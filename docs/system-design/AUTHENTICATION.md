# Authentication và private access

## Mục tiêu

Interview Lab là workspace cá nhân. GitHub xác thực danh tính, còn `ALLOWED_EMAILS` quyết định tài khoản nào được truy cập. Hệ thống mặc định từ chối nếu allowlist trống hoặc OAuth không trả về email.

## Luồng đăng nhập

1. Người dùng mở một route riêng tư.
2. `src/proxy.ts` gọi Auth.js và chuyển session không hợp lệ tới `/sign-in`.
3. `/sign-in` bắt đầu GitHub OAuth với scope `read:user user:email`.
4. Callback `signIn` so sánh email đã chuẩn hóa với `ALLOWED_EMAILS` bằng exact match.
5. Callback `jwt` upsert hồ sơ vào bảng `users`, sau đó lưu UUID nội bộ trong token.
6. Callback `session` chỉ đưa `id`, `email`, `name` và `image` cần thiết vào session.

Nếu email không hợp lệ, Auth.js chuyển tới `/unauthorized` và không tạo session dùng được.

## Các lớp bảo vệ

| Lớp | Trách nhiệm |
|---|---|
| Auth.js callback | Chặn email ngoài allowlist trước khi phát hành session |
| Next.js Proxy | Redirect sớm page request chưa đăng nhập; không phải ranh giới bảo mật duy nhất |
| Auth DAL | `getAuthenticatedUser` và `requireAuthenticatedUser` xác minh lại session cùng allowlist |
| Route Handler | Gọi DAL và tự trả `401`; `/api/me` là implementation tham chiếu |
| Server Action | Gọi `requireAuthenticatedUser` trước mutation; sign-out action là implementation tham chiếu |

API route được đi qua Proxy có chủ đích để handler tự quyết định status code và response format. Mọi Route Handler hoặc Server Action mới có dữ liệu riêng tư phải gọi Auth DAL, không chỉ ẩn nút ở UI.

## Environment variables

| Biến | Ý nghĩa |
|---|---|
| `AUTH_SECRET` | Secret ký/mã hóa session; phải khác nhau giữa môi trường |
| `AUTH_GITHUB_ID` | Client ID của GitHub OAuth App |
| `AUTH_GITHUB_SECRET` | Client secret của GitHub OAuth App |
| `ALLOWED_EMAILS` | Danh sách email được phép, phân tách bằng dấu phẩy, chấm phẩy hoặc whitespace |

GitHub callback URL:

- Local: `http://localhost:3000/api/auth/callback/github`
- Vercel: `https://<domain>/api/auth/callback/github`

Không prefix các biến trên bằng `NEXT_PUBLIC_`; chúng chỉ được đọc ở server. Auth.js tự nhận diện Vercel là trusted host. Nếu chạy `next start` sau reverse proxy khác, cấu hình `AUTH_URL` chuẩn hoặc `AUTH_TRUST_HOST` theo hạ tầng thực tế.

## Quy tắc mở rộng

- Chỉ lưu DTO user tối thiểu trong session, không truyền token OAuth xuống client.
- Thay đổi `ALLOWED_EMAILS` có hiệu lực ở request kế tiếp vì DAL kiểm tra lại allowlist, kể cả với session đã tồn tại.
- Mutation phải lấy `user.id` từ DAL; không nhận user ID đáng tin cậy từ form hoặc request body.
- Khi thêm provider mới, mọi provider vẫn phải đi qua cùng callback allowlist và user upsert.
