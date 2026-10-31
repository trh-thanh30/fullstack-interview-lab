# Card MOCK-002 — Adaptive question selection

**Status:** DONE


**Priority:** P0  
**Size:** L  
**Dependencies:** MOCK-001, QB-003

**Outcome:** Câu tiếp theo dựa trên cấu hình, lịch sử và chất lượng câu trả lời.

**Tasks:**

- [x] Chọn câu mở đầu từ question bank đã duyệt.
- [x] Dùng rule trước để đảm bảo coverage topic/level.
- [x] Cho AI chọn giữa follow-up hoặc chuyển câu mới bằng structured decision.
- [x] Giới hạn số follow-up trên mỗi câu.
- [x] Không lặp lại câu đã hỏi trong session.

**Acceptance criteria:**

- [x] Session luôn tôn trọng số câu/thời lượng đã cấu hình.
- [x] Câu trả lời hời hợt có thể tạo follow-up phù hợp.
- [x] AI failure có deterministic fallback sang câu kế tiếp.

## Implementation notes

- Rule engine chỉ lấy `published` short-answer/deep-dive có rubric, ưu tiên topic ít được hỏi rồi level khớp và loại toàn bộ question ID đã dùng.
- Gemini trả structured decision `follow_up | next_question`; server vẫn áp giới hạn follow-up, score threshold, question count và deadline.
- Provider/evaluation failure không làm mất answer và luôn fallback deterministic sang câu bank tiếp theo.

