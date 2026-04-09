## TL;DR kiểu Feynman
- Mục tiêu là kéo `kdc` về cảm giác như `WebDatLo`: lưu menu/header/home-public-settings xong thì site public đổi gần như ngay.
- Không làm thêm UI cấu hình trong `/system`; giữ đúng tinh thần KISS + CoC cho người dùng non-tech.
- Sửa theo hướng nhỏ, dễ rollback: bỏ các lớp snapshot/cache đang chặn realtime ở shell public, nhưng không đụng sâu SEO/content routes không liên quan.
- `Image Optimization` không phải root cause chính của việc dữ liệu cập nhật chậm; không mở rộng scope sang image pipeline trong spec này.
- Đây là refactor hành vi runtime ở vài file shell/layout/shared, không phải viết lại kiến trúc toàn dự án.

## Audit Summary
### Observation
1. Triệu chứng quan sát được là gì (expected vs actual)?
   - Expected: lưu ở admin/system thì site public đang mở đổi gần như ngay, giống `WebDatLo`.
   - Actual: ở `kdc` và core gốc, nhiều thay đổi public-facing như menu/header/settings bị trễ, thường phải chờ một lúc mới thấy.

2. Phạm vi ảnh hưởng (user, module, môi trường)?
   - User: admin, system editor, non-tech operator đang cấu hình site.
   - Module: tối thiểu gồm menu, header settings, public settings, homepage/shell-facing data.
   - Môi trường: production/public site render qua Next.js + Convex.

3. Có tái hiện ổn định không? điều kiện tái hiện tối thiểu?
   - Có dấu hiệu tái hiện ổn định theo mô tả user và qua code audit.
   - Điều kiện tối thiểu: mở public site, mở admin/system, lưu thay đổi menu/header/public settings rồi quan sát site public.

4. Mốc thay đổi gần nhất (commit/config/dependency/data)?
   - Không có lịch sử git chung đủ tốt để blame theo commit giữa 3 repo.
   - Nhưng evidence code hiện tại cho thấy `kdc` đã thêm chiến lược server snapshot/cache rõ hơn `WebDatLo` ở `app/layout.tsx`, `app/(site)/layout.tsx`, `lib/get-settings.ts`, `components/site/Header.tsx`.

5. Dữ liệu nào đang thiếu để kết luận chắc chắn?
   - Thiếu đo đạc runtime thực tế về tần suất re-render/subscription sau save.
   - Thiếu diff chính xác ở `SiteShell` và vài shell component phụ nếu muốn định lượng full blast radius.
   - Tuy vậy evidence hiện tại đủ mạnh để ra spec thay đổi có kiểm soát.

6. Có giả thuyết thay thế hợp lý nào chưa bị loại trừ?
   - Giả thuyết `Image Optimization quota` gây chậm menu/settings: chưa phù hợp với symptom vì menu/text/config cũng chậm.
   - Giả thuyết mutation Convex sai: yếu, vì `convex/menus.ts` giữa repos gần như tương đồng.
   - Giả thuyết traffic/Convex dashboard chung gây chậm: yếu, vì `WebDatLo` vẫn thấy update nhanh hơn.

7. Rủi ro nếu fix sai nguyên nhân là gì?
   - Nếu bỏ cache quá rộng, có thể tăng query/subscription, tăng cost và làm mất lợi ích perf ở vùng không cần realtime.
   - Nếu sửa quá tay ở root layout, có thể ảnh hưởng SEO/public pages ngoài phạm vi bug.

8. Tiêu chí pass/fail sau khi sửa?
   - Pass: save menu/header/public shell settings thì site public đang mở đổi gần như ngay.
   - Pass: không thêm UI cấu hình mới cho non-tech admin.
   - Pass: không phá các route SEO/content vốn không yêu cầu realtime.
   - Fail: vẫn còn delay rõ rệt ở shell public, hoặc blast radius lan sang route content không liên quan.

