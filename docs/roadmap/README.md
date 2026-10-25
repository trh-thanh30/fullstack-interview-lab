# Interview Platform — Feature Roadmap

Đây là bộ tài liệu làm việc chính. Mỗi feature có một file độc lập để dễ giao việc, triển khai, review và đánh dấu tiến độ.

## Cách sử dụng

1. Mở phase đang thực hiện.
2. Chọn card đầu tiên chưa hoàn thành nhưng đã đủ dependencies.
3. Đổi `Status` trong card từ `TODO` thành `IN_PROGRESS`.
4. Hoàn thành Tasks và Acceptance criteria trong card.
5. Chạy test, cập nhật tài liệu rồi đổi trạng thái thành `DONE`.
6. Tick card tương ứng trong `README.md` của phase.

## Trạng thái

- `TODO`: Chưa bắt đầu.
- `IN_PROGRESS`: Đang triển khai.
- `BLOCKED`: Không thể tiếp tục; ghi rõ blocker trong card.
- `DONE`: Đã đạt toàn bộ acceptance criteria và Definition of Done.

## Tiến độ theo phase

| Phase | Nội dung | Cards | Trạng thái |
|---|---|---:|---|
| [Phase 0](./phase-0-foundation/README.md) | Product baseline và kiến trúc | 4 | TODO |
| [Phase 1](./phase-1-content-ingestion/README.md) | Content ingestion | 4 | TODO |
| [Phase 2](./phase-2-question-bank/README.md) | Question bank và review | 3 | TODO |
| [Phase 3](./phase-3-quiz-mvp/README.md) | Trắc nghiệm MVP | 4 | TODO |
| [Phase 4](./phase-4-ai-essay/README.md) | Tự luận có AI đánh giá | 4 | TODO |
| [Phase 5](./phase-5-mock-interview/README.md) | Mock interview thích ứng | 4 | TODO |
| [Phase 6](./phase-6-system-design-coding/README.md) | System design và coding | 3 | TODO |
| [Phase 7](./phase-7-learning-loop/README.md) | Learning loop | 3 | TODO |
| [Phase 8](./phase-8-production/README.md) | Production hardening | 4 | TODO |

## Definition of Done chung

- [ ] Acceptance criteria của card đều đạt.
- [ ] Type-check, lint và test liên quan đều pass.
- [ ] Không để API key hoặc secret xuất hiện ở client/log.
- [ ] Loading, empty state và error state đã được xử lý.
- [ ] Schema thay đổi có migration tương ứng.
- [ ] AI output được kiểm tra bằng Zod trước khi lưu.
- [ ] Có thể sử dụng bằng keyboard ở các luồng chính.
- [ ] Preview deployment hoạt động.
- [ ] README hoặc tài liệu liên quan đã được cập nhật.

## Vertical slice đầu tiên

Ưu tiên hoàn thành theo thứ tự:

1. Phase 0.
2. `QB-001` với 20 câu seed thủ công.
3. Phase 3 — Quiz MVP.
4. Deploy bản trắc nghiệm đầu tiên lên Vercel.
5. Quay lại Phase 1, `QB-002`, `QB-003` và các feature AI.

## Tài liệu tổng hợp

- [Roadmap đầy đủ dạng Markdown](../INTERVIEW_PLATFORM_IMPLEMENTATION_ROADMAP.md)
- [Roadmap đầy đủ dạng DOCX](../interview-platform-roadmap.docx)

