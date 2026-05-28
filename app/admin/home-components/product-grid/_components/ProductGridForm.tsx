'use client';

import React from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import { Check, GripVertical, Layers, Package, Plus, RotateCcw, Search, X } from 'lucide-react';
import { useDemoItemList } from '../../_shared/hooks/useDemoItemList';
import { DemoItemRowShell } from '../../_shared/components/DemoItemRowShell';
import { DemoPrimaryFields } from '../../_shared/components/DemoPrimaryFields';
import { Button, Input, Label, cn } from '../../../components/ui';
import { SettingsImageUploader } from '../../../components/SettingsImageUploader';
import type { ProductGridSortBy, ProductGridSelectionMode } from '../_types';
import type { SectionSpacing } from '../../_shared/types/sectionSpacing';
import type { DemoProductItem, ProductListCardRadius } from '../../product-list/_types';
import { AiDemoProductsImport } from '../../product-list/_components/AiDemoProductsImport';
import { CollapsibleSubSection as SubSection } from '../../_shared/components/CollapsibleSubSection';
import { HomeComponentDisplaySettingsSection } from '../../_shared/components/HomeComponentDisplaySettingsSection';
import { useFormSectionsState } from '../../_shared/hooks/useFormSectionsState';
import { FormSectionsToggleAllButton } from '../../_shared/components/FormSectionsToggleAllButton';

import { DEFAULT_GRID_DEMO_PRODUCTS } from '../_lib/constants';

export const DEFAULT_DEMO_PRODUCTS: DemoProductItem[] = DEFAULT_GRID_DEMO_PRODUCTS;

export interface ProductGridProductItem {
  _id: string;
  name: string;
  image?: string | null;
  price?: number | null;
  salePrice?: number | null;
  hasVariants?: boolean;
}

export interface CategoryTabItem {
  _id: string;
  name: string;
  image?: string;
  active: boolean;
}