### Inference
Root cause hợp lý nhất là: `kdc` đang dùng mô hình server snapshot + cache + `skip` client subscription ở shell public nhiều hơn `WebDatLo`, khiến dữ liệu công khai bị stale trong một khoảng thời gian sau save.

### Decision
Đề xuất nâng `kdc` về hướng `WebDatLo` theo **phạm vi hẹp, action-first, rollback dễ**:
- Ưu tiên khôi phục realtime cho shell public và các dữ liệu user kỳ vọng thấy ngay.
- Không mở UI `/system` cho cấu hình chiến lược này.
- Không mở rộng sang tối ưu ảnh hay refactor SEO routes ngoài phạm vi cần thiết.

## Root Cause Confidence
**High** — vì có evidence trực tiếp từ code:
- `E:\NextJS\job\kdc\app\layout.tsx` có `revalidate = 60`, trong khi `WebDatLo` dùng `dynamic = "force-dynamic"`.
- `E:\NextJS\job\kdc\app\(site)\layout.tsx` preload snapshot server-side và giữ `revalidate = 60`.
- `E:\NextJS\job\kdc\lib\get-settings.ts` bọc `cache(...)` cho public settings.
- `E:\NextJS\job\kdc\components\site\Header.tsx` dùng `skip` khi có `initialData`, làm client không subscribe lại realtime cho nhiều key quan trọng.

## Counter-Hypothesis
- **Counter-hypothesis A:** Delay là do image optimization quota.
  - Confidence Low.
  - Lý do: quota ảnh không giải thích được việc menu/text/public settings chậm cập nhật.
- **Counter-hypothesis B:** Delay do Convex mutation/query tầng DB.
  - Confidence Low-Medium.
  - Lý do: các mutation/query chính ở `convex/menus.ts` không có khác biệt đủ lớn để giải thích hành vi.
- **Counter-hypothesis C:** Delay do một component đơn lẻ ngoài `Header`.
  - Confidence Medium.
  - Lý do: có thể còn component khác, nhưng evidence hiện tại cho thấy `Header` + `site layout` + `get-settings` là cụm root cause chính cần xử lý trước.

## Elaboration & Self-Explanation
Giải thích thật chậm:

Hiện tại `kdc` đang làm thế này:
1. Server lấy sẵn dữ liệu menu/settings trước.
2. Nhét dữ liệu đó xuống client làm `initialData`.
3. Client thấy đã có dữ liệu rồi nên không tiếp tục “nghe live” từ Convex ở một số phần.
4. Vì vậy sau khi admin save, public site không phải lúc nào cũng biết ngay để tự đổi.

Còn `WebDatLo` gần với cách này hơn:
1. Client vẫn nghe Convex cho mấy phần public shell quan trọng.
2. Save xong là dữ liệu mới chảy về.
3. UI đổi ngay hoặc gần-ngay.

Nói ngắn hơn: `kdc` đang ưu tiên ảnh chụp tĩnh trước, `WebDatLo` ưu tiên luồng live trước.

User của anh là non-tech. Với họ, hành vi đúng tự nhiên là “tôi bấm lưu thì site phải đổi”. Nên nếu muốn đưa `kdc` về đúng tinh thần KISS/CoC, ta nên bỏ bớt lớp tối ưu làm lệch mental model này ở những vùng public-facing quan trọng.

## Concrete Examples & Analogies
### Ví dụ bám sát repo
- Ở `kdc/components/site/Header.tsx`, nếu `initialData.menuData` đã có thì query `api.menus.getFullMenu` có thể bị `skip`.
- Ở `WebDatLo/components/site/Header.tsx`, query menu/settings/modules vẫn chạy `useQuery(...)` trực tiếp nên dữ liệu còn realtime.
- Kết quả là cùng một thao tác `saveMenuItemsBulk`, `WebDatLo` có khả năng phản ứng ngay còn `kdc` thì dễ stale.

