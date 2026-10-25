# Card MOCK-002 — Adaptive question selection

**Status:** TODO


**Priority:** P0  
**Size:** L  
**Dependencies:** MOCK-001, QB-003

**Outcome:** Câu tiếp theo dựa trên cấu hình, lịch sử và chất lượng câu trả lời.

**Tasks:**

- [ ] Chọn câu mở đầu từ question bank đã duyệt.
- [ ] Dùng rule trước để đảm bảo coverage topic/level.
- [ ] Cho AI chọn giữa follow-up hoặc chuyển câu mới bằng structured decision.
- [ ] Giới hạn số follow-up trên mỗi câu.
- [ ] Không lặp lại câu đã hỏi trong session.

**Acceptance criteria:**

- [ ] Session luôn tôn trọng số câu/thời lượng đã cấu hình.
- [ ] Câu trả lời hời hợt có thể tạo follow-up phù hợp.
- [ ] AI failure có deterministic fallback sang câu kế tiếp.

