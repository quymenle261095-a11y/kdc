import { CalendarClock, CheckCircle, DollarSign, Eye, Layers, ShoppingCart, Ticket, Users } from 'lucide-react';
import { defineModuleWithRuntime } from '../define-module';
 
export const promotionsModule = defineModuleWithRuntime({
   key: 'promotions',
   name: 'Khuyến mãi',
   description: 'Quản lý voucher và mã giảm giá',
   icon: Ticket,
   color: 'rose',
 
  capabilities: [
    { key: 'coupon_v1', name: 'Mã giảm giá (Coupon v1)', status: 'ready', enabled: true, description: 'Cho phép tạo mã giảm giá công khai & riêng tư, áp dụng tại checkout.' },
    { key: 'auto_promo', name: 'Ưu đãi tự động', status: 'roadmap', enabled: false, disabledToggle: true, description: 'Tự động giảm giá theo giỏ hàng mà không cần nhập mã (Roadmap/Khóa).' },
    { key: 'flash_sale', name: 'Flash Sale Engine', status: 'roadmap', enabled: false, disabledToggle: true, description: 'Đợt giảm giá chớp nhoáng theo khung giờ (Roadmap/Khóa).' },
    { key: 'bundle_promo', name: 'Combo / Mua kèm', status: 'roadmap', enabled: false, disabledToggle: true, description: 'Mua X tặng Y, giảm giá theo bậc (Roadmap/Khóa).' },
    { key: 'loyalty', name: 'Loyalty & Membership', status: 'roadmap', enabled: false, disabledToggle: true, description: 'Quy đổi điểm thưởng, hạng thành viên (Roadmap/Khóa).' },
  ],

  features: [
    { key: 'enableUsageLimit', label: 'Giới hạn lượt dùng', icon: Users, linkedField: 'usageLimit' },
    { key: 'enableMinOrder', label: 'Đơn tối thiểu', icon: ShoppingCart, linkedField: 'minOrderAmount' },
    { key: 'enableMaxDiscount', label: 'Giảm tối đa', icon: DollarSign, linkedField: 'maxDiscountAmount' },
    { key: 'enableSchedule', label: 'Hẹn giờ', icon: CalendarClock },
    { key: 'enableApplicable', label: 'Áp dụng có chọn lọc & Loại trừ', icon: CheckCircle, enabled: true },
    { key: 'enableAdvancedDiscount', label: 'Loại giảm nâng cao (%, Tiền, FreeShip)', icon: Ticket },
    { key: 'enableCustomerConditions', label: 'Điều kiện khách hàng', icon: Users },
    { key: 'enableBudgetLimit', label: 'Ngân sách khuyến mãi', icon: DollarSign, enabled: true },
    { key: 'enableStacking', label: 'Cộng dồn & ưu tiên', icon: Layers, enabled: false },
    { key: 'enableDisplay', label: 'Hiển thị ngoài site', icon: Eye },
  ],
 
  settings: [
    { key: 'promotionsPerPage', label: 'Số voucher / trang', type: 'number', default: 20 },
    { key: 'defaultDiscountType', label: 'Loại giảm mặc định', type: 'select', default: 'percent', options: [
      { value: 'percent', label: 'Giảm %' },
      { value: 'fixed', label: 'Giảm tiền' },
    ] },
    { key: 'codeLength', label: 'Độ dài mã', type: 'number', default: 8 },
  ],
 
  conventionNote: 'promotionType: coupon/campaign/flash_sale/bundle/loyalty. discountType: percent, fixed, buy_x_get_y, buy_a_get_b, tiered, free_shipping, gift. code unique + uppercase.',
 
  runtimeConfig: {
    fields: [
      { enabled: true, fieldKey: 'name', isSystem: true, name: 'Tên khuyến mãi', order: 0, required: true, type: 'text' },
      { enabled: true, fieldKey: 'code', isSystem: true, name: 'Mã voucher', order: 1, required: true, type: 'text' },
      { enabled: true, fieldKey: 'discountType', isSystem: true, name: 'Loại giảm', order: 2, required: true, type: 'select' },
      { enabled: true, fieldKey: 'discountValue', isSystem: true, name: 'Giá trị giảm', order: 3, required: true, type: 'number' },
      { enabled: true, fieldKey: 'status', isSystem: true, name: 'Trạng thái', order: 4, required: true, type: 'select' },
      { enabled: true, fieldKey: 'description', isSystem: false, name: 'Mô tả', order: 5, required: false, type: 'textarea' },
      { enabled: true, fieldKey: 'usageLimit', isSystem: false, linkedFeature: 'enableUsageLimit', name: 'Giới hạn sử dụng', order: 6, required: false, type: 'number' },
      { enabled: true, fieldKey: 'minOrderAmount', isSystem: false, linkedFeature: 'enableMinOrder', name: 'Đơn tối thiểu', order: 7, required: false, type: 'price' },
      { enabled: true, fieldKey: 'maxDiscountAmount', isSystem: false, linkedFeature: 'enableMaxDiscount', name: 'Giảm tối đa', order: 8, required: false, type: 'price' },
      { enabled: true, fieldKey: 'startDate', isSystem: false, name: 'Ngày bắt đầu', order: 9, required: false, type: 'date' },
      { enabled: true, fieldKey: 'endDate', isSystem: false, name: 'Ngày kết thúc', order: 10, required: false, type: 'date' },
    ],
  },

  tabs: ['config'],
 });
