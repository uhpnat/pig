/**
 * ============================================================================
 * PIGGY DUO – GOOGLE APPS SCRIPT BACKEND (Tách bảng riêng + Merge chống mất tin nhắn)
 * ============================================================================
 * Cách dùng:
 * 1. Tạo 1 file Google Sheet mới của riêng 2 bạn -> bấm Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Dán toàn bộ mã này vào Code.gs -> Lưu -> Triển khai (Deploy) -> Ứng dụng web (Web app):
 *    - Thực thi dưới dạng: Tôi (Me)
 *    - Ai có quyền truy cập: Bất kỳ ai (Anyone)
 * 3. Copy link Web App URL (https://script.google.com/macros/s/.../exec) dán vào màn hình khởi tạo của App!
 *    (Mẹo: Nếu gắn trực tiếp từ menu Tiện ích mở rộng của Sheet, bạn không cần điền SPREADSHEET_ID vì script tự nhận diện bằng SpreadsheetApp.getActiveSpreadsheet()!).
 */

var SPREADSHEET_ID = ''; // Để trống nếu bạn mở Apps Script trực tiếp từ file Google Sheet của bạn
var SECRET_PASSCODE = '';

function getSpreadsheet(payloadId) {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  var id = (payloadId || SPREADSHEET_ID || '').trim();
  return SpreadsheetApp.openById(id);
}

