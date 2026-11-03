# Card LEARN-002 — Weak-topic recommendations

**Status:** DONE


**Priority:** P1  
**Size:** M  
**Dependencies:** LEARN-001

**Outcome:** Hệ thống đề xuất chính xác nội dung cần ôn tiếp.

**Tasks:**

- [x] Tính weakness score từ recency, accuracy và rubric dimension.
- [x] Dùng rule deterministic để xếp hạng topic.
- [x] Dùng AI chỉ để diễn giải kế hoạch, không tự sửa thống kê.
- [x] Cho phép tạo session trực tiếp từ recommendation.

**Acceptance criteria:**

- [x] Recommendation luôn giải thích được bằng dữ liệu lịch sử.
- [x] Topic chưa đủ sample được ghi rõ là độ tin cậy thấp.

## Implementation notes

- Ranking dùng công thức cố định: 55% performance gap, 25% recency và 20% rubric gap.
- Card hiển thị accuracy, rubric average, recency, sample count và confidence; ít hơn ba mẫu là `low`.
- Gemini structured output chỉ nhận ranking cố định để viết narrative; action tạo MCQ session bằng topic ID đã kiểm tra server-side.

