# Interview Platform — Implementation Roadmap

> Tài liệu triển khai theo từng feature card cho website tự luyện phỏng vấn Fullstack có AI, deploy trên Vercel.

> **Bản làm việc theo từng card:** [Mở roadmap đã tách file](./roadmap/README.md). File hiện tại được giữ làm bản tổng hợp và nguồn xuất DOCX.

## 1. Mục tiêu sản phẩm

Xây dựng một website cá nhân giúp:

- Luyện trắc nghiệm theo nhóm kiến thức, công nghệ và cấp độ.
- Trả lời câu hỏi tự luận và nhận đánh giá theo rubric.
- Thực hiện mock interview có câu hỏi nối tiếp thích ứng.
- Luyện system design theo một quy trình có cấu trúc.
- Theo dõi điểm yếu, lịch sử và kế hoạch ôn tập.
- Nhập, chuẩn hóa và kiểm duyệt câu hỏi từ Markdown, PDF và tài liệu chính thức.

## 2. Phạm vi MVP

### Trong phạm vi

- Một tài khoản cá nhân được phép truy cập.
- Question bank có nguồn, phiên bản và trạng thái kiểm duyệt.
- Trắc nghiệm, tự luận và mock interview bằng văn bản.
- AI trả về structured output, có rubric và source context.
- Dashboard tiến độ cơ bản.
- Deploy tự động lên Vercel.

### Chưa làm trong MVP

- Multi-tenant hoặc bán subscription.
- Voice interview thời gian thực.
- Chạy code không tin cậy trên server.
- Microservices, Kubernetes hoặc Elasticsearch.
- Fine-tuning model.
- Mobile application riêng.

## 3. Stack đã chốt

| Nhóm | Công nghệ |
|---|---|
| Application | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Validation | Zod, React Hook Form |
| Database | Neon PostgreSQL, pgvector |
| Data access | Drizzle ORM, Drizzle Kit |
| Authentication | Auth.js, Google hoặc GitHub OAuth, email allowlist |
| AI | Vercel AI SDK, OpenAI Responses API |
| Storage | Vercel Blob khi có upload tài liệu từ UI |
| Test | Vitest, Testing Library, Playwright |
| CI/CD | GitHub Actions, Vercel Preview/Production |
| Package manager | pnpm |

## 4. Quy ước feature card

- **P0:** Bắt buộc để MVP hoạt động.
- **P1:** Nên có trước bản dùng ổn định.
- **P2:** Nâng cấp sau MVP.
- **S:** Tối đa khoảng nửa ngày tập trung.
- **M:** Khoảng một đến hai ngày tập trung.
- **L:** Cần tách thành nhiều pull request hoặc task con.
- Chỉ bắt đầu card khi dependency của nó đã hoàn thành.
- Mỗi card phải có test tương xứng và không làm hỏng luồng đã hoàn thành.

## 5. Definition of Done chung

Một feature chỉ được đánh dấu hoàn thành khi:

- [ ] Acceptance criteria đều đạt.
- [ ] Type-check, lint và test liên quan đều pass.
- [ ] Không để API key hoặc secret xuất hiện ở client/log.
- [ ] Loading, empty state và error state đã được xử lý.
- [ ] Schema thay đổi có migration tương ứng.
- [ ] AI output được kiểm tra bằng Zod trước khi lưu.
- [ ] Có thể sử dụng bằng keyboard ở các luồng chính.
- [ ] Preview deployment hoạt động.
- [ ] README hoặc tài liệu liên quan đã được cập nhật.

---

# Phase 0 — Product baseline và kiến trúc

## Mục tiêu phase

Tạo khung dự án có thể chạy, test và deploy; thống nhất domain model trước khi phát triển feature.

## Exit criteria

- Ứng dụng chạy local và trên Vercel Preview.
- Database migration chạy được trên database development.
- Route riêng tư chỉ tài khoản allowlist truy cập được.
- CI chặn merge khi lint, type-check hoặc test fail.

### Card FND-001 — Bootstrap ứng dụng

**Priority:** P0  
**Size:** S  
**Dependencies:** Không

**Outcome:** Có skeleton Next.js production-ready.

**Tasks:**

- [ ] Khởi tạo Next.js App Router với TypeScript và pnpm.
- [ ] Cài Tailwind CSS, shadcn/ui và alias import.
- [ ] Tạo layout, navigation và các route placeholder.
- [ ] Thêm `.env.example` nhưng không commit secret.
- [ ] Thêm scripts `dev`, `build`, `lint`, `typecheck`, `test`.

**Acceptance criteria:**