function checkPasscode(pass) {
  if (!SECRET_PASSCODE) return true;
  return String(pass || '').trim() === SECRET_PASSCODE;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendPush(wp) {
  if (!wp || !wp.endpoint || !wp.bodyBase64) return null;
  try {
    if (wp.delayMs && Number(wp.delayMs) > 0) {
      Utilities.sleep(Math.min(15000, Number(wp.delayMs)));
    }
    var rawBytes = Utilities.base64Decode(wp.bodyBase64);
    var r = UrlFetchApp.fetch(wp.endpoint, {
      method: 'post',
      headers: wp.headers || {},
      payload: rawBytes,
      muteHttpExceptions: true
    });
    return { sent: true, status: r.getResponseCode() };
  } catch (err) {
    return { sent: false, error: String(err) };
  }
}

// Đọc danh sách tin nhắn từ bảng Messages riêng biệt
function readMessagesTable(ss) {
  var mSheet = ss.getSheetByName('Messages');
  if (!mSheet) return [];
  var lastRow = mSheet.getLastRow();
  if (lastRow < 2) return [];
  var rows = mSheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var readBy = String(r[4] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    out.push({
      id: String(r[0]),
      at: String(r[1]),
      sender: String(r[2]) === 'b' ? 'b' : 'a',
      text: String(r[3] || ''),
      readBy: readBy.length ? readBy : [String(r[2]) === 'b' ? 'b' : 'a']
    });
  }
  return out;
}

// Hợp nhất (Merge) trạng thái cũ trên Sheet và trạng thái mới từ điện thoại gửi lên để KHÔNG BAO GIỜ mất tin nhắn hay khoản nạp!
function mergeAppState(existing, incoming, tableMessages) {
  if (!existing || !existing.journey) return incoming;
  if (!incoming || !incoming.journey) return existing;

  var out = JSON.parse(JSON.stringify(incoming));

  // 1. Hợp nhất Daily Reveals theo ngày (ưu tiên lượt quay đầu tiên trong ngày)
  var revByDate = {};
  (existing.reveals || []).concat(incoming.reveals || []).forEach(function(r) {
    if (!r || !r.date) return;
    var prev = revByDate[r.date];
    if (!prev || String(r.createdAt) <= String(prev.createdAt)) {
      revByDate[r.date] = r;
    }
  });
  out.reveals = Object.keys(revByDate).sort().map(function(d) { return revByDate[d]; });

  // 2. Hợp nhất Contributions (giữ nguyên xác nhận chéo confirmedBy của cả 2 người!)
  var rank = { pending: 0, confirmed: 1, voided: 2 };
  var cMap = {};
  (existing.contributions || []).concat(incoming.contributions || []).forEach(function(raw) {
    if (!raw) return;
    var canonRev = raw.revealId ? revByDate[raw.date] : null;
    var c = canonRev ? {
      id: 'ct_' + canonRev.id + '_' + raw.member,
      member: raw.member,
      revealId: canonRev.id,
      amount: canonRev.amounts[raw.member],
      date: raw.date,
      status: raw.status,
      notes: raw.notes || '',
      createdAt: raw.createdAt,
      confirmedAt: raw.confirmedAt || null,
      confirmedBy: raw.confirmedBy || (raw.status === 'confirmed' ? ['a', 'b'] : [])
    } : raw;
    var key = c.revealId ? ('rev:' + c.date + ':' + c.member) : ('id:' + c.id);
    var prev = cMap[key];
    if (!prev) {
      cMap[key] = c;
    } else {
      var byMap = {};
      (prev.confirmedBy || []).concat(c.confirmedBy || []).forEach(function(m) { if (m) byMap[m] = true; });
      var unionBy = Object.keys(byMap);
      var bothDone = byMap.a && byMap.b;
      var st = (rank[c.status] || 0) >= (rank[prev.status] || 0) ? c.status : prev.status;
      if (st !== 'voided' && bothDone) st = 'confirmed';
      cMap[key] = {
        id: c.id,
        member: c.member,
        revealId: c.revealId,
        amount: c.amount,
        date: c.date,
        status: st,
        notes: c.notes || prev.notes || '',
        createdAt: prev.createdAt || c.createdAt,
        confirmedAt: c.confirmedAt || prev.confirmedAt || (st === 'confirmed' ? new Date().toISOString() : null),
        confirmedBy: unionBy
      };
    }
  });
  out.contributions = Object.keys(cMap).map(function(k) { return cMap[k]; });

  // 3. Hợp nhất ActivityLog & Notifications
  var aMap = {};
  (existing.activity || []).concat(incoming.activity || []).forEach(function(a) {
    if (!a) return;
    var k = a.type === 'reveal' ? ('reveal:' + String(a.at).slice(0, 10)) : a.id;
    if (!aMap[k]) aMap[k] = a;
  });
  out.activity = Object.keys(aMap).map(function(k) { return aMap[k]; }).sort(function(x, y) {
    return String(y.at).localeCompare(String(x.at));
  }).slice(0, 120);

  var nMap = {};
  (existing.notifications || []).concat(incoming.notifications || []).forEach(function(n) {
    if (!n || !n.id) return;
    var prev = nMap[n.id];
    nMap[n.id] = prev ? Object.assign({}, prev, n, { read: Boolean(prev.read || n.read) }) : n;
  });
  out.notifications = Object.keys(nMap).map(function(k) { return nMap[k]; }).sort(function(x, y) {
    return String(y.at).localeCompare(String(x.at));
  }).slice(0, 60);

  // 4. Hợp nhất Challenges & Milestones
  var cs = Object.assign({}, existing.challengeStatus || {}, incoming.challengeStatus || {});
  Object.keys(cs).forEach(function(k) {
    if ((existing.challengeStatus && existing.challengeStatus[k] === 'completed') ||
        (incoming.challengeStatus && incoming.challengeStatus[k] === 'completed')) {
      cs[k] = 'completed';
    }
  });
  out.challengeStatus = cs;
  out.completedAt = Object.assign({}, existing.completedAt || {}, incoming.completedAt || {});

  var msMap = {};
  (existing.milestonesReached || []).concat(incoming.milestonesReached || []).forEach(function(m) { msMap[m] = true; });
  out.milestonesReached = Object.keys(msMap).map(Number).sort(function(a, b) { return a - b; });

  // 5. Hợp nhất Chat Messages từ cả AppState + bảng Messages + gói tin mới (KHÔNG BAO GIỜ MẤT TIN NHẮN!)
  var msgMap = {};
  (tableMessages || []).concat(existing.messages || []).concat(incoming.messages || []).forEach(function(m) {
    if (!m || !m.id) return;
    var prev = msgMap[m.id];
    if (!prev) {
      msgMap[m.id] = m;
    } else {
      var rb = {};
      (prev.readBy || [prev.sender]).concat(m.readBy || [m.sender]).forEach(function(id) { if (id) rb[id] = true; });
      msgMap[m.id] = Object.assign({}, prev, m, { readBy: Object.keys(rb) });
    }
  });
  out.messages = Object.keys(msgMap).map(function(k) { return msgMap[k]; }).sort(function(a, b) {
    return String(a.at).localeCompare(String(b.at));
  }).slice(-100);

  // 6. Bảo toàn pushSubscription riêng của từng người (chống trùng 1 máy cho cả Nam & Nữ)
  if (out.journey && out.journey.members && existing.journey && existing.journey.members) {
    ['a', 'b'].forEach(function(id) {
      var eSub = existing.journey.members[id] && existing.journey.members[id].pushSubscription;
      var iSub = incoming.journey.members[id] && incoming.journey.members[id].pushSubscription;
      if (eSub && iSub) {
        out.journey.members[id].pushSubscription = String(iSub.updatedAt) >= String(eSub.updatedAt) ? iSub : eSub;
      } else if (eSub || iSub) {
        out.journey.members[id].pushSubscription = iSub || eSub;
      }
    });
    var subA = out.journey.members.a && out.journey.members.a.pushSubscription;
    var subB = out.journey.members.b && out.journey.members.b.pushSubscription;
    if (subA && subB && subA.endpoint === subB.endpoint) {
      if (String(subA.updatedAt) >= String(subB.updatedAt)) {
        delete out.journey.members.b.pushSubscription;
      } else {
        delete out.journey.members.a.pushSubscription;
      }
    }
  }

  return out;
}

function doGet(e) {
  var pass = e && e.parameter ? e.parameter.key : '';
  if (!checkPasscode(pass)) {
    return jsonOut({ ok: false, error: 'Sai mã khoá bảo mật (SECRET_PASSCODE)' });
  }
  var ss = getSpreadsheet(e && e.parameter ? e.parameter.id : '');
  var sheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
  var val = sheet.getRange('C2').getValue();
  var updated = sheet.getRange('B2').getValue();
  if (!val) return jsonOut({ ok: true, empty: true });

  var state = JSON.parse(val);
  // Kết hợp tin nhắn từ bảng Messages riêng biệt
  var tblMsgs = readMessagesTable(ss);
  if (tblMsgs.length > 0) {
    var msgMap = {};
    (state.messages || []).concat(tblMsgs).forEach(function(m) { if (m && m.id) msgMap[m.id] = m; });
    state.messages = Object.keys(msgMap).map(function(k) { return msgMap[k]; }).sort(function(a, b) {
      return String(a.at).localeCompare(String(b.at));
    }).slice(-100);
  }
  return jsonOut({ ok: true, updatedAt: updated, state: state });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkPasscode(payload.passcode)) {
      return jsonOut({ ok: false, error: 'Sai mã khoá bảo mật (SECRET_PASSCODE)' });
    }
    if (payload.pushOnly && payload.webPush) {
      return jsonOut({ ok: true, webPushResult: sendPush(payload.webPush) });
    }
    var incoming = payload.state;
    if (!incoming) {
      return jsonOut({ ok: false, error: 'Missing state' });
    }
    var ss = getSpreadsheet(payload.spreadsheetId);
    var now = new Date().toISOString();

    var appSheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
    var existingJson = appSheet.getRange('C2').getValue();
    var existing = existingJson ? JSON.parse(existingJson) : null;
    var tblMsgs = payload.forceReplace ? [] : readMessagesTable(ss);
    var state = (payload.forceReplace || !existing) ? incoming : mergeAppState(existing, incoming, tblMsgs);
    var j = state.journey;

    // 1. Bảng Journey (Thông tin hành trình)
    var jSheet = ss.getSheetByName('Journey') || ss.insertSheet('Journey');
    jSheet.clearContents();
    var jRows = [
      ['Trường cấu hình', 'Giá trị', 'Ghi chú'],
      ['ID hành trình', j ? j.id : '', 'Mã định danh hành trình'],
      ['Tên hành trình', j ? j.name : 'Chưa thiết lập', 'Tên chung của hai bạn'],
      ['Mục tiêu (VND)', j ? j.goal : 0, 'Số tiền mục tiêu chung'],
      ['Ngày bắt đầu', j ? j.startDate : '', 'YYYY-MM-DD'],
      ['Thời hạn (tháng)', j ? j.months : 0, 'Số tháng tiết kiệm'],
      ['Ngày kết thúc', j ? j.endDate : '', 'YYYY-MM-DD'],
      ['Chế độ chia mức góp', j ? j.fairness : 'proportional', 'proportional / equal / custom'],
      ['Tên heo đất', j ? j.pig.name : '', 'Mascot'],
      ['Kiểu heo đất', j ? j.pig.style : '', 'Style'],
      ['Cập nhật lần cuối', now, 'ISO timestamp']
    ];
    jSheet.getRange(1, 1, jRows.length, 3).setValues(jRows);

    // 2. Bảng Members (Tách riêng thông tin 2 thành viên & trạng thái kết nối Push)
    var memSheet = ss.getSheetByName('Members') || ss.insertSheet('Members');
    memSheet.clearContents();
    var memRows = [['ID', 'Tên thành viên', 'Giới tính', 'Vai trò', 'Thu nhập/tháng (VND)', 'Ảnh đại diện', 'Đã bật Push iPhone', 'Endpoint Push']];
    if (j && j.members) {
      ['a', 'b'].forEach(function(id) {
        var m = j.members[id];
        if (!m) return;
        memRows.push([
          m.id,
          m.name,
          m.gender === 'male' ? 'Nam' : 'Nữ',
          m.role,
          m.income,
          m.avatar,
          m.pushSubscription && m.pushSubscription.endpoint ? 'Đã bật' : 'Chưa bật',
          m.pushSubscription && m.pushSubscription.endpoint ? m.pushSubscription.endpoint : ''
        ]);
      });
    }
    memSheet.getRange(1, 1, memRows.length, 8).setValues(memRows);

    // 3. Bảng DailyReveals (Lịch sử mở số mỗi ngày)
    var rSheet = ss.getSheetByName('DailyReveals') || ss.insertSheet('DailyReveals');
    rSheet.clearContents();
    var rRows = [['Mã mở số', 'Ngày', 'Người bấm mở', 'Số tiền Người 1 (VND)', 'Số tiền Người 2 (VND)', 'Tổng cộng (VND)', 'Thời gian tạo']];
    (state.reveals || []).forEach(function(r) {
      rRows.push([r.id, r.date, j ? j.members[r.initiatedBy].name : r.initiatedBy, r.amounts.a, r.amounts.b, r.amounts.a + r.amounts.b, r.createdAt]);
    });
    rSheet.getRange(1, 1, rRows.length, 7).setValues(rRows);

    // 4. Bảng Contributions (Các khoản góp & trạng thái xác nhận chéo 2/2)
    var cSheet = ss.getSheetByName('Contributions') || ss.insertSheet('Contributions');
    cSheet.clearContents();
    var cRows = [['Mã khoản góp', 'Ngày', 'Thành viên', 'Số tiền (VND)', 'Trạng thái', 'Đã duyệt bởi', 'Nguồn mở số', 'Ghi chú', 'Tạo lúc', 'Xác nhận lúc']];
    (state.contributions || []).forEach(function(c) {
      cRows.push([c.id, c.date, j ? j.members[c.member].name : c.member, c.amount, c.status, (c.confirmedBy || []).join(','), c.revealId || 'Nạp thêm', c.notes || '', c.createdAt, c.confirmedAt || '']);
    });
    cSheet.getRange(1, 1, cRows.length, 10).setValues(cRows);

    // 5. Bảng Messages (Tách riêng toàn bộ tin nhắn Chat của đôi mình)
    var mSheet = ss.getSheetByName('Messages') || ss.insertSheet('Messages');
    mSheet.clearContents();
    var mRows = [['Mã tin nhắn', 'Thời gian', 'Mã người gửi', 'Nội dung tin nhắn', 'Đã xem bởi', 'Tên người gửi']];
    (state.messages || []).forEach(function(m) {
      mRows.push([m.id, m.at, m.sender, m.text, (m.readBy || [m.sender]).join(','), j && j.members[m.sender] ? j.members[m.sender].name : m.sender]);
    });
    mSheet.getRange(1, 1, mRows.length, 6).setValues(mRows);

    // 6. Bảng Notifications (Tách riêng thông báo theo người nhận)
    var nSheet = ss.getSheetByName('Notifications') || ss.insertSheet('Notifications');
    nSheet.clearContents();
    var nRows = [['Mã thông báo', 'Thời gian', 'Loại', 'Người tạo', 'Người nhận', 'Tiêu đề', 'Nội dung', 'Đã đọc']];
    (state.notifications || []).slice(0, 60).forEach(function(n) {
      nRows.push([n.id, n.at, n.type, n.actor || '', n.target || 'all', n.title, n.message, String(Boolean(n.read))]);
    });
    nSheet.getRange(1, 1, nRows.length, 8).setValues(nRows);

    // 7. Bảng ActivityLog (Nhật ký hoạt động)
    var aSheet = ss.getSheetByName('ActivityLog') || ss.insertSheet('ActivityLog');
    aSheet.clearContents();
    var aRows = [['Mã sự kiện', 'Thời gian', 'Loại', 'Thành viên', 'Số tiền (VND)', 'Tiêu đề', 'Mô tả', 'Trạng thái']];
    (state.activity || []).slice(0, 120).forEach(function(a) {
      aRows.push([a.id, a.at, a.type, a.member ? (j ? j.members[a.member].name : a.member) : '', a.amount != null ? a.amount : '', a.title, a.description || '', a.status || '']);
    });
    aSheet.getRange(1, 1, aRows.length, 8).setValues(aRows);

    // 8. Bảng AppState gọn nhẹ (đã cắt tỉa danh sách dài vì đã lưu sang các bảng riêng ở trên)
    var compactState = Object.assign({}, state, {
      activity: (state.activity || []).slice(0, 60),
      notifications: (state.notifications || []).slice(0, 40),
      messages: (state.messages || []).slice(-60)
    });
    appSheet.clearContents();
    appSheet.getRange(1, 1, 2, 3).setValues([
      ['key', 'updated_at', 'json_state'],
      ['piggy_duo_state_v2', now, JSON.stringify(compactState)]
    ]);

    var wpRes = payload.webPush ? sendPush(payload.webPush) : null;
    return jsonOut({ ok: true, syncedAt: now, state: state, webPushResult: wpRes });
  } finally {
    lock.releaseLock();
  }
}
