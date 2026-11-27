import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCheck, MessageCircleHeart, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar, IconButton } from '@/components/ui'
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
  const [vvStyle, setVvStyle] = useState<{ height?: number; top?: number; kbOpen: boolean }>({ kbOpen: false })
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = state.messages ?? []

  // Track iOS / Android virtual keyboard via visualViewport so the input bar always sits flush right above the keyboard!
  useEffect(() => {
    if (!chatOpen || typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return

    const updateViewport = () => {
      const fullH = window.innerHeight
      const kbOpen = fullH - vv.height > 90
      setVvStyle({
        height: Math.round(vv.height),
        top: Math.round(vv.offsetTop),
        kbOpen,
      })
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    }

    updateViewport()
    vv.addEventListener('resize', updateViewport)
    vv.addEventListener('scroll', updateViewport)
    return () => {
      vv.removeEventListener('resize', updateViewport)
      vv.removeEventListener('scroll', updateViewport)
    }
  }, [chatOpen])

  // Scroll to bottom & mark messages as read when chat opens or new message arrives
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

  const send = async (rawContent?: string) => {
    const liveVal = rawContent !== undefined ? rawContent : (inputRef.current?.value || text)
    const clean = liveVal.trim()
    if (!clean) {
      inputRef.current?.focus()
      return
    }
    setText('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    haptic(state.settings, 20)
    beep(state.settings, 'tick')
    await run(repo.sendChatMessage(myMemberId, clean))
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          className="fixed inset-x-0 z-[90] mx-auto flex w-full max-w-[440px] flex-col justify-end bg-[#1e1b4b]/45 backdrop-blur-[2px]"
          style={
            vvStyle.height
              ? { top: `${vvStyle.top ?? 0}px`, height: `${vvStyle.height}px` }
              : { inset: 0 }
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setChatOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Nhắn tin với ${partnerMember?.name ?? 'Người ấy'}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-h-[92%] w-full flex-col rounded-t-[30px] border-t-2 border-white bg-gradient-to-b from-white to-[#fff5f9] shadow-[0_-12px_36px_rgba(30,27,75,0.28)]"
            style={{
              height: vvStyle.kbOpen ? '100%' : '82%',
              paddingBottom: vvStyle.kbOpen
                ? '6px'
                : 'calc(10px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* 1. Compact Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-pink-100/80 px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar value={partnerMember?.avatar || 'girl'} size={34} />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-black text-[#1e1b4b]">
                    💬 {partnerMember?.name ?? 'Người ấy'}
                  </h2>
                  <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Trực tuyến Real-Time · Bạn là {myMember?.name}
                  </p>
                </div>
              </div>
              <IconButton
                label="Đóng khung chat"
                size="sm"
                onClick={() => setChatOpen(false)}
                className="!bg-[#f3e8ff] !text-[#6d28d9] !shadow-none"
              >
                <X size={18} />
              </IconButton>
            </div>

            {/* 2. Messages Scroll Area (Flex-1 so input bar below stays pinned right at the bottom above keyboard!) */}
            <div
              ref={listRef}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50/70 px-3.5 py-2.5"
            >
              {messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center py-6 text-center">
                  <MessageCircleHeart size={36} className="text-pink-400" />
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
                      {!isMe && <Avatar value={senderMember?.avatar || 'girl'} size={26} />}
                      <div
                        className={`max-w-[78%] rounded-2xl px-3 py-2 text-left shadow-sm ${
                          isMe
                            ? 'rounded-br-sm bg-gradient-to-r from-indigo-600 to-pink-500 text-white'
                            : 'rounded-bl-sm border border-white bg-white text-[#1e1b4b]'
                        }`}
                      >
                        <p className="break-words text-[13px] font-extrabold leading-snug">{m.text}</p>
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

            {/* 3. Quick Replies & Emoji Bar (Directly above the input box) */}
            <div className="shrink-0 border-t border-pink-100/70 bg-white/95 px-3 pt-1.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void send(qr)}
                    className="shrink-0 cursor-pointer rounded-full border border-indigo-100 bg-indigo-50/85 px-2.5 py-1 text-[10.5px] font-black text-indigo-700 transition-transform active:scale-95"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between px-1 py-0.5">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setText((prev) => {
                        const base = inputRef.current ? inputRef.current.value : prev
                        const next = `${base}${em}`
                        if (inputRef.current) inputRef.current.value = next
                        return next
                      })
                      inputRef.current?.focus()
                    }}
                    className="cursor-pointer border-0 bg-transparent p-1 text-base transition-transform active:scale-125"
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* 4. Bottom Input Bar — Flush against the bottom edge / top of keyboard, Send button ALWAYS unlocked! */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void send()
                }}
                className="mt-1 flex items-center gap-2 pb-1"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  maxLength={300}
                  enterKeyHint="send"
                  autoComplete="off"
                  onChange={(e) => setText(e.target.value)}
                  onInput={(e) => setText((e.target as HTMLInputElement).value)}
                  placeholder={`Nhắn cho ${partnerMember?.name ?? 'người ấy'}...`}
                  className="flex-1 rounded-full border-2 border-indigo-200 bg-white px-4 py-2.5 text-[15px] font-extrabold text-[#1e1b4b] outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  aria-label="Gửi tin nhắn"
                  onPointerDown={(e) => {
                    // Prevent input blur on iOS so the first tap always triggers send immediately!
                    e.preventDefault()
                    void send()
                  }}
                  className="flex h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border-0 bg-gradient-to-r from-indigo-600 to-pink-500 px-4 text-xs font-black text-white shadow-[0_6px_16px_rgba(236,72,153,0.35)] transition-transform active:scale-95"
                >
                  <Send size={15} />
                  <span>Gửi</span>
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
