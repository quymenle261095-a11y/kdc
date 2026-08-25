'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import {
  Button,
  Checkbox,
  Input,
  Label,
} from '../../components/ui';
import { IconPopoverPicker } from '../../home-components/_shared/components/IconPopoverPicker';
import { ATTRIBUTE_ICON_OPTIONS } from '../_lib/iconRegistry';
import { AttributeGroupPreview } from '../_components/AttributeGroupPreview';
import { AiAttributeTermsImportDialog, type PendingAttributeTerm } from '../_components/AiAttributeTermsImportDialog';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminSelect,
  AdminSlugInput,
  AdminStickyFooter,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

export default function AttributeGroupCreatePage() {
  const router = useRouter();
  const createGroup = useMutation(api.attributeGroups.create);
  const createTerm = useMutation(api.attributeTerms.create);

  const primarySetting = useQuery(api.settings.getByKey, { key: 'site_brand_primary' });
  const secondarySetting = useQuery(api.settings.getByKey, { key: 'site_brand_secondary' });
  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });
  const enableProductTypes = enableProductTypesSetting?.value === true;

  const brandPrimary = (primarySetting?.value as string) || '#ea580c';
  const brandSecondary = (secondarySetting?.value as string) || '#475569';

  const colorPresets = [
    { label: 'Đen', value: '#000000', class: 'bg-black border-black text-white' },
    { label: 'Trắng', value: '#ffffff', class: 'bg-white border-slate-200 text-slate-800' },
    { label: 'Màu chính', value: brandPrimary, class: 'text-white', style: { backgroundColor: brandPrimary, borderColor: brandPrimary } },
    { label: 'Màu phụ', value: brandSecondary, class: 'text-white', style: { backgroundColor: brandSecondary, borderColor: brandSecondary } },
  ];

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [filterType, setFilterType] = useState('single');
  const [inputType, setInputType] = useState('select');
  const [isFilterable, setIsFilterable] = useState(true);
  const [isSpecialFilter, setIsSpecialFilter] = useState(false);
  const [iconName, setIconName] = useState('Wine');
  const [iconColor, setIconColor] = useState('#ea580c');
  const [pendingTerms, setPendingTerms] = useState<PendingAttributeTerm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleApplyAiTerms = (terms: PendingAttributeTerm[]) => {
    setPendingTerms((prev) => {
      const map = new Map(prev.map((term) => [term.slug, term]));
      terms.forEach((term) => map.set(term.slug, term));
      return Array.from(map.values());
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    if (isSpecialFilter && (filterType === 'range' || inputType === 'range')) {
      toast.error('Bộ lọc đặc biệt không được phép sử dụng kiểu khoảng giá (range). Vui lòng chọn kiểu Một lựa chọn hoặc Nhiều lựa chọn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const groupId = await createGroup({
        name: name.trim(),
        code: code.trim(),
        slug: slug.trim(),
        filterType,
        inputType,
        isFilterable,
        isSpecialFilter,
        iconPath: iconName,
        displayConfig: {
          iconColor,
          color: iconColor,
        },
      });

      for (let i = 0; i < pendingTerms.length; i++) {
        const term = pendingTerms[i];
        await createTerm({
          groupId,
          name: term.name,
          slug: term.slug,
          description: term.description,
          active: true,
          order: i,
        });
      }

      toast.success('Tạo nhóm thuộc tính thành công');
      router.push('/admin/attribute-groups');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo nhóm thuộc tính'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm nhóm thuộc tính"
      subtitle="Thiết lập nhóm thuộc tính sản phẩm, kiểu lọc, icon và các giá trị đi kèm."
      backHref="/admin/attribute-groups"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo nhóm thuộc tính"
          onCancel={() => router.push('/admin/attribute-groups')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          disableSave={isSubmitting || !name.trim() || !slug.trim() || !code.trim()}
          aiImportNode={
            <AiAttributeTermsImportDialog
              groupName={name}
              filterType={filterType}
              inputType={inputType}
              onApply={handleApplyAiTerms}
            />
          }
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin nhóm thuộc tính">
              <AdminTitleInput
                label="Tên nhóm thuộc tính"
                value={name}
                onChange={handleNameChange}
                required
                placeholder="VD: Dung tích, Giống nho, Thương hiệu, Màu sắc..."
                autoFocus
                copyLabel="tên nhóm thuộc tính"
              />

              <AdminSlugInput
                slug={slug}
                onChange={setSlug}
              />

              <div className="space-y-2">
                <Label>Mã nhóm (Code) <span className="text-red-500">*</span></Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="VD: volume, grape, brand, color..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kiểu lọc (Filter type)</Label>
                  <AdminSelect
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'single', label: 'Một lựa chọn (Single)' },
                      { value: 'multiple', label: 'Nhiều lựa chọn (Multiple)' },
                      { value: 'range', label: 'Khoảng giá trị (Range)' },
                    ]}
                  />
                </div>

                {filterType !== 'range' && (
                  <div className="space-y-2">
                    <Label>Kiểu hiển thị (Input type)</Label>
                    <AdminSelect
                      value={inputType}
                      onChange={setInputType}
                      options={[
                        { value: 'select', label: 'Dropdown (Select)' },
                        { value: 'buttons', label: 'Các nút bấm (Buttons)' },
                        { value: 'radio', label: 'Nút tròn (Radio)' },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isFilterable"
                    checked={isFilterable}
                    onCheckedChange={(checked) => setIsFilterable(Boolean(checked))}
                  />
                  <Label htmlFor="isFilterable" className="cursor-pointer font-medium">
                    Hiển thị nhóm này trong bộ lọc sản phẩm (Filter)
                  </Label>
                </div>

                {enableProductTypes && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isSpecialFilter"
                      checked={isSpecialFilter}
                      onCheckedChange={(checked) => setIsSpecialFilter(Boolean(checked))}
                    />
                    <Label htmlFor="isSpecialFilter" className="cursor-pointer font-medium">
                      Đánh dấu là bộ lọc đặc biệt
                    </Label>
                  </div>
                )}
              </div>
            </AdminFormCard>

            <AdminFormCard title="Icon & Màu sắc nhận diện">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Icon đại diện</Label>
                  <IconPopoverPicker
                    value={iconName}
                    onChange={setIconName}
                    options={ATTRIBUTE_ICON_OPTIONS}
                    brandColor={iconColor}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Màu sắc icon</Label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {colorPresets.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setIconColor(p.value)}
                        style={p.style}
                        className={`px-3 py-1 rounded text-xs font-medium border transition-all ${p.class} ${iconColor === p.value ? 'ring-2 ring-orange-500 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={iconColor}
                      onChange={(e) => setIconColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={iconColor}
                      onChange={(e) => setIconColor(e.target.value)}
                      placeholder="#ea580c"
                      className="font-mono text-sm uppercase flex-1"
                    />
                  </div>
                </div>
              </div>
            </AdminFormCard>

            <AdminFormCard title="Giá trị thuộc tính chờ tạo (Terms)">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Dùng nút "Import AI" để sinh nhanh danh sách các giá trị thuộc tính.
                  </p>
                  {pendingTerms.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 text-xs"
                      onClick={() => setPendingTerms([])}
                    >
                      Xóa tất cả ({pendingTerms.length})
                    </Button>
                  )}
                </div>

                {pendingTerms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
                    Chưa có giá trị nào. Bạn có thể thêm sau khi tạo nhóm, hoặc bấm Import AI ở thanh điều hướng để thêm hàng loạt.
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-900/20">
                    {pendingTerms.map((term, index) => (
                      <div
                        key={term.slug}
                        className="flex items-start justify-between gap-3 rounded-md bg-white dark:bg-slate-800 p-2.5 border border-slate-100 dark:border-slate-700/50 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {index + 1}. {term.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{term.slug}</div>
                          {term.description && (
                            <div className="mt-1 text-slate-500 line-clamp-1">{term.description}</div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => setPendingTerms((prev) => prev.filter((item) => item.slug !== term.slug))}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Xem trước giao diện bộ lọc">
              <AttributeGroupPreview
                name={name}
                filterType={filterType}
                inputType={inputType}
                iconName={iconName}
                iconColor={iconColor}
                terms={pendingTerms.map((term, index) => ({ _id: term.slug, name: term.name, slug: term.slug, order: index }))}
              />
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
