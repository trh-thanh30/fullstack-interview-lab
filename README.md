# Interview Lab

Website cá nhân để luyện phỏng vấn Fullstack bằng question bank có nguồn, trắc nghiệm, tự luận có rubric và mock interview với AI.

## Chạy local

Yêu cầu Node.js 22+ và pnpm 10+.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Mở `http://localhost:3000`.

## Quality checks

```bash
pnpm lint
pnpm check:test-layout
pnpm typecheck
pnpm test:run
pnpm build
```

Chạy toàn bộ quality gate giống CI bằng:

```bash
pnpm quality
```

Test phải nằm trong thư mục `tests/` gần module tương ứng. Xem [testing conventions](./docs/engineering/TESTING_CONVENTIONS.md) trước khi thêm test, mock hoặc fixture mới.

## Environment variables

`.env.example` là danh sách biến cấu hình. Secret chỉ được đặt trong `.env.local` hoặc deployment environment, không commit vào repository.

Các integration chưa được triển khai có thể để giá trị trống. Khi một feature cần biến bắt buộc, server sử dụng `getRequiredEnv` để dừng với lỗi chỉ rõ tên biến bị thiếu.

## Authentication

Ứng dụng dùng Auth.js với GitHub OAuth và JWT session. Trước khi chạy luồng đăng nhập:

1. Tạo GitHub OAuth App.
2. Đặt callback local là `http://localhost:3000/api/auth/callback/github`.
3. Điền `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` và `ALLOWED_EMAILS` trong `.env.local`.
4. Với Vercel, tạo thêm callback `https://<domain>/api/auth/callback/github` và cấu hình cùng các biến trong Project Settings.

`ALLOWED_EMAILS` nhận nhiều email, phân tách bằng dấu phẩy, dấu chấm phẩy hoặc khoảng trắng. Nếu biến trống, mọi tài khoản đều bị từ chối theo nguyên tắc fail-closed.

Chi tiết các lớp bảo vệ nằm tại [AUTHENTICATION.md](./docs/system-design/AUTHENTICATION.md).

## CI/CD và Vercel

GitHub Actions chạy lint, type-check, test và production build cho pull request và mọi push vào `main`. CI không nhận `DATABASE_URL`; database integration test chạy bằng PGlite in-memory.

- [Chiến lược environment](./docs/deployment/ENVIRONMENTS.md)
- [Production deployment checklist](./docs/deployment/PRODUCTION_CHECKLIST.md)
- Vercel build contract: [`vercel.json`](./vercel.json)

## Database

Production dùng Neon PostgreSQL; schema và migration được quản lý bằng Drizzle.

```bash
# Sinh migration sau khi thay đổi src/db/schema/*
pnpm db:generate

# Cần DATABASE_URL
pnpm db:migrate
pnpm db:seed

# Mở Drizzle Studio
pnpm db:studio
```

Migration integration test dùng PostgreSQL in-memory qua PGlite và pgvector, vì vậy có thể xác nhận migration chạy từ database trống mà không cần dùng database production.

## Source registry

Đăng ký metadata và SHA-256 checksum của Markdown/PDF trước khi import nội dung:

```bash
pnpm source:register -- --file /absolute/path/to/source.md
pnpm source:scan -- /absolute/path/to/source-directory
pnpm source:list
pnpm source:list -- --status outdated
```

Các lệnh cần `DATABASE_URL`. Inventory nguồn ban đầu nằm tại [SOURCE_INVENTORY.md](./docs/content/SOURCE_INVENTORY.md).

Import các Markdown thuộc allowlist JavaScript, React, Node.js, NestJS và Docker:

```bash
pnpm source:import-markdown -- \
  --root /home/trh_thanh30/Documents/fullstack-interviews \
  --license-note "Internal use only; license review pending"
```

Importer chia chunk theo section heading, giữ nguyên Markdown của paragraph, list, image và fenced code block. Lỗi được cô lập theo file và batch trả exit code khác `0` nếu có file thất bại.

## UI foundation

Design system dùng shadcn/ui `base-nova`, Tailwind CSS v4 và Base UI primitives. Xem [quy ước UI](./docs/system-design/DESIGN_SYSTEM.md) trước khi thêm component mới.

Domain model và các quyết định persistence nằm tại [DOMAIN_MODEL.md](./docs/system-design/DOMAIN_MODEL.md).

## Roadmap

- [Roadmap theo từng feature card](./docs/roadmap/README.md)
- [Card vừa hoàn thành: FND-003](./docs/roadmap/phase-0-foundation/FND-003.md)