### Analogy đời thường
- `WebDatLo` giống màn hình hiển thị tỷ giá đang live.
- `kdc` hiện tại giống ảnh chụp màn hình đó cứ 60 giây cập nhật một lần.
- Task này là đổi lại để phần cần live thì thật sự live, không bắt user chờ ảnh chụp mới.

## Problem Graph
```mermaid
flowchart TD
  A[Main: Public shell update chậm] --> B[1. Server snapshot giữ dữ liệu cũ]
  A --> C[2. Client không subscribe lại]
  A --> D[3. Route/layout cache giữ kết quả]
  B --> B1[1.1 app/(site)/layout preload initial data]
  C --> C1[1.2 Header useQuery skip khi có initialData]
  D --> D1[1.3 revalidate/cache trong layout/get-settings]
  C1 --> R[ROOT CAUSE ưu tiên xử lý trước]
```

## Proposal
### Mục tiêu implementation
Đưa `kdc` về gần hành vi `WebDatLo` cho shell public, bằng thay đổi nhỏ, tập trung, dễ rollback.

### Phạm vi thay đổi đề xuất
1. Giảm hoặc bỏ việc `skip` client subscription ở `Header` cho các query public-facing cần realtime.
2. Hạ vai trò của `initialHeaderData`: chỉ dùng làm fallback/first paint, không dùng để chặn realtime sau mount.
3. Gỡ cache server-side không cần thiết ở public settings dùng cho shell public.
4. Giữ nguyên hoặc hạn chế đụng đến content routes/SEO routes không liên quan.

## Files Impacted
### UI / Shell
- `Sửa: E:\NextJS\job\kdc\components\site\Header.tsx`
  - Vai trò hiện tại: render header và quyết định query nào bị `skip` nếu đã có `initialData`.
  - Thay đổi: chuyển `initialData` thành fallback-only; các query menu/header/public module flags quan trọng sẽ luôn có subscription client-side như WebDatLo.

- `Sửa: E:\NextJS\job\kdc\components\site\SiteShell.tsx`
  - Vai trò hiện tại: truyền `initialHeaderData`/`deferInteractive` và điều phối shell public.
  - Thay đổi: bảo đảm luồng render không cản việc header tự subscribe lại sau mount; giữ scope hẹp chỉ cho shell.

### Server / Layout
- `Sửa: E:\NextJS\job\kdc\app\(site)\layout.tsx`
  - Vai trò hiện tại: preload menu/settings/module flags server-side và đặt `revalidate = 60`.
  - Thay đổi: giảm snapshot blocking cho shell public; giữ SSR seed tối thiểu nhưng không ép stale behavior.

- `Sửa: E:\NextJS\job\kdc\app\layout.tsx`
  - Vai trò hiện tại: root layout có `revalidate = 60` và preload site settings cho brand context.
  - Thay đổi: rà lại mức cache để tránh root shell giữ dữ liệu công khai quá lâu; chỉ sửa phần ảnh hưởng trực tiếp shell/public settings.

### Shared / Settings
- `Sửa: E:\NextJS\job\kdc\lib\get-settings.ts`
  - Vai trò hiện tại: gom public settings và cache bằng React `cache(...)`.
  - Thay đổi: tách hoặc bỏ cache ở các hàm đang cấp dữ liệu cho shell public realtime; giữ code nhỏ, dễ rollback.

### Không đổi trong spec này
- `Không sửa: E:\NextJS\job\kdc\convex\menus.ts`
  - Vai trò hiện tại: query/mutation menu.
  - Lý do không đổi: chưa có evidence đủ mạnh rằng tầng DB là root cause chính.

- `Không sửa: image pipeline / PublicImage`
  - Vai trò hiện tại: tối ưu quota ảnh.
  - Lý do không đổi: ngoài scope bug realtime hiện tại.

