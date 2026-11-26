/**
 * ============================================================================
 * PIGGY DUO – GOOGLE APPS SCRIPT BACKEND (Có LockService + Merge chống xung đột)
 * ============================================================================
 * Đã gắn cứng vào Google Sheet của 2 bạn:
 * https://docs.google.com/spreadsheets/d/1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s/edit?gid=0#gid=0
 */

var SPREADSHEET_ID = '1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s';
var SECRET_PASSCODE = '';

function checkPasscode(pass) {
  if (!SECRET_PASSCODE) return true;
  return String(pass || '').trim() === SECRET_PASSCODE;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hợp nhất (Merge) trạng thái cũ trên Sheet và trạng thái mới từ điện thoại gửi lên để không bao giờ mất thao tác khi 2 người bấm cùng lúc!
function mergeAppState(existing, incoming) {
  if (!existing || !existing.journey) return incoming;
  if (!incoming || !incoming.journey) return existing;

  var out = JSON.parse(JSON.stringify(incoming));

  // 1. Hợp nhất Daily Reveals theo ngày (ưu tiên kết quả mới nhất khi người dùng bấm Random lại số tiền!)
  var revByDate = {};
  (existing.reveals || []).concat(incoming.reveals || []).forEach(function(r) {
    var prev = revByDate[r.date];
    if (!prev || String(r.createdAt) >= String(prev.createdAt)) {
      revByDate[r.date] = r;
    }
  });
  out.reveals = Object.keys(revByDate).sort().map(function(d) { return revByDate[d]; });

  // 2. Hợp nhất Contributions (không mất xác nhận của người kia khi 2 người bấm xác nhận cùng lúc)
  var rank = { pending: 0, confirmed: 1, voided: 2 };
  var cMap = {};
  (existing.contributions || []).concat(incoming.contributions || []).forEach(function(raw) {
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
      confirmedAt: raw.confirmedAt || null
    } : raw;
    var key = c.revealId ? ('rev:' + c.date + ':' + c.member) : ('id:' + c.id);
    var prev = cMap[key];
    if (!prev) {
      cMap[key] = c;
    } else {
      var st = (rank[c.status] || 0) >= (rank[prev.status] || 0) ? c.status : prev.status;
      cMap[key] = {
        id: c.id,
        member: c.member,
        revealId: c.revealId,
        amount: c.amount,
        date: c.date,
        status: st,
        notes: c.notes || prev.notes || '',
        createdAt: prev.createdAt || c.createdAt,
        confirmedAt: c.confirmedAt || prev.confirmedAt || null
      };
    }
  });
  out.contributions = Object.keys(cMap).map(function(k) { return cMap[k]; });

  // 3. Hợp nhất ActivityLog
  var aMap = {};
  (existing.activity || []).concat(incoming.activity || []).forEach(function(a) {
    var k = a.type === 'reveal' ? ('reveal:' + String(a.at).slice(0, 10)) : a.id;
    if (!aMap[k]) aMap[k] = a;
  });
  out.activity = Object.keys(aMap).map(function(k) { return aMap[k]; }).sort(function(x, y) {
    return String(y.at).localeCompare(String(x.at));
  });

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

  return out;
}

