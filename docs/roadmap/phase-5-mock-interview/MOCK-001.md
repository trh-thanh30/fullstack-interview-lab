# Card MOCK-001 — Interview state machine

**Status:** TODO


**Priority:** P0  
**Size:** M  
**Dependencies:** AI-004

**Outcome:** Luồng interview có trạng thái rõ ràng và dễ phục hồi.

**Tasks:**

- [ ] Định nghĩa `setup`, `asking`, `answering`, `follow_up`, `evaluating`, `summary`, `abandoned`.
- [ ] Định nghĩa transition hợp lệ ở domain layer.
- [ ] Persist state và turn number sau mỗi bước.
- [ ] Ngăn hai request song song chuyển cùng một session.

**Acceptance criteria:**

- [ ] Transition không hợp lệ bị từ chối ở server.
- [ ] Refresh ở mọi state đều phục hồi được.
- [ ] Có unit test cho toàn bộ transition chính.

