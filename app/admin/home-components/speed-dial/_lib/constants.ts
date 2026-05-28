import type { SpeedDialConfig, SpeedDialStyle } from '../_types';

export const SPEED_DIAL_STYLES: Array<{ id: SpeedDialStyle; label: string }> = [
  { id: 'fab', label: 'Layout 1' },
  { id: 'sidebar', label: 'Layout 2' },
  { id: 'pills', label: 'Layout 3' },
  { id: 'stack', label: 'Layout 4' },
  { id: 'dock', label: 'Layout 5' },
  { id: 'minimal', label: 'Layout 6' },
  { id: 'builder-bar', label: 'Layout 7' },
];

export const normalizeSpeedDialStyle = (value?: string): SpeedDialStyle => {
  if (value === 'fab' || value === 'sidebar' || value === 'pills' || value === 'stack' || value === 'dock' || value === 'minimal' || value === 'builder-bar') {
    return value;
  }
  return 'fab';
};

export const DEFAULT_SPEED_DIAL_CONFIG: SpeedDialConfig = {
  actions: [
    {
      id: 'default-1',
      bgColor: '#3b82f6',
      icon: 'phone',
      label: '',
      url: '',
    },
  ],
  position: 'bottom-right',
  style: 'fab',
  defaultOpen: true,
  showOnAllPages: false,
  enableShadow: true,
};
