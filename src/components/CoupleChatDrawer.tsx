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
const CLOSE_DRAG_THRESHOLD = 72

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
    syncState,
  } = useStore()

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [vvBox, setVvBox] = useState<{ top: number; height: number; kbOpen: boolean } | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const dragStartYRef = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = state.messages ?? []

  const closeChat = () => {
    inputRef.current?.blur()
    setDragY(0)
    setDragging(false)
    setChatOpen(false)
  }

  // 1. Freeze background page scroll 100% while Chat is open so swiping inside chat NEVER moves HomePage!
  useEffect(() => {
    if (!chatOpen || typeof document === 'undefined') return
    setDragY(0)
    setDragging(false)
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

  // 3. Auto-scroll to newest message, pull latest remote messages on open, & mark messages as read
  useEffect(() => {
    if (!chatOpen || !j) return
    void repo.syncWithSheet('pull').then((latest) => {
      syncState(latest)
    }).catch(() => undefined)
  }, [chatOpen, j, repo, syncState])

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

  // Pull-down-to-close gesture handlers on the top grabber & header
  const onSheetDragStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY
    setDragging(true)
  }

  const onSheetDragMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return
    const dy = e.touches[0].clientY - dragStartYRef.current
    if (dy > 0) {
      setDragY(dy)
    } else {
      setDragY(0)
    }
  }

  const onSheetDragEnd = () => {
    if (dragStartYRef.current === null) return
    dragStartYRef.current = null
    setDragging(false)
    if (dragY >= CLOSE_DRAG_THRESHOLD) {
      haptic(state.settings, 15)
      closeChat()
    } else {
      setDragY(0)
    }
  }

  // Sends message and keeps the virtual keyboard open continuously (with duplicate-tap lock while sending)
  const send = (rawContent?: string) => {
    if (sendingRef.current) return
    const liveVal = rawContent !== undefined ? rawContent : (inputRef.current?.value ?? text)
    const clean = liveVal.trim()

    inputRef.current?.focus()
    if (!clean) return

    sendingRef.current = true
    setSending(true)
    setText('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    haptic(state.settings, 20)
    beep(state.settings, 'tick')

    void run(repo.sendChatMessage(myMemberId, clean))
      .then(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }
        inputRef.current?.focus()
      })
      .finally(() => {
        sendingRef.current = false
        setSending(false)
      })
  }

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          className="fixed inset-x-0 z-[95] mx-auto flex w-full max-w-[440px] flex-col justify-end bg-[#1e1b4b]/45 backdrop-blur-[2px]"
          style={
            vvBox
              ? { top: `${vvBox.top}px`, height: `${vvBox.height}px` }
              : { inset: 0 }
          }
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeChat}
        >
          {/* Bottom Sheet Card with Top Gap & Pull-Down-to-Close Gesture */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Nhắn tin với ${partnerMember?.name ?? 'Người ấy'}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            transition={
              dragging
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
            className="flex w-full flex-col overflow-hidden rounded-t-[32px] border-t-2 border-white bg-gradient-to-b from-white via-white to-[#fff5f9] shadow-[0_-14px_38px_rgba(30,27,75,0.28)]"
            style={{
              // Always leave a top gap so the rounded sheet & backdrop show at the top, while sitting 0px flush on the keyboard at the bottom!
              height: kbActive ? 'calc(100% - 42px)' : '82%',
              maxHeight: 'calc(100% - 42px)',
              paddingBottom: kbActive ? '0px' : 'calc(8px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* 1. Drag-to-Close Grabber Handle + Header */}
            <div
              onTouchStart={onSheetDragStart}
              onTouchMove={onSheetDragMove}
              onTouchEnd={onSheetDragEnd}
              onTouchCancel={onSheetDragEnd}
              className="shrink-0 cursor-grab select-none border-b border-pink-100/80 bg-white/95 px-4 pb-2.5 pt-2 active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              {/* Pill Drag Handle */}
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300/90" />

              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar value={partnerMember?.avatar || 'girl'} size={34} />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-[#1e1b4b]">
                      💬 {partnerMember?.name ?? 'Người ấy'}
                    </h2>
                    <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Vuốt thanh này xuống để đóng · Bạn là {myMember?.name}
                    </p>
                  </div>
                </div>
                <IconButton
                  label="Đóng khung chat"
                  size="sm"
                  onClick={closeChat}
                  className="!bg-[#f3e8ff] !text-[#6d28d9] !shadow-none"
                >
                  <X size={18} />
                </IconButton>
              </div>
            </div>

            {/* 2. Isolated Scrollable Message History */}
            <div
              ref={listRef}
              onTouchStart={(e) => {
                // Also allow pulling down to close when the message list is already at the very top (scrollTop <= 0)
                if (listRef.current && listRef.current.scrollTop <= 0) {
                  dragStartYRef.current = e.touches[0].clientY
                } else {
                  dragStartYRef.current = null
                }
              }}
              onTouchMove={(e) => {
                if (dragStartYRef.current === null) return
                const dy = e.touches[0].clientY - dragStartYRef.current
                if (dy > 6 && listRef.current && listRef.current.scrollTop <= 0) {
                  setDragging(true)
                  setDragY(dy)
                } else if (dy < 0) {
                  dragStartYRef.current = null
                  setDragging(false)
                  setDragY(0)
                }
              }}
              onTouchEnd={onSheetDragEnd}
              onTouchCancel={onSheetDragEnd}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain bg-slate-50/70 px-3.5 py-2.5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center py-6 text-center">
                  <MessageCircleHeart size={38} className="text-pink-400" />
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

            {/* 3. Bottom Composer Dock — Flush 0px on top of the keyboard! */}
            <div className="shrink-0 border-t border-pink-100 bg-white px-3 pb-1.5 pt-1.5 shadow-[0_-4px_16px_rgba(30,27,75,0.05)]">
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
                  disabled={sending}
                  aria-label="Gửi tin nhắn"
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    send()
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                  }}
                  onClick={() => {
                    send()
                  }}
                  className="flex h-10 shrink-0 cursor-pointer select-none items-center gap-1 rounded-full border-0 bg-gradient-to-r from-indigo-600 to-pink-500 px-4 text-xs font-black text-white shadow-[0_4px_12px_rgba(236,72,153,0.35)] active:scale-95 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{sending ? 'Đang gửi…' : 'Gửi'}</span>
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
