import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCheck, ChevronDown, MessageCircleHeart, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui'
import { fmtDateTime } from '@/domain/format'
import { useStore } from '@/hooks/useStore'
import { beep, haptic } from '@/lib/fx'

const QUICK_REPLIES = [
  'Nạp tiền heo hôm nay nha người đẹp ơi 🐷💸',
  'Mình vừa nạp rồi đó, duyệt 2/2 giúp mình nha ✅',
  'Hôm nay ai mở số may mắn đây ta? 🎰',
  'Yêu thương nhiều lắm, cùng cố gắng chạm đích nha 💗',
]

const QUICK_EMOJIS = ['❤️', '🐷', '💸', '🥰', '🎉', '🔥', '😘', '✨']

export function CoupleChatDrawer() {
  const {
    state,
    journey: j,
    repo,
    run,
    myMemberId,
    myMember,
    partnerMember,
    chatOpen,
    setChatOpen,
  } = useStore()

  const [text, setText] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [vvBox, setVvBox] = useState<{ top: number; height: number; kbOpen: boolean } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = state.messages ?? []

  // 1. Freeze background page scroll 100% while Chat is open so swiping inside chat NEVER moves HomePage!
  useEffect(() => {
    if (!chatOpen || typeof document === 'undefined') return
    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement

    const prevBodyPos = body.style.position
    const prevBodyTop = body.style.top
    const prevBodyLeft = body.style.left
    const prevBodyRight = body.style.right
    const prevBodyOverflow = body.style.overflow
    const prevHtmlOverflow = html.style.overflow

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'

    return () => {
      body.style.position = prevBodyPos
      body.style.top = prevBodyTop
      body.style.left = prevBodyLeft
      body.style.right = prevBodyRight
      body.style.overflow = prevBodyOverflow
      html.style.overflow = prevHtmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [chatOpen])

  // 2. Track exact iOS / Android visualViewport height & offsetTop so the chat input sits 0px flush on top of the keyboard!
  useEffect(() => {
    if (!chatOpen || typeof window === 'undefined') return
    const vv = window.visualViewport

    const syncViewport = () => {
      if (!vv) return
      const screenH = window.screen?.height || window.innerHeight
      // On iOS Safari, window.innerHeight often shrinks with vv.height, so check against screen.height too
      const isKb =
        window.innerHeight - vv.height > 65 ||
        screenH - vv.height > 260
      setVvBox({
        top: Math.max(0, Math.round(vv.offsetTop)),
        height: Math.round(vv.height),
        kbOpen: isKb,
      })
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    }

    syncViewport()
    vv?.addEventListener('resize', syncViewport)
    vv?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
    return () => {
      vv?.removeEventListener('resize', syncViewport)
      vv?.removeEventListener('scroll', syncViewport)
      window.removeEventListener('resize', syncViewport)
    }
  }, [chatOpen])

  // 3. Auto-scroll to newest message & mark messages as read
  useEffect(() => {
    if (!chatOpen || !j) return
    const t = setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    }, 30)
    const hasUnread = messages.some((m) => m.sender !== myMemberId && !(m.readBy ?? []).includes(myMemberId))
    if (hasUnread) {
      void run(repo.markChatRead(myMemberId))
    }
    return () => clearTimeout(t)
  }, [chatOpen, messages.length, myMemberId, j, repo, run])

  if (!j) return null

  const kbActive = inputFocused || Boolean(vvBox?.kbOpen)

  // Sends message and keeps the virtual keyboard open continuously
  const send = (rawContent?: string) => {
    const liveVal = rawContent !== undefined ? rawContent : (inputRef.current?.value ?? text)
    const clean = liveVal.trim()

    // Always keep focus on the input so the keyboard NEVER closes when pressing Send!
    inputRef.current?.focus()

    if (!clean) return

    setText('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    haptic(state.settings, 20)
    beep(state.settings, 'tick')

    void run(repo.sendChatMessage(myMemberId, clean)).then(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
      inputRef.current?.focus()
    })
  }

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Nhắn tin với ${partnerMember?.name ?? 'Người ấy'}`}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 z-[95] mx-auto flex w-full max-w-[440px] flex-col overflow-hidden bg-gradient-to-b from-[#e0f2fe] via-white to-[#fff5f9] shadow-2xl"
          style={
            vvBox
              ? {
                  top: `${vvBox.top}px`,
                  height: `${vvBox.height}px`,
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingBottom: kbActive ? '0px' : 'env(safe-area-inset-bottom, 0px)',
                }
              : {
                  inset: 0,
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingBottom: kbActive ? '0px' : 'env(safe-area-inset-bottom, 0px)',
                }
          }
        >
          {/* 1. Fixed Top Chat Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-sky-100 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar value={partnerMember?.avatar || 'girl'} size={36} />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-[#1e1b4b]">
                  💬 {partnerMember?.name ?? 'Người ấy'}
                </h2>
                <p className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Chat Real-Time · Bạn là {myMember?.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                inputRef.current?.blur()
                setChatOpen(false)
              }}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-black text-purple-700 shadow-sm active:scale-95"
            >
              <ChevronDown size={15} /> Đóng
            </button>
          </div>

          {/* 2. Isolated Scrollable Message History (overscroll-contain so it NEVER scrolls the background page) */}
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3.5 py-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center py-6 text-center">
                <MessageCircleHeart size={40} className="text-pink-400" />
                <p className="mt-2 text-xs font-black text-[#1e1b4b]">
                  Chưa có tin nhắn nào giữa hai bạn
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  Chọn một câu nhắc nhanh hoặc gõ tin nhắn ngay bên dưới nhé! 💌
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === myMemberId
                const senderMember = j.members[m.sender]
                const seenByPartner = (m.readBy ?? []).length >= 2
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isMe && <Avatar value={senderMember?.avatar || 'girl'} size={28} />}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-left shadow-sm ${
                        isMe
                          ? 'rounded-br-sm bg-gradient-to-r from-indigo-600 to-pink-500 text-white'
                          : 'rounded-bl-sm border border-white bg-white text-[#1e1b4b]'
                      }`}
                    >
                      <p className="break-words text-[13.5px] font-extrabold leading-snug">{m.text}</p>
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[9.5px] font-bold ${
                          isMe ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        <span>{fmtDateTime(m.at, j.timezone)}</span>
                        {isMe &&
                          (seenByPartner ? (
                            <CheckCheck size={12} className="text-sky-200" aria-label="Đã xem" />
                          ) : (
                            <Check size={11} aria-label="Đã gửi" />
                          ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 3. Bottom Composer Dock — Anchored 0px flush to the top of the mobile keyboard! */}
          <div className="shrink-0 border-t border-pink-100 bg-white px-3 pb-1.5 pt-1.5 shadow-[0_-4px_16px_rgba(30,27,75,0.06)]">
            {/* Quick 1-Tap Couple Reminder Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => send(qr)}
                  className="shrink-0 cursor-pointer rounded-full border border-indigo-100 bg-indigo-50/90 px-2.5 py-1 text-[10.5px] font-black text-indigo-700 active:scale-95"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* Quick Emoji Strip */}
            <div className="flex items-center justify-between px-1 py-0.5">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const base = inputRef.current ? inputRef.current.value : text
                    const next = `${base}${em}`
                    setText(next)
                    if (inputRef.current) {
                      inputRef.current.value = next
                      inputRef.current.focus()
                    }
                  }}
                  className="cursor-pointer border-0 bg-transparent p-1 text-base transition-transform active:scale-125"
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Text Input + Always-Unlocked Send Button that keeps keyboard open! */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
              className="mt-0.5 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={text}
                maxLength={300}
                enterKeyHint="send"
                autoComplete="off"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => setText(e.target.value)}
                onInput={(e) => setText((e.target as HTMLInputElement).value)}
                placeholder={`Nhắn cho ${partnerMember?.name ?? 'người ấy'}...`}
                className="flex-1 rounded-full border-2 border-indigo-200 bg-slate-50/70 px-4 py-2 text-[15px] font-extrabold text-[#1e1b4b] outline-none focus:border-indigo-500 focus:bg-white"
              />
              <button
                type="button"
                aria-label="Gửi tin nhắn"
                onTouchEnd={(e) => {
                  // Prevent iOS Safari from blurring the input so the keyboard stays open continuously!
                  e.preventDefault()
                  send()
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                }}
                onClick={() => {
                  send()
                }}
                className="flex h-10 shrink-0 cursor-pointer select-none items-center gap-1 rounded-full border-0 bg-gradient-to-r from-indigo-600 to-pink-500 px-4 text-xs font-black text-white shadow-[0_4px_12px_rgba(236,72,153,0.35)] active:scale-95"
              >
                <Send size={14} />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
