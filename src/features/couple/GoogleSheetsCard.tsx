import { CloudDownload, CloudUpload, Copy, ExternalLink, FileSpreadsheet, KeyRound, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Field, Modal } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import { useJourney, useStore } from '@/hooks/useStore'

const GAS_CODE = `// Dán vào Tiện ích mở rộng -> Apps Script trên Google Sheet của bạn
var SECRET_PASSCODE = ''; // Tuỳ chọn: điền mã khoá nếu muốn kiểm tra cả trên Sheet

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function checkPass(p) { return !SECRET_PASSCODE || String(p || '').trim() === SECRET_PASSCODE; }

function doGet(e) {
  if (!checkPass(e && e.parameter ? e.parameter.key : '')) return jsonOut({ ok: false, error: 'Sai mã khoá' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
  var val = sheet.getRange('C2').getValue();
  var updated = sheet.getRange('B2').getValue();
  return jsonOut(val ? { ok: true, updatedAt: updated, state: JSON.parse(val) } : { ok: true, empty: true });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkPass(payload.passcode)) return jsonOut({ ok: false, error: 'Sai mã khoá' });
    var state = payload.state;
    if (!state) return jsonOut({ ok: false, error: 'Missing state' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date().toISOString();
    var appSheet = ss.getSheetByName('AppState') || ss.insertSheet('AppState');
    appSheet.clearContents();
    appSheet.getRange(1, 1, 2, 3).setValues([['key', 'updated_at', 'json_state'], ['piggy_duo_state_v1', now, JSON.stringify(state)]]);
    return jsonOut({ ok: true, syncedAt: now });
  } finally { lock.releaseLock(); }
}`

