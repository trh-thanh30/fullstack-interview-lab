# Card MOCK-003 — Interview room UI

**Status:** DONE


**Priority:** P0  
**Size:** M  
**Dependencies:** MOCK-002

**Outcome:** Giao diện tập trung giống một vòng phỏng vấn thực tế.

**Tasks:**

- [x] Hiển thị interviewer turn, answer composer, timer và progress.
- [x] Cho phép kết thúc sớm có xác nhận.
- [x] Không hiển thị score chi tiết giữa session theo mặc định.
- [x] Autosave câu trả lời và trạng thái kết nối.

**Acceptance criteria:**

- [x] Double-click submit không tạo hai turn.
- [x] Có thể resume session trên thiết bị khác sau khi đăng nhập.
- [x] UI vẫn dùng được khi AI response chậm.

## Implementation notes

- `/interview/session/[id]` hiển thị timer server deadline, progress câu chính, transcript gọn và composer; score được giữ kín đến report.
- Draft autosave sau 700 ms vào database. Pending UI khóa submit, còn unique answer + session version chặn double request ở server.
- Setup, active, slow AI, interrupted evaluation, abandoned và error đều có trạng thái phục hồi rõ ràng.

