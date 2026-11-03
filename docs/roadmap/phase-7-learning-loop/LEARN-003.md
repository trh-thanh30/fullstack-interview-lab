# Card LEARN-003 — Spaced repetition

**Status:** DONE


**Priority:** P2  
**Size:** M  
**Dependencies:** LEARN-001

**Outcome:** Câu sai hoặc chưa vững được đưa lại đúng thời điểm.

**Tasks:**

- [x] Lưu ease, interval, dueAt và lần review gần nhất.
- [x] Cập nhật lịch dựa trên kết quả, confidence và lần trả lời.
- [x] Tạo daily review queue.

**Acceptance criteria:**

- [x] Câu overdue được ưu tiên trước câu mới khi chọn review mode.
- [x] Người dùng có thể reset lịch của một câu.

## Implementation notes

- `review_schedules` lưu ease, interval, repetitions, due time, last result/confidence và ownership theo user.
- MCQ player thu confidence 1–3; biến thể SM-2 reset câu sai về một ngày và có ease floor 1.3.
- Daily queue sort overdue theo `due_at` trước khi thêm câu mới; session giữ đúng thứ tự explicit question IDs và reset không xóa answer history.

