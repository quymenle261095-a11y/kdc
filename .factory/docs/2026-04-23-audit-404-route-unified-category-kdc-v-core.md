# I. Primer

## 1. TL;DR kiểu Feynman
- Em đã audit và kết luận: KDC đang 404 ở `/voi-chen-lanh` không phải do setting `/system/ia` lưu sai.
- Nguyên nhân chính là route file cho unified IA đang bị thiếu thực tế trong cả KDC lẫn core.
- Cụ thể, thư mục `app/(site)/[categorySlug]` và `app/(site)/[categorySlug]/[recordSlug]` đang tồn tại nhưng rỗng, nên Next.js không có page để match URL `/{category}` hoặc `/{category}/{record}`.
- Vì vậy core `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs` cũng có vấn đề tương tự nếu mở URL unified category thật.
- Trang `/products?category=voi-chen-lanh` vẫn chạy vì đây là flow namespace/filter cũ trong `app/(site)/products/page.tsx`, không phụ thuộc route file unified.
- Nếu triển khai fix, hướng đúng là khôi phục cụm route unified từ source đúng hoặc viết lại route pages theo contract hiện có của `convex/ia.ts`.

## 2. Elaboration & Self-Explanation
Bài toán này có 2 lớp:

a) lớp cấu hình logic: setting `ia_route_mode = unified`, helper route `buildCategoryPath`, query `resolveUnifiedCategory`, UI ở products page đều đã hỗ trợ mode hợp nhất.

b) lớp route runtime của Next.js: muốn URL `/{category}` chạy được thì phải có file page thật ở `app/(site)/[categorySlug]/page.tsx`.

Hiện audit cho thấy lớp a) có tồn tại ở cả KDC và core, nhưng lớp b) lại thiếu. Thư mục dynamic route có đó, nhưng bên trong rỗng. Khi route file rỗng/mất, Next.js sẽ trả 404 trước khi code business như `resolveUnifiedCategory` có cơ hội chạy.

Nói đơn giản: hệ thống đã có “bộ não” hiểu unified IA, nhưng chưa có “cửa vào” ở App Router để nhận URL đó.

## 3. Concrete Examples & Analogies
### a) Ví dụ cụ thể bám repo
- `app/system/ia/page.tsx` cho phép chọn `Hợp nhất (mặc định)` và preview ra `/{category}` + `/{category}/{record}`.
- `lib/ia/route-mode.ts` cũng build đúng URL unified.
- `convex/ia.ts` có `resolveUnifiedCategory` và `resolveUnifiedDetail`.
- Nhưng `app/(site)/[categorySlug]` và `app/(site)/[categorySlug]/[recordSlug]` hiện đang là thư mục rỗng.
- Kết quả: `/products?category=voi-chen-lanh` chạy, còn `/voi-chen-lanh` thì 404.

### b) Analogy đời thường
- Giống như đã có bảng chỉ đường và nhân viên tổng đài biết đường đi, nhưng cửa chính của toà nhà lại chưa xây xong. Người dùng đến đúng địa chỉ vẫn không vào được.

# II. Audit Summary (Tóm tắt kiểm tra)
- Observation:
  - KDC có các helper và setting cho unified IA:
    - `lib/ia/route-mode.ts`
    - `lib/ia/settings.ts`
    - `app/system/ia/page.tsx`
    - `convex/ia.ts`
- Observation:
  - Core cũng có cùng các helper/query/settings tương tự.
- Observation:
  - `app/(site)/products/page.tsx` ở cả KDC và core đều có flow đọc category từ path/query:
    - lấy `categorySlugFromPath`
    - map sang category id
    - filter query products theo `categoryId`
- Observation:
  - Nhưng `LS` cho thấy cả hai thư mục sau đều rỗng ở KDC và core:
    - `E:\NextJS\job\kdc\app\(site)\[categorySlug]`
    - `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs\app\(site)\[categorySlug]`
- Observation:
  - Vì thư mục rỗng, `Read` vào `app/(site)/[categorySlug]/page.tsx` và `app/(site)/[categorySlug]/[recordSlug]/page.tsx` đều fail với `ENOENT`.
- Inference:
  - 404 hiện tại đến từ thiếu App Router entrypoint, không phải do setting unified hoặc product category data path.
- Decision:
  - Kết luận core có cùng vấn đề ở lớp route unified runtime.

# III. Root Cause & Counter-Hypothesis (Nguyên nhân gốc & Giả thuyết đối chứng)
## 1. Root Cause Confidence (Độ tin cậy nguyên nhân gốc): High
- Lý do: có evidence trực tiếp từ cây thư mục route, lỗi `ENOENT`, và sự hiện diện đồng thời của helper/query nhưng thiếu page file.

