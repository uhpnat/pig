import { Modal, Button } from '@/components/ui'
import { useInstallPrompt } from '@/hooks/usePwa'

export function InstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canPrompt, installed, isIOS, prompt } = useInstallPrompt()
  return (
    <Modal open={open} onClose={onClose} title="Cài Our Little Bank ra Màn hình chính">
      {installed ? <p className="mt-3 text-sm font-bold">✅ Bạn đang dùng bản đã cài đặt.</p> : (
        <div className="mt-3 space-y-4 text-sm">
          <section className={isIOS ? 'rounded-2xl bg-white/60 p-3' : ''}>
            <h3 className="h3">📱 iPhone / iPad (Safari)</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 font-semibold"><li>Mở trang này bằng <b>Safari</b>.</li><li>Nhấn nút <b>Chia sẻ</b> (hình vuông có mũi tên lên).</li><li>Chọn <b>“Thêm vào Màn hình chính”</b>.</li><li>Nhấn <b>Thêm</b>. Mở Our Little Bank từ màn hình chính.</li></ol>
            <p className="muted mt-1 !text-xs">Thông báo đẩy trên iOS chỉ hoạt động sau khi đã cài vào Màn hình chính (iOS 16.4+).</p>
          </section>
          <section>
            <h3 className="h3">🤖 Android (Chrome)</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 font-semibold"><li>Nhấn menu <b>⋮</b> của Chrome.</li><li>Chọn <b>“Cài đặt ứng dụng”</b> hoặc “Thêm vào màn hình chính”.</li></ol>
            {canPrompt && <div className="mt-2"><Button size="sm" onClick={prompt}>Cài đặt ngay</Button></div>}
          </section>
        </div>
      )}
    </Modal>
  )
}
