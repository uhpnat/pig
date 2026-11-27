import {
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Share2,
} from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Field, Modal } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import { useJourney, useStore } from '@/hooks/useStore'
import { extractSpreadsheetId } from '@/services/localRepository'

export const GAS_BACKEND_CODE = `// Dán vào Tiện ích mở rộng (Extensions) -> Apps Script trên file Google Sheet của riêng 2 bạn
var SPREADSHEET_ID = ''; // Để trống nếu mở Apps Script trực tiếp từ Google Sheet (tự động nhận diện)
var SECRET_PASSCODE = '';

function getSpreadsheet(payloadId) {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById((payloadId || SPREADSHEET_ID || '').trim());
}
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function checkPass(p) { return !SECRET_PASSCODE || String(p || '').trim() === SECRET_PASSCODE; }

function sendPush(wp) {
  if (!wp || !wp.endpoint || !wp.bodyBase64) return null;
  try {
    if (wp.delayMs && Number(wp.delayMs) > 0) Utilities.sleep(Math.min(15000, Number(wp.delayMs)));
    var rawBytes = Utilities.base64Decode(wp.bodyBase64);
    var r = UrlFetchApp.fetch(wp.endpoint, {
      method: 'post',
      headers: wp.headers || {},
      payload: rawBytes,
      muteHttpExceptions: true
    });
    return { sent: true, status: r.getResponseCode() };
  } catch (err) { return { sent: false, error: String(err) }; }
}

function readMessagesTable(ss) {
  var mSheet = ss.getSheetByName('Messages');
  if (!mSheet || mSheet.getLastRow() < 2) return [];
  var rows = mSheet.getRange(2, 1, mSheet.getLastRow() - 1, 6).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var rb = String(r[4] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    out.push({ id: String(r[0]), at: String(r[1]), sender: String(r[2]) === 'b' ? 'b' : 'a', text: String(r[3] || ''), readBy: rb.length ? rb : [String(r[2]) === 'b' ? 'b' : 'a'] });
  }
  return out;
}

function mergeAppState(existing, incoming, tblMsgs) {
  if (!existing || !existing.journey) return incoming;
  if (!incoming || !incoming.journey) return existing;
  var out = JSON.parse(JSON.stringify(incoming));
  var revByDate = {};
  (existing.reveals || []).concat(incoming.reveals || []).forEach(function(r) {
    if (r && r.date && (!revByDate[r.date] || String(r.createdAt) <= String(revByDate[r.date].createdAt))) revByDate[r.date] = r;
  });
  out.reveals = Object.keys(revByDate).sort().map(function(d) { return revByDate[d]; });

  var rank = { pending: 0, confirmed: 1, voided: 2 };
  var cMap = {};
  (existing.contributions || []).concat(incoming.contributions || []).forEach(function(raw) {
    if (!raw) return;
    var canonRev = raw.revealId ? revByDate[raw.date] : null;
    var c = canonRev ? Object.assign({}, raw, { id: 'ct_' + canonRev.id + '_' + raw.member, revealId: canonRev.id, amount: canonRev.amounts[raw.member] }) : raw;
    var key = c.revealId ? ('rev:' + c.date + ':' + c.member) : ('id:' + c.id);
    var prev = cMap[key];
    if (!prev) { cMap[key] = c; } else {
      var byMap = {};
      (prev.confirmedBy || []).concat(c.confirmedBy || []).forEach(function(m) { if (m) byMap[m] = true; });
      var unionBy = Object.keys(byMap);
      var st = (rank[c.status] || 0) >= (rank[prev.status] || 0) ? c.status : prev.status;
      if (st !== 'voided' && byMap.a && byMap.b) st = 'confirmed';
      cMap[key] = Object.assign({}, prev, c, { status: st, confirmedBy: unionBy });
    }
  });
  out.contributions = Object.keys(cMap).map(function(k) { return cMap[k]; });

  var msgMap = {};
  (tblMsgs || []).concat(existing.messages || []).concat(incoming.messages || []).forEach(function(m) {
    if (!m || !m.id) return;
    var prev = msgMap[m.id];
    if (!prev) { msgMap[m.id] = m; } else {
      var rb = {};
      (prev.readBy || [prev.sender]).concat(m.readBy || [m.sender]).forEach(function(id) { if (id) rb[id] = true; });
      msgMap[m.id] = Object.assign({}, prev, m, { readBy: Object.keys(rb) });
    }
  });
  out.messages = Object.keys(msgMap).map(function(k) { return msgMap[k]; }).sort(function(a, b) { return String(a.at).localeCompare(String(b.at)); }).slice(-100);
  return out;
}

function doGet(e) {
  if (!checkPass(e && e.parameter ? e.parameter.key : '')) return jsonOut({ ok: false, error: 'Sai mã khoá' });
  var ss = getSpreadsheet(e && e.parameter ? e.parameter.id : '');
  var sheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
  var val = sheet.getRange('C2').getValue();
  var updated = sheet.getRange('B2').getValue();
  if (!val) return jsonOut({ ok: true, empty: true });
  var state = JSON.parse(val);
  var tblMsgs = readMessagesTable(ss);
  if (tblMsgs.length) {
    var msgMap = {};
    (state.messages || []).concat(tblMsgs).forEach(function(m) { if (m && m.id) msgMap[m.id] = m; });
    state.messages = Object.keys(msgMap).map(function(k) { return msgMap[k]; }).sort(function(a, b) { return String(a.at).localeCompare(String(b.at)); }).slice(-100);
  }
  return jsonOut({ ok: true, updatedAt: updated, state: state });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkPass(payload.passcode)) return jsonOut({ ok: false, error: 'Sai mã khoá' });
    if (payload.pushOnly && payload.webPush) return jsonOut({ ok: true, webPushResult: sendPush(payload.webPush) });
    var incoming = payload.state;
    if (!incoming) return jsonOut({ ok: false, error: 'Missing state' });
    var ss = getSpreadsheet(payload.spreadsheetId);
    var now = new Date().toISOString();
    var appSheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
    var existingJson = appSheet.getRange('C2').getValue();
    var existing = existingJson ? JSON.parse(existingJson) : null;
    var tblMsgs = payload.forceReplace ? [] : readMessagesTable(ss);
    var state = (payload.forceReplace || !existing) ? incoming : mergeAppState(existing, incoming, tblMsgs);
    var j = state.journey;

    // 1. Bảng Journey
    var jSheet = ss.getSheetByName('Journey') || ss.insertSheet('Journey');
    jSheet.clearContents();
    var jRows = [['Trường cấu hình', 'Giá trị', 'Ghi chú'], ['ID hành trình', j ? j.id : '', 'ID'], ['Tên hành trình', j ? j.name : '', 'Tên'], ['Mục tiêu (VND)', j ? j.goal : 0, 'VND'], ['Ngày bắt đầu', j ? j.startDate : '', 'YYYY-MM-DD'], ['Ngày kết thúc', j ? j.endDate : '', 'YYYY-MM-DD'], ['Tên heo đất', j ? j.pig.name : '', 'Mascot'], ['Cập nhật lần cuối', now, 'ISO']];
    jSheet.getRange(1, 1, jRows.length, 3).setValues(jRows);

    // 2. Bảng Members (Tách riêng 2 thành viên)
    var memSheet = ss.getSheetByName('Members') || ss.insertSheet('Members');
    memSheet.clearContents();
    var memRows = [['ID', 'Tên', 'Giới tính', 'Thu nhập/tháng', 'Đã bật Push']];
    if (j && j.members) {
      ['a', 'b'].forEach(function(id) {
        var m = j.members[id];
        if (m) memRows.push([m.id, m.name, m.gender === 'male' ? 'Nam' : 'Nữ', m.income, m.pushSubscription && m.pushSubscription.endpoint ? 'Đã bật' : 'Chưa bật']);
      });
    }
    memSheet.getRange(1, 1, memRows.length, 5).setValues(memRows);

    // 3. Bảng DailyReveals
    var rSheet = ss.getSheetByName('DailyReveals') || ss.insertSheet('DailyReveals');
    rSheet.clearContents();
    var rRows = [['Mã mở số', 'Ngày', 'Người mở', 'Số tiền Người 1', 'Số tiền Người 2', 'Tổng', 'Tạo lúc']];
    (state.reveals || []).forEach(function(r) { rRows.push([r.id, r.date, j ? j.members[r.initiatedBy].name : r.initiatedBy, r.amounts.a, r.amounts.b, r.amounts.a + r.amounts.b, r.createdAt]); });
    rSheet.getRange(1, 1, rRows.length, 7).setValues(rRows);

    // 4. Bảng Contributions
    var cSheet = ss.getSheetByName('Contributions') || ss.insertSheet('Contributions');
    cSheet.clearContents();
    var cRows = [['Mã khoản góp', 'Ngày', 'Thành viên', 'Số tiền', 'Trạng thái', 'Duyệt bởi', 'Nguồn', 'Ghi chú', 'Tạo lúc', 'Xác nhận lúc']];
    (state.contributions || []).forEach(function(c) { cRows.push([c.id, c.date, j ? j.members[c.member].name : c.member, c.amount, c.status, (c.confirmedBy || []).join(','), c.revealId || 'Nạp thêm', c.notes || '', c.createdAt, c.confirmedAt || '']); });
    cSheet.getRange(1, 1, cRows.length, 10).setValues(cRows);

    // 5. Bảng Messages (Tách riêng toàn bộ tin nhắn Chat)
    var mSheet = ss.getSheetByName('Messages') || ss.insertSheet('Messages');
    mSheet.clearContents();
    var mRows = [['Mã tin nhắn', 'Thời gian', 'Mã người gửi', 'Nội dung', 'Đã xem bởi', 'Tên người gửi']];
    (state.messages || []).forEach(function(m) { mRows.push([m.id, m.at, m.sender, m.text, (m.readBy || [m.sender]).join(','), j && j.members[m.sender] ? j.members[m.sender].name : m.sender]); });
    mSheet.getRange(1, 1, mRows.length, 6).setValues(mRows);

    // 6. Bảng Notifications & ActivityLog
    var nSheet = ss.getSheetByName('Notifications') || ss.insertSheet('Notifications');
    nSheet.clearContents();
    var nRows = [['Mã thông báo', 'Thời gian', 'Loại', 'Người nhận', 'Tiêu đề', 'Nội dung', 'Đã đọc']];
    (state.notifications || []).slice(0, 60).forEach(function(n) { nRows.push([n.id, n.at, n.type, n.target || 'all', n.title, n.message, String(Boolean(n.read))]); });
    nSheet.getRange(1, 1, nRows.length, 7).setValues(nRows);

    var aSheet = ss.getSheetByName('ActivityLog') || ss.insertSheet('ActivityLog');
    aSheet.clearContents();
    var aRows = [['Mã sự kiện', 'Thời gian', 'Loại', 'Thành viên', 'Số tiền', 'Tiêu đề', 'Mô tả']];
    (state.activity || []).slice(0, 100).forEach(function(a) { aRows.push([a.id, a.at, a.type, a.member ? (j ? j.members[a.member].name : a.member) : '', a.amount != null ? a.amount : '', a.title, a.description || '']); });
    aSheet.getRange(1, 1, aRows.length, 7).setValues(aRows);

    // 7. Bảng AppState rút gọn
    var compact = Object.assign({}, state, { activity: (state.activity || []).slice(0, 50), notifications: (state.notifications || []).slice(0, 35), messages: (state.messages || []).slice(-50) });
    appSheet.clearContents();
    appSheet.getRange(1, 1, 2, 3).setValues([['key', 'updated_at', 'json_state'], ['piggy_duo_state_v2', now, JSON.stringify(compact)]]);

    var wpRes = payload.webPush ? sendPush(payload.webPush) : null;
    return jsonOut({ ok: true, syncedAt: now, state: state, webPushResult: wpRes });
  } finally { lock.releaseLock(); }
}`

