import {
  ChevronRight,
  Clock,
  Copy,
  Download,
  Heart,
  RefreshCw,
  Settings,
  Smartphone,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Interactive3DStage } from '@/components/pig/Interactive3DStage'
import { MoneyBagSticker, PartySticker, TargetSticker } from '@/components/Stickers'
import { Avatar, Button, Card, ConfirmDialog, Field, Modal, ProgressBar, Toggle } from '@/components/ui'
import { incomeShares, plannedShares } from '@/domain/engine'
import { durationLabel, fmtDate, fmtDateTime, pct, vnd } from '@/domain/format'
import { actualShares } from '@/domain/stats'
import { useChallenges, useJourney, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'
import { EditRulesDialog } from './EditRulesDialog'
import { GoogleSheetsCard } from './GoogleSheetsCard'
import { InstallGuide } from './InstallGuide'

const MODE = { proportional: 'Theo thu nhập', equal: 'Chia đều', custom: 'Tuỳ chỉnh' } as const

export default function CouplePage() {
  const j = useJourney()
  const { state, repo, run, confirmed, progress, toast } = useStore()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [install, setInstall] = useState(false)
  const [del, setDel] = useState(false)
  const [clearKeepCfgOpen, setClearKeepCfgOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [confirmErr, setConfirmErr] = useState('')
  const [planOpen, setPlanOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const done = useChallenges().filter((c) => c.status === 'completed')
  const s = state.settings
  const inc = incomeShares(j)
  const plan = plannedShares(j)
  const actual = actualShares(state.contributions)
  const changes = state.activity.filter((a) => a.type === 'settings').slice(0, 5)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Đã sao chép 📋')
    } catch {
      toast('Không sao chép được – hãy chép tay nhé', 'error')
    }
  }

  const exportData = async () => {
    const blob = new Blob([await repo.exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'piggy-duo-export.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const set = (p: Parameters<typeof repo.updateSettings>[0]) => run(repo.updateSettings(p))

  const menuRows = [
    {
      icon: <TargetSticker size={28} />,
      bg: 'bg-[#fff1f2]',
      label: 'Mục tiêu & Kế hoạch',
      sub: `${vnd(j.goal)} · ${durationLabel(j.months)}`,
      onClick: () => setPlanOpen(true),
    },
    {
      icon: <Clock size={20} className="text-[#16a34a]" />,
      bg: 'bg-[#dcfce7]',
      label: 'Lịch sử góp tiền',
      sub: `${state.contributions.filter((c) => c.status === 'confirmed').length} khoản đã xác nhận`,
      onClick: () => nav('/journal'),
    },
    {
      icon: <Settings size={20} className="text-[#4f46e5]" />,
      bg: 'bg-[#e0e7ff]',
      label: 'Cài đặt chung',
      sub: 'Âm thanh, giao diện, Google Sheets, cài app',
      onClick: () => setSettingsOpen(true),
    },
    {
      icon: <UserPlus size={20} className="text-[#ea580c]" />,
      bg: 'bg-[#ffedd5]',
      label: 'Giới thiệu bạn bè & Mã đôi mình',
      sub: 'Chia sẻ link kết nối & bảo mật 2 người',
      onClick: () => setInviteOpen(true),
    },
  ]

  return (
    <div
      className="relative min-h-[100dvh] pb-[calc(96px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'linear-gradient(180deg, #fde8f1 0%, #fff9fb 40%, #fdf2f7 100%)',
      }}
    >
      {/* Top Bar matching the mockup */}
      <div className="relative z-10 flex items-center justify-center px-4 pb-2 pt-3.5">
        <h1 className="text-[22px] font-black tracking-tight text-[#1e1b4b]">
          Của chúng mình <span className="text-[#ff4d79]">❤️</span>
        </h1>
        <button
          type="button"
          aria-label="Cài đặt chung"
          onClick={() => setSettingsOpen(true)}
          className="absolute right-4 top-3.5 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/80 text-[#1e1b4b] shadow-sm transition-transform active:scale-95"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Separated 3D Cutout Two Pigs on Interactive Romantic Cloud & Meadow Stage */}
      <div
        className="relative overflow-hidden pt-1"
        style={{ background: 'linear-gradient(180deg, #fde8f1 0%, #fbcfe8 55%, #dcfce7 100%)' }}
      >
        <Interactive3DStage
          spriteSrc={IMG.spriteDuo}
          alt="Hai chú heo đất 3D của đôi mình"
          theme="romantic"
          spriteHeight={215}
          reducedMotion={state.settings.animations === 'off'}
        />
      </div>

      {/* Overlapping Soft Pastel Bottom Sheet */}
      <div
        className="relative -mt-6 rounded-t-[36px] px-4 pb-6 pt-5 shadow-[0_-10px_30px_rgba(255,140,180,.18)]"
        style={{ background: 'linear-gradient(180deg, #fff9fb 0%, #fdf2f7 100%)' }}
      >
        {/* Subtitle slogan matching 08_shared_journey.png */}
        <p className="text-center text-[15px] font-black leading-snug text-[#172554]">
          Cùng nhau, chúng ta có thể
          <br />
          đạt được nhiều hơn! <span className="text-[#ff4d8d]">💕</span>
        </p>

        {/* Couple Avatars Pill */}
        <div className="mt-2.5 flex items-center justify-center gap-4">
          {(['a', 'b'] as const).map((k) => (
            <div key={k} className="flex items-center gap-2 rounded-full border border-white bg-white px-3.5 py-1.5 shadow-sm">
              <Avatar value={j.members[k].avatar} size={34} />
              <div className="text-left">
                <p className="text-xs font-black text-[#1e1b4b]">{j.members[k].name}</p>
                <p className="text-[11px] font-bold text-[#ff5c85]">{vnd(confirmed[k])}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight Card: Tổng tiền 2 người đã góp */}
        <div className="mt-3.5 flex items-center justify-between rounded-[26px] border-2 border-white bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(143,124,240,.14)]">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fff8e1] shadow-inner">
            <MoneyBagSticker size={44} />
          </div>
          <div className="min-w-0 flex-1 px-3">
            <p className="text-[13px] font-extrabold text-[#4b5563]">Tổng tiền 2 người đã góp</p>
            <p className="mt-0.5 truncate text-[25px] font-black leading-tight tracking-tight text-[#172554]">
              {vnd(confirmed.total)}
            </p>
            <p className="text-[11px] font-extrabold text-[#7c3aed]">
              Đạt {pct(progress)} mục tiêu ({vnd(j.goal)})
            </p>
          </div>
          <PartySticker size={40} className="shrink-0" />
        </div>

        {/* iOS-Style Grouped Menu Card */}
        <div className="mt-4 overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_12px_30px_rgba(143,124,240,.13)]">
          {menuRows.map((row, idx) => (
            <button
              key={row.label}
              type="button"
              onClick={row.onClick}
              className={`flex w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent px-4 py-3.5 text-left transition-colors hover:bg-[#fdf2f7]/60 active:bg-[#fce7f3] ${
                idx < menuRows.length - 1 ? 'border-b border-[#f3e8ff]' : ''
              }`}
              style={{ fontFamily: 'inherit' }}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${row.bg}`}>
                {row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black text-[#1e1b4b]">{row.label}</span>
                <span className="block truncate text-xs font-bold text-[#7d74a8]">{row.sub}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-[#9ca3af]" />
            </button>
          ))}
        </div>

        {/* Google Sheets Sync Status Card */}
        <div className="mt-4">
          <GoogleSheetsCard />
        </div>

        {/* Quick Data Reset Action Card (Keep Initial Config) */}
        <div className="mt-3.5 rounded-[26px] border-2 border-white bg-white/95 p-4 shadow-[0_10px_24px_rgba(143,124,240,.12)]">
          <p className="text-[14px] font-black text-[#172554]">🧹 Làm mới dữ liệu tiết kiệm</p>
          <p className="mt-0.5 text-xs font-bold text-[#64748b]">
            Xoá lịch sử mở số, các khoản đã góp & nhật ký để bắt đầu lại từ 0đ nhưng vẫn giữ nguyên cấu hình hành trình, thu nhập & heo đất ban đầu.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-3 !text-[#e11d48] !shadow-[inset_0_0_0_2px_#fecdd3]"
            onClick={() => {
              setConfirmText('')
              setConfirmErr('')
              setClearKeepCfgOpen(true)
            }}
          >
            🔄 Xoá dữ liệu tiết kiệm (Giữ lại cấu hình)
          </Button>
        </div>
      </div>

      {/* Modal 1: Mục tiêu & Kế hoạch */}
      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title="Mục tiêu & Kế hoạch 🎯">
        <div className="mt-3 space-y-3">
          <Card className="!mt-0">
            <div className="grid grid-cols-2 gap-3">
              {(['a', 'b'] as const).map((k) => (
                <div key={k} className="text-center">
                  <Avatar value={j.members[k].avatar} size={52} className="mx-auto" />
                  <p className="h3 mt-1">{j.members[k].name}</p>
                  <p className="muted !text-[11px]">Thu nhập: {vnd(j.members[k].income)}/tháng</p>
                  <p className="mt-1 text-sm font-black text-pink">{vnd(confirmed[k])}</p>
                  <ProgressBar value={actual[k] * 100} className="!mt-1.5 !h-2" />
                  <p className="muted mt-1 !text-[11px]">
                    Thu nhập {pct(inc[k] * 100)} · Kế hoạch {pct(plan[k] * 100)} · Thực góp {pct(actual[k] * 100)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="!mt-0">
            {[
              ['Tên hành trình', j.name],
              ['Mục tiêu chung', vnd(j.goal)],
              ['Đã tiết kiệm', `${vnd(confirmed.total)} (${pct(progress)})`],
              ['Thời gian', `${durationLabel(j.months)} (${fmtDate(j.startDate)} → ${fmtDate(j.endDate)})`],
              ['Cách chia mức góp', MODE[j.fairness]],
              ['Xác nhận khoản góp', j.requireConfirmation ? 'Bắt buộc xác nhận' : 'Tự động'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1 text-sm">
                <span className="muted">{k}</span>
                <b className="text-right">{v}</b>
              </div>
            ))}
          </Card>

          { (state.milestonesReached.length > 0 || done.length > 0) && (
            <Card className="!mt-0">
              <h3 className="h3">🏆 Thành tựu đã đạt</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.milestonesReached.map((m) => (
                  <span key={m} className="pill">🎯 {m}%</span>
                ))}
                {done.map(({ def }) => (
                  <span key={def.id} className="pill">{def.reward.icon} {def.title}</span>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button size="sm" onClick={() => { setPlanOpen(false); setEdit(true) }}>
              ✏️ Sửa mục tiêu & thu nhập
            </Button>
            <Button size="sm" variant="violet" onClick={() => { setPlanOpen(false); nav('/pig') }}>
              🐷 Đổi kiểu heo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Cài đặt chung */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Cài đặt chung ⚙️">
        <div className="mt-3 space-y-2">
          <Toggle
            checked={j.revealEnabled}
            onChange={(v) => run(repo.updateJourney({ revealEnabled: v }))}
            label="Mở số tiền hằng ngày"
            hint="Tắt nếu muốn tạm dừng nghi thức."
          />
          <Toggle checked={s.sound} onChange={(v) => set({ sound: v })} label="Âm thanh hiệu ứng" />
          <Toggle checked={s.haptics} onChange={(v) => set({ haptics: v })} label="Rung phản hồi" />
          <Toggle
            checked={s.animations === 'auto'}
            onChange={(v) => set({ animations: v ? 'auto' : 'off' })}
            label="Hiệu ứng chuyển động"
          />

          <div className="mt-4 grid gap-2.5 pt-2">
            <Button variant="ghost" size="sm" onClick={() => { setSettingsOpen(false); nav('/notifications') }}>
              🔔 Tuỳ chọn thông báo đẩy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSettingsOpen(false); setInstall(true) }}>
              <Smartphone size={16} className="mr-1 inline" /> Hướng dẫn cài app ra màn hình chính
            </Button>
            <Button variant="ghost" size="sm" onClick={exportData}>
              <Download size={16} className="mr-1 inline" /> Xuất dữ liệu dự phòng (.json)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSettingsOpen(false)
                setConfirmText('')
                setConfirmErr('')
                setClearKeepCfgOpen(true)
              }}
              className="!text-[#e11d48] !shadow-[inset_0_0_0_2px_#fecdd3]"
            >
              🔄 Xoá dữ liệu tiết kiệm (Giữ cấu hình ban đầu)
            </Button>
            <Button
              size="sm"
              onClick={() => { setSettingsOpen(false); setDel(true) }}
              className="!bg-none !bg-[#e5484d] !shadow-none"
            >
              🗑️ Xoá hoàn toàn hành trình (Tạo lại từ đầu)
            </Button>
          </div>

          {changes.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white/60 p-3">
              <p className="h3">📝 Lịch sử thay đổi quy tắc</p>
              {changes.map((c) => (
                <p key={c.id} className="muted mt-1 !text-xs">
                  {fmtDateTime(c.at, j.timezone)} – {c.description}
                </p>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 3: Giới thiệu bạn bè & Mã đôi mình */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Kết nối đôi mình 💌">
        <div className="mt-3 space-y-3 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pink/15 text-pink">
            <Heart size={28} />
          </div>
          <p className="muted text-xs leading-relaxed">
            Gửi đường link hoặc mã mời dưới đây cho người ấy để cả hai cùng mở heo đất và đồng bộ trực tiếp trên Google Sheet.
          </p>
          {state.invite && (
            <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3.5 shadow-sm">
              <div className="text-left">
                <p className="muted !text-xs">Mã đôi mình</p>
                <p className="text-2xl font-black tracking-[.2em] text-[#1e1b4b]">{state.invite.code}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Sao chép mã"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white shadow"
                  onClick={() => copy(state.invite!.code)}
                >
                  <Copy size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Tạo mã mới"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white shadow"
                  onClick={() => run(repo.regenerateInvite())}
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => {
              copy(`${location.origin}${location.pathname}`)
            }}
          >
            📋 Sao chép link ứng dụng ({location.origin}{location.pathname})
          </Button>
        </div>
      </Modal>

      <EditRulesDialog open={edit} onClose={() => setEdit(false)} />
      <InstallGuide open={install} onClose={() => setInstall(false)} />

      {/* Modal xác nhận gõ "xác nhận xoá" để xoá dữ liệu tiết kiệm nhưng giữ nguyên cấu hình ban đầu */}
      <Modal
        open={clearKeepCfgOpen}
        onClose={() => setClearKeepCfgOpen(false)}
        title="Xoá toàn bộ dữ liệu tiết kiệm?"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const normalized = confirmText.trim().toLowerCase()
            if (normalized !== 'xác nhận xoá' && normalized !== 'xac nhan xoa') {
              setConfirmErr('Vui lòng gõ đúng chữ "xác nhận xoá"')
              return
            }
            const out = await run(repo.clearDataKeepConfig())
            if (out) {
              setClearKeepCfgOpen(false)
              setConfirmText('')
              toast('Đã xoá dữ liệu tiết kiệm & giữ nguyên cấu hình ban đầu! 🌱')
            }
          }}
          className="mt-3 space-y-3 text-sm"
        >
          <div className="rounded-2xl bg-[#fff1f2] p-3.5 text-xs font-bold leading-relaxed text-[#be123c]">
            ⚠️ Hành động này sẽ xoá toàn bộ <b>lịch sử mở số tiền, các khoản đã góp, nhật ký và tiến độ thử thách</b> trên cả ứng dụng và Google Sheet để đưa số dư heo đất về <b>0đ</b>.
            <br />
            <br />
            ✅ <b>Được giữ nguyên:</b> Tên hành trình ({j.name}), mục tiêu ({vnd(j.goal)}), thời hạn, thông tin & thu nhập của {j.members.a.name} & {j.members.b.name}, cùng cấu hình bé heo 3D.
          </div>

          <Field
            label='Nhập chữ "xác nhận xoá" để tiếp tục'
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value)
              setConfirmErr('')
            }}
            placeholder="xác nhận xoá"
            error={confirmErr}
            autoComplete="off"
          />

          <div className="mt-4 grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearKeepCfgOpen(false)}
            >
              Huỷ bỏ
            </Button>
            <button
              type="submit"
              onPointerDown={(e) => e.stopPropagation()}
              className="btn btn-sm !bg-none !bg-[#e11d48] !shadow-[0_4px_0_#9f1239,0_8px_16px_rgba(225,29,72,.28)]"
            >
              Xác nhận xoá
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={del}
        danger
        title="Xoá toàn bộ hành trình?"
        message="Mọi khoản góp, nhật ký và thử thách sẽ bị xoá và không thể hoàn tác. Hãy xuất dữ liệu trước nếu cần lưu lại."
        confirmLabel="Xoá hành trình"
        onClose={() => setDel(false)}
        onConfirm={async () => {
          if (await run(repo.reset())) nav('/welcome')
        }}
      />
    </div>
  )
}