## Execution Preview
1. Đọc kỹ `SiteShell` để xác định các prop initial data nào đang cản subscription.
2. Chỉnh `Header` theo pattern `WebDatLo`: query realtime luôn bật cho dữ liệu shell quan trọng; `initialData` chỉ là fallback.
3. Rà `app/(site)/layout.tsx` để giảm preload dư thừa gây stale shell.
4. Rà `app/layout.tsx` và `lib/get-settings.ts` để bỏ cache gây ảnh hưởng trực tiếp tới public shell.
5. Static review: typing, null-safety, backward compatibility với dữ liệu cũ.
6. Chuẩn bị commit gọn, rollback dễ nếu user xác nhận triển khai.

## Execution (with reflection)
1. Solving `Header subscription gating`...
   - Thought: Đây là root cause có evidence mạnh nhất và blast radius nhỏ nhất.
   - Action: đổi `skip` logic sang fallback-only cho menu/settings/module flags shell.
   - Reflection: ✓ Valid nếu public shell update ngay mà không cần đụng sâu toàn app.

2. Solving `layout/server snapshot stale`...
   - Thought: Nếu chỉ sửa Header mà layout vẫn cache mạnh, stale có thể còn.
   - Action: giảm cache/revalidate ở các layout cấp shell liên quan trực tiếp.
   - Reflection: ✓ Valid nếu giới hạn ở shell public; ✗ Retry nếu lan sang SEO/content routes không cần đổi.

3. Solving `shared settings cache`...
   - Thought: `cache(...)` ở public settings có thể tiếp tục giữ dữ liệu cũ dù header đã subscribe lại một phần.
   - Action: tách cached vs non-cached path tối thiểu cho shell-facing settings.
   - Reflection: ✓ Valid nếu shell tươi hơn mà không phải xóa toàn bộ cache strategy của app.

## Acceptance Criteria
- Save menu ở `/admin/menus` thì header/footer public đang mở đổi gần như ngay.
- Save các public settings ảnh hưởng trực tiếp shell/header thì site public đang mở đổi gần như ngay.
- Không thêm UI cấu hình mới ở `/system`.
- Không mở rộng thay đổi sang image optimization hay SEO/content pages ngoài phạm vi shell public.
- Patch giữ nhỏ, dễ rollback và bám pattern `WebDatLo` thay vì phát minh kiến trúc mới.

## Verification Plan
- Typecheck: **không chạy trong spec mode**; khi implement chỉ chạy `bunx tsc --noEmit` nếu có thay đổi TS/code, đúng theo AGENTS.md.
- Test/lint: **không chạy**, vì AGENTS.md cấm tự chạy lint/unit test.
- Repro thủ công để tester verify:
  1. Mở public site và admin/system song song.
  2. Lưu menu/header/public settings.
  3. Quan sát shell public có đổi gần như ngay không.
  4. Kiểm tra vài route content/SEO để chắc không có regression rõ rệt.

## Risk / Rollback
### Risk
- Tăng số subscription/query ở shell public.
- Có thể tăng nhẹ bandwidth/cost khi traffic cao.
- Nếu sửa quá rộng, có nguy cơ làm mất lợi ích cache của các route không cần realtime.

### Rollback
- Rollback theo từng lớp, từ nhỏ đến lớn:
  1. Revert `Header.tsx` trước.
  2. Revert `app/(site)/layout.tsx`.
  3. Revert `lib/get-settings.ts` và `app/layout.tsx` nếu cần.
- Mỗi bước đều độc lập tương đối, nên rollback dễ và ít rủi ro.

## Out of Scope
- Không thêm cấu hình chiến lược realtime/cache ở `/system`.
- Không audit lại toàn bộ SEO/page caching của mọi route content.
- Không động vào image optimization, media pipeline, hay Convex schema/mutation nếu không có evidence mới.

## Open Questions
- Không có ambiguity lớn ở mức spec hiện tại; hướng sửa đã đủ rõ và bám yêu cầu user: kéo `kdc` mạnh về bản `WebDatLo` theo KISS/CoC, scope hẹp, rollback dễ.