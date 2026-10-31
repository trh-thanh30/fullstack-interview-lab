# Phase 4 — Tự luận có AI đánh giá

[← Roadmap](../README.md)

## Mục tiêu

Đánh giá câu trả lời tự luận bằng rubric, đưa feedback có căn cứ và lưu đầy đủ trace cần thiết.

## Cards

- [x] [AI-001 — AI provider abstraction](./AI-001.md)
- [x] [AI-002 — Context retrieval](./AI-002.md)
- [x] [AI-003 — Rubric-based evaluator](./AI-003.md)
- [x] [AI-004 — Short-answer practice UI](./AI-004.md)

## Exit criteria

- [x] AI evaluation trả đúng schema và có fallback khi lỗi.
- [x] Feedback chỉ ra điểm đúng, thiếu và sai.
- [x] Có thể tái đánh giá một answer với prompt/model mới mà không ghi đè lịch sử.

## Verification

- Test layout, ESLint và TypeScript đều pass.
- 28 test files / 68 tests pass, gồm PGlite migration + essay persistence, Gemini embedding contract, retrieval regression và server weighted scoring.
- Production build tạo thành công `/essay` và `/essay/session/[id]` với Cache Components.

## Điều hướng

[← Phase 3](../phase-3-quiz-mvp/README.md) · [Phase 5 →](../phase-5-mock-interview/README.md)

