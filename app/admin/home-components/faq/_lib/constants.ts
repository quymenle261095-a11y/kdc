import type { FaqConfig, FaqStyleOption, FaqItem } from '../_types';

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  { id: 1, question: '', answer: '' },
];

export const FAQ_STYLES: FaqStyleOption[] = [
  { id: 'wine-list', label: 'Wine List' },
  { id: 'accordion', label: 'Minimal' },
  { id: 'minimal', label: 'Floating' },
  { id: 'timeline', label: 'Split' },
  { id: 'cards', label: 'Grid' },
  { id: 'two-column', label: 'Showcase' },
  { id: 'tabbed', label: 'Brand' },
];

export const DEFAULT_FAQ_CONFIG: FaqConfig = {
  description: '',
  buttonText: '',
  buttonLink: '',
  // Header defaults
  hideHeader: false,
  showTitle: true,
  showSubtitle: true,
  subtitle: '',
  headerAlign: 'left',
  titleColorPrimary: false,
  subtitleAboveTitle: false,
  uppercaseText: false,
  showBadge: true,
  badgeText: '',
  spacing: 'normal',
  cornerRadius: 'none',
  rounded: 'none',
  desktopColumns: 4,
};
