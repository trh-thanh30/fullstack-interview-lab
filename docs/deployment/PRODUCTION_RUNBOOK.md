# Production runbook

Runbook này dùng cho Interview Lab trên Vercel + Neon. Không chạy migration production từ CI dùng chung; người release dùng credential Production trong môi trường quản trị riêng.

## Release gate

1. Chạy `pnpm install --frozen-lockfile` và `pnpm quality`.
2. Chạy live Gemini regression bằng model định deploy: `pnpm ai:eval:live`.
3. Deploy commit lên Vercel Preview và smoke test toàn bộ luồng bằng tài khoản allowlist.
4. Xác nhận Preview dùng Neon Preview branch và private Blob Preview, không dùng credential Production.
5. Ghi commit SHA, Preview URL, migration cuối và model/prompt version vào release note.

## Backup và migration

1. Trong Neon **Backup & Restore**, tạo snapshot thủ công của Production branch trước migration hoặc xác nhận Point-in-Time Restore đang bật với restore window phù hợp.
2. Khôi phục snapshot/PITR vào một branch tách biệt và kiểm tra được bảng `users`, `questions`, `interview_sessions` trước khi coi recovery path đã được kiểm chứng.
3. Ghi timestamp/snapshot ID và người xác nhận vào release note.
4. Với đúng `DATABASE_URL` Production, chạy:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   pnpm release:verify-data
   ```

5. Migration phải backward-compatible với deployment ngay trước đó. Không xóa/đổi nghĩa column trong cùng release application.

`release:verify-data` mặc định yêu cầu ít nhất một source processed, 20 MCQ, bốn self-answer, một coding question đã publish và ba system-design templates. Import/normalize nguồn và review/publish question trước khi chạy lại nếu gate thất bại.

Neon PITR tạo trạng thái branch tại timestamp/LSN trong retention window. Snapshot phù hợp để giữ một recovery point lâu hơn và có thể restore sang branch riêng để kiểm tra trước khi chuyển traffic.

## Promote và smoke test

1. Promote Preview đã duyệt hoặc merge đúng commit vào production branch.
2. Cấu hình `PRODUCTION_URL` và cookie của tài khoản smoke riêng trong shell cục bộ, không lưu vào `.env` được commit.
3. Chạy `pnpm release:smoke`.
4. Kiểm tra thủ công:
   - GitHub OAuth + allowlist;
   - tạo và hoàn thành MCQ;
   - submit essay và nhận correlation ID nếu AI lỗi;
   - hoàn thành ít nhất một turn mock interview và mở report;
   - mở `/ops`, `/learn`, system design và coding workspace;
   - export privacy JSON.
5. Xác nhận Vercel logs không có secret, error spike hoặc request vượt input limit.

## Custom domain

Custom domain là tùy chọn. Trong Vercel Project → Settings → Domains, thêm domain, làm theo record được `vercel domains inspect` trả về và chỉ đổi `NEXT_PUBLIC_APP_URL`/OAuth callback sau khi DNS cùng TLS đã hợp lệ. Redeploy sau khi đổi environment variables.

## Application rollback

1. Nếu application lỗi nhưng schema còn tương thích, dùng Vercel Instant Rollback tới production deployment gần nhất đã biết tốt hoặc `vercel rollback <deployment-url>`.
2. Không rollback database chỉ vì rollback application. Deployment trước phải đọc được schema mới nhờ chính sách migration backward-compatible.
3. Sau Vercel rollback, kiểm tra domain assignment; auto-assignment production có thể bị tắt cho đến khi promote deployment mới.

## Database recovery

1. Dừng mutation/deploy mới và ghi incident timestamp.
2. Dùng Neon Time Travel Assist/PITR hoặc restore snapshot vào branch mới.
3. Kiểm tra dữ liệu trên branch phục hồi trước khi switch endpoint/connection.
4. Nếu cần dữ liệu phát sinh sau incident, export/copy có chọn lọc thay vì ghi đè mù.
5. Chạy smoke test authenticated sau recovery và ghi RPO/RTO thực tế.

## Incident checklist

- Correlation ID và feature/model từ `/ops`.
- Commit/deployment URL đang phục vụ traffic.
- Migration cuối và snapshot/PITR timestamp.
- Secret nào cần rotate.
- Hành động rollback/recovery và kết quả smoke test.

## Tài liệu provider

- [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback)
- [Vercel custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Neon Point-in-Time Restore](https://neon.com/blog/announcing-point-in-time-restore)
- [Neon snapshots](https://neon.com/blog/three-ways-to-use-your-snapshots)
