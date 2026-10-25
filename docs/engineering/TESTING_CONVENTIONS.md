# Testing conventions

## Directory layout

Test code không đặt cạnh production code. Mỗi module có thư mục `tests/` riêng:

```text
src/
├── content/
│   ├── file-sources.ts
│   ├── source-registry.ts
│   └── tests/
│       ├── file-sources.test.ts
│       └── source-registry.test.ts
├── db/
│   ├── schema/
│   ├── seed.ts
│   └── tests/
│       └── schema.integration.test.ts
└── lib/
    ├── env.ts
    └── tests/
        └── env.test.ts
```

Quy tắc:

- Unit test, component test và integration test nằm trong `tests/` gần module được kiểm thử nhất.
- Giữ tên production file trong test name: `source-registry.ts` → `tests/source-registry.test.ts`.
- Mock dành riêng cho module nằm tại `tests/mocks/`; fixture nằm tại `tests/fixtures/`.
- Setup dùng chung và architecture test nằm trong `/tests` ở repository root.
- Script chỉ phục vụ kiểm tra test convention nằm trong `/tests/scripts`.
- Không tạo `__tests__` hoặc để `*.test.*`, `*.spec.*` trực tiếp cạnh source file.

## Ngoại lệ cho tool configuration

Các file sau không phải test artifact và phải nằm ở root để tool tự nhận diện:

- `vitest.config.mts`
- `eslint.config.mjs`
- `postcss.config.mjs`

Đuôi `.mjs`/`.mts` chỉ mô tả module format, không có nghĩa file đó là test. Chỉ chuyển file vào `tests/` khi vai trò của nó là test, test setup, mock hoặc fixture.

## Enforcement

```bash
pnpm check:test-layout
pnpm test:run
pnpm quality
```

`check:test-layout` làm CI fail nếu phát hiện test nằm ngoài `tests/`. `repository-layout.test.ts` cung cấp thêm regression test cho cùng convention.
