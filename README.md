# 🐷 Piggy Duo – Heo đất của đôi mình

PWA tiết kiệm chung cho **hai người**: mỗi ngày một người bấm **một nút**, app mở số tiền cho cả hai (hiệu ứng slot), mỗi người xác nhận khoản góp của mình, heo lớn dần theo tiến độ.
Mặc định tiếng Việt · VND · `vi-VN` · `Asia/Ho_Chi_Minh`. **App không giữ, không chuyển hay tự trừ tiền** – chỉ ghi lại cam kết và khoản góp thực tế.

## Chạy nhanh (chế độ demo, không cần backend)

```bash
npm install
npm run dev          # http://localhost:5173
```

Ở màn hình đầu tiên chọn **“Xem thử với dữ liệu mẫu”** để có 14 ngày lịch sử (được tạo bằng chính engine thật), hoặc tự tạo hành trình mới.

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `tsc` + build production (`dist/`) |
| `npm test` | Unit test domain (engine, idempotency, xác nhận, thống kê) |
| `npm run icons` | Sinh lại icon PNG từ `public/icon.svg` (cần `sharp`) |

## Kiến trúc

```
src/
  domain/        Logic nghiệp vụ thuần (không React): types, engine, stats, challenges, actions, seed, format
  services/      Repository (interface) + LocalRepository (localStorage + BroadcastChannel) – thay bằng Supabase sau
  hooks/         useStore (context), usePwa (cài đặt, push)
  components/    UI kit (ui.tsx), Pig (mascot), PigScene, Layout, FxHost (confetti/toast)
  features/      onboarding · pig · home · reveal · journal · stats · challenges · couple · notifications
supabase/migrations/   0001 schema · 0002 RLS + realtime · 0003 RPC (reveal_today, confirm_contribution, accept_invitation)
public/                manifest, service worker, icons
```

Nguyên tắc: UI chỉ gọi `Repository`; mọi thay đổi dữ liệu là hàm thuần trong `domain/actions.ts` nên có thể test và tái dùng ở server. Mascot (`components/pig/Pig.tsx`) hoàn toàn trình bày – có thể thay bằng sprite sheet/Lottie mà không đụng logic tiền.

### Engine chia tiền (`domain/engine.ts`)
- **Ba tỷ lệ tách biệt**: tỷ lệ thu nhập · tỷ lệ góp theo kế hoạch (`proportional` mặc định / `equal` / `custom`) · tỷ lệ thực góp đã xác nhận.
- Ngân sách tháng: *số tiền cố định* > *% thu nhập chung* > *mục tiêu ÷ số tháng*.
- Mỗi lần mở: số ngày còn lại trong tháng → trung bình còn lại/ngày → nhân hệ số ngẫu nhiên 0,4–1,6 → kẹp trong cửa sổ khả thi (min/max theo ngày, chia theo tỷ lệ kế hoạch, ngân sách còn lại, mục tiêu còn lại) → làm tròn 1.000đ. Không âm, không vượt ngân sách, ngày bỏ lỡ được dàn đều lại, giao dịch đã xác nhận không bao giờ bị sửa.
- **Idempotent**: tối đa một kết quả/ngày/hành trình; gọi lại trả về kết quả cũ. Kết quả được lưu **trước** khi trả về; animation chỉ là trình diễn.
- Ba trạng thái tách biệt: *kết quả mở* (`Reveal`) → *khoản góp* (`Contribution`, `pending`) → *xác nhận* (`confirmed`). Chỉ khoản `confirmed` được cộng vào heo khi bật “yêu cầu xác nhận”.

> ⚠️ Ở chế độ demo, số ngẫu nhiên sinh ở client (`crypto.getRandomValues`) và **không đáng tin cho dữ liệu tài chính thật**. Với backend, dùng RPC `reveal_today` (sinh ngẫu nhiên phía server, advisory lock + unique `(journey_id, reveal_date)`).

## Cơ sở dữ liệu Google Sheets (Mặc định)

Ứng dụng được cấu hình lưu trữ dữ liệu trực tiếp trên **Google Sheets** của bạn:
- **Spreadsheet ID**: `1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s`
- **Link bảng tính**: https://docs.google.com/spreadsheets/d/1bWRdtknPrfmjZzwZ-1YPNzEuRUXN9_OMPCcQv0ZXY_s/edit
- **7 trang tính (Tabs)**:
  1. `Journey`: Cấu hình hành trình, mục tiêu, thu nhập 2 người và cấu hình heo đất.
  2. `DailyReveals`: Lịch sử kết quả mở số tiền ngẫu nhiên hằng ngày của hai bạn.
  3. `Contributions`: Danh sách các khoản góp (đang chờ xác nhận / đã xác nhận / nạp thêm).
  4. `ActivityLog`: Nhật ký hoạt động & kiểm toán thay đổi quy tắc.
  5. `Challenges`: Tiến độ và trạng thái các thử thách tiết kiệm.
  6. `Notifications`: Danh sách thông báo trong ứng dụng.
  7. `AppState`: Snapshot JSON phục vụ đồng bộ tức thời 2 chiều với ứng dụng.

