# AGENTS.md

## 1. Core Principles

- Trả lời bằng Tiếng Việt có dấu khi làm việc với repository này.
- Tuân thủ KISS, YAGNI, DRY. Ưu tiên giải pháp đơn giản, ngắn gọn, dễ đọc và dễ rollback.
- Áp dụng Surgical Changes nghiêm ngặt: chỉ sửa đúng tệp và đúng phần liên quan trực tiếp đến tác vụ. Tuyệt đối không tự ý định dạng lại (formatting), sửa comment hoặc refactor code lân cận nếu chúng không bị lỗi và không thuộc phạm vi được yêu cầu.
- Think & Push back: khi phát hiện giả định ngầm, rủi ro mất dữ liệu, sai thẩm quyền hoặc phương án đơn giản hơn, luôn dừng lại giải thích ngắn bằng evidence và xin ý kiến người dùng trước khi triển khai.
- Tách bạch Observation (quan sát), Inference (suy luận), Decision (quyết định) và luôn dẫn chứng bằng đường dẫn tệp, dòng code hoặc kết quả lệnh cụ thể.

## 2. Source-of-Truth Hierarchy

Khi có sự khác biệt giữa các nguồn hướng dẫn, áp dụng thứ tự ưu tiên từ cao xuống thấp:

1. Yêu cầu trực tiếp của người dùng trong phiên làm việc hiện tại.
2. `AGENTS.md` (source of truth duy nhất của repository).
3. Tài liệu tiêu chuẩn trong `.factory/standards/` (chỉ đọc khi scope tác vụ chạm tới).
4. Project Skill trong `.factory/skills/` (chỉ kích hoạt khi trigger thực sự khớp).
5. Mã nguồn và cấu hình hiện có của dự án.
6. Tài liệu công khai của thư viện/framework.

Không còn sử dụng hoặc tham chiếu tới `CLAUDE.md`.

## 3. Stack Boundaries

- Project: Next.js 16 (App Router), React 19, Convex 1.43, Tailwind CSS v4, Shadcn UI, Bun.
- Backend & Persistence: Convex trong thư mục `convex/` là backend duy nhất. Không thêm ORM, API server, database ngoài hay queue service độc lập khi chưa có yêu cầu.
- Code Convex chỉ chạy từ thư mục `convex/`; không tạo schema/function Convex ở thư mục gốc hay client.

## 4. Workspace Hygiene & Temporary Files

- Không tạo tệp nháp, tệp thử nghiệm, patch file hay report tạm ở thư mục gốc hoặc các module chính.
- Nếu thật sự cần script tạm, lưu tại thư mục nháp được quy định hoặc môi trường ngoài repo, và bắt buộc dọn dẹp sạch sẽ trước khi bàn giao tác vụ.
- Không tự động tạo, lưu hay commit tệp spec/plan trong `.factory/docs/`.
- Không đọc, in hay commit secret, private key, token hoặc tệp `.env*`.

## 5. Skill Routing & User-Only Gates

- Mỗi skill chỉ sở hữu một capability rõ ràng với trigger hẹp. Không kích hoạt skill nếu trigger chưa xuất hiện.
- Không tự ý nối chuỗi skill (skill chain) hoặc tự chạy pipeline đa bước.
- Các skill thuộc nhóm **User-Only Gate** sau đây **TUYỆT ĐỐI KHÔNG** được main agent hoặc subagent tự động gọi trong workflow ngầm:
  - `domain-expert`: chỉ khi người dùng yêu cầu phân tích domain chiến lược.
  - `domain-discovery`: chỉ khi người dùng yêu cầu khám phá actor/state/policy/invariant.
  - `vietadmin-feature-workflow`: chỉ khi người dùng yêu cầu lập workflow cross-layer cho tính năng lớn.
  - `vietadmin-review`: chỉ khi người dùng trực tiếp yêu cầu review/QA/audit.
- Quy chuẩn chi tiết theo công nghệ:
  - Frontend React/TypeScript: tham chiếu `.factory/standards/frontend-react-typescript.md`.
  - Next.js + Convex handoff: tham chiếu `.factory/standards/convex-nextjs-handoff.md`.
  - Single-owner & trigger rules: tham chiếu `.factory/standards/skill-routing.md`.

## 6. Frontend & Convex Rules

