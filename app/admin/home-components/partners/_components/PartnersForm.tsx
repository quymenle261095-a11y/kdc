import React from 'react';
import { Handshake, Settings2 } from 'lucide-react';
import { Label, cn } from '../../../components/ui';
import { MultiImageUploader } from '../../../components/MultiImageUploader';
import type { PartnerItem, PartnersCornerRadius, PartnersLogoSize, PartnersSpacing } from '../_types';
import { CollapsibleSubSection as SubSection } from '../../_shared/components/CollapsibleSubSection';
import { SectionSpacingControl } from '../../_shared/components/SectionSpacingControl';
import { useFormSectionsState } from '../../_shared/hooks/useFormSectionsState';
import { FormSectionsToggleAllButton } from '../../_shared/components/FormSectionsToggleAllButton';

const activeSections = ['settings', 'partners'];

export const PartnersForm = ({
  items,
  setItems,
  cornerRadius,
  setCornerRadius,
  logoSize,
  setLogoSize,
  showBorder,
  setShowBorder,
  spacing,
  setSpacing,
  defaultExpanded = true,
  showBorderControl = true,
  className,
  actions,
}: {
  items: PartnerItem[];
  setItems: (items: PartnerItem[]) => void;
  cornerRadius: PartnersCornerRadius;
  setCornerRadius: (value: PartnersCornerRadius) => void;
  logoSize: PartnersLogoSize;
  setLogoSize: (value: PartnersLogoSize) => void;
  showBorder: boolean;
  setShowBorder: (value: boolean) => void;
  spacing: PartnersSpacing;
  setSpacing: (value: PartnersSpacing) => void;
  defaultExpanded?: boolean;
  showBorderControl?: boolean;
  className?: string;
  actions?: React.ReactNode;
}) => {
  const { openSections, toggleSection, hasClosedSection, handleToggleAll } = useFormSectionsState(activeSections, defaultExpanded);

  return (
    <div className={cn('mb-6', className)}>
      <FormSectionsToggleAllButton hasClosedSection={hasClosedSection} onToggleAll={handleToggleAll} />
      <div className="space-y-3">
        <SubSection
          icon={Settings2}
          title="Cài đặt hiển thị"
          open={openSections.settings}
          onOpenChange={(open) => toggleSection('settings', open)}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bo góc card</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={cornerRadius}
                onChange={(event) => { setCornerRadius(event.target.value as PartnersCornerRadius); }}
              >
                <option value="none">Không bo góc</option>
                <option value="sm">Bo góc ít</option>
                <option value="lg">Bo góc nhiều</option>
              </select>
            </div>
            <SectionSpacingControl value={spacing} onChange={setSpacing} />
            <div className="space-y-2">
              <Label>Kích thước logo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={logoSize}
                onChange={(event) => { setLogoSize(event.target.value as PartnersLogoSize); }}
              >
                <option value="small">Nhỏ</option>
                <option value="normal">Bình thường</option>
                <option value="large">Lớn</option>
                <option value="veryLarge">Rất lớn</option>
                <option value="largest">Lớn nhất</option>
              </select>
            </div>
            {showBorderControl && (
              <div className="space-y-2">
                <Label>Border card</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  value={showBorder ? 'show' : 'hide'}
                  onChange={(event) => { setShowBorder(event.target.value === 'show'); }}
                >
                  <option value="show">Có border</option>
                  <option value="hide">Bỏ border</option>
                </select>
              </div>
            )}
          </div>
        </SubSection>

        <SubSection
          icon={Handshake}
          title={`Logo đối tác (${items.length})`}
          open={openSections.partners}
          onOpenChange={(open) => toggleSection('partners', open)}
          actions={actions}
        >
          <div className="space-y-2">
            <MultiImageUploader<PartnerItem>
              items={items}
              onChange={setItems}
              folder="partners"
              imageKey="url"
              extraFields={[
                { key: 'name', placeholder: 'Tên đối tác / thương hiệu', type: 'text' },
                { key: 'link', placeholder: 'Link website đối tác', type: 'url' }
              ]}
              minItems={1}
              maxItems={60}
              aspectRatio="video"
              columns={4}
              showReorder={true}
              addButtonText="Thêm logo"
              layout="vertical"
              enableCrop
              cropOnUpload={false}
              cropAspectRatio="square"
              deleteMode="defer"
              imageFit="contain"
            />
          </div>
        </SubSection>
      </div>
    </div>
  );
};
