'use client';

import type { GalleryItem, GalleryConfig } from '../_types';

export const GALLERY_STYLES = [
  { id: 'spotlight' as const, label: 'Tiêu điểm' },
  { id: 'explore' as const, label: 'Khám phá' },
  { id: 'stories' as const, label: 'Câu chuyện' },
  { id: 'grid' as const, label: 'Grid' },
  { id: 'marquee' as const, label: 'Marquee' },
  { id: 'masonry' as const, label: 'Masonry' },
];

export const TRUST_BADGES_STYLES = [
  { id: 'grid' as const, label: 'Grid' },
  { id: 'cards' as const, label: 'Cards' },
  { id: 'stack' as const, label: 'Stack' },
  { id: 'wall' as const, label: 'Wall' },
  { id: 'carousel' as const, label: 'Carousel' },
  { id: 'seal' as const, label: 'Seal' },
];

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  { id: 'item-1', link: '', name: '', url: '' },
  { id: 'item-2', link: '', name: '', url: '' },
];

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  items: DEFAULT_GALLERY_ITEMS,
  style: 'spotlight',
  hideHeader: false,
  showTitle: true,
  subtitle: '',
  showSubtitle: true,
  headerAlign: 'left',
  titleColorPrimary: false,
  subtitleAboveTitle: false,
  uppercaseText: false,
  showBadge: true,
  badgeText: '',
};

type GalleryMarqueeItemLike = {
  url?: string;
  link?: string;
  name?: string;
};

export const getGalleryMarqueeBaseItems = <T extends GalleryMarqueeItemLike>(items: T[]): T[] => {
  const seen = new Set<string>();

  return items
    .filter((item) => item.url?.trim())
    .filter((item) => {
      const dedupeKey = `${item.url ?? ''}::${item.link ?? ''}::${item.name ?? ''}`;
      if (seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    });
};