## 2. Root Cause
- Triệu chứng quan sát được là gì (expected vs actual)?
  - Expected: khi route mode là unified, `/voi-chen-lanh` mở category hub hoặc product list đã lọc.
  - Actual: `/voi-chen-lanh` trả 404, trong khi `/products?category=voi-chen-lanh` vẫn hiển thị đúng.
- Phạm vi ảnh hưởng?
  - Toàn bộ unified category/detail routes ở site cho KDC; core cũng bị tương tự.
- Có tái hiện ổn định không? điều kiện tái hiện tối thiểu?
  - Có. Chỉ cần bật unified mode rồi truy cập URL dạng `/{category}` là sẽ vướng nếu route file không tồn tại.
- Mốc thay đổi gần nhất?
  - Có dấu hiệu trước đây intended có route unified vì grep thấy nhiều callsite trỏ tới `app/(site)/[categorySlug]/**`, nhưng hiện file runtime thực tế không còn trong tree.
- Dữ liệu nào đang thiếu để kết luận chắc chắn?
  - Không thiếu dữ liệu cốt lõi để kết luận nguyên nhân 404 hiện tại.
- Có giả thuyết thay thế hợp lý nào chưa bị loại trừ?
  - Có giả thuyết data category slug không tồn tại hoặc query resolve sai; nhưng bị yếu đi vì 404 đến từ thiếu route file, không phải notFound trong handler.
- Rủi ro nếu fix sai nguyên nhân là gì?
  - Có thể sửa query/data vô ích nhưng unified URL vẫn 404 vì Next chưa có route entry.
- Tiêu chí pass/fail sau khi sửa?
  - `/{category}` và `/{category}/{record}` match được route runtime; category hợp lệ không còn 404 do thiếu file.

## 3. Counter-Hypothesis (Giả thuyết đối chứng)
- Giả thuyết 1: setting `ia_route_mode` chưa lưu đúng.
  - Bị bác bỏ vì `app/system/ia/page.tsx` và toàn bộ helper/query đều đang bám mode unified.
- Giả thuyết 2: `resolveUnifiedCategory` của Convex hỏng.
  - Chưa phải nguyên nhân chính của 404 hiện tại, vì thiếu route page khiến request không đi tới bước gọi query.
- Giả thuyết 3: chỉ KDC bị, core không bị.
  - Bị bác bỏ vì core cũng có thư mục route unified rỗng tương tự.

```mermaid
flowchart TD
  A[User vao /voi-chen-lanh] --> B{Next co page cho /[categorySlug]?}
  B -- Khong --> C[404 ngay tai router]
  B -- Co --> D[page.tsx goi api.ia.resolveUnifiedCategory]
  D --> E[Map sang module products]
  E --> F[Render ProductsPage da loc category]
```

# IV. Proposal (Đề xuất)
## 1. Hướng chọn
- Option A (Recommend) — Confidence 92%: khôi phục/viết lại cụm route unified `app/(site)/[categorySlug]/**` và `app/(site)/[categorySlug]/[recordSlug]/**` ở cả KDC lẫn core theo contract hiện có.
- Vì sao recommend:
  - Đây là đúng điểm gãy hiện tại.
  - Tận dụng được toàn bộ helper/query đã tồn tại.
  - Fix một lần đúng bản chất thay vì chữa vòng ngoài.

## 2. Cách thực hiện cụ thể nếu anh muốn em sửa
### a) KDC
- Thêm hoặc khôi phục:
  - `app/(site)/[categorySlug]/page.tsx`
  - `app/(site)/[categorySlug]/[recordSlug]/page.tsx`
  - nếu cần, `app/(site)/[categorySlug]/[recordSlug]/layout.tsx`
- Wiring:
  - page category gọi `api.ia.resolveUnifiedCategory`
  - branch theo `moduleKey` để render `ProductsPage`, `PostsPage`, `ServicesPage`
  - detail page gọi `api.ia.resolveUnifiedDetail`
- Với product list, tận dụng logic đã có trong `app/(site)/products/page.tsx` vì nó đã hỗ trợ `categorySlugFromPath`.

### b) Core
- Audit/fix cùng cluster tương tự, vì core cũng đang có cùng symptom architecture.
- Nếu mục tiêu là parity với core, nên fix từ core trước hoặc fix song song rồi sync lại.

## 3. Quyết định kỹ thuật nhỏ
- Không cần đổi `convex/ia.ts` ở vòng đầu trừ khi sau khi route sống lại mới lộ bug data-level.
- Không cần đổi `app/system/ia/page.tsx` vì UI setting hiện không phải nguyên nhân.

