# Phase 8 — Production hardening

[← Roadmap](../README.md)

## Mục tiêu

Kiểm soát chi phí, lỗi, bảo mật và chất lượng AI trước khi dùng thường xuyên.

## Cards

- [x] [OPS-001 — Observability và cost controls](./OPS-001.md)
- [x] [OPS-002 — Security và privacy review](./OPS-002.md)
- [x] [OPS-003 — AI evaluation regression suite](./OPS-003.md)
- [ ] [OPS-004 — Production release](./OPS-004.md)

## Exit criteria

- [x] Có production runbook và backup strategy.
- [x] Có cost limit, error visibility và regression tests cho AI.
- [ ] Không còn P0 issue mở.

## Trạng thái release

Source hardening đã hoàn tất. OPS-004 còn cần thao tác ngoài repository: tạo/test Neon recovery point, cấu hình Vercel Production, chạy migration/seed và authenticated smoke test trên deployment thật.

## Verification

- `pnpm quality` pass: test layout, secret scan, offline eval gate, lint, type-check, 44 test files / 116 tests và production build.
- Build manifest có `/ops`, `/settings/privacy` và authenticated `/api/privacy/export`.
- `git diff --check` pass; live Gemini eval và production smoke chỉ chạy khi có credential môi trường đích.

## Điều hướng

[← Phase 7](../phase-7-learning-loop/README.md) · [Về roadmap](../README.md)

