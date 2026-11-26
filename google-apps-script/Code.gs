/**
 * ============================================================================
 * PIGGY DUO – GOOGLE APPS SCRIPT BACKEND (Dùng cho GitHub Pages / 2 điện thoại)
 * ============================================================================
 * Hướng dẫn gắn vào Google Sheet của bạn (chỉ làm 1 lần, mất 30 giây):
 * 1. Mở file Google Sheet của bạn:
 *    https://docs.google.com/spreadsheets/d/1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s/edit
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xoá mã mặc định trong Code.gs và dán toàn bộ nội dung file này vào.
 * 4. Nhấn "Triển khai" (Deploy) -> "Tạo phiên bản triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web app):
 *    - Thực thi dưới dạng (Execute as): Tôi (Me)
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 6. Nhấn Triển khai, cấp quyền cho tài khoản Google của bạn, rồi copy URL Web App
 *    (có dạng https://script.google.com/macros/s/.../exec)
 * 7. Dán URL đó vào mục "Kết nối Google Sheets" trong tab "Của chúng mình" trên app!
 */

// Nếu bạn muốn khoá thêm ở tầng Google Sheet, điền cùng Mã khoá đôi mình vào đây (để trống = không bắt buộc):
var SECRET_PASSCODE = '';

function checkPasscode(pass) {
  if (!SECRET_PASSCODE) return true;
  return String(pass || '').trim() === SECRET_PASSCODE;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var pass = e && e.parameter ? e.parameter.key : '';
  if (!checkPasscode(pass)) {
    return jsonOut({ ok: false, error: 'Sai mã khoá bảo mật (SECRET_PASSCODE)' });
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
  var val = sheet.getRange('C2').getValue();
  var updated = sheet.getRange('B2').getValue();
  var out = val
    ? { ok: true, updatedAt: updated, state: JSON.parse(val) }
    : { ok: true, empty: true };
  return jsonOut(out);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkPasscode(payload.passcode)) {
      return jsonOut({ ok: false, error: 'Sai mã khoá bảo mật (SECRET_PASSCODE)' });
    }
    var state = payload.state;
    if (!state) {
      return jsonOut({ ok: false, error: 'Missing state' });
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date().toISOString();

    // 1. Lưu JSON chuẩn vào AppState
    var appSheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
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

    return jsonOut({ ok: true, syncedAt: now });
  } finally {
    lock.releaseLock();
  }
}
