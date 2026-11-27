import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Lock,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button, Card, Field } from '@/components/ui'
import { buildPartnerInviteUrl, GAS_BACKEND_CODE } from '@/features/couple/GoogleSheetsCard'
import { useStore } from '@/hooks/useStore'
import { extractSpreadsheetId } from '@/services/localRepository'

const UNLOCK_KEY = 'piggy-duo:unlocked:v1'

export function PasscodeGate({ children }: { children: ReactNode }) {
  const { repo, run, toast } = useStore()
  const cfg = repo.getSheetConfig()
  const requiredPin = cfg.passcode

  // Setup state for First-Time Google Sheet Connection Gate
  const [sheetUrlInput, setSheetUrlInput] = useState(cfg.spreadsheetId || '')
  const [gasUrlInput, setGasUrlInput] = useState(cfg.appsScriptUrl || '')
  const [pinInput, setPinInput] = useState(cfg.passcode || '')
  const [setupErr, setSetupErr] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedPartnerLink, setCopiedPartnerLink] = useState(false)
  const [justConnected, setJustConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Passcode unlock state (when a passcode is configured)
  const [unlocked, setUnlocked] = useState(() => {
    if (!requiredPin) return true
    try {
      return sessionStorage.getItem(UNLOCK_KEY) === requiredPin || localStorage.getItem(UNLOCK_KEY) === requiredPin
    } catch {
      return false
    }
  })
  const [input, setInput] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')

  const copyAppsScriptCode = async () => {
    try {
      await navigator.clipboard.writeText(GAS_BACKEND_CODE)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
      toast('Đã sao chép mã Apps Script! Hãy dán vào Google Sheet của bạn 📋')
    } catch {
      toast('Không sao chép tự động được, hãy bôi đen mã bên dưới để copy nhé', 'error')
    }
  }

  /**
   * Person 1 connects their Google Sheet / Apps Script URL for the first time.
   * Also supports pasting the full Partner Invite Link directly into the Apps Script URL box!
   */
  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupErr('')

    let rawGas = gasUrlInput.trim()
    let rawSheet = sheetUrlInput.trim()
    let rawPin = pinInput.trim()

    // Also allow Person 2 to paste the full Partner Invite Link (https://uhpnat.github.io/pig/?gas=...) directly into the box!
    if (rawGas.includes('?gas=') || rawGas.includes('&gas=')) {
      try {
        const u = new URL(rawGas)
        rawGas = (u.searchParams.get('gas') || rawGas).trim()
        rawSheet = (u.searchParams.get('sheet') || rawSheet).trim()
        rawPin = (u.searchParams.get('pin') || u.searchParams.get('key') || rawPin).trim()
        setGasUrlInput(rawGas)
        if (rawSheet) setSheetUrlInput(rawSheet)
        if (rawPin) setPinInput(rawPin)
      } catch {
        /* ignore */
      }
    }

    if (cfg.isStaticHost && (!rawGas || !rawGas.startsWith('https://script.google.com/'))) {
      setSetupErr('Vui lòng dán đúng link Apps Script Web App URL (bắt đầu bằng https://script.google.com/macros/s/.../exec)')
      return
    }
    if (!cfg.isStaticHost && !rawGas && !rawSheet) {
      setSetupErr('Vui lòng nhập link Google Sheet hoặc Apps Script Web App URL')
      return
    }

    setConnecting(true)
    try {
      repo.setSheetConfig({
        appsScriptUrl: rawGas,
        spreadsheetId: extractSpreadsheetId(rawSheet),
        passcode: rawPin,
      })
      if (rawPin) {
        try {
          sessionStorage.setItem(UNLOCK_KEY, rawPin)
          localStorage.setItem(UNLOCK_KEY, rawPin)
        } catch {}
        setUnlocked(true)
      }

      // Test connection & pull existing journey from the Sheet if already created
      await run(repo.syncWithSheet('pull'))
      const updatedCfg = repo.getSheetConfig()
      if (updatedCfg.lastError) {
        setSetupErr(updatedCfg.lastError)
        return
      }
      setJustConnected(true)
      toast('Đã kết nối và lưu Google Sheet vĩnh viễn vào máy! 🎉')
    } finally {
      setConnecting(false)
    }
  }

  // 1. FIRST-TIME GOOGLE SHEET ONBOARDING GATE (Shown when no Sheet/Apps Script is saved yet, or right after Person 1 connects so they can copy Person 2's link!)
  if (cfg.needsAppsScript || justConnected) {
    const partnerUrl = buildPartnerInviteUrl(
      gasUrlInput || cfg.appsScriptUrl,
      sheetUrlInput || cfg.spreadsheetId,
      pinInput || cfg.passcode,
    )

    return (
      <div
        className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col justify-center px-4 py-8"
        style={{
          background: 'linear-gradient(180deg, #fce7f3 0%, #f5efff 50%, #e0f2fe 100%)',
        }}
      >
        <Card className="!mt-0 border-2 border-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-pink-700">
                Cài đặt 1 lần duy nhất
              </span>
              <h1 className="mt-0.5 text-lg font-black leading-tight text-[#1e1b4b]">
                Kết nối Google Sheet riêng của 2 bạn 🐷
              </h1>
            </div>
          </div>

          {justConnected ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-1.5 text-sm font-black text-emerald-800">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                  <span>Đã kết nối & lưu vào máy bạn thành công!</span>
                </div>
                <p className="mt-1 leading-relaxed text-emerald-800">
                  Từ lần sau bạn chỉ cần vào thẳng <b>uhpnat.github.io/pig</b> (hoặc mở icon 🐷 ngoài màn hình chính) là vào thẳng app, không bao giờ phải nhập lại link nữa!
                </p>
              </div>

              <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-violet-50 p-3.5">
                <p className="text-xs font-black text-[#1e1b4b]">
                  💌 Gửi link này cho Người thứ 2 (Người ấy):
                </p>
                <p className="mt-1 text-[11.5px] font-bold leading-relaxed text-slate-600">
                  Người thứ 2 chỉ cần <b>bấm vào link dưới đây đúng 1 lần</b> là máy người ấy sẽ tự động kết nối và lưu vĩnh viễn Google Sheet này luôn!
                </p>
                <div className="mt-2 rounded-xl border border-pink-200 bg-white p-2 font-mono text-[10.5px] font-bold break-all text-slate-700">
                  {partnerUrl}
                </div>
                <Button
                  size="sm"
                  variant="pink"
                  className="mt-2.5"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(partnerUrl)
                      setCopiedPartnerLink(true)
                      setTimeout(() => setCopiedPartnerLink(false), 2500)
                      toast('Đã sao chép link mời cho Người thứ 2! 💌')
                    } catch {
                      toast('Hãy sao chép đường link trong khung trắng ở trên nhé', 'error')
                    }
                  }}
                >
                  {copiedPartnerLink ? <Check size={15} /> : <Share2 size={15} />}
                  <span>
                    {copiedPartnerLink ? 'Đã chép link cho Người thứ 2!' : 'Copy link gửi cho Người thứ 2'}
                  </span>
                </Button>
              </div>

              <Button
                variant="violet"
                className="w-full !py-3.5 !text-base"
                onClick={() => setJustConnected(false)}
              >
                <Sparkles size={18} />
                <span>Vào App Nuôi Heo Đất ngay →</span>
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-2.5 text-xs font-bold leading-relaxed text-slate-600">
                Mỗi cặp đôi dùng <b>1 file Google Sheet riêng tư</b> để người lạ mở link <code>uhpnat.github.io/pig</code> không thể xem hay đụng vào heo đất của 2 bạn. Sau khi kết nối 1 lần, link sẽ tự lưu vĩnh viễn trên máy!
              </p>

              {/* 3-Step Visual Setup Guide */}
              <div className="mt-3 space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs font-bold text-slate-700">
                <p className="font-black text-[#1e1b4b]">📋 Hướng dẫn 3 bước cho Người thứ 1 (chỉ 1 phút):</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-[11.5px] leading-relaxed">
                  <li>
                    Tạo 1 bảng tính mới tại{' '}
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer"
                      className="font-black text-emerald-700 underline"
                    >
                      sheets.new <ExternalLink size={11} className="inline" />
                    </a>{' '}
                    (hoặc mở Google Sheet riêng của bạn) → trên menu chọn <b>Tiện ích mở rộng (Extensions)</b> → <b>Apps Script</b>.
                  </li>
                  <li>
                    Xoá mã mặc định trong <code>Code.gs</code>, bấm nút <b>Sao chép mã Apps Script</b> bên dưới dán vào rồi bấm <b>Lưu (Ctrl+S)</b>:
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={copyAppsScriptCode}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-black text-indigo-700 shadow-sm active:scale-95"
                      >
                        {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>
                          {copiedCode
                            ? 'Đã chép mã Apps Script (Tách 8 bảng + Chống mất tin nhắn)!'
                            : 'Sao chép mã Apps Script (Tách 8 bảng)'}
                        </span>
                      </button>
                    </div>
                  </li>
                  <li>
                    Ở góc phải trên của Apps Script, bấm <b>Triển khai (Deploy)</b> → <b>Tạo phiên bản triển khai mới</b>:
                    <br />• Chọn loại: <b>Ứng dụng web (Web app)</b>
                    <br />• Thực thi dưới dạng: <b>Tôi (Me)</b>
                    <br />• Ai có quyền truy cập: <b>Bất kỳ ai (Anyone)</b>
                    <br />→ Bấm <b>Triển khai</b>, copy đường link <code>https://script.google.com/macros/s/.../exec</code> dán vào ô dưới đây:
                  </li>
                </ol>
              </div>

              <form onSubmit={handleConnectSheet} className="mt-3 space-y-2.5 text-left">
                <Field
                  label="1. Dán Apps Script Web App URL (hoặc Link mời từ người thứ 1)"
                  value={gasUrlInput}
                  onChange={(e) => {
                    setGasUrlInput(e.target.value)
                    setSetupErr('')
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  error={setupErr}
                  autoFocus
                />
                <Field
                  label="2. Link Google Sheet của 2 bạn (tuỳ chọn, để mở nhanh Sheet)"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <Field
                  label="3. Mã khoá bí mật đôi mình (tuỳ chọn)"
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Để trống hoặc đặt mã PIN riêng (VD: 150102)"
                />

                <Button type="submit" variant="pink" loading={connecting} className="mt-3 w-full !py-3.5 !text-sm">
                  {connecting ? 'Đang kiểm tra kết nối Google Sheet…' : '🔗 Kết nối & Lưu vĩnh viễn vào máy này'}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    )
  }

  // 2. PASSCODE GATE (Only shown if the couple set an optional secret PIN and this device hasn't unlocked it yet)
  if (!requiredPin || unlocked) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === requiredPin) {
      try {
        sessionStorage.setItem(UNLOCK_KEY, requiredPin)
        if (remember) localStorage.setItem(UNLOCK_KEY, requiredPin)
      } catch {
        /* ignore */
      }
      setUnlocked(true)
      toast('Chào mừng hai bạn quay lại! 💗')
    } else {
      setErr('Mã khoá chưa đúng, chỉ hai đứa mình biết thôi nhé!')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center px-4 py-10">
      <Card className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-pink/15 text-pink">
          <Lock size={30} />
        </div>
        <h1 className="h1 mt-3">Góc riêng của đôi mình 💗</h1>
        <p className="muted mt-1">
          Ứng dụng này được bảo vệ bằng mã khoá riêng. Chỉ hai người có mã mới vào xem và mở heo đất được.
        </p>
        <form onSubmit={submit} className="mt-4 text-left">
          <Field
            label="Nhập mã khoá bí mật"
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setErr('')
            }}
            placeholder="••••••"
            error={err}
            autoFocus
          />
          <label className="mt-3 flex items-center gap-2 text-xs font-extrabold">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[#8f7cf0]"
            />
            Ghi nhớ trên điện thoại của mình
          </label>
          <Button type="submit" className="mt-4">
            Mở khoá heo đất 🐷
          </Button>
        </form>
      </Card>
    </div>
  )
}
