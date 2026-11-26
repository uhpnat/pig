import { CloudDownload, CloudUpload, ExternalLink, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Field } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import { useJourney, useStore } from '@/hooks/useStore'

export function GoogleSheetsCard() {
  const j = useJourney()
  const { repo, run, toast } = useStore()
  const cfg = repo.getSheetConfig()
  const [sheetId, setSheetId] = useState(cfg.spreadsheetId)
  const [gasUrl, setGasUrl] = useState(cfg.appsScriptUrl)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${cfg.spreadsheetId}/edit`

  const saveConfig = () => {
    repo.setSheetConfig({ spreadsheetId: sheetId, appsScriptUrl: gasUrl })
    toast('Đã lưu cấu hình Google Sheets 📊')
  }

  const pushNow = async () => {
    const out = await run(repo.syncWithSheet('push'))
    if (out) {
      const nextCfg = repo.getSheetConfig()
      if (nextCfg.lastError) toast(`Lỗi đồng bộ: ${nextCfg.lastError}`, 'error')
      else toast('Đã đẩy dữ liệu lên Google Sheets thành công! ☁️')
    }
  }

  const pullNow = async () => {
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
          <FileSpreadsheet size={18} className="text-[#1c9a62]" /> Cơ sở dữ liệu Google Sheets
        </h2>
        <Badge tone={cfg.lastError ? 'warn' : 'ok'}>
          {cfg.syncing ? 'Đang đồng bộ…' : cfg.lastError ? 'Chờ kết nối' : 'Tự động lưu'}
        </Badge>
      </div>
      <p className="muted mt-1.5 !text-xs leading-relaxed">
        Mọi thao tác mở số, xác nhận góp tiền và nhật ký đều tự động ghi trực tiếp vào bảng tính Google Sheets của hai bạn (gồm 7 tab: <b>Journey, DailyReveals, Contributions, ActivityLog, Challenges, Notifications, AppState</b>).
      </p>

      <div className="mt-2.5 rounded-2xl bg-white/60 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="muted !text-xs">Spreadsheet ID:</span>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-extrabold text-[#1c9a62] no-underline hover:underline"
          >
            Mở bảng tính <ExternalLink size={13} />
          </a>
        </div>
        <p className="mt-1 break-all font-mono text-[11px] font-bold text-ink">{cfg.spreadsheetId}</p>
        {cfg.lastSyncedAt && (
          <p className="muted mt-1 !text-[11px]">
            ✅ Đồng bộ lần cuối: {fmtDateTime(cfg.lastSyncedAt, j.timezone)}
          </p>
        )}
        {cfg.lastError && (
          <p className="mt-1 text-[11px] font-bold text-[#a56a00]">
            ⚠️ {cfg.lastError}
          </p>
        )}
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
        onClick={() => setShowAdvanced((x) => !x)}
        className="muted mt-3 block w-full border-0 bg-transparent text-center !text-xs underline cursor-pointer"
      >
        {showAdvanced ? 'Ẩn cài đặt kết nối nâng cao ▲' : 'Đổi Spreadsheet ID / Apps Script Web App URL ▼'}
      </button>

      {showAdvanced && (
        <div className="mt-2 border-t border-dashed border-vio/25 pt-2">
          <Field
            label="Google Spreadsheet ID"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s"
          />
          <Field
            label="Apps Script Web App URL (tuỳ chọn khi deploy tĩnh)"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            hint="Để trống khi chạy trên máy này (tự động dùng cầu nối Google Sheets CLI)."
          />
          <div className="mt-3">
            <Button size="sm" onClick={saveConfig}>Lưu cấu hình Sheet</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
