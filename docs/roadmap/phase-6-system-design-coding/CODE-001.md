# Card CODE-001 — Coding question workspace

**Status:** DONE


**Priority:** P2  
**Size:** L  
**Dependencies:** QB-001

**Outcome:** Viết và lưu code answer mà chưa cần chạy code server-side.

**Tasks:**

- [x] Tích hợp code editor có syntax highlighting.
- [x] Lưu language, code và explanation.
- [x] Cho AI review complexity, correctness assumptions và edge cases.
- [x] Không thực thi code trong Vercel Function.

**Acceptance criteria:**

- [x] Code draft được autosave.
- [x] AI feedback ghi rõ code chưa được chạy nếu không có execution result.

## Implementation notes

- `/coding` dùng CodeMirror 6 cho TypeScript/JavaScript; language, code và explanation autosave sau 700 ms.
- Mỗi static review snapshot đúng source đã gửi và lưu complexity, assumptions, edge cases, risks cùng suggestions.
- Không tồn tại Run action hay execution endpoint. Server ép `execution_status = not_run` và bổ sung disclaimer nếu model bỏ sót.

