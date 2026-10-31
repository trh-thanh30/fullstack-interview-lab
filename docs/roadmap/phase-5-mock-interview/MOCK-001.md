# Card MOCK-001 — Interview state machine

**Status:** DONE


**Priority:** P0  
**Size:** M  
**Dependencies:** AI-004

**Outcome:** Luồng interview có trạng thái rõ ràng và dễ phục hồi.

**Tasks:**

- [x] Định nghĩa `setup`, `asking`, `answering`, `follow_up`, `evaluating`, `summary`, `abandoned`.
- [x] Định nghĩa transition hợp lệ ở domain layer.
- [x] Persist state và turn number sau mỗi bước.
- [x] Ngăn hai request song song chuyển cùng một session.

**Acceptance criteria:**

- [x] Transition không hợp lệ bị từ chối ở server.
- [x] Refresh ở mọi state đều phục hồi được.
- [x] Có unit test cho toàn bộ transition chính.

## Implementation notes

- `MockInterviewStore.transition` kiểm tra ownership, state và optimistic `version` trước mỗi mutation; stale request không thể chuyển session lần hai.
- `started_at`, `deadline_at`, `current_position`, `state` và `version` được persist. Các state trung gian `asking`/`evaluating` có recovery action riêng sau refresh.
- Transition graph là pure domain code và được kiểm tra cả unit test lẫn PGlite integration test.

