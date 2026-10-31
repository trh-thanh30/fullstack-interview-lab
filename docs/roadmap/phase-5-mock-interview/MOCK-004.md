# Card MOCK-004 — Final interview report

**Status:** DONE


**Priority:** P0  
**Size:** M  
**Dependencies:** MOCK-003

**Outcome:** Sau interview có báo cáo tổng hợp và hành động ôn tập tiếp theo.

**Tasks:**

- [x] Tổng hợp score theo topic và dimension.
- [x] Liệt kê điểm mạnh, lỗ hổng và incorrect claims đáng chú ý.
- [x] Liên kết từng nhận xét với answer/evaluation tương ứng.
- [x] Đề xuất một practice set tiếp theo.

**Acceptance criteria:**

- [x] Báo cáo không tạo score mới khác với evaluation từng câu mà không giải thích.
- [x] Có thể truy cập lại report từ history.

## Implementation notes

- Report tính average theo topic/dimension trực tiếp từ latest persisted evaluation của từng answer; không gọi model để tạo score tổng.
- Strength, gap và incorrect claim giữ `turnId`/`answerId`, liên kết ngược về evidence trong transcript.
- Practice recommendation lấy topic/dimension thấp nhất bằng rule minh bạch; history tự điều hướng session hoàn tất về report.