### Cơ chế đồng bộ
1. **Khi chạy trên máy (Vite Dev Server)**: Middleware `/api/gsheets` trong `scripts/gsheets-vite-plugin.ts` tự động đọc/ghi thẳng vào Google Sheet của bạn qua Google Sheets CLI đã xác thực, kết hợp cache `localStorage` để giao diện phản hồi tức thì (offline-first).
2. **Khi deploy lên web tĩnh / dùng trên 2 điện thoại**: Mở file `google-apps-script/Code.gs`, dán vào mục **Tiện ích mở rộng → Apps Script** của file Google Sheet trên, bấm **Triển khai → Ứng dụng web (Web App)** và dán URL vào mục **Cơ sở dữ liệu Google Sheets** trong tab **Của chúng mình ❤️**.

## Biến môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `VITE_GOOGLE_SHEET_ID` | ID của Google Sheet lưu dữ liệu (mặc định đã trỏ tới Sheet của bạn) |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | (Tuỳ chọn) URL Web App của Google Apps Script khi deploy tĩnh |
| `VITE_SUPABASE_URL` | (Tuỳ chọn) URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | (Tuỳ chọn) anon key Supabase |

Không bao giờ đặt `service_role` key vào biến `VITE_*`. Xem `.env.example`.

## Cấu hình Supabase

1. Tạo project tại supabase.com, bật Auth → Email (và Google nếu muốn).
2. `supabase link --project-ref <ref>` rồi `supabase db push` để áp dụng 3 migration.
3. Điền `.env` từ `.env.example`.
4. Các RPC `reveal_today`, `confirm_contribution`, `accept_invitation` chạy `SECURITY DEFINER`; client **không có** quyền ghi trực tiếp vào `daily_reveals`, `contributions`, `audit_logs` (RLS không có policy ghi).
5. Realtime: các bảng quan trọng đã được thêm vào publication `supabase_realtime`; RLS áp dụng cho realtime.

> Migration đã viết nhưng **chưa được chạy thử trên database thật** – hãy review và test trước khi dùng production.

## PWA & triển khai

- `public/manifest.webmanifest` (standalone, theme color, icon 192/512/maskable), `apple-touch-icon.png`, meta Apple web-app trong `index.html`.
- `public/sw.js`: cache app shell, điều hướng SPA offline, stale-while-revalidate cho asset, handler `push`. Chỉ đăng ký ở bản production.
- Deploy: `npm run build` rồi đưa `dist/` lên host tĩnh **bắt buộc HTTPS** (Netlify, Vercel, Cloudflare Pages, Firebase Hosting…) với rewrite mọi đường dẫn về `/index.html`.
- Cài đặt: iPhone → Safari → Chia sẻ → “Thêm vào Màn hình chính”; Android → Chrome → “Cài đặt ứng dụng” (có hướng dẫn ngay trong app: *Của chúng mình → Cài đặt app*).

## Trạng thái triển khai (trung thực)

**Đã có và dùng được (demo mode):** onboarding 4 bước (RHF + Zod, lưu nháp, xem trước kế hoạch trực tiếp, avatar có tải ảnh) · tạo heo (6 kiểu, màu, nền, tên, xem thử chuyển động) · dashboard · mở số tiền hằng ngày với slot animation (tôn trọng reduced-motion, âm thanh/rung tuỳ chọn) · xác nhận khoản góp · nạp thêm · nhật ký (lọc, tìm kiếm, chi tiết, audit cũ→mới, huỷ khoản chờ thay vì xoá) · thống kê & biểu đồ (Recharts, dự báo có nhãn “ước tính”) · thử thách & phần thưởng · trang đôi bạn + sửa quy tắc (có nhật ký thay đổi) · thông báo trong app · xuất dữ liệu · đồng bộ giữa các tab · offline shell.

**Chưa làm / chưa hoàn chỉnh:**
- `SupabaseRepository` phía client (migration + RPC đã có; chưa nối UI, chưa có đăng nhập email/Google, chưa có luồng nhận/từ chối lời mời thực tế, realtime thật giữa 2 thiết bị).
- Đồng ý của *cả hai* khi đổi quy tắc chỉ là hộp kiểm trong demo (cần bảng yêu cầu thay đổi + phê duyệt khi có backend).
- Web Push thật (cần VAPID + Edge Function); hiện chỉ xin quyền và có handler trong service worker.
- Hàng đợi nạp tiền offline + đồng bộ/giải quyết xung đột; đính kèm ảnh vào giao dịch; rút tiền; ghi chú chỉnh sửa sau; “rời hành trình”; tuỳ chọn người còn lại xác nhận “đã nhận”.
- Mở khoá phụ kiện/nền theo thử thách (phần thưởng hiện là huy hiệu sưu tập).
- Chưa có ESLint, test E2E, kiểm thử trợ năng tự động; icon/mascot là SVG minh hoạ tạm.
