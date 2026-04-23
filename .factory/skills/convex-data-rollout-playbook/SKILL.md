---
name: convex-data-rollout-playbook
description: "Playbook tái sử dụng cho các tác vụ data-first trên Convex như nhập dữ liệu thật, remap header menu khỏi link #, bổ sung home-components từ catalog hiện có, tạo nội dung/trust pages tối thiểu để route hoạt động đúng. Dùng khi user muốn sửa dữ liệu thật trong Convex thay vì refactor UI, đặc biệt với menu, products, categories, posts, trust pages và homeComponents."
version: 1.0.0
---

# Convex Data Rollout Playbook

Skill này chuẩn hóa quy trình vừa làm thành một workflow tái sử dụng cho các bài toán:

- nhập/bổ sung dữ liệu thật vào Convex,
- sửa menu header/footer/sidebar từ placeholder `#` sang destination thật,
- bổ sung `homeComponents` từ catalog hiện có,
- tạo content/trust pages tối thiểu để route public không bị rỗng,
- dùng script tạm để thao tác nhanh rồi dọn sạch repo.

## Khi nào dùng

- User nói “sửa dữ liệu thật trên Convex”.
- User muốn map lại menu theo sản phẩm/danh mục/bài viết thật.
- User muốn bổ sung `ProductList`, `ProductCategories`, `CategoryProducts`, `Blog`, `FAQ`... bằng dữ liệu đang có.
- User muốn import nhanh dữ liệu từ file/folder/local source rồi ghi qua query/mutation hiện có.
- User muốn dùng script tạm để đọc/mutate dữ liệu rồi xóa script sau khi xong.

## Không dùng khi

- Bài toán chủ yếu là refactor UI/component code.
- Cần đổi schema/business model lớn.
- Chỉ sửa 1 field nhỏ đã biết chính xác record và mutation.

## Nguyên tắc cốt lõi

1. **Data-first, không UI-first**: đọc source of truth trong Convex trước khi sửa.
2. **Read before write**: luôn query snapshot hiện trạng trước khi mutate.
3. **Patch tối thiểu**: chỉ update field cần đổi.
4. **Tận dụng surface có sẵn**: ưu tiên query/mutation hiện có, tránh thêm function mới nếu chưa cần.
5. **Script tạm, repo sạch**: nếu tạo script hỗ trợ thì phải xóa sau khi hoàn tất.
6. **Evidence over opinion**: mọi mapping phải dựa trên query, route thật, slug thật, record thật.

## Execution Protocol (bắt buộc)

Khi dùng skill này, output nên theo khung:

1. Audit summary.
2. Source of truth đang dùng.
3. Mapping / rollout plan.
4. Thao tác mutate tối thiểu.
5. Verify after.
6. Cleanup artifacts.

## Workflow chuẩn

### Bước 1: Audit source of truth

Đọc các nhóm dữ liệu liên quan:

- `.env.local` để biết deployment / URL Convex.
- query runtime đang render ở site/admin:
  - `api.menus.getFullMenu`
  - `api.homeComponents.listActive`
  - `api.products.*`
  - `api.productCategories.*`
  - `api.posts.*`
  - `api.settings.*`
  - `api.trustPages.*`
- route thực tế ở `app/(site)/**` để xác nhận URL pattern có hoạt động thật không.

Checklist:

- menu đang lấy từ đâu?
- homepage đang lấy từ đâu?
- route category/product/post dùng slug hay query param?
- trust pages có mapping thật chưa?
- section nào đã tồn tại, section nào còn thiếu?

### Bước 2: Snapshot dữ liệu thật

Nếu query trực tiếp bằng CLI không tiện, tạo script tạm để đọc:

- menu hiện tại,
- categories + stats,
- products active,
- posts / post categories / trust pages,
- homeComponents active,
- settings liên quan IA / route mode / branding.

Ví dụ use cases:

- in cây menu để thấy toàn bộ nhánh `#`,
- xếp hạng category theo `productCount`,
- lấy top products để dựng `ProductList`,
- tìm post thật cho `/about`, `/faq`, `/terms`...

### Bước 3: Lập mapping có evidence

Phải map dựa trên dữ liệu thật, không đoán mò.

#### 3.1 Menu mapping

Ưu tiên:

- root item tổng quát → route list thật
  - `Sản phẩm` → `/products`
  - `Bài viết` → `/posts`
  - `Liên hệ` → `/contact`
- category item → route category thật
  - `/products?category={slug}` nếu site dùng query-param
  - hoặc route unified tương ứng nếu project đang bật route unified
- leaf item theo product → `/products/{slug}`
- trust / capability / company info → `/about`, `/terms`, `/privacy`, ...
- service item nhưng chưa có module/service data thật → tạm map sang `/contact` nếu đó là CTA hợp lý hơn route rỗng.

#### 3.2 Home-component mapping

Chọn theo dữ liệu thật:

- `ProductCategories`: top categories có sản phẩm thật và ảnh đại diện tốt.
- `ProductList`: top sản phẩm active, ưu tiên nhóm sản phẩm trọng tâm.
- `CategoryProducts`: dùng khi muốn mỗi category có block con riêng.

Quy tắc:

- nếu component cùng loại đã tồn tại nhưng config seed/generic → ưu tiên `update`,
- nếu chưa có → `create`,
- title/subtitle/sectionTitle phải bám context dữ liệu thật.

### Bước 4: Gap handling

Nếu menu cần destination nhưng chưa có:

- kiểm tra trust pages / posts / page-like content hiện có;
- nếu thiếu thật sự, tạo content tối thiểu, đúng brand, đúng route;
- chỉ tạo đúng những gì cần để route public không rỗng.

Ví dụ:

- menu `Giới thiệu công ty` nhưng chưa có `/about` usable → dùng trust page hoặc tạo post mapped cho `/about`.

### Bước 5: Mutate tối thiểu

Ưu tiên gọi mutation hiện có:

- `menus.updateMenuItem`
- `menus.saveMenuItemsBulk`
- `homeComponents.create`
- `homeComponents.update`
- `settings.setMultiple`
- `posts.create` / `posts.update`

Guardrails:

- không overwrite cả object nếu không cần,
- không đổi schema chỉ để tiện import,
- không tạo helper vĩnh viễn nếu chỉ phục vụ một batch.

### Bước 6: Verify after

Sau khi mutate, phải query lại:

- `menus.getFullMenu({ location: 'header' })`
- `homeComponents.listActive()`
- query category/product/post liên quan
- settings/trust page mapping nếu có đụng vào

Kiểm tra:

- các item quan trọng đã hết `#` chưa,
- URL có đúng pattern route thật không,
- section homepage đã active và config đúng shape chưa,
- dữ liệu mới có render được về mặt contract không.

### Bước 7: Cleanup

Nếu có script tạm:

- xóa toàn bộ file tạm sau khi verify xong,
- không để rác trong repo,
- không commit nếu user chỉ muốn thao tác dữ liệu.

## Playbook cho trường hợp “header menu + home-components”

### Audit

1. Đọc `components/site/Header.tsx` để xác nhận header dùng `api.menus.getFullMenu`.
2. Đọc `app/(site)/page.tsx` + `HomePageClient` để xác nhận homepage dùng `api.homeComponents.listActive`.
3. Đọc route list/detail thật ở `app/(site)/products/page.tsx`, `app/(site)/posts/page.tsx`, `app/(site)/about/page.tsx`.

### Snapshot

Tạo script tạm để lấy:

- toàn bộ menu header,
- category stats,
- product list resolved,
- posts + trust page preview,
- homeComponents active.

### Mapping

- root menu → route thật,
- category/product menu → slug thật,
- trust/company menu → `/about` hoặc trust route,
- service/CTA menu → `/contact` nếu chưa có service data usable,
- `ProductCategories` → top category đo lường,
- `ProductList` → top products của nhóm đo lường.

### Mutate

- update menu item theo từng `id`,
- update `ProductCategories` hiện có,
- create `ProductList` nếu chưa có.

### Verify

- query menu sau khi patch,
- query homeComponents sau khi patch,
- kiểm tra còn item quan trọng nào là `#`.

### Cleanup

- xóa tất cả `tmp_*.cjs` / script tạm vừa tạo.

## Template script tạm

```js
const { ConvexHttpClient } = require('convex/browser');

// 1) load env
// 2) query snapshot
// 3) build mapping
// 4) run mutation tối thiểu
// 5) console.log report before/after
```

## Evidence checklist

Trước khi kết luận xong việc, phải có:

- function/query đã dùng,
- record/table đã chạm,
- before/after ngắn gọn,
- route pattern đã verify,
- xác nhận script tạm đã xóa.

## Anti-patterns

Không làm:

- sửa UI trong khi data mới là source of truth,
- fetch all rồi filter JS nếu đã có index/query hẹp hơn,
- map mọi `#` về cùng một route một cách mù quáng,
- để script import/patch nằm lại repo,
- commit dữ liệu khi user không yêu cầu.

## Kết hợp với skill khác

- Dùng cùng `docs-seeker` khi cần factual support / docs / web evidence để viết content chuẩn hơn.
- Dùng cùng `skill-writer` khi muốn đóng gói workflow mới thành skill tái sử dụng.
- Nếu thay đổi lan sang module/experience/home-component contracts, đối chiếu thêm `system-extension-guideline`.

## Output mong muốn khi hoàn thành task

- Summary ngắn các query/mutation đã dùng.
- Danh sách record/menu/component đã cập nhật.
- Các gap còn lại chưa map được và lý do.
- Xác nhận đã xóa script tạm.