- Frontend:
  - Giữ strict typing; dùng `unknown` thay cho `any` ở boundary chưa rõ kiểu.
  - Tách component tĩnh ra ngoài hàm component chính để tránh hủy state và re-render thừa.
  - Bảo đảm WCAG 2.2 AA cơ bản: focus visible, keyboard navigation, contrast đủ đọc, touch target dễ bấm.
  - Tránh lồng các thẻ tương tác (`button` trong `button`); dùng `asChild` trên Radix triggers khi bọc element khác.
- Convex:
  - Đọc `convex/schema.ts` và `convex/_generated/ai/guidelines.md` trước khi sửa code dưới `convex/`.
  - Khai báo validator `args` và `returns` cho tất cả registered functions.
  - Mặc định dùng `internalQuery`, `internalMutation`, `internalAction`; chỉ mở public khi client thực sự cần.
  - Sử dụng `.withIndex(...)` cho mọi luồng đọc; không dùng `.filter()` thay cho mệnh đề lọc chính.
  - Giới hạn kết quả đọc bằng `.take(n)` hoặc `.paginate(paginationOptsValidator)`; cấm `.collect()` trên bảng lớn.
  - External I/O hoặc fetch chỉ đặt trong action; mutation chỉ thao tác dữ liệu qua `ctx.db`.

## 7. Real Data Operations & Safety

- Sửa dữ liệu thật trên Convex chỉ được thực hiện khi người dùng cấp phép rõ ràng (explicit user consent).
- Khi được phép sửa dữ liệu thật:
  - Xác định chính xác deployment, module, record và trường dữ liệu bị tác động.
  - Ưu tiên dùng query/mutation/action sẵn có của ứng dụng.
  - Bắt buộc đọc dữ liệu hiện tại trước khi ghi (read-before-write).
  - Chỉ patch tối thiểu trường cần sửa, không ghi đè toàn bộ đối tượng.
  - Đọc lại dữ liệu để xác minh ngay sau khi ghi (read-after-write).

## 8. Review-First Workflow (Triển khai & Bàn giao)

Workflow mặc định khi hoàn thành viết/sửa code:

1. Triển khai surgical diff đúng phạm vi yêu cầu.
2. Agent tự tĩnh rà soát (static review) toàn bộ diff: kiểm tra scope, typing, null-safety, edge cases, data contract và tệp phát sinh ngoài ý muốn.
3. Trình bày ngắn gọn cho người dùng: các tệp đã sửa, giải pháp chính, giả định/rủi ro (nếu có) và các kiểm tra chưa chạy.
4. **DỪNG LẠI và chờ chỉ thị của người dùng.**

Agent **nghiêm cấm**:
- Tự động chạy lệnh kiểm thử (test), lint, build hay typecheck nặng nếu người dùng chưa yêu cầu.
- Tự động tạo commit, push hay deploy.

## 9. Verification & Git Controls

- Kiểm thử & verification:
  - Việc kiểm thử runtime và tích hợp thuộc về người dùng/tester hoặc lệnh được yêu cầu trực tiếp.
  - Chỉ thực hiện các lệnh kiểm tra (typecheck/lint/test) khi người dùng yêu cầu cụ thể.
- Git controls:
  - **TUYỆT ĐỐI KHÔNG TỰ Ý COMMIT HOẶC PUSH CODE.**
  - Chỉ stage đúng các tệp liên quan trực tiếp đến tác vụ khi người dùng yêu cầu commit.
  - Khi được yêu cầu commit, kiểm tra `git status` và `git diff --cached` để bảo đảm không stage tệp rác.
  - Tuân thủ Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`).
  - Không bao giờ push trừ khi người dùng cấp phép hành động push cụ thể.
  - Không tự ý tạo hoặc chuyển nhánh ngoại trừ trường hợp người dùng yêu cầu rõ ràng.

## 10. Comment & Evidence Rules

- Comment giải thích **LÝ DO (Why)** cho thuật toán phức tạp, phân quyền hay workaround; không comment hành động **CÁI GÌ (What)** khi tên biến/hàm đã tự giải thích.
- Tiền tố comment chuẩn hóa:
  - `// QUYỀN:` giải thích điều kiện phân quyền/ownership.
  - `// LOGIC:` giải thích quy tắc nghiệp vụ/thuật toán.
  - `// UI:` giải thích hiển thị/kích thước/tương tác động.
- Không commit code cũ bị ngắt dòng bằng comment (dead code); xóa bỏ hoàn toàn vì Git đã lưu lịch sử.