export function buildPartnerInviteUrl(appsScriptUrl: string, spreadsheetId?: string, passcode?: string): string {
  const base =
    typeof location !== 'undefined' && location.origin.includes('github.io')
      ? `${location.origin}${location.pathname}`
      : typeof location !== 'undefined'
        ? `${location.origin}${location.pathname}`
        : 'https://uhpnat.github.io/pig/'
  const params = new URLSearchParams()
  if (appsScriptUrl.trim()) params.set('gas', appsScriptUrl.trim())
  if (spreadsheetId?.trim()) params.set('sheet', extractSpreadsheetId(spreadsheetId))
  if (passcode?.trim()) params.set('pin', passcode.trim())
  return params.toString() ? `${base}?${params.toString()}` : base
}

export function GoogleSheetsCard() {
  const j = useJourney()
  const { repo, toast } = useStore()
  const cfg = repo.getSheetConfig()
  const [gasUrl, setGasUrl] = useState(cfg.appsScriptUrl)
  const [sheetInput, setSheetInput] = useState(cfg.spreadsheetId)
  const passcode = cfg.passcode
  const [showSetup, setShowSetup] = useState(cfg.needsAppsScript)
  const [showGuide, setShowGuide] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const sheetUrl = cfg.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}/edit`
    : 'https://sheets.new'

  const partnerInviteLink = buildPartnerInviteUrl(gasUrl || cfg.appsScriptUrl, sheetInput || cfg.spreadsheetId, passcode)

  const saveConfig = () => {
    repo.setSheetConfig({
      appsScriptUrl: gasUrl,
      spreadsheetId: sheetInput,
      passcode,
    })
    if (passcode.trim()) {
      try {
        sessionStorage.setItem('piggy-duo:unlocked:v1', passcode.trim())
        localStorage.setItem('piggy-duo:unlocked:v1', passcode.trim())
      } catch {
        /* ignore */
      }
    }
    toast('Đã lưu kết nối Google Sheets vào máy vĩnh viễn! 🔒')
  }

  const copyPartnerLink = async () => {
    repo.setSheetConfig({
      appsScriptUrl: gasUrl,
      spreadsheetId: sheetInput,
      passcode,
    })
    try {
      await navigator.clipboard.writeText(partnerInviteLink)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2500)
      toast('Đã sao chép link mời cho người thứ 2! Người ấy bấm vào 1 lần là tự lưu vào máy luôn 💌')
    } catch {
      toast('Không sao chép tự động được, hãy copy thủ công nhé', 'error')
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="h3 flex items-center gap-1.5">
          <FileSpreadsheet size={18} className="text-[#1c9a62]" /> Google Sheets & Link mời người thứ 2
        </h2>
        <Badge tone={cfg.needsAppsScript || cfg.lastError ? 'warn' : 'ok'}>
          {cfg.syncing
            ? 'Đang đồng bộ…'
            : cfg.needsAppsScript
              ? 'Chưa gắn link Sheet'
              : cfg.lastError
                ? 'Chờ kết nối'
                : 'Đã lưu kết nối'}
        </Badge>
      </div>

      {/* Partner 1-Click Invite Link Box */}
      {cfg.appsScriptUrl && (
        <div className="mt-2.5 rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/80 to-violet-50/80 p-3">
          <p className="text-xs font-black text-[#1e1b4b]">
            💌 Link dành cho Người thứ 2 (bấm vào 1 lần là tự lưu kết nối):
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-600">
            Gửi link này cho người ấy. Khi người ấy mở link lần đầu, kết nối Google Sheet sẽ tự lưu vĩnh viễn vào máy — những lần sau chỉ cần vào <b>uhpnat.github.io/pig</b> là vào thẳng!
          </p>
          <Button
            size="sm"
            variant="pink"
            className="mt-2"
            onClick={copyPartnerLink}
          >
            {copiedInvite ? <Check size={15} /> : <Share2 size={15} />}
            <span>{copiedInvite ? 'Đã sao chép link cho người ấy!' : 'Copy link gửi cho Người thứ 2'}</span>
          </Button>
        </div>
      )}

      <div className="mt-2.5 rounded-2xl bg-white/60 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="muted !text-xs">Trạng thái bảng tính riêng của 2 bạn:</span>
          {cfg.spreadsheetId && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-extrabold text-[#1c9a62] no-underline hover:underline"
            >
              Mở Google Sheet <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="mt-1 break-all font-mono text-[11px] font-bold text-ink">
          {cfg.appsScriptUrl ? '✅ Đã kết nối với Google Sheet của hai bạn' : '⏳ Chưa kết nối Google Sheet'}
        </p>
        {cfg.lastSyncedAt && (
          <p className="muted mt-1 !text-[11px]">
            ✅ Tự động đồng bộ 2 chiều · Lần cuối: {fmtDateTime(cfg.lastSyncedAt, j.timezone)}
          </p>
        )}
        {cfg.lastError && <p className="mt-1 text-[11px] font-bold text-[#a56a00]">⚠️ {cfg.lastError}</p>}
      </div>

      <button
        type="button"
        onClick={() => setShowSetup((x) => !x)}
        className="muted mt-3 block w-full cursor-pointer border-0 bg-transparent text-center !text-xs underline"
      >
        {showSetup ? 'Ẩn cài đặt kết nối Google Sheet ▲' : 'Đổi đường dẫn kết nối Google Sheet ▼'}
      </button>

      {showSetup && (
        <div className="mt-2 space-y-2 border-t border-dashed border-vio/25 pt-2">
          <Field
            label="1. Link ứng dụng web (Apps Script URL)"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            hint="Link kết nối tới Google Sheet của riêng 2 bạn."
          />
          <Field
            label="2. Link Google Sheet (tuỳ chọn, để bấm mở nhanh bảng tính)"
            value={sheetInput}
            onChange={(e) => setSheetInput(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          <div className="mt-3 grid gap-2">
            <Button size="sm" onClick={saveConfig}>
              Lưu kết nối vào máy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowGuide(true)}>
              📖 Xem hướng dẫn & lấy mã kết nối Google Sheet
            </Button>
          </div>
        </div>
      )}

      <Modal open={showGuide} onClose={() => setShowGuide(false)} title="Hướng dẫn kết nối Google Sheet">
        <div className="mt-2 space-y-3 text-xs leading-relaxed">
          <p className="font-bold text-slate-600">
            Làm theo 3 bước đơn giản dưới đây để gắn ứng dụng vào file Google Sheet của riêng hai bạn:
          </p>
          <ol className="list-decimal space-y-1.5 pl-4 font-semibold">
            <li>
              Mở file Google Sheet riêng của 2 bạn → trên menu chọn <b>Tiện ích mở rộng (Extensions)</b> → <b>Apps Script</b>.
            </li>
            <li>
              Bấm nút <b>Sao chép mã</b> bên dưới, dán đè vào khung soạn thảo rồi bấm <b>Lưu</b>:
            </li>
          </ol>
          <div className="relative rounded-2xl border border-[#ddd6fe] bg-[#f5f3ff] p-3 text-[11px] text-[#1e1b4b]">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(GAS_BACKEND_CODE)
                toast('Đã sao chép mã kết nối! 📋')
              }}
              className="chip float-right flex items-center gap-1 !bg-[#7c3aed] !px-2.5 !py-1 !text-[11px] !text-white"
            >
              <Copy size={12} /> Sao chép mã
            </button>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">{GAS_BACKEND_CODE}</pre>
          </div>
          <ol start={3} className="list-decimal space-y-1.5 pl-4 font-semibold">
            <li>
              Bấm <b>Triển khai (Deploy)</b> → <b>Tạo phiên bản triển khai mới</b>, chọn loại <b>Ứng dụng web</b>, mục <b>Ai có quyền truy cập</b> chọn <b>Bất kỳ ai (Anyone)</b>, rồi dán đường link nhận được vào ứng dụng!
            </li>
          </ol>
        </div>
      </Modal>
    </Card>
  )
}
