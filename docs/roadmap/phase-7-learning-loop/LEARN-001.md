# Card LEARN-001 — Progress dashboard

**Status:** DONE


**Priority:** P1  
**Size:** M  
**Dependencies:** MCQ-004, AI-004

**Outcome:** Thấy tiến độ theo thời gian, topic và level.

**Tasks:**

- [x] Hiển thị số session, thời gian luyện và accuracy.
- [x] Hiển thị score trend cho self-answer và mock interview.
- [x] Phân tích theo category, technology và rubric dimension.
- [x] Có filter theo khoảng thời gian.

**Acceptance criteria:**

- [x] Dashboard query không tính session abandoned vào điểm hoàn thành.
- [x] Empty state hướng người dùng tới practice đầu tiên.

## Implementation notes

- Route `/learn` aggregate trực tiếp từ session/answer/evaluation snapshots và hỗ trợ `7d`, `30d`, `90d`, `all`.
- Trend phân biệt essay, mock interview, system design và coding; breakdown gồm topic, technology, level và rubric dimension.
- Integration test xác nhận session `abandoned` không ảnh hưởng session count, duration, answer count hay accuracy.

