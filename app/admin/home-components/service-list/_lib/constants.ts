import type {
  ServiceListConfig,
  ServiceListStyle,
} from '../_types';
import {
  DEFAULT_SERVICE_LIST_CARD_RADIUS,
  DEFAULT_SERVICE_LIST_DESKTOP_COLUMNS,
  DEFAULT_SERVICE_LIST_SPACING,
} from '../_types';

export const SERVICE_LIST_STYLES: { id: ServiceListStyle; label: string }[] = [
  { id: 'grid', label: 'Grid' },
  { id: 'bento', label: 'Bento' },
  { id: 'list', label: 'List' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'showcase', label: 'Showcase' }
];

export const DEFAULT_SERVICE_LIST_CONFIG: ServiceListConfig = {
  cardRadius: DEFAULT_SERVICE_LIST_CARD_RADIUS,
  desktopColumns: DEFAULT_SERVICE_LIST_DESKTOP_COLUMNS,
  itemCount: 8,
  selectionMode: 'auto',
  spacing: DEFAULT_SERVICE_LIST_SPACING,
  sortBy: 'newest',
};
