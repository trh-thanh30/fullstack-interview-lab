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

## PDF allowlist của ING-003

PDF importer chỉ nhận hai filename tại root của thư mục e-book:

- `Kiến trúc ứng dụng web.pdf`
- `system-degisn.pdf`

`TranHuuThanhCV.pdf` không nằm trong allowlist nên không thể bị import nhầm. Kết quả `pdftotext -layout` thực tế tạo 59 chunks cho ebook kiến trúc và 93 chunks cho system design. Trang cover/trống không tạo chunk nhưng page number gốc vẫn được giữ; vì vậy chunk đầu tiên của cả hai tài liệu có `pageNumber = 2`.

## Normalize và deduplicate của ING-004

Sau khi Markdown/PDF đã được import, chạy `pnpm source:normalize`. Pipeline:

1. Chuẩn hóa alias technology về slug trong taxonomy, ví dụ `Node`, `NodeJS`, `Node.js` thành `nodejs`.
2. Gắn topic/category, một hoặc nhiều technology, level và content type cho từng chunk.
3. Chỉ gọi Gemini Embeddings cho chunk chưa có vector hoặc được tạo bởi model khác.
4. So checksum giữa các source trước; các cặp khác checksum mới được so cosine similarity.
5. Upsert kết quả vào `source_duplicate_candidates` với trạng thái `pending`; không xóa source hoặc chunk.

CLI in tổng số chunk theo category, technology, level và content type. Tối đa 20 duplicate candidates được preview cùng similarity, title, heading và URI của cả hai nguồn; toàn bộ kết quả vẫn nằm trong review queue.
