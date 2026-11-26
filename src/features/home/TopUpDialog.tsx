import { useState, useEffect } from 'react'
import { Avatar, Button, Chip, Modal, MoneyInput, Field } from '@/components/ui'
import { vnd } from '@/domain/format'
import type { MemberId } from '@/domain/types'
import { useJourney, useStore } from '@/hooks/useStore'

/** Manual extra deposit. It becomes savings only after confirmation when the journey requires it. */
export function TopUpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const j = useJourney()
  const { repo, run, toast, celebrate, myMemberId } = useStore()
  const [who, setWho] = useState<MemberId>(myMemberId || 'a')
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) setWho(myMemberId || 'a')
  }, [open, myMemberId])

  const submit = async () => {
    if (amount < 1000) return setErr('Nhập ít nhất 1.000đ')
    const ok = await run(repo.addContribution(who, amount, note))
    if (ok) {
      toast(j.requireConfirmation ? 'Đã ghi nhận – chờ xác nhận ở Nhật ký' : `Đã nạp ${vnd(amount)} 🪙`)
      if (!j.requireConfirmation) celebrate(['🪙'])
      setAmount(0); setNote(''); setErr(''); onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nạp thêm tiền">
      <p className="muted mt-1 !text-xs">Dành cho khoản góp ngoài kết quả hằng ngày. Piggy Duo không chuyển tiền thật.</p>
      <span className="label">Ai nạp?</span>
      <div className="flex gap-2">
        {(['a', 'b'] as const).map((k) => (
          <Chip key={k} on={who === k} onClick={() => setWho(k)} className="flex items-center gap-2"><Avatar value={j.members[k].avatar} size={24} />{j.members[k].name}</Chip>
        ))}
      </div>
      <MoneyInput label="Số tiền" value={amount} onChange={(n) => { setAmount(n); setErr('') }} error={err} autoFocus />
      <Field label="Ghi chú (tuỳ chọn)" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: tiền thưởng cuối tuần" />
      <div className="mt-5"><Button onClick={submit}>Ghi nhận khoản nạp</Button></div>
    </Modal>
  )
}
