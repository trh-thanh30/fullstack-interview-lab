# Production deployment checklist

## Trước khi deploy lần đầu

- [ ] GitHub repository đã được import vào Vercel và Production Branch là `main`.
- [ ] GitHub branch protection yêu cầu check `Quality gate` pass trước khi merge.
- [ ] Preview deployment xuất hiện trên pull request thử nghiệm.
- [ ] Neon Development, Preview và Production được tách riêng.
- [ ] Migration đã chạy trên database Preview trước Production.
- [ ] GitHub OAuth App production dùng callback `https://<production-domain>/api/auth/callback/github`.
- [ ] `AUTH_SECRET`, OAuth credentials và database credential không xuất hiện trong source hoặc build log.
- [ ] `ALLOWED_EMAILS` Production chỉ chứa tài khoản được phê duyệt.

## Quality gate cho mỗi release

- [ ] `pnpm install --frozen-lockfile` thành công.
- [ ] `pnpm lint` pass.
- [ ] `pnpm typecheck` pass.
- [ ] `pnpm test:run` pass.
- [ ] `pnpm build` pass.
- [ ] Preview smoke test: `/sign-in` trả `200`.
- [ ] Preview smoke test: truy cập route private khi chưa login chuyển về `/sign-in`.
- [ ] Preview smoke test: `/api/me` trả `401` khi chưa login.
- [ ] Đăng nhập bằng email allowlist thành công trên môi trường đích.
- [ ] Email ngoài allowlist bị từ chối.

## Deploy Production

1. Kiểm tra deployment Preview của đúng commit.
2. Chụp hoặc ghi lại migration/version hiện tại nếu release có schema change.
3. Chạy migration Production bằng credential Production từ môi trường quản trị an toàn.
4. Merge pull request vào `main`; Vercel Git integration tạo Production deployment.
5. Kiểm tra deployment log và function log không chứa secret hoặc lỗi Auth.js/database.
6. Chạy lại ba smoke test và một login thật trên production domain.

## Rollback

1. Nếu chỉ application lỗi, dùng Vercel **Instant Rollback** về deployment Production ổn định gần nhất.
2. Nếu migration không tương thích ngược, dừng rollout và áp dụng rollback/forward-fix đã chuẩn bị cho migration; không tự ý xóa dữ liệu.
3. Nếu secret lộ, rotate secret tại provider trước, cập nhật Vercel và redeploy; rollback code không thu hồi được secret đã lộ.
4. Ghi lại incident, commit lỗi, deployment URL và bước khắc phục.

## Sau deploy

- [ ] Production route và auth flow hoạt động.
- [ ] Database Production không nhận traffic từ Preview.
- [ ] Không có spike lỗi trong Vercel logs.
- [ ] Card/release note ghi deployment URL và commit đã phát hành.
