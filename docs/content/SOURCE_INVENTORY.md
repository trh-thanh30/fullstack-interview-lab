# Source inventory

Inventory được rà soát cho ING-001. Đây là catalog đầu vào; việc parse Markdown/PDF thuộc ING-002 và ING-003.

## Nguồn được chọn

| Nguồn | Loại | Phạm vi | License note |
|---|---|---:|---|
| `/home/trh_thanh30/Documents/fullstack-interviews` | Markdown | 67 file | Không tìm thấy license file; chỉ dùng nội bộ cho tới khi xác minh quyền sử dụng |
| `/home/trh_thanh30/Documents/e-book/Kiến trúc ứng dụng web.pdf` | PDF | 1 file | Tài liệu người dùng cung cấp; cần xác minh quyền trước khi phân phối |
| `/home/trh_thanh30/Documents/e-book/system-degisn.pdf` | PDF | 1 file | Tài liệu người dùng cung cấp; cần xác minh quyền trước khi phân phối |

`fullstack-interviews` có nội dung Frontend, Backend, DevOps, database, nền tảng máy tính, security và design patterns. Asset hình ảnh và source-code example không thuộc source type của ING-001 nên scanner bỏ qua.

## Loại khỏi pipeline

| File | Lý do |
|---|---|
| `/home/trh_thanh30/Documents/e-book/TranHuuThanhCV.pdf` | Dữ liệu cá nhân, không phải tài liệu phỏng vấn |
| `/home/trh_thanh30/Documents/e-book/Báo giá hệ thống Booking.docx` | Không thuộc phạm vi nội dung và DOCX chưa phải source type được hỗ trợ |
| `.git`, image assets và dependency/build directories | Metadata repository hoặc định dạng chưa được ING-001 hỗ trợ |

## Đăng ký vào database

Sau khi cấu hình `DATABASE_URL` và chạy migration:

```bash
pnpm source:scan -- /home/trh_thanh30/Documents/fullstack-interviews \
  --license-note "Internal use only; license review pending"

pnpm source:scan -- \
  "/home/trh_thanh30/Documents/e-book/Kiến trúc ứng dụng web.pdf" \
  "/home/trh_thanh30/Documents/e-book/system-degisn.pdf" \
  --license-note "User-provided material; redistribution rights pending"

pnpm source:list
pnpm source:list -- --status outdated
```

Scanner chỉ đăng ký metadata và checksum, chưa tạo `source_chunks`. Chạy lại an toàn: checksum giống nhau trả `unchanged`/`duplicate`; nội dung thay đổi tại cùng URI chuyển source sang `outdated` để importer xử lý lại.

## Markdown allowlist của ING-002

Importer ban đầu chỉ quét các directory đã phê duyệt:

- `frontend/javascript`
- `frontend/react`
- `backend/nodejs`
- `backend/nestjs`
- `devops/docker`

Allowlist hiện có 8 file Markdown, bao gồm đầy đủ năm README bắt buộc. Kết quả parse kiểm chứng là 322 section chunks với checksum duy nhất trong từng source. Các directory khác trong kho sẽ được thêm có chủ đích sau khi kiểm tra chất lượng và quyền sử dụng.