# V. Files Impacted (Tệp bị ảnh hưởng)
## 1. KDC
- Sửa/Thêm: `app/(site)/[categorySlug]/page.tsx`
  - Vai trò hiện tại: đang thiếu page runtime cho unified category route.
  - Thay đổi: thêm route handler render đúng module hub.
- Sửa/Thêm: `app/(site)/[categorySlug]/[recordSlug]/page.tsx`
  - Vai trò hiện tại: đang thiếu page runtime cho unified detail route.
  - Thay đổi: thêm route handler cho record detail.
- Sửa/Thêm: `app/(site)/[categorySlug]/[recordSlug]/layout.tsx`
  - Vai trò hiện tại: có thể cần cho metadata/canonical nếu pattern repo đang dùng layout detail.
  - Thay đổi: nối SEO/canonical theo route unified.
- Sửa: `convex/ia.ts` (chỉ nếu cần)
  - Vai trò hiện tại: resolve slug category/detail.
  - Thay đổi: chỉ chạm nếu sau khi route sống lại phát hiện query chưa validate đủ quan hệ category-record.

## 2. Core
- Sửa/Thêm: cùng cụm `app/(site)/[categorySlug]/**`
  - Vai trò hiện tại: route unified runtime đang thiếu thực thể file.
  - Thay đổi: khôi phục/viết lại để core không lặp symptom 404.

# VI. Execution Preview (Xem trước thực thi)
1. Đọc lại route unified cluster ở core và KDC.
2. Xác nhận file nào đang thiếu thật sự.
3. Viết/khôi phục page category unified.
4. Viết/khôi phục page detail unified.
5. Nối metadata/layout nếu repo cần.
6. Review tĩnh import, params, render branch theo `moduleKey`.
7. Chạy `bunx tsc --noEmit`.
8. Commit gói fix.

# VII. Verification Plan (Kế hoạch kiểm chứng)
- Kiểm tra tĩnh:
  - route file tồn tại thật trong App Router,
  - import `ProductsPage` / `PostsPage` / `ServicesPage` hợp lệ,
  - params Promise types khớp pattern repo hiện tại.
- Typecheck:
  - chạy `bunx tsc --noEmit`.
- Repro plan:
  - vào `/voi-chen-lanh`
  - vào `/{category}/{record}` với một record hợp lệ
  - so sánh với `/products?category=voi-chen-lanh`
- Pass khi:
  - route unified không còn 404 do missing page,
  - category slug hợp lệ render đúng module,
  - core và KDC không còn lệch ở cụm route này nếu fix song song.

# VIII. Todo
- [ ] Xác nhận chính xác cụm route unified nào còn thiếu ở KDC và core.
- [ ] Khôi phục/viết lại `app/(site)/[categorySlug]/page.tsx`.
- [ ] Khôi phục/viết lại `app/(site)/[categorySlug]/[recordSlug]/page.tsx`.
- [ ] Bổ sung layout/metadata nếu cần.
- [ ] Review tĩnh và chạy `bunx tsc --noEmit`.
- [ ] Commit fix theo phạm vi anh chọn.

# IX. Acceptance Criteria (Tiêu chí chấp nhận)
- Kết luận điều tra trả lời rõ: core có bị tương tự hay không.
- Có evidence file-path cho nguyên nhân 404.
- Nếu triển khai fix: `/voi-chen-lanh` không còn 404 do missing route file.
- Nếu có detail route hợp lệ: `/{category}/{record}` chạy đúng.
- `bunx tsc --noEmit` pass.

# X. Risk / Rollback (Rủi ro / Hoàn tác)
- Rủi ro:
  - Sau khi route sống lại có thể lộ thêm bug data-level ở `resolveUnifiedDetail`.
  - Có thể phát sinh redirect/canonical cần đồng bộ thêm với SEO layout.
- Rollback:
  - Vì fix gói trong cụm route riêng, có thể revert commit nếu behavior không ổn.

# XI. Out of Scope (Ngoài phạm vi)
- Không sửa dữ liệu category/product thật trong Convex ở vòng điều tra này.
- Không refactor toàn bộ IA system.
- Không sửa UI `/system/ia` vì hiện không phải nguyên nhân chính.

# XII. Open Questions (Câu hỏi mở)
- Không có ambiguity lớn cho phần kết luận audit.
- Nếu anh muốn em fix tiếp, chỉ còn quyết định phạm vi:
  - fix KDC trước,
  - hay fix luôn cả core rồi sync lại KDC.