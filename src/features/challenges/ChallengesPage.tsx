import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CoinStackSticker, GiftBoxSticker } from '@/components/Stickers'
import { Badge, Button, Field, Modal, MoneyInput, ProgressBar } from '@/components/ui'
import { vnd } from '@/domain/format'
import { useChallenges, useStore } from '@/hooks/useStore'
import { IMG } from '@/lib/assets'

export default function ChallengesPage() {
  const items = useChallenges()
  const { repo, run, celebrate, toast } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [err, setErr] = useState('')

  const start = async (id: string) => {
    const out = await run(repo.startChallenge(id))
    if (out) {
      if (out.challengeStatus[id] === 'completed') {
        celebrate(['🏅', '🎉', '✨'])
        toast('Hoàn thành thử thách! 🏅')
      } else toast('Đã tham gia thử thách 🚀')
    }
  }

  const create = async () => {
    if (!title.trim()) return setErr('Nhập tên thử thách')
    if (amount < 10000) return setErr('Số tiền mục tiêu tối thiểu 10.000đ')
    if (await run(repo.addCustomChallenge(title, amount))) {
      setOpen(false)
      setTitle('')
      setAmount(0)
      setErr('')
      toast('Đã tạo thử thách mới ✏️')
    }
  }

  const selected = items.find((i) => i.def.id === detailId)

  return (
    <div
      className="min-h-[100dvh] px-4 pb-[calc(96px+env(safe-area-inset-bottom))]"
      style={{
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(180deg, #ede9fe 0px, #ede9fe 76px, #f5efff 38%, #ffeef5 100%)',
      }}
    >
      {/* Header matching 07_challenges.png */}
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => nav('/')}
          className="absolute left-0 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-white/80 text-[#1e1b4b] shadow-sm"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="text-[20px] font-black text-[#172554]">Thử thách tiết kiệm</h1>
      </div>

      {/* Hero Banner: Thử thách 30 ngày with 3D headband pig matching 07_challenges.png */}
      <div
        className="mt-4 flex items-center justify-between overflow-hidden rounded-[28px] border-2 border-white p-4 shadow-[0_14px_30px_rgba(79,70,229,.28)]"
        style={{ background: 'linear-gradient(125deg, #2563eb 0%, #7c3aed 55%, #ec4899 100%)' }}
      >
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="text-[20px] font-black leading-tight text-white">Thử thách 30 ngày</h2>
          <p className="mt-1 text-[13px] font-bold leading-snug text-white/95">
            Góp ít nhất 50.000đ/ngày để nhận thưởng!
          </p>
          <button
            type="button"
            onClick={() => start('days30')}
            className="btn mt-3 !w-auto !px-6 !py-2 !text-[14px]"
          >
            Tham gia
          </button>
        </div>
        <img
          src={IMG.chal}
          alt="Heo thử thách 30 ngày"
          className="-my-2 -mr-2 h-28 w-28 shrink-0 rounded-2xl object-cover drop-shadow-md"
        />
      </div>

      {/* Section 1: Nhiệm vụ hôm nay */}
      <h2 className="mt-5 text-[16px] font-black text-[#172554]">Nhiệm vụ hôm nay</h2>
      <div className="mt-2.5 flex items-center justify-between rounded-[24px] border-2 border-white bg-white/95 px-4 py-3.5 shadow-[0_10px_24px_rgba(143,124,240,.13)]">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fffbeb] shadow-inner">
            <CoinStackSticker size={36} />
          </span>
          <div>
            <p className="text-[15px] font-black text-[#172554]">Góp ít nhất 50.000đ</p>
            <p className="text-xs font-bold text-[#64748b]">Mở số tiền hôm nay cùng người ấy</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => nav('/reveal')}
          className="btn !w-auto !px-4 !py-2 !text-[13px]"
        >
          Thực hiện
        </button>
      </div>

      {/* Section 2: Các thử thách khác */}
      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-[16px] font-black text-[#172554]">Các thử thách khác</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer border-0 bg-transparent text-xs font-black text-[#7c3aed] underline"
        >
          + Tự tạo thử thách
        </button>
      </div>

      <div className="mt-2.5 space-y-2.5">
        {items.map(({ def, value, status }) => {
          const pctVal = Math.min(100, (value / def.target) * 100)
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => setDetailId(def.id)}
              className="flex w-full cursor-pointer items-center gap-3.5 rounded-[24px] border-2 border-white bg-white/95 px-4 py-3.5 text-left shadow-[0_8px_22px_rgba(143,124,240,.12)] transition-transform active:scale-[0.99]"
              style={{ fontFamily: 'inherit' }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fff1f2] shadow-inner">
                <GiftBoxSticker size={34} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-black text-[#172554]">{def.title}</p>
                  {status === 'completed' && <Badge>Hoàn thành</Badge>}
                </div>
                <p className="mt-0.5 text-xs font-extrabold text-[#64748b]">
                  Thưởng: {def.reward.icon} {def.reward.label} · Tiến độ {Math.round(pctVal)}%
                </p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-[#94a3b8]" />
            </button>
          )
        })}
      </div>

      {/* Challenge Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setDetailId(null)}
        title={selected ? selected.def.title : 'Thử thách'}
      >
        {selected && (
          <div className="mt-3 space-y-3">
            <p className="muted text-sm">{selected.def.description}</p>
            <p className="text-sm font-black text-[#172554]">
              Phần thưởng: {selected.def.reward.icon} {selected.def.reward.label}
            </p>
            <ProgressBar
              value={Math.min(100, (selected.value / selected.def.target) * 100)}
              label={selected.def.title}
            />
            <p className="muted text-xs">
              Hiện tại:{' '}
              {selected.def.unit === 'đ'
                ? `${vnd(Math.min(selected.value, selected.def.target))} / ${vnd(selected.def.target)}`
                : `${Math.min(selected.value, selected.def.target)} / ${selected.def.target} ${selected.def.unit}`}
            </p>
            {selected.status === 'idle' && (
              <Button
                onClick={() => {
                  start(selected.def.id)
                  setDetailId(null)
                }}
              >
                Bắt đầu thử thách này 🚀
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Custom Challenge Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Thử thách tự tạo">
        <Field
          label="Tên thử thách"
          value={title}
          maxLength={50}
          onChange={(e) => {
            setTitle(e.target.value)
            setErr('')
          }}
          placeholder="Ví dụ: 7 ngày không uống trà sữa"
        />
        <MoneyInput
          label="Tổng số tiền cần đạt"
          value={amount}
          onChange={(n) => {
            setAmount(n)
            setErr('')
          }}
          error={err}
        />
        <div className="mt-5">
          <Button onClick={create}>Tạo thử thách</Button>
        </div>
      </Modal>
    </div>
  )
}
