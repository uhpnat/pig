import { Check, CheckCheck, MessageCircleHeart, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar, Modal } from '@/components/ui'
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
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const messages = state.messages ?? []

  // Scroll to bottom & mark messages as read when chat opens or new message arrives while open
  useEffect(() => {
    if (!chatOpen || !j) return
    const el = listRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
    const hasUnread = messages.some((m) => m.sender !== myMemberId && !(m.readBy ?? []).includes(myMemberId))
    if (hasUnread) {
      void run(repo.markChatRead(myMemberId))
    }
  }, [chatOpen, messages.length, myMemberId, j, repo, run])

  if (!j) return null

  const send = async (content: string) => {
    const clean = content.trim()
    if (!clean || sending) return
    setSending(true)
    setText('')
    haptic(state.settings, 20)
    beep(state.settings, 'tick')
    try {
      await run(repo.sendChatMessage(myMemberId, clean))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={chatOpen}
      onClose={() => setChatOpen(false)}
      title={`💬 Nhắn tin với ${partnerMember?.name ?? 'Người ấy'}`}
    >
      <div className="mt-2 flex flex-col">
        {/* Partner Status Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-pink-100 bg-gradient-to-r from-sky-50/70 via-white to-pink-50/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar value={partnerMember?.avatar || 'girl'} size={30} />
            <div>
              <p className="text-xs font-black text-[#1e1b4b]">{partnerMember?.name}</p>
              <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Đồng bộ Real-Time & Google Sheets
              </p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black text-indigo-700">
            Bạn: {myMember?.name}
          </span>
        </div>

        {/* Messages Scroll Area */}
        <div
          ref={listRef}
          className="mt-2.5 flex h-[44dvh] max-h-[340px] flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
        >
          {messages.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center py-6 text-center">
              <MessageCircleHeart size={36} className="text-pink-400" />
              <p className="mt-2 text-xs font-black text-[#1e1b4b]">
                Chưa có tin nhắn nào giữa hai bạn
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                Chọn một câu nhắc nhanh bên dưới hoặc gửi lời yêu thương đầu tiên nhé! 💌
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

        {/* Quick 1-Tap Couple Reminder Chips */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => send(qr)}
              className="shrink-0 cursor-pointer rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-[10.5px] font-black text-indigo-700 transition-transform active:scale-95"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Quick Emoji Bar */}
        <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-100/70 px-2.5 py-1">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setText((prev) => `${prev}${em}`)}
              className="cursor-pointer border-0 bg-transparent p-1 text-base transition-transform active:scale-125"
            >
              {em}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(text)
          }}
          className="mt-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Nhắn cho ${partnerMember?.name ?? 'người ấy'}...`}
            className="flex-1 rounded-full border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#1e1b4b] outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Gửi tin nhắn"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md transition-transform active:scale-95 disabled:opacity-45"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </Modal>
  )
}