export function GoogleSheetsCard() {
  const j = useJourney()
  const { repo, run, toast } = useStore()
  const cfg = repo.getSheetConfig()
  const [sheetId, setSheetId] = useState(cfg.spreadsheetId)
  const [gasUrl, setGasUrl] = useState(cfg.appsScriptUrl)
  const [passcode, setPasscode] = useState(cfg.passcode)
  const [showSetup, setShowSetup] = useState(cfg.needsAppsScript)
  const [showGuide, setShowGuide] = useState(false)

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}/edit`

  const saveConfig = () => {
    repo.setSheetConfig({ spreadsheetId: sheetId, appsScriptUrl: gasUrl, passcode })
    if (passcode.trim()) {
      try {
        sessionStorage.setItem('piggy-duo:unlocked:v1', passcode.trim())
        localStorage.setItem('piggy-duo:unlocked:v1', passcode.trim())
      } catch {
        /* ignore */
      }
    }
    toast('Đã lưu cấu hình Google Sheets & Mã khoá đôi mình! 🔒')
  }

  const copyPartnerLink = async () => {
    const base = `${location.origin}${location.pathname}`
    const params = new URLSearchParams()
    if (gasUrl.trim()) params.set('gas', gasUrl.trim())
    if (passcode.trim()) params.set('pin', passcode.trim())
    const full = params.toString() ? `${base}?${params.toString()}` : base
    try {
      await navigator.clipboard.writeText(full)
      toast('Đã sao chép link bí mật cho người ấy! 💌')
    } catch {
      toast('Không sao chép tự động được, hãy copy thủ công nhé', 'error')
    }
  }

  const pushNow = async () => {
    if (cfg.needsAppsScript && !gasUrl.trim()) {
      setShowSetup(true)
      setShowGuide(true)
      toast('Hãy dán Apps Script Web App URL để kết nối từ GitHub Pages nhé!', 'error')
      return
    }
    if (gasUrl.trim() !== cfg.appsScriptUrl || passcode.trim() !== cfg.passcode) {
      repo.setSheetConfig({ spreadsheetId: sheetId, appsScriptUrl: gasUrl, passcode })
    }
    const out = await run(repo.syncWithSheet('push'))
    if (out) {
      const nextCfg = repo.getSheetConfig()
      if (nextCfg.lastError) toast(`Lỗi đồng bộ: ${nextCfg.lastError}`, 'error')
      else toast('Đã đẩy dữ liệu lên Google Sheets thành công! ☁️')
    }
  }

  const pullNow = async () => {
    if (cfg.needsAppsScript && !gasUrl.trim()) {
      setShowSetup(true)
      setShowGuide(true)
      toast('Hãy dán Apps Script Web App URL để tải dữ liệu trên GitHub Pages nhé!', 'error')
      return
    }
    if (gasUrl.trim() !== cfg.appsScriptUrl || passcode.trim() !== cfg.passcode) {
      repo.setSheetConfig({ spreadsheetId: sheetId, appsScriptUrl: gasUrl, passcode })
    }
    const out = await run(repo.syncWithSheet('pull'))
    if (out) {
      const nextCfg = repo.getSheetConfig()
      if (nextCfg.lastError) toast(`Lỗi tải dữ liệu: ${nextCfg.lastError}`, 'error')
      else toast('Đã tải dữ liệu mới nhất từ Google Sheets! 📥')
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="h3 flex items-center gap-1.5">
          <FileSpreadsheet size={18} className="text-[#1c9a62]" /> Google Sheets & Khoá đôi mình
        </h2>
        <Badge tone={cfg.needsAppsScript || cfg.lastError ? 'warn' : 'ok'}>
          {cfg.syncing
            ? 'Đang đồng bộ…'
            : cfg.needsAppsScript
              ? 'Cần gắn link Apps Script'
              : cfg.lastError
                ? 'Chờ kết nối'
                : 'Đã kết nối'}
        </Badge>
      </div>

      {cfg.needsAppsScript && (
        <div className="mt-2.5 rounded-2xl bg-[#fff0c9] p-3 text-xs font-bold text-[#8a6200]">
          💡 <b>Vì sao trên GitHub Pages báo lỗi 405?</b> GitHub Pages là máy chủ tĩnh nên chặn lệnh `POST /api/gsheets` (HTTP 405). Để 2 điện thoại ghi thẳng vào Google Sheet của bạn mà không lộ cho người lạ, bạn hãy bấm <b>“Lấy link Apps Script (30 giây)”</b> bên dưới rồi dán vào ô <b>Apps Script Web App URL</b> nhé!
          <div className="mt-2">
            <Button size="sm" variant="violet" onClick={() => setShowGuide(true)}>
              📖 Xem mã & cách lấy link Apps Script (30 giây)
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2.5 rounded-2xl bg-white/60 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="muted !text-xs">File Google Sheet (riêng tư):</span>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-extrabold text-[#1c9a62] no-underline hover:underline"
          >
            Mở bảng tính <ExternalLink size={13} />
          </a>
        </div>
        {cfg.lastSyncedAt && (
          <p className="muted mt-1 !text-[11px]">
            ✅ Đồng bộ lần cuối: {fmtDateTime(cfg.lastSyncedAt, j.timezone)}
          </p>
        )}
        {cfg.lastError && <p className="mt-1 text-[11px] font-bold text-[#a56a00]">⚠️ {cfg.lastError}</p>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Button size="sm" variant="violet" disabled={cfg.syncing} onClick={pushNow}>
          <CloudUpload size={15} className="mr-1 inline" /> Đẩy lên Sheet
        </Button>
        <Button size="sm" variant="ghost" disabled={cfg.syncing} onClick={pullNow}>
          <CloudDownload size={15} className="mr-1 inline" /> Tải từ Sheet
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowSetup((x) => !x)}
        className="muted mt-3 block w-full cursor-pointer border-0 bg-transparent text-center !text-xs underline"
      >
        {showSetup ? 'Ẩn cấu hình URL & Mã khoá đôi mình ▲' : 'Cấu hình Apps Script URL & Mã khoá 2 người ▼'}
      </button>

      {showSetup && (
        <div className="mt-2 border-t border-dashed border-vio/25 pt-2">
          <Field
            label="1. Apps Script Web App URL (bắt buộc khi dùng trên GitHub Pages)"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            hint="Link này kết nối thẳng tới Google Sheet của riêng bạn, không bị lỗi 405."
          />
          <Field
            label="2. Mã khoá bí mật (chỉ 2 đứa mình biết để vào app)"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Ví dụ: 150102 hoặc kỷ niệm của 2 đứa"
            hint="Khi đặt mã này, ai mở link https://uhpnat.github.io/pig/ cũng phải nhập đúng mã mới vào được."
          />
          <Field
            label="3. Google Spreadsheet ID"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s"
          />
          <div className="mt-3 grid gap-2">
            <Button size="sm" onClick={saveConfig}>
              <KeyRound size={15} className="mr-1 inline" /> Lưu cấu hình & Mã khoá
            </Button>
            <Button size="sm" variant="ghost" onClick={copyPartnerLink}>
              <Share2 size={15} className="mr-1 inline" /> Copy link gửi cho người ấy (kèm sẵn kết nối)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowGuide(true)}>
              📖 Hướng dẫn tạo Apps Script Web App URL
            </Button>
          </div>
        </div>
      )}

      <Modal open={showGuide} onClose={() => setShowGuide(false)} title="Kết nối Google Sheet cho 2 người">
        <div className="mt-2 space-y-3 text-xs leading-relaxed">
          <p className="font-bold">
            Để sửa lỗi <b>405</b> trên GitHub Pages và bảo mật tuyệt đối cho 2 người, bạn làm 4 bước sau (chỉ 30 giây):
          </p>
          <ol className="list-decimal space-y-1.5 pl-4 font-semibold">
            <li>
              Mở{' '}
              <a href={sheetUrl} target="_blank" rel="noreferrer" className="font-black text-[#1c9a62] underline">
                File Google Sheet của bạn
              </a>{' '}
              trên máy tính. (File này là <b>Riêng tư</b> trên Google Drive của bạn, người lạ không xem được).
            </li>
            <li>
              Trên menu Google Sheet, bấm <b>Tiện ích mở rộng (Extensions)</b> → <b>Apps Script</b>.
            </li>
            <li>
              Xoá đoạn mã mặc định và dán đoạn mã dưới đây vào, rồi bấm nút <b>Sao chép mã</b> bên dưới:
            </li>
          </ol>
          <div className="relative rounded-2xl bg-[#2a2150] p-3 text-[11px] text-white">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(GAS_CODE)
                toast('Đã sao chép mã Apps Script! 📋')
              }}
              className="chip !bg-white/20 !px-2.5 !py-1 !text-[11px] !text-white float-right flex items-center gap-1"
            >
              <Copy size={12} /> Sao chép mã
            </button>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">{GAS_CODE}</pre>
          </div>
          <ol start={4} className="list-decimal space-y-1.5 pl-4 font-semibold">
            <li>
              Ở góc phải trên của Apps Script, bấm <b>Triển khai (Deploy)</b> → <b>Tạo phiên bản triển khai mới (New deployment)</b>:
              <br />• Chọn loại (biểu tượng bánh răng): <b>Ứng dụng web (Web app)</b>
              <br />• Thực thi dưới dạng: <b>Tôi (Me)</b>
              <br />• Ai có quyền truy cập: <b>Bất kỳ ai (Anyone)</b>
              <br />→ Bấm <b>Triển khai</b>, copy đường link <code>https://script.google.com/macros/s/.../exec</code> và dán vào ô <b>Apps Script Web App URL</b> trong app là xong!
            </li>
          </ol>
        </div>
      </Modal>
    </Card>
  )
}
