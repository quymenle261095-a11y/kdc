# Spec nâng cấp Core từ dự án system-vietadmin-nextjs

# I. Primer

## 1. TL;DR kiểu Feynman
* Dự án hiện tại (`kdc`) sử dụng code nền tảng (core) từ dự án `system-vietadmin-nextjs`. Core này vừa có cập nhật mới.
* Ta cần mang toàn bộ code mới từ core đè lên dự án hiện tại nhưng giữ nguyên lịch sử commit trước đó (bằng cách gộp tất cả thay đổi thành 1 commit duy nhất - Squash Merge).
* Các bước thực hiện chính:
  a) Thêm link tạm thời tới dự án core (`git remote add`).
  b) Tải code mới từ core về (`git fetch`).
  c) Trộn và đè code từ core sang dự án hiện tại (`git merge --squash` & `git checkout --theirs .`).
  d) Commit lại với thông điệp đồng bộ và dọn dẹp remote tạm.
  e) Cài lại thư viện (`bun install`).

## 2. Elaboration & Self-Explanation
Dự án của chúng ta (`kdc`) sử dụng mã nguồn nền tảng (core) từ thư mục `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs`. Khi core này được cập nhật các tính năng, thư viện hoặc sửa lỗi mới, dự án `kdc` cần phải đồng bộ theo để hưởng lợi từ các cải tiến đó. 

Để làm việc này mà không làm rối loạn lịch sử commit của dự án `kdc`, chúng ta sử dụng kỹ thuật "Squash Merge". Nghĩa là chúng ta coi toàn bộ thay đổi mới từ core như một cục thay đổi duy nhất, sau đó đè lên các tệp tin hiện tại (ưu tiên chọn code của core khi có xung đột bằng lệnh `git checkout --theirs .`), và tạo một commit duy nhất đánh dấu đợt nâng cấp này. Cuối cùng, chúng ta cập nhật các thư viện phụ thuộc bằng `bun install` và kiểm tra xem hệ thống có chạy ổn định không.

## 3. Concrete Examples & Analogies
* **Ví dụ cụ thể**: Khi core cập nhật thêm một component mới như `components/ui/button-custom.tsx` hoặc nâng cấp phiên bản Next.js trong `package.json`, thao tác này sẽ đem các file mới và cấu hình `package.json` mới đó sang dự án `kdc`. Nếu cả hai bên cùng sửa file `package.json`, lệnh `git checkout --theirs .` sẽ ưu tiên lấy file `package.json` của core sang, đè lên file của `kdc` nhằm đảm bảo tính đồng bộ hoàn toàn với core mới.
* **Ẩn dụ đời thường**: Hãy tưởng tượng bạn có một chiếc xe máy được độ lại từ một mẫu xe nguyên bản (core). Khi hãng sản xuất ra phiên bản nâng cấp động cơ và khung sườn mới cho mẫu xe nguyên bản đó, thay vì bạn đi mua xe mới hay tháo từng con ốc để đổi, bạn mang xe đến xưởng, tháo toàn bộ động cơ/khung sườn cũ ra và lắp nguyên cụm nâng cấp mới từ hãng vào, chỉ giữ lại lớp sơn tự thiết kế của bạn.

# II. Audit Summary (Tóm tắt kiểm tra)
* **Thư mục dự án hiện tại**: `e:\NextJS\job\job_from_system_vietadmin\kdc`
* **Nhánh hiện tại của dự án**: `master` (working tree clean, không có thay đổi chưa commit).
* **Thư mục dự án Core**: `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs`
* **Nhánh chính của dự án Core**: `master` (đã kiểm tra và xác nhận).
* **Package Manager hiện tại**: Dự án sử dụng `bun` (có file `bun.lock` trong thư mục gốc).

# III. Root Cause & Counter-Hypothesis (Nguyên nhân gốc & Giả thuyết đối chứng)
* **Nguyên nhân gốc**: Dự án hiện tại đang chạy trên phiên bản core cũ, cần đồng bộ hóa với phiên bản core mới nhất tại `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs` để có các tính năng và sửa lỗi mới nhất.
* **Độ tin cậy (Root Cause Confidence)**: **High**. Vì đây là quy trình nâng cấp core định kỳ được yêu cầu trực tiếp từ người dùng, thông tin đường dẫn core đã được xác thực chính xác thông qua audit.