- [ ] `pnpm build` thành công.
- [ ] Trang dashboard placeholder hiển thị responsive.
- [ ] Biến môi trường thiếu tạo lỗi rõ ràng khi khởi động server.

### Card FND-002 — Domain model và database schema

**Priority:** P0  
**Size:** M  
**Dependencies:** FND-001

**Outcome:** Có schema nền tảng cho question bank và interview session.

**Tasks:**

- [ ] Kết nối Neon PostgreSQL bằng Drizzle.
- [ ] Tạo các bảng: `users`, `topics`, `technologies`, `questions`, `question_choices`.
- [ ] Tạo các bảng: `rubrics`, `sources`, `source_chunks`, `question_sources`.
- [ ] Tạo các bảng: `interview_sessions`, `session_questions`, `answers`, `evaluations`.
- [ ] Tạo enum cho question type, level, status và session mode.
- [ ] Tạo migration đầu tiên và seed taxonomy cơ bản.

**Acceptance criteria:**

- [ ] Migration có thể chạy từ database trống.
- [ ] Seed tạo được Frontend, Backend, DevOps, Architecture và các technology ban đầu.
- [ ] Foreign key và unique constraint ngăn dữ liệu nguồn/câu hỏi bị liên kết sai.

### Card FND-003 — Authentication và private access

**Priority:** P0  
**Size:** S  
**Dependencies:** FND-001, FND-002

**Outcome:** Website chỉ tài khoản được cho phép mới truy cập được.

**Tasks:**

- [ ] Tích hợp Auth.js với Google hoặc GitHub OAuth.
- [ ] Thêm `ALLOWED_EMAILS` ở server environment.
- [ ] Bảo vệ dashboard, practice, interview và review routes.
- [ ] Thêm sign-in, unauthorized và sign-out states.

**Acceptance criteria:**

- [ ] Người chưa đăng nhập bị chuyển tới sign-in.
- [ ] Email không nằm trong allowlist không vào được app.
- [ ] Server Action và Route Handler đều tự kiểm tra quyền, không chỉ dựa vào UI.

### Card FND-004 — CI/CD foundation

**Priority:** P0  
**Size:** S  
**Dependencies:** FND-001

**Outcome:** Mọi thay đổi đều được kiểm tra và có preview deployment.

**Tasks:**

- [ ] Tạo GitHub Actions chạy install, lint, type-check, unit test và build.
- [ ] Kết nối repository với Vercel.
- [ ] Tách environment variables cho Development, Preview và Production.
- [ ] Viết checklist production deployment.

**Acceptance criteria:**

- [ ] Pull request tạo Vercel Preview URL.
- [ ] Một test fail làm CI fail.
- [ ] Production database không được dùng trong CI.

---

# Phase 1 — Content ingestion

## Mục tiêu phase

Đưa tài liệu hiện có vào hệ thống bằng pipeline có thể chạy lại, truy vết nguồn và chống trùng.

## Exit criteria

- Import được Markdown và hai PDF kiến trúc mẫu.
- Mỗi source chunk truy ngược được file, heading và vị trí tương đối.
- Chạy import lại không tạo bản ghi trùng.

### Card ING-001 — Source registry

**Priority:** P0  
**Size:** S  
**Dependencies:** FND-002

**Outcome:** Mọi nội dung nhập vào đều có metadata nguồn.

**Tasks:**

- [ ] Định nghĩa source type: Markdown, PDF, URL và manual.
- [ ] Lưu title, URI/path, checksum, license note, importedAt và lastReviewedAt.
- [ ] Tạo trạng thái `new`, `processed`, `failed`, `outdated`.
- [ ] Tạo lệnh CLI liệt kê source và trạng thái.

**Acceptance criteria:**

- [ ] Source cùng checksum không bị import lại.
- [ ] Source thay đổi nội dung được đánh dấu cần xử lý lại.

### Card ING-002 — Markdown importer

**Priority:** P0  
**Size:** M  
**Dependencies:** ING-001

**Outcome:** Import được kho `fullstack-interviews` thành các chunk có cấu trúc.

**Tasks:**

- [ ] Quét Markdown theo allowlist directory.
- [ ] Parse heading, paragraph, list, code block và image reference.
- [ ] Giữ breadcrumb theo file và heading.
- [ ] Tạo chunk theo section thay vì cắt theo số ký tự cố định.
- [ ] Ghi lỗi từng file mà không làm hỏng toàn bộ batch.

**Acceptance criteria:**

- [ ] Import được các README JavaScript, React, Node.js, NestJS và Docker.
- [ ] Code block không bị mất định dạng.
- [ ] Chạy importer hai lần cho ra cùng số record.

### Card ING-003 — PDF importer

**Priority:** P0  
**Size:** M  
**Dependencies:** ING-001

**Outcome:** Trích xuất được nội dung e-book kiến trúc và system design.

**Tasks:**

- [ ] Dùng `pdftotext` trong ingestion CLI chạy local.
- [ ] Lưu page number và heading khi có thể nhận diện.
- [ ] Loại header/footer lặp lại.
- [ ] Chuẩn hóa khoảng trắng nhưng không làm mất code hoặc bullet.
- [ ] Gắn cờ các trang có chất lượng trích xuất thấp để review.

**Acceptance criteria:**

- [ ] Import thành công `Kiến trúc ứng dụng web.pdf` và `system-degisn.pdf`.
- [ ] Một chunk có thể truy ngược về PDF và trang nguồn.
- [ ] Nội dung footer lặp không chiếm phần lớn kết quả retrieval.

### Card ING-004 — Normalize, classify và deduplicate

**Priority:** P0  
**Size:** L  
**Dependencies:** ING-002, ING-003

**Outcome:** Nội dung được gắn taxonomy và loại bỏ trùng lặp trước khi sinh câu hỏi.

**Tasks:**

- [ ] Chuẩn hóa tên công nghệ và alias, ví dụ `Node`, `NodeJS`, `Node.js`.
- [ ] Gắn category, technology, level và content type.
- [ ] Tạo embedding cho source chunk.
- [ ] Dùng exact hash trước, semantic similarity sau để tìm trùng.
- [ ] Không tự xóa; đưa kết quả nghi trùng vào review queue.

**Acceptance criteria:**

- [ ] Có báo cáo số chunk theo category/technology.
- [ ] Các chunk giống hệt nhau được nhận diện chính xác.
- [ ] Semantic duplicate hiển thị similarity và hai nguồn để người dùng quyết định.

---

# Phase 2 — Question bank và review workflow

## Mục tiêu phase

Tạo ngân hàng câu hỏi có version, rubric, nguồn dẫn và quy trình kiểm duyệt.

## Exit criteria

- Có thể tạo, sửa, preview, publish và archive câu hỏi.
- Câu hỏi chưa review không xuất hiện trong practice.
- Có tối thiểu 20 câu hỏi đã duyệt cho luồng end-to-end.

### Card QB-001 — Question CRUD

**Priority:** P0  
**Size:** M  
**Dependencies:** FND-002, FND-003

**Outcome:** Quản lý thủ công toàn bộ lifecycle của câu hỏi.

**Tasks:**

- [ ] Tạo danh sách với filter category, technology, level, type và status.
- [ ] Tạo form thêm/sửa câu hỏi bằng Zod.
- [ ] Hỗ trợ MCQ, short answer, deep dive và system design.
- [ ] Thêm preview giống giao diện practice.
- [ ] Hỗ trợ archive thay vì hard delete.

**Acceptance criteria:**

- [ ] Không thể publish MCQ nếu thiếu đáp án đúng.
- [ ] Không thể publish câu tự luận nếu thiếu rubric.
- [ ] Mọi câu published có ít nhất một source hoặc được đánh dấu manual.

### Card QB-002 — AI-assisted question generation

**Priority:** P0  
**Size:** M  
**Dependencies:** ING-004, QB-001

**Outcome:** AI đề xuất câu hỏi từ source chunk nhưng không tự publish.

**Tasks:**

- [ ] Chọn source chunk và loại câu hỏi muốn sinh.
- [ ] Yêu cầu AI trả structured output qua Zod schema.
- [ ] Sinh prompt, đáp án, explanation, level và rubric draft.
- [ ] Lưu model, prompt version, token usage và source IDs.
- [ ] Luôn lưu ở trạng thái `draft`.

**Acceptance criteria:**

- [ ] Output sai schema bị từ chối hoặc retry có giới hạn.
- [ ] Mỗi câu generated liên kết được với source đã dùng.
- [ ] AI không có API nào có thể publish trực tiếp.

### Card QB-003 — Review queue

**Priority:** P0  
**Size:** M  
**Dependencies:** QB-001, QB-002

**Outcome:** Có một nơi duyệt nhanh các câu hỏi AI tạo hoặc nội dung nghi trùng.

**Tasks:**

- [ ] Hiển thị question, answer, rubric và source cạnh nhau.
- [ ] Có action approve, edit, reject, merge và mark outdated.
- [ ] Thêm cảnh báo câu tương tự.
- [ ] Ghi audit metadata cho lần review gần nhất.

**Acceptance criteria:**

- [ ] Có thể review liên tục bằng keyboard.
- [ ] Reject yêu cầu reason ngắn.
- [ ] Publish cập nhật `lastReviewedAt` và reviewer.

---

# Phase 3 — Trắc nghiệm MVP

## Mục tiêu phase

Có phiên luyện trắc nghiệm hoàn chỉnh, lưu kết quả và giải thích sau khi trả lời.

## Exit criteria

- Người dùng tạo được session theo topic/level.
- Câu trả lời được lưu và chấm bằng code.
- Refresh trang không làm mất tiến độ.

### Card MCQ-001 — Practice configuration

**Priority:** P0  
**Size:** S  
**Dependencies:** QB-001

**Outcome:** Người dùng cấu hình bộ câu hỏi muốn luyện.

**Tasks:**

- [ ] Chọn category, technologies, level và số câu.
- [ ] Hiển thị số câu khả dụng trước khi bắt đầu.
- [ ] Có lựa chọn random hoặc ưu tiên câu chưa làm/sai nhiều.

**Acceptance criteria:**

- [ ] Không tạo session rỗng.
- [ ] Query chỉ lấy câu `published`.
- [ ] Cấu hình được validate ở server.

### Card MCQ-002 — Session engine

**Priority:** P0  
**Size:** M  
**Dependencies:** MCQ-001

**Outcome:** Session có snapshot câu hỏi ổn định trong suốt lần luyện.

**Tasks:**

- [ ] Tạo session và danh sách session questions.
- [ ] Random thứ tự câu và lựa chọn một lần khi bắt đầu.
- [ ] Lưu current position và trạng thái session.
- [ ] Hỗ trợ resume session chưa hoàn thành.

**Acceptance criteria:**

- [ ] Question bank thay đổi không làm biến đổi session đang chạy.
- [ ] Reload browser tiếp tục đúng câu hiện tại.
- [ ] Không thể submit answer hai lần ngoài ý muốn.

### Card MCQ-003 — Quiz experience

**Priority:** P0  
**Size:** M  
**Dependencies:** MCQ-002

**Outcome:** Giao diện làm bài nhanh, rõ ràng và dùng tốt bằng keyboard.

**Tasks:**

- [ ] Hiển thị progress, question, choices và submit action.
- [ ] Có loading, empty, error và reconnect states.
- [ ] Sau submit mới hiển thị đúng/sai và explanation.
- [ ] Không gửi answer key xuống client trước khi submit.

**Acceptance criteria:**

- [ ] Keyboard có thể chọn đáp án và sang câu tiếp theo.
- [ ] Mobile layout không tràn nội dung/code block.
- [ ] Browser devtools không thấy answer key trước khi trả lời.

### Card MCQ-004 — Result summary

**Priority:** P0  
**Size:** S  
**Dependencies:** MCQ-003

**Outcome:** Cuối session có báo cáo đủ để biết nên ôn gì tiếp.

**Tasks:**

- [ ] Hiển thị tổng điểm, thời gian và tỷ lệ đúng theo topic.
- [ ] Liệt kê câu sai cùng explanation và source.
- [ ] Cho phép tạo session mới chỉ từ các câu sai.

**Acceptance criteria:**

- [ ] Tổng điểm được tính từ dữ liệu server.
- [ ] Có thể mở lại kết quả session cũ.

---

# Phase 4 — Tự luận có AI đánh giá

## Mục tiêu phase

Đánh giá câu trả lời tự luận bằng rubric, đưa feedback có căn cứ và lưu đầy đủ trace cần thiết.

## Exit criteria

- AI evaluation trả đúng schema và có fallback khi lỗi.
- Feedback chỉ ra điểm đúng, thiếu và sai.
- Có thể tái đánh giá một answer với prompt/model mới mà không ghi đè lịch sử.

### Card AI-001 — AI provider abstraction

**Priority:** P0  
**Size:** M  
**Dependencies:** FND-001

**Outcome:** Có lớp gọi AI tập trung, có streaming, timeout và usage logging.

**Tasks:**

- [ ] Tích hợp Vercel AI SDK với OpenAI provider.
- [ ] Cấu hình model theo environment, không hard-code trong UI.
- [ ] Thêm timeout, retry có giới hạn và error mapping.
- [ ] Log model, latency, token usage, estimated cost và prompt version.
- [ ] Redact secret và nội dung nhạy cảm khỏi error log.

**Acceptance criteria:**

- [ ] Có thể thay model bằng environment/config.
- [ ] Request lỗi không làm session bị mất.
- [ ] Mọi AI call có correlation ID.

### Card AI-002 — Context retrieval

**Priority:** P0  
**Size:** M  
**Dependencies:** ING-004, AI-001

**Outcome:** Evaluator nhận đúng source context thay vì chỉ dựa vào kiến thức model.

**Tasks:**

- [ ] Embed câu hỏi hoặc retrieval query.
- [ ] Filter chunk theo technology, source status và version.
- [ ] Lấy top-k chunks và loại kết quả dưới similarity threshold.
- [ ] Gắn source IDs vào evaluation input/output.

**Acceptance criteria:**

- [ ] Câu React không retrieve tài liệu Docker nếu không liên quan.
- [ ] Khi không đủ context, evaluator phải biểu thị uncertainty.
- [ ] Có test dataset nhỏ để kiểm tra retrieval regression.

### Card AI-003 — Rubric-based evaluator

**Priority:** P0  
**Size:** L  
**Dependencies:** AI-001, AI-002, QB-001

**Outcome:** Chấm tự luận nhất quán theo các dimension đã định nghĩa.

**Tasks:**

- [ ] Định nghĩa schema: score, dimensions, strengths, missingPoints, incorrectClaims, suggestedAnswer.
- [ ] Chấm correctness, completeness, clarity và practical experience.
- [ ] Prompt evaluator chỉ sử dụng rubric và context được cung cấp.
- [ ] Validate và clamp score ở server.
- [ ] Lưu evaluation mới theo kiểu append-only.

**Acceptance criteria:**

- [ ] Cùng một rubric luôn sinh đủ dimension bắt buộc.
- [ ] Không có evidence thì không khẳng định một statement là sai chắc chắn.
- [ ] UI phân biệt rõ feedback AI với đáp án/reference đã kiểm duyệt.

### Card AI-004 — Short-answer practice UI

**Priority:** P0  
**Size:** M  
**Dependencies:** AI-003, MCQ-002

**Outcome:** Người dùng trả lời tự luận, xem feedback và trả lời lại.

**Tasks:**

- [ ] Tạo editor textarea có autosave.
- [ ] Stream trạng thái đang đánh giá mà không stream JSON lỗi ra UI.
- [ ] Hiển thị score breakdown và follow-up suggestion.
- [ ] Cho phép retry answer và so sánh hai lần.

**Acceptance criteria:**

- [ ] Reload trước submit không mất bản nháp.
- [ ] Submit nhiều lần tạo nhiều attempt, không ghi đè.
- [ ] Lỗi AI cho phép retry mà không nhập lại câu trả lời.

---

# Phase 5 — Mock interview thích ứng

## Mục tiêu phase

Tạo trải nghiệm phỏng vấn nhiều lượt, AI biết hỏi sâu nhưng vẫn bị kiểm soát bởi state machine và question bank.

## Exit criteria

- Một mock interview chạy được từ setup đến final summary.
- AI không thể tự ý bỏ qua state hoặc ghi dữ liệu ngoài schema.
- Session dở dang có thể resume.

### Card MOCK-001 — Interview state machine

**Priority:** P0  
**Size:** M  
**Dependencies:** AI-004

**Outcome:** Luồng interview có trạng thái rõ ràng và dễ phục hồi.

**Tasks:**

- [ ] Định nghĩa `setup`, `asking`, `answering`, `follow_up`, `evaluating`, `summary`, `abandoned`.
- [ ] Định nghĩa transition hợp lệ ở domain layer.
- [ ] Persist state và turn number sau mỗi bước.
- [ ] Ngăn hai request song song chuyển cùng một session.

**Acceptance criteria:**

- [ ] Transition không hợp lệ bị từ chối ở server.
- [ ] Refresh ở mọi state đều phục hồi được.
- [ ] Có unit test cho toàn bộ transition chính.

### Card MOCK-002 — Adaptive question selection

**Priority:** P0  
**Size:** L  
**Dependencies:** MOCK-001, QB-003

**Outcome:** Câu tiếp theo dựa trên cấu hình, lịch sử và chất lượng câu trả lời.

**Tasks:**

- [ ] Chọn câu mở đầu từ question bank đã duyệt.
- [ ] Dùng rule trước để đảm bảo coverage topic/level.
- [ ] Cho AI chọn giữa follow-up hoặc chuyển câu mới bằng structured decision.
- [ ] Giới hạn số follow-up trên mỗi câu.
- [ ] Không lặp lại câu đã hỏi trong session.

**Acceptance criteria:**

- [ ] Session luôn tôn trọng số câu/thời lượng đã cấu hình.
- [ ] Câu trả lời hời hợt có thể tạo follow-up phù hợp.
- [ ] AI failure có deterministic fallback sang câu kế tiếp.

### Card MOCK-003 — Interview room UI

