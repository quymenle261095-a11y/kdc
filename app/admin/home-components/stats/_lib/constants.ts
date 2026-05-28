'use client';

import { DEFAULT_STATS_CORNER_RADIUS, DEFAULT_STATS_SPACING, type StatsContent, type StatsItem } from '../_types';

export const STATS_STYLES = [
  { id: 'horizontal' as const, label: 'Thanh ngang' },
  { id: 'cards' as const, label: 'Cards' },
  { id: 'icons' as const, label: 'Circle' },
  { id: 'gradient' as const, label: 'Gradient' },
  { id: 'minimal' as const, label: 'Minimal' },
  { id: 'counter' as const, label: 'Counter' },
  { id: 'solar-hero' as const, label: 'Hero ảnh nền' },
  { id: 'builder-overlay' as const, label: 'Overlay Builder' },
];

export const DEFAULT_STATS_BACKGROUND_IMAGE = '';

export const DEFAULT_STATS_ITEMS: StatsItem[] = [
  { description: 'Được tin chọn bởi hơn 1.000 khách hàng trên toàn quốc.', label: 'Khách hàng', value: '1000+' },
  { description: 'Đồng hành cùng hơn 50 đối tác chiến lược.', label: 'Đối tác', value: '50+' },
  { description: 'Tối ưu trải nghiệm để duy trì mức độ hài lòng cao.', label: 'Hài lòng', value: '99%' },
  { description: 'Luôn sẵn sàng hỗ trợ khách hàng khi cần.', label: 'Hỗ trợ', value: '24/7' },
];

export const DEFAULT_STATS_CONFIG: Partial<StatsContent> = {
  showTitle: true,
  showSubtitle: true,
  subtitle: '',
  headerAlign: 'left',
  desktopColumns: 4,
  mediaPlacement: 'top',
  mediaAlign: 'center',
  backgroundImage: DEFAULT_STATS_BACKGROUND_IMAGE,
  fullWidth: false,
  spacing: DEFAULT_STATS_SPACING,
  cornerRadius: DEFAULT_STATS_CORNER_RADIUS,
};