# IV. Proposal (Đề xuất)
Nâng cấp dự án `kdc` lên phiên bản Core mới nhất thông qua các bước Squash Merge Git, giải quyết xung đột bằng cách ưu tiên code từ Core (`--theirs`), commit thay đổi, dọn dẹp remote tạm và chạy cài đặt lại dependencies với `bun install`.

# V. Files Impacted (Tệp bị ảnh hưởng)
Do đây là thao tác Squash Merge đè toàn bộ Core mới lên dự án, số lượng file bị ảnh hưởng có thể rất lớn (bao gồm các file trong `app/`, `components/`, `package.json`, v.v.).
* `Sửa/Thêm/Xóa`: Toàn bộ các file được cập nhật từ Core mới tại `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs`.
* Cụ thể sau khi chạy lệnh merge, chúng ta sẽ có danh sách chi tiết các file thay đổi trong commit.

# VI. Execution Preview (Xem trước thực thi)
1. Thêm git remote tạm `core-update` chỉ đến thư mục Core.
2. Fetch dữ liệu từ `core-update`.
3. Chạy lệnh Squash Merge từ nhánh `master` của Core (`core-update/master`) kèm tham số `--allow-unrelated-histories`.
4. Giải quyết xung đột bằng cách checkout toàn bộ code theo hướng ưu tiên Core (`git checkout --theirs .`).
5. Add thay đổi và tạo commit `chore: sync and upgrade to latest Viet Admin core`.
6. Xóa remote tạm `core-update`.
7. Chạy `bun install` để cập nhật dependencies.

# VII. Verification Plan (Kế hoạch kiểm chứng)
### Automated Tests
* Không chạy lint hay unit test tự động (tuân thủ luật `Clean-by-construction` và cấm tuyệt đối tự chạy lint/unit test).
* Chỉ kiểm tra xem quá trình cài đặt dependencies (`bun install`) có thành công không.

### Manual Verification
* Chạy thử dự án ở local bằng lệnh `bun run dev` (người dùng/tester phụ trách verification runtime/integration).

# VIII. Todo
* [ ] Thêm remote tạm thời `core-update` trỏ đến `E:\NextJS\study\admin-ui-aistudio\system-vietadmin-nextjs`.
* [ ] Fetch dữ liệu từ `core-update`.
* [ ] Thực hiện Squash Merge từ `core-update/master` với `--allow-unrelated-histories`.
* [ ] Giải quyết xung đột bằng `git checkout --theirs .`.
* [ ] Chạy `git add .` để chuẩn bị commit.
* [ ] Tạo commit với nội dung `chore: sync and upgrade to latest Viet Admin core`.
* [ ] Xóa remote `core-update`.
* [ ] Cài đặt lại thư viện bằng `bun install`.

# IX. Acceptance Criteria (Tiêu chí chấp nhận)
* Thao tác merge thành công mà không có xung đột chưa được giải quyết.
* Tạo được commit `chore: sync and upgrade to latest Viet Admin core` sạch sẽ.
* `bun install` chạy thành công không gặp lỗi dependency.
* Trạng thái git của dự án trở lại clean sau khi hoàn tất.

# X. Risk / Rollback (Rủi ro / Hoàn tác)
* **Rủi ro**: Lệnh `git checkout --theirs .` sẽ ghi đè hoàn toàn những file có xung đột bằng code của Core. Nếu dự án hiện tại có những tùy chỉnh riêng biệt ở các file trùng tên với Core mà không được backup, các tùy chỉnh này có thể bị mất.
* **Hoàn tác (Rollback)**: Vì dự án đang sạch trước khi merge, nếu xảy ra lỗi trong quá trình merge hoặc sau khi cài đặt, ta có thể khôi phục lại trạng thái ban đầu bằng lệnh:
  ```bash
  git merge --abort
  git reset --hard HEAD
  git clean -fd
  ```

# XI. Out of Scope (Ngoài phạm vi)
* Không tự ý sửa đổi code logic thủ công ngoài phạm vi merge từ Core.
* Không tự ý thực hiện commit lên server (push) hay deploy.