**Priority:** P0  
**Size:** M  
**Dependencies:** MOCK-002

**Outcome:** Giao diện tập trung giống một vòng phỏng vấn thực tế.

**Tasks:**

- [ ] Hiển thị interviewer turn, answer composer, timer và progress.
- [ ] Cho phép kết thúc sớm có xác nhận.
- [ ] Không hiển thị score chi tiết giữa session theo mặc định.
- [ ] Autosave câu trả lời và trạng thái kết nối.

**Acceptance criteria:**

- [ ] Double-click submit không tạo hai turn.
- [ ] Có thể resume session trên thiết bị khác sau khi đăng nhập.
- [ ] UI vẫn dùng được khi AI response chậm.

### Card MOCK-004 — Final interview report

**Priority:** P0  
**Size:** M  
**Dependencies:** MOCK-003

**Outcome:** Sau interview có báo cáo tổng hợp và hành động ôn tập tiếp theo.

**Tasks:**

- [ ] Tổng hợp score theo topic và dimension.
- [ ] Liệt kê điểm mạnh, lỗ hổng và incorrect claims đáng chú ý.
- [ ] Liên kết từng nhận xét với answer/evaluation tương ứng.
- [ ] Đề xuất một practice set tiếp theo.

**Acceptance criteria:**

- [ ] Báo cáo không tạo score mới khác với evaluation từng câu mà không giải thích.
- [ ] Có thể truy cập lại report từ history.

---

# Phase 6 — System design và coding practice

## Mục tiêu phase

Mở rộng từ Q&A sang bài phỏng vấn mở, tập trung vào cách làm rõ yêu cầu và đánh đổi kỹ thuật.

## Exit criteria

- Hoàn thành được một phiên system design có checkpoint.
- Có rubric riêng cho requirement, estimation, architecture, data, scaling, reliability và security.

### Card SYS-001 — System design interview template

**Priority:** P1  
**Size:** L  
**Dependencies:** MOCK-004

**Outcome:** Có quy trình system design thay vì một ô chat tự do.

**Tasks:**

- [ ] Tạo problem template: context, functional requirements, non-functional requirements và constraints.
- [ ] Chia session thành clarify, estimate, high-level design, deep dive, trade-offs và summary.
- [ ] Tạo rubric cho từng checkpoint.
- [ ] Cho phép ghi chú kiến trúc dạng Markdown.

**Acceptance criteria:**

- [ ] Người dùng không bị ép theo một đáp án kiến trúc duy nhất.
- [ ] Feedback đánh giá trade-off và assumption, không chỉ tên công nghệ.
- [ ] Có ít nhất ba bài mẫu đã review.

### Card SYS-002 — Diagram attachment

**Priority:** P2  
**Size:** M  
**Dependencies:** SYS-001

**Outcome:** Có thể đính kèm sơ đồ cho bài system design.

**Tasks:**

- [ ] Cho phép upload ảnh hoặc lưu Mermaid text.
- [ ] Lưu file ở Vercel Blob và metadata trong PostgreSQL.
- [ ] Cho phép AI nhận image input khi model hỗ trợ.

**Acceptance criteria:**

- [ ] Chỉ chấp nhận MIME type và kích thước được cho phép.
- [ ] Xóa attachment khỏi session không để lại link công khai ngoài ý muốn.

### Card CODE-001 — Coding question workspace

**Priority:** P2  
**Size:** L  
**Dependencies:** QB-001

**Outcome:** Viết và lưu code answer mà chưa cần chạy code server-side.

**Tasks:**

- [ ] Tích hợp code editor có syntax highlighting.
- [ ] Lưu language, code và explanation.
- [ ] Cho AI review complexity, correctness assumptions và edge cases.
- [ ] Không thực thi code trong Vercel Function.

**Acceptance criteria:**

- [ ] Code draft được autosave.
- [ ] AI feedback ghi rõ code chưa được chạy nếu không có execution result.

---

# Phase 7 — Learning loop

## Mục tiêu phase

Biến lịch sử làm bài thành kế hoạch ôn tập có ích thay vì chỉ lưu điểm.

## Exit criteria

- Dashboard phản ánh đúng dữ liệu session.
- Có thể tạo practice set từ topic yếu hoặc câu đến hạn ôn lại.

### Card LEARN-001 — Progress dashboard

**Priority:** P1  
**Size:** M  
**Dependencies:** MCQ-004, AI-004

**Outcome:** Thấy tiến độ theo thời gian, topic và level.

**Tasks:**

- [ ] Hiển thị số session, thời gian luyện và accuracy.
- [ ] Hiển thị score trend cho self-answer và mock interview.
- [ ] Phân tích theo category, technology và rubric dimension.
- [ ] Có filter theo khoảng thời gian.

