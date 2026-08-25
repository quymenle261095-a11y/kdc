export type TrustPageKey = 'about' | 'terms' | 'privacy' | 'returnPolicy' | 'shipping' | 'payment' | 'faq';

export type TrustPageSlot = {
  key: TrustPageKey;
  label: string;
  slug: string;
  iaKey: string;
  defaultTitle: string;
  keywords?: string[];
};

export const TRUST_PAGE_SLOTS: TrustPageSlot[] = [
  {
    defaultTitle: 'Về chúng tôi',
    iaKey: 'ia_page_about',
    key: 'about',
    keywords: ['about', 'gioi-thieu', 've-chung-toi', 'gioi-thieu-ve'],
    label: 'Về chúng tôi',
    slug: '/about',
  },
  {
    defaultTitle: 'Điều khoản sử dụng',
    iaKey: 'ia_page_terms',
    key: 'terms',
    keywords: ['terms', 'dieu-khoan', 'dieu-khoan-su-dung', 'terms-of-service'],
    label: 'Điều khoản sử dụng',
    slug: '/terms',
  },
  {
    defaultTitle: 'Chính sách bảo mật',
    iaKey: 'ia_page_privacy',
    key: 'privacy',
    keywords: ['privacy', 'bao-mat', 'chinh-sach-bao-mat', 'privacy-policy'],
    label: 'Chính sách bảo mật',
    slug: '/privacy',
  },
  {
    defaultTitle: 'Chính sách đổi trả',
    iaKey: 'ia_page_return_policy',
    key: 'returnPolicy',
    keywords: ['return', 'return-policy', 'doi-tra', 'hoan-tien', 'refund'],
    label: 'Chính sách đổi trả',
    slug: '/return-policy',
  },
  {
    defaultTitle: 'Chính sách vận chuyển',
    iaKey: 'ia_page_shipping',
    key: 'shipping',
    keywords: ['shipping', 'van-chuyen', 'giao-hang', 'delivery'],
    label: 'Vận chuyển',
    slug: '/shipping',
  },
  {
    defaultTitle: 'Chính sách thanh toán',
    iaKey: 'ia_page_payment',
    key: 'payment',
    keywords: ['payment', 'thanh-toan', 'hinh-thuc-thanh-toan', 'pay'],
    label: 'Thanh toán',
    slug: '/payment',
  },
  {
    defaultTitle: 'Câu hỏi thường gặp',
    iaKey: 'ia_page_faq',
    key: 'faq',
    keywords: ['faq', 'cau-hoi-thuong-gap', 'ho-tro', 'support'],
    label: 'Câu hỏi thường gặp',
    slug: '/faq',
  },
];

export const TRUST_PAGE_KEYS = TRUST_PAGE_SLOTS.map((slot) => slot.key);

export const findTrustPageSlot = (key: TrustPageKey) =>
  TRUST_PAGE_SLOTS.find((slot) => slot.key === key);
