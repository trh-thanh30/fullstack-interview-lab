# Environment strategy

## Nguyên tắc

- Secret chỉ nằm trong `.env.local`, GitHub Actions hoặc Vercel Project Settings; không commit vào repository.
- Development, Preview và Production dùng database cùng credential tách biệt.
- Preview tuyệt đối không nhận `DATABASE_URL` của Production.
- `NEXT_PUBLIC_*` được đóng vào client bundle tại build time; không đặt secret dưới prefix này.
- Thay đổi biến trên Vercel chỉ có hiệu lực từ deployment tiếp theo.

## Ma trận cấu hình

| Biến | Development | Preview | Production |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Interview Lab` | `Interview Lab Preview` | `Interview Lab` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL/alias preview | Domain production |
| `DATABASE_URL` | Neon development branch | Neon preview branch riêng | Neon production branch |
| `AUTH_SECRET` | Secret local | Secret Preview | Secret Production |
| `AUTH_GITHUB_ID` | GitHub OAuth app local | Credential hỗ trợ Preview | GitHub OAuth app production |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app local | Credential hỗ trợ Preview | GitHub OAuth app production |
| `AUTH_REDIRECT_PROXY_URL` | Để trống | Auth proxy URL ổn định nếu dùng OAuth trên URL động | Để trống |
| `ALLOWED_EMAILS` | Email phát triển | Allowlist Preview | Allowlist Production |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini key development | Key non-production | Key Production |
| `GEMINI_QUESTION_MODEL` | `gemini-2.5-flash` | Cùng model đã test | Model đã duyệt |
| `GEMINI_EVALUATION_MODEL` | `gemini-2.5-flash` | Model non-production | Model đã qua regression eval |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-2` | Khớp source embeddings Preview | Khớp source embeddings Production |
| `AI_RETRIEVAL_TOP_K` | `5` | `5` | Giá trị đã eval |
| `AI_RETRIEVAL_SIMILARITY_THRESHOLD` | `0.68` | `0.68` | Giá trị đã eval |
| `AI_INPUT_COST_PER_1M` / `AI_OUTPUT_COST_PER_1M` | Rate hiện hành hoặc `0` | Rate hiện hành | Rate hiện hành |

## CI environment

GitHub Actions chỉ nhận giá trị giả cho Auth.js để kiểm tra build. Workflow cố ý không khai báo `DATABASE_URL`; integration test sử dụng PGlite in-memory. Step `Guard database isolation` làm job thất bại nếu runner vô tình có `DATABASE_URL`.

Không thêm production secret vào GitHub Actions cho workflow CI. Nếu sau này có end-to-end test cần database, tạo database CI riêng, credential read/write giới hạn và đặt tên secret rõ ràng như `CI_DATABASE_URL`.

## Vercel setup

1. Import GitHub repository bằng **New Project** trên Vercel.
2. Chọn Framework Preset `Next.js`, Root Directory `.` và Production Branch `main`.
3. Kiểm tra install/build command khớp `vercel.json`.
4. Trong Project Settings → Environment Variables, thêm từng biến theo đúng scope Development, Preview hoặc Production.
5. Dùng Neon branch/database riêng cho Preview; không tick Production cho credential Preview.
6. Redeploy sau mỗi lần đổi environment variables.
7. Trong Project Settings → Git, xác nhận repository vẫn connected và Preview deployment được bật.
8. Chạy migration mới trước khi dùng essay practice và bảo đảm source chunks đã được normalize bằng đúng `GEMINI_EMBEDDING_MODEL`.

Vercel Git integration sẽ tạo Preview deployment cho branch/PR ngoài production branch. Liên kết này cần quyền trên tài khoản GitHub/Vercel nên không thể hoàn tất chỉ bằng thay đổi source code.

## GitHub OAuth trên Preview

GitHub OAuth App chỉ nhận một callback URL. Production nên có OAuth app riêng với callback:

```text
https://<production-domain>/api/auth/callback/github
```

Các URL Preview thay đổi theo deployment. Nếu cần đăng nhập trên mọi Preview, cấu hình Auth.js `AUTH_REDIRECT_PROXY_URL` tới một auth proxy URL ổn định, bao gồm `/api/auth`, rồi đăng ký callback GitHub tại domain ổn định đó. Không bật giải pháp này trước khi đã kiểm tra session secret và redirect flow trên một preview thử nghiệm.

Nếu chưa cần kiểm thử OAuth trên mọi PR, dùng một branch alias cố định cho staging và một GitHub OAuth App riêng sẽ đơn giản hơn.
