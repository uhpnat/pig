import { Lock } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button, Card, Field } from '@/components/ui'
import { useStore } from '@/hooks/useStore'

const UNLOCK_KEY = 'piggy-duo:unlocked:v1'

export function PasscodeGate({ children }: { children: ReactNode }) {
  const { repo, toast } = useStore()
  const cfg = repo.getSheetConfig()
  const requiredPin = cfg.passcode

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