function doGet(e) {
  var pass = e && e.parameter ? e.parameter.key : '';
  if (!checkPasscode(pass)) {
    return jsonOut({ ok: false, error: 'Sai mã khoá bảo mật (SECRET_PASSCODE)' });
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
  var val = sheet.getRange('C2').getValue();
  var updated = sheet.getRange('B2').getValue();
  var out = val
    ? { ok: true, updatedAt: updated, state: JSON.parse(val) }
    : { ok: true, empty: true };
  return jsonOut(out);
}

function doPost(e) {
  // LockService xếp hàng tuần tự khi 2 người bấm cùng 1 giây
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkPasscode(payload.passcode)) {
      return jsonOut({ ok: false, error: 'Sai mã khoá bảo mật (SECRET_PASSCODE)' });
    }
    var incoming = payload.state;
    if (!incoming) {
      return jsonOut({ ok: false, error: 'Missing state' });
    }
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var now = new Date().toISOString();

    var appSheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
    var existingJson = appSheet.getRange('C2').getValue();
    var existing = existingJson ? JSON.parse(existingJson) : null;
    var state = existing ? mergeAppState(existing, incoming) : incoming;

    // 1. Lưu JSON chuẩn đã merge vào AppState
    appSheet.clearContents();
    appSheet.getRange(1, 1, 2, 3).setValues([
      ['key', 'updated_at', 'json_state'],
      ['piggy_duo_state_v1', now, JSON.stringify(state)]
    ]);

    // 2. Lưu bảng Journey dễ đọc
    var j = state.journey;
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
      ['Người 1 - Tên', j ? j.members.a.name : '', 'Chủ hành trình'],
      ['Người 1 - Thu nhập/tháng (VND)', j ? j.members.a.income : 0, 'VND'],
      ['Người 2 - Tên', j ? j.members.b.name : '', 'Thành viên'],
      ['Người 2 - Thu nhập/tháng (VND)', j ? j.members.b.income : 0, 'VND'],
      ['Tên heo đất', j ? j.pig.name : '', 'Mascot'],
      ['Kiểu heo đất', j ? j.pig.style : '', 'Style'],
      ['Cập nhật lần cuối', now, 'ISO timestamp']
    ];
    jSheet.getRange(1, 1, jRows.length, 3).setValues(jRows);

    // 3. Lưu bảng DailyReveals
    var rSheet = ss.getSheetByName('DailyReveals') || ss.insertSheet('DailyReveals');
    rSheet.clearContents();
    var rRows = [['Mã mở số', 'Ngày', 'Người bấm mở', 'Số tiền Người 1 (VND)', 'Số tiền Người 2 (VND)', 'Tổng cộng (VND)', 'Thời gian tạo']];
    (state.reveals || []).forEach(function(r) {
      rRows.push([r.id, r.date, j ? j.members[r.initiatedBy].name : r.initiatedBy, r.amounts.a, r.amounts.b, r.amounts.a + r.amounts.b, r.createdAt]);
    });
    rSheet.getRange(1, 1, rRows.length, 7).setValues(rRows);

    // 4. Lưu bảng Contributions
    var cSheet = ss.getSheetByName('Contributions') || ss.insertSheet('Contributions');
    cSheet.clearContents();
    var cRows = [['Mã khoản góp', 'Ngày', 'Thành viên', 'Số tiền (VND)', 'Trạng thái', 'Nguồn mở số', 'Ghi chú', 'Tạo lúc', 'Xác nhận lúc']];
    (state.contributions || []).forEach(function(c) {
      cRows.push([c.id, c.date, j ? j.members[c.member].name : c.member, c.amount, c.status, c.revealId || 'Nạp thêm', c.notes || '', c.createdAt, c.confirmedAt || '']);
    });
    cSheet.getRange(1, 1, cRows.length, 9).setValues(cRows);

    // 5. Lưu bảng ActivityLog
    var aSheet = ss.getSheetByName('ActivityLog') || ss.insertSheet('ActivityLog');
    aSheet.clearContents();
    var aRows = [['Mã sự kiện', 'Thời gian', 'Loại', 'Thành viên', 'Số tiền (VND)', 'Tiêu đề', 'Mô tả', 'Trạng thái']];
    (state.activity || []).slice(0, 200).forEach(function(a) {
      aRows.push([a.id, a.at, a.type, a.member ? (j ? j.members[a.member].name : a.member) : '', a.amount != null ? a.amount : '', a.title, a.description || '', a.status || '']);
    });
    aSheet.getRange(1, 1, aRows.length, 8).setValues(aRows);

    // Trả luôn state đã merge về để máy vừa bấm cập nhật theo máy kia ngay lập tức!
    return jsonOut({ ok: true, syncedAt: now, state: state });
  } finally {
    lock.releaseLock();
  }
}