**Acceptance criteria:**

- [ ] Dashboard query không tính session abandoned vào điểm hoàn thành.
- [ ] Empty state hướng người dùng tới practice đầu tiên.

### Card LEARN-002 — Weak-topic recommendations

**Priority:** P1  
**Size:** M  
**Dependencies:** LEARN-001

**Outcome:** Hệ thống đề xuất chính xác nội dung cần ôn tiếp.

**Tasks:**

- [ ] Tính weakness score từ recency, accuracy và rubric dimension.
- [ ] Dùng rule deterministic để xếp hạng topic.
- [ ] Dùng AI chỉ để diễn giải kế hoạch, không tự sửa thống kê.
- [ ] Cho phép tạo session trực tiếp từ recommendation.

**Acceptance criteria:**

- [ ] Recommendation luôn giải thích được bằng dữ liệu lịch sử.
- [ ] Topic chưa đủ sample được ghi rõ là độ tin cậy thấp.

### Card LEARN-003 — Spaced repetition

**Priority:** P2  
**Size:** M  
**Dependencies:** LEARN-001

**Outcome:** Câu sai hoặc chưa vững được đưa lại đúng thời điểm.

**Tasks:**

- [ ] Lưu ease, interval, dueAt và lần review gần nhất.
- [ ] Cập nhật lịch dựa trên kết quả, confidence và lần trả lời.
- [ ] Tạo daily review queue.

**Acceptance criteria:**

- [ ] Câu overdue được ưu tiên trước câu mới khi chọn review mode.
- [ ] Người dùng có thể reset lịch của một câu.

---

# Phase 8 — Production hardening

## Mục tiêu phase

Kiểm soát chi phí, lỗi, bảo mật và chất lượng AI trước khi dùng thường xuyên.

## Exit criteria

- Có production runbook và backup strategy.
- Có cost limit, error visibility và regression tests cho AI.
- Không còn P0 issue mở.

### Card OPS-001 — Observability và cost controls

**Priority:** P0  
**Size:** M  
**Dependencies:** AI-001

**Outcome:** Biết AI call nào chậm, lỗi hoặc tốn chi phí bất thường.

**Tasks:**

- [ ] Dashboard token usage và estimated cost theo feature/model.
- [ ] Đặt max input/output token cho từng AI operation.
- [ ] Alert khi tỷ lệ lỗi hoặc chi phí vượt ngưỡng.
- [ ] Retention policy cho prompt/response logs.

**Acceptance criteria:**

- [ ] Có thể truy từ UI error tới server correlation ID.
- [ ] Một source quá lớn không thể tạo request vượt giới hạn đã đặt.

### Card OPS-002 — Security và privacy review

**Priority:** P0  
**Size:** M  
**Dependencies:** FND-003, MOCK-003

**Outcome:** Dữ liệu cá nhân và API endpoints được bảo vệ phù hợp.

**Tasks:**

- [ ] Kiểm tra authorization trên mọi mutation/read riêng tư.
- [ ] Thêm security headers và CSRF-safe patterns.
- [ ] Validate upload, URL và AI input ở server.
- [ ] Kiểm tra prompt injection từ imported content.
- [ ] Thêm chức năng export và xóa dữ liệu cá nhân.

**Acceptance criteria:**

- [ ] Người dùng không thể đọc session bằng ID đoán được nếu không được phép.
- [ ] Imported source không thể thay developer/system instruction.
- [ ] Secret scan không phát hiện credential trong repository.

### Card OPS-003 — AI evaluation regression suite

**Priority:** P0  
**Size:** L  
**Dependencies:** AI-003, MOCK-004

**Outcome:** Thay prompt/model không âm thầm làm chất lượng chấm điểm giảm.

**Tasks:**

- [ ] Tạo golden dataset gồm answer tốt, trung bình, sai và cố tình đánh lừa.
- [ ] Kiểm tra schema validity và score range tự động.
- [ ] So sánh evaluation mới với baseline có tolerance.
- [ ] Chạy eval thủ công trước khi đổi production model/prompt.

**Acceptance criteria:**

- [ ] Dataset bao phủ ít nhất Frontend, Backend, DevOps và System Design.
- [ ] Prompt/model version mới không deploy khi regression vượt threshold.

### Card OPS-004 — Production release

**Priority:** P0  
**Size:** M  
**Dependencies:** OPS-001, OPS-002, OPS-003

**Outcome:** Có bản production ổn định và có thể rollback.

**Tasks:**