export const ProductGridForm = ({
  itemCount,
  setItemCount,
  sortBy,
  setSortBy,
  selectionMode,
  setSelectionMode,
  selectedProductIds,
  setSelectedProductIds,
  productSearchTerm,
  setProductSearchTerm,
  selectedProducts,
  filteredProducts,
  isLoading,
  demoProducts,
  setDemoProducts,
  categoryTabIds,
  setCategoryTabIds,
  allCategories,
  desktopColumns = 4,
  onDesktopColumnsChange,
  spacing,
  setSpacing,
  cardRadius,
  setCardRadius,
  defaultExpanded = true,
  className,
}: {
  itemCount: number;
  setItemCount: (value: number) => void;
  sortBy: ProductGridSortBy;
  setSortBy: (value: ProductGridSortBy) => void;
  selectionMode: ProductGridSelectionMode;
  setSelectionMode: (value: ProductGridSelectionMode) => void;
  selectedProductIds: string[];
  setSelectedProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  productSearchTerm: string;
  setProductSearchTerm: (value: string) => void;
  selectedProducts: ProductGridProductItem[];
  filteredProducts: ProductGridProductItem[];
  isLoading: boolean;
  demoProducts: DemoProductItem[];
  setDemoProducts: React.Dispatch<React.SetStateAction<DemoProductItem[]>>;
  categoryTabIds: string[];
  setCategoryTabIds: React.Dispatch<React.SetStateAction<string[]>>;
  allCategories?: CategoryTabItem[];
  desktopColumns?: 3 | 4 | 5 | 6;
  onDesktopColumnsChange?: (cols: 3 | 4 | 5 | 6) => void;
  spacing?: SectionSpacing;
  setSpacing?: (value: SectionSpacing) => void;
  cardRadius?: ProductListCardRadius;
  setCardRadius?: (value: ProductListCardRadius) => void;
  defaultExpanded?: boolean;
  className?: string;
}) => {
  const { openSections, toggleSection, hasClosedSection, handleToggleAll } = useFormSectionsState(
    ['settings', 'columns', 'tabs', 'source'],
    defaultExpanded
  );

  const selectedCategories = allCategories
    ? categoryTabIds.map(id => allCategories.find(c => c._id === id)).filter(Boolean) as CategoryTabItem[]
    : [];

  const { add: addDemoProduct, update: updateDemoProduct, remove: removeDemoProduct, loadDefault: loadDefaultDemo } = useDemoItemList(
    demoProducts,
    setDemoProducts,
    {
      createEmpty: () => ({ name: '', image: '', price: '', originalPrice: '', description: '', category: '', tag: '' as const, link: '' }),
      defaults: DEFAULT_DEMO_PRODUCTS,
    },
  );

  return (
    <div className={cn('mb-6', className)}>
      <AiDemoProductsImport onApply={setDemoProducts} />
      <FormSectionsToggleAllButton
        hasClosedSection={hasClosedSection}
        onToggleAll={handleToggleAll}
      />
      <div className="space-y-3">
      {spacing && setSpacing && cardRadius && setCardRadius ? (
        <HomeComponentDisplaySettingsSection
            open={openSections.settings}
            onOpenChange={(open) => toggleSection('settings', open)}
            cornerRadius={cardRadius}
            onCornerRadiusChange={setCardRadius}
            spacing={spacing}
            onSpacingChange={setSpacing}
          />
      ) : null}

      {/* ── Số cột desktop ── */}
      {onDesktopColumnsChange && (
        <div>
          <SubSection
            icon={Layers}
            title="Số cột desktop"
            open={openSections.columns}
            onOpenChange={(open) => toggleSection('columns', open)}
          >
            <div className="grid grid-cols-4 gap-2">
              {([3, 4, 5, 6] as const).map((option) => {
                const selected = desktopColumns === option;
                const info = option === 3 ? 'Tablet 3 · Mobile 1' : option === 4 ? 'Tablet 2 · Mobile 2' : option === 5 ? 'Tablet 3 · Mobile 2' : 'Tablet 3 · Mobile 3';
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onDesktopColumnsChange(option)}
                    className={cn(
                      'py-2 rounded-md border text-xs transition-colors text-center',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                    )}
                  >
                    <div className="font-semibold">{option} cột</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{info}</div>
                  </button>
                );
              })}
            </div>
          </SubSection>
        </div>
      )}

      {/* ── Tab danh mục ── */}
      <div>
        <SubSection
          icon={Layers}
          title="Tab danh mục"
          open={openSections.tabs}
          onOpenChange={(open) => toggleSection('tabs', open)}
        >
        <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Chọn danh mục hiển thị dưới dạng nút lọc phía trên lưới sản phẩm
            </p>
            {/* Selected tabs */}
            {selectedCategories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Đã chọn ({selectedCategories.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(cat => (
                    <span
                      key={cat._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
                    >
                      {cat.name}
                      <button
                        type="button"
                        onClick={() => setCategoryTabIds(prev => prev.filter(id => id !== cat._id))}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Available categories */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Chọn danh mục hiển thị</Label>
              {!allCategories ? (
                <p className="text-xs text-slate-400">Đang tải danh mục...</p>
              ) : allCategories.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có danh mục sản phẩm nào</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allCategories.filter(cat => cat.active).map(cat => {
                    const isSelected = categoryTabIds.includes(cat._id);
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCategoryTabIds(prev => prev.filter(id => id !== cat._id));
                          } else {
                            setCategoryTabIds(prev => [...prev, cat._id]);
                          }
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          isSelected
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-blue-600'
                        )}
                      >
                        {isSelected && <Check size={12} />}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCategories.length === 0 && allCategories && allCategories.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Chưa chọn danh mục — sẽ hiển thị tất cả danh mục active
              </p>
            )}
        </div>
        </SubSection>
      </div>

      {/* ── Nguồn dữ liệu ── */}
      <div>
        <SubSection
          icon={Package}
          title="Nguồn dữ liệu"
          open={openSections.source}
          onOpenChange={(open) => toggleSection('source', open)}
        >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Chế độ chọn sản phẩm</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>{  setSelectionMode('auto'); }}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all",
                  selectionMode === 'auto'
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                Tự động
              </button>
              <button
                type="button"
                onClick={() =>{  setSelectionMode('manual'); }}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all",
                  selectionMode === 'manual'
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                Chọn thủ công
              </button>
              <button
                type="button"
                onClick={() =>{  setSelectionMode('demo'); }}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all",
                  selectionMode === 'demo'
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                Demo
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {selectionMode === 'auto'
                ? 'Hiển thị sản phẩm tự động theo số lượng và sắp xếp'
                : selectionMode === 'manual'
                  ? 'Chọn từng sản phẩm cụ thể để hiển thị'
                  : 'Nhập dữ liệu demo trực tiếp, không cần sản phẩm thật'}
            </p>
          </div>

          {selectionMode === 'auto' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số lượng hiển thị</Label>
                <Input
                  type="number"
                  value={itemCount}
                  onChange={(e) =>{  setItemCount(Number.parseInt(e.target.value) || 8); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Sắp xếp theo</Label>
                <select
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  value={sortBy}
                  onChange={(e) =>{  setSortBy(e.target.value as ProductGridSortBy); }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="bestseller">Bán chạy nhất</option>
                  <option value="random">Ngẫu nhiên</option>
                </select>
              </div>
            </div>
          )}

          {selectionMode === 'manual' && (
            <div className="space-y-4">
              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <Label>Sản phẩm đã chọn ({selectedProducts.length})</Label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedProducts.map((product, index) => (
                      <div
                        key={product._id}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group"
                      >
                        <div className="text-slate-400 cursor-move"><GripVertical size={16} /></div>
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full font-medium">{index + 1}</span>
                        {product.image ? (
                          <Image src={product.image} alt="" width={48} height={48} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center"><Package size={16} className="text-slate-400" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.price?.toLocaleString('vi-VN')}đ</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={() =>{  setSelectedProductIds(ids => ids.filter(id => id !== product._id)); }}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Thêm sản phẩm</Label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Tìm kiếm sản phẩm..."
                    className="pl-9"
                    value={productSearchTerm}
                    onChange={(e) =>{  setProductSearchTerm(e.target.value); }}
                  />
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-[250px] overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      {isLoading ? 'Đang tải...' : 'Không tìm thấy sản phẩm'}
                    </div>
                  ) : (
                    filteredProducts.map(product => {
                      const isSelected = selectedProductIds.includes(product._id);
                      return (
                        <div
                          key={product._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProductIds(ids => ids.filter(id => id !== product._id));
                            } else {
                              setSelectedProductIds(ids => [...ids, product._id]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors",
                            isSelected ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-600"
                          )}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          {product.image ? (
                            <Image src={product.image} alt="" width={40} height={40} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center"><Package size={14} className="text-slate-400" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.price?.toLocaleString('vi-VN')}đ</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Demo mode - Inline demo items */}
          {selectionMode === 'demo' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sản phẩm demo ({demoProducts.length})</Label>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={loadDefaultDemo}>
                    <RotateCcw size={14} className="mr-1" /> Mặc định
                  </Button>
                  <AiDemoProductsImport onApply={setDemoProducts} />
                  <Button type="button" variant="outline" size="sm" onClick={addDemoProduct}>
                    <Plus size={14} className="mr-1" /> Thêm
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {demoProducts.map((item, index) => (
                  <DemoItemRowShell
                    key={item.id}
                    index={index}
                    image={item.image}
                    placeholderIcon={<Package size={12} />}
                    onRemove={() => removeDemoProduct(item.id)}
                    footer={
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Giá gốc (tùy chọn)" value={item.originalPrice ?? ''} className="h-7 text-xs"
                          onChange={(e) => updateDemoProduct(item.id, { originalPrice: e.target.value })} />
                        <Input placeholder="Danh mục" value={item.category ?? ''} className="h-7 text-xs"
                          onChange={(e) => updateDemoProduct(item.id, { category: e.target.value })} />
                        <SettingsImageUploader
                          label="Ảnh sản phẩm"
                          value={item.image ?? ''}
                          onChange={(url) => updateDemoProduct(item.id, { image: url ?? '' })}
                          folder="home-components/product-grid"
                          naming={{ entityName: item.name || 'demo-product', field: 'image', index: index + 1 }}
                          previewSize="sm"
                        />
                      </div>
                    }
                  >
                    <DemoPrimaryFields
                      name={item.name}
                      namePlaceholder="Tên sản phẩm *"
                      onNameChange={v => updateDemoProduct(item.id, { name: v })}
                      link={item.link ?? ''}
                      onLinkChange={v => updateDemoProduct(item.id, { link: v })}
                    />
                    <Input placeholder="Giá (VD: 350.000đ)" value={item.price ?? ''} className="h-8 w-28 text-xs shrink-0"
                      onChange={(e) => updateDemoProduct(item.id, { price: e.target.value })} />
                  </DemoItemRowShell>
                ))}
              </div>
              {demoProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                  <Package size={24} className="mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 mb-3">Chưa có sản phẩm demo</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={loadDefaultDemo}>
                      <RotateCcw size={12} /> Tải mẫu
                    </Button>
                    <AiDemoProductsImport buttonClassName="h-9" onApply={setDemoProducts} />
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addDemoProduct}>
                      <Plus size={12} /> Thêm mới
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </SubSection>
      </div>
      </div>
    </div>
  );
};
