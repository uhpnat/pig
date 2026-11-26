import { useState } from 'react'
import { Badge, Button, Card, Modal, MoneyInput, ProgressBar, Field } from '@/components/ui'
import { IMG } from '@/lib/assets'
import { useChallenges, useStore } from '@/hooks/useStore'
import { vnd } from '@/domain/format'

export default function ChallengesPage() {
  const items = useChallenges()
  const { repo, run, celebrate, toast, state } = useStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [err, setErr] = useState('')

  const start = async (id: string) => {
    const out = await run(repo.startChallenge(id))
    if (out) { if (out.challengeStatus[id] === 'completed') { celebrate(['🏅', '🎉', '✨']); toast('Hoàn thành thử thách! 🏅') } else toast('Đã bắt đầu thử thách 🚀') }
  }
  const create = async () => {
    if (!title.trim()) return setErr('Nhập tên thử thách')
    if (amount < 10000) return setErr('Số tiền mục tiêu tối thiểu 10.000đ')
    if (await run(repo.addCustomChallenge(title, amount))) { setOpen(false); setTitle(''); setAmount(0); setErr(''); toast('Đã tạo thử thách ✏️') }
  }
  const rewards = items.filter((i) => i.status === 'completed')

  return (
    <div className="px-4 pt-4">
      <h1 className="h1">Thử thách tiết kiệm</h1>
      <p className="muted mt-1">Tuỳ chọn và vui là chính. Bỏ lỡ một ngày cũng không sao nhé 💗</p>

      <div className="mt-3 flex items-center overflow-hidden rounded-[28px] p-4 shadow-[0_14px_28px_rgba(80,90,230,.35)]" style={{ background: 'linear-gradient(120deg,#3f7bff,#9b6bff)' }}>
        <div className="flex-1">
          <h2 className="h2 !text-white">Thử thách của riêng bạn</h2>
          <p className="my-1 mb-3 text-sm font-bold text-[#eaf0ff]">Tự đặt mục tiêu tiền cho hai đứa!</p>
          <Button size="sm" block={false} onClick={() => setOpen(true)}>Tạo thử thách</Button>
        </div>
        <img src={IMG.chal} alt="" className="-my-1.5 -mr-2 w-[110px] rounded-3xl" style={{ maskImage: 'linear-gradient(to right, transparent, #000 30%)' }} />
      </div>

      {rewards.length > 0 && (
        <Card><h2 className="h3">🎖️ Bộ sưu tập phần thưởng ({rewards.length})</h2>
          <div className="mt-2 flex flex-wrap gap-2">{rewards.map(({ def }) => <span key={def.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold shadow">{def.reward.icon} {def.reward.label}</span>)}</div>
          <p className="muted mt-2 !text-[11px]">Phần thưởng chỉ mang tính trang trí.</p></Card>
      )}

      {items.map(({ def, value, status }) => {
        const p = Math.min(100, (value / def.target) * 100)
        return (
          <Card key={def.id} aria-label={def.title}>
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>{def.icon}</span>
              <div className="min-w-0 flex-1"><h3 className="h3">{def.title}</h3><p className="muted !text-xs">{def.description}</p><p className="muted !text-xs">Thưởng: {def.reward.icon} {def.reward.label}</p></div>
              {status === 'completed' ? <Badge>Hoàn thành</Badge> : status === 'active' ? <Badge tone="warn">Đang làm</Badge> : null}
            </div>
            <ProgressBar value={p} className="mt-2.5" label={def.title} />
            <div className="mt-2 flex items-center justify-between">
              <span className="muted">{def.unit === 'đ' ? `${vnd(Math.min(value, def.target))} / ${vnd(def.target)}` : `${Math.min(value, def.target)}/${def.target} ${def.unit}`}</span>
              {status === 'idle' && <Button size="sm" block={false} onClick={() => start(def.id)}>Bắt đầu</Button>}
            </div>
          </Card>
        )
      })}
      {state.contributions.length === 0 && <p className="muted mt-3 text-center">Tiến độ sẽ tăng sau khi hai bạn xác nhận khoản góp đầu tiên.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Thử thách tự tạo">
        <Field label="Tên thử thách" value={title} maxLength={50} onChange={(e) => { setTitle(e.target.value); setErr('') }} placeholder="Ví dụ: Chạm mốc 10 triệu" />
        <MoneyInput label="Tổng số tiền cần đạt" value={amount} onChange={(n) => { setAmount(n); setErr('') }} error={err} />
        <div className="mt-5"><Button onClick={create}>Tạo thử thách</Button></div>
      </Modal>
    </div>
  )
}
