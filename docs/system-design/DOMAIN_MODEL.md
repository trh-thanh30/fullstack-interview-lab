# Interview Lab — Domain model

## Kiến trúc dữ liệu

PostgreSQL là system of record. Neon cung cấp PostgreSQL serverless cho production; Drizzle quản lý schema và migration. `pgvector` chỉ được dùng cho embedding của source chunks, còn question filtering và progress vẫn dùng relational query thông thường.

```mermaid
erDiagram
  users ||--o{ interview_sessions : owns
  users ||--o{ questions : authors
  topics ||--o{ technologies : groups
  topics ||--o{ questions : categorizes
  technologies ||--o{ question_technologies : tags
  questions ||--o{ question_technologies : has
  questions ||--o{ question_choices : contains
  questions ||--o{ rubrics : versions
  sources ||--o{ source_chunks : splits
  source_chunks ||--o{ question_sources : supports
  questions ||--o{ question_sources : cites
  interview_sessions ||--o{ session_questions : snapshots
  questions o|--o{ session_questions : originates
  session_questions ||--o{ answers : attempts
  answers ||--o{ evaluations : evaluated
  rubrics o|--o{ evaluations : applies
```

## Quyết định chính

- UUID được sinh tại PostgreSQL để client không kiểm soát identifier.
- Question dùng nhiều technology qua bảng nối, nhưng có đúng một topic chính.
- Rubric và evaluation là versioned/append-only để đổi prompt hoặc model không phá lịch sử.
- Session question lưu snapshot prompt, choices và rubric; chỉnh question bank không làm thay đổi session đang chạy.
- Source và source chunk có checksum/position unique để ingestion chạy lại an toàn.
- Foreign key `restrict` bảo vệ taxonomy/source đang được tham chiếu; dữ liệu session phụ thuộc user dùng cascade.
- Vector có 1536 chiều và HNSW cosine index; migration tạo extension `vector` trước khi tạo bảng.

## Migration và seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

`DATABASE_URL` chỉ nằm trong `.env.local` hoặc environment của Vercel. Test integration dùng PGlite in-memory kèm pgvector để chạy migration trên database rỗng.