- [ ] Chạy migration production qua quy trình đã định nghĩa.
- [ ] Seed taxonomy, source metadata và question đã duyệt.
- [ ] Cấu hình custom domain nếu cần.
- [ ] Smoke test auth, MCQ, self-answer, mock interview và report.
- [ ] Ghi lại rollback và database recovery procedure.

**Acceptance criteria:**

- [ ] Production smoke test pass.
- [ ] Có ít nhất một bản backup hoặc recovery path đã kiểm tra.
- [ ] Rollback application không yêu cầu rollback phá hủy database.

---

# 6. Thứ tự triển khai khuyến nghị

```text
FND-001
  ├─ FND-002 ─ FND-003
  └─ FND-004

FND-002
  └─ ING-001
      ├─ ING-002
      └─ ING-003
          └─ ING-004
              └─ QB-002

QB-001 ─ QB-002 ─ QB-003
  └─ MCQ-001 ─ MCQ-002 ─ MCQ-003 ─ MCQ-004
                          └─ AI-004

AI-001 ─ AI-002 ─ AI-003 ─ AI-004
                              └─ MOCK-001 ─ MOCK-002 ─ MOCK-003 ─ MOCK-004
                                                               ├─ SYS-001
                                                               └─ LEARN-001

AI-001 ─ OPS-001
AI-003 ─ OPS-003
FND-003 ─ OPS-002
OPS-001 + OPS-002 + OPS-003 ─ OPS-004
```

## Vertical slice đầu tiên nên hoàn thành

Không cần hoàn thiện toàn bộ ingestion trước khi thấy sản phẩm chạy. Slice đầu tiên nên là:

1. FND-001 đến FND-004.
2. QB-001 với 20 câu seed thủ công.
3. MCQ-001 đến MCQ-004.
4. Deploy một bản MVP trắc nghiệm.
5. Sau đó mới hoàn thiện ingestion và AI.

Slice này giúp kiểm chứng UX và data model sớm, trước khi chi phí AI và pipeline nội dung tăng lên.

# 7. Release milestones

| Milestone | Nội dung | Điều kiện phát hành |
|---|---|---|
| M0 — Skeleton | Phase 0 | App, auth, DB, CI/CD hoạt động |
| M1 — Quiz MVP | QB-001 + Phase 3 | 20+ câu đã duyệt, làm và xem kết quả được |
| M2 — Content Pipeline | Phase 1 + QB-002/003 | Import idempotent, có review queue |
| M3 — AI Self-answer | Phase 4 | Rubric evaluation có eval baseline |
| M4 — Mock Interview | Phase 5 | Session nhiều lượt và final report ổn định |
| M5 — Learning Platform | Phase 6 + 7 | System design, dashboard, recommendation |
| M6 — Production | Phase 8 | Security, observability, eval và runbook hoàn tất |

# 8. Backlog nội dung ban đầu

Ưu tiên tạo bộ câu hỏi đã duyệt theo thứ tự:

1. JavaScript và TypeScript fundamentals.
2. React và browser fundamentals.
3. Node.js event loop, streams và error handling.
4. NestJS modules, DI, guards, interceptors và validation.
5. SQL/PostgreSQL, transaction và indexing.
6. HTTP, networking, authentication và web security.
7. Docker, CI/CD và deployment strategies.
8. Design patterns, clean/hexagonal architecture.
9. System design: caching, queue, database, scalability, reliability và observability.
10. Next.js App Router, Server Components, caching và server/client boundary.

# 9. Các quyết định cần giữ xuyên suốt dự án

- MCQ được chấm bằng code; AI chỉ giải thích.
- Câu AI sinh luôn ở trạng thái draft.
- Evaluation là append-only và có model/prompt version.
- Question đã dùng trong session được snapshot.
- Official documentation được ưu tiên hơn các bài tổng hợp phỏng vấn.
- Mọi câu hỏi phải truy được nguồn hoặc được đánh dấu do người dùng tự soạn.
- Không thêm NestJS service riêng cho tới khi Next.js backend thực sự trở thành bottleneck.
- Không chạy code do AI/người dùng tạo trong Vercel Function.
- AI feedback là tín hiệu hỗ trợ, không được trình bày như chân lý tuyệt đối.

# 10. Checklist bắt đầu ngay

- [ ] Hoàn thành FND-001.
- [ ] Tạo Neon development database.
- [ ] Hoàn thành schema trong FND-002.
- [ ] Cấu hình OAuth và allowlist.
- [ ] Tạo GitHub repository và kết nối Vercel.
- [ ] Seed 20 câu hỏi đầu tiên.
- [ ] Hoàn thành vertical slice Quiz MVP.

