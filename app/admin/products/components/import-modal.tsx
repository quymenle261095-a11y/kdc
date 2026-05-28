"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "../../components/ui";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { generateProductTemplateBase64, parseProductExcelBase64 } from "../actions/excel-actions";
import { Download, Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ProductModuleConfig } from "@/lib/excel/product-schema-builder";

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Không đọc được file Excel"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Không đọc được file Excel"));
    reader.readAsDataURL(file);
  });

export function ImportExportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const settings = useQuery(api.admin.modules.listModuleSettings, { moduleKey: "products" }) || [];
  const getSetting = (key: string) => settings.find(setting => setting.settingKey === key)?.value;
  const productTypeMode = getSetting("productTypeMode") ?? "both";
  const variantImages = getSetting("variantImages") ?? "inherit";

  const configData: ProductModuleConfig = {
    hasVariants: Boolean(getSetting("variantEnabled")),
    imageStrategy: variantImages === "override" ? "OVERRIDE" : variantImages === "both" ? "MIXED" : "INHERIT",
    inventoryStrategy: getSetting("variantStock") === "product" ? "PRODUCT_LEVEL" : "VARIANT_LEVEL",
    isDigitalEnabled: productTypeMode === "digital" || productTypeMode === "both",
    isPhysicalEnabled: productTypeMode === "physical" || productTypeMode === "both",
    priceStrategy: getSetting("variantPricing") === "product" ? "PRODUCT_LEVEL" : "VARIANT_LEVEL",
  };

  const categories = useQuery(api.productCategories.listAll, {}) || [];
  const productOptions = useQuery(api.productOptions.listActiveWithValues, {}) || [];
  const upsertBulk = useMutation(api.productsImport.upsertBulk);

  const excelOptions = productOptions.map((opt) => ({
    name: opt.name,
    slug: opt.slug,
    values: opt.values.map((v) => v.value),
  }));

  const handleDownloadTemplate = async () => {
    try {
      setIsLoading(true);
      const categoryList = categories.map(c => ({ id: c._id, name: c.name }));
      const base64 = await generateProductTemplateBase64(configData, categoryList, excelOptions);
      
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      link.download = "Product_Import_Template.xlsx";
      link.click();
      toast.success("Đã tải template thành công!");
    } catch (error) {
      toast.error("Lỗi khi tạo template");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file Excel");
      return;
    }

    try {
      setIsLoading(true);
      
      const base64String = await toBase64(file);
      const result = await parseProductExcelBase64(base64String, configData, excelOptions);
      
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      console.log("Parsed Data:", result.data);
      const optionNames = excelOptions.map((opt) => opt.name);
      await upsertBulk({ 
        products: result.data as any,
        optionNames: optionNames.length > 0 ? optionNames : undefined,
      });
      
      toast.success(`Upsert thành công ${result.data?.length} sản phẩm (Cha).`);
      setIsOpen(false);
      setFile(null);
    } catch (error: any) {
      toast.error("Lỗi Import: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setIsOpen(true)}>
        <FileSpreadsheet className="h-4 w-4" />
        Import / Export
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Quản lý Dữ liệu Excel (Schema-Driven)</DialogTitle>
            <DialogDescription>
              File template sẽ được sinh động dựa trên cấu hình hệ thống hiện tại.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" /> 1. Tải Template (Smart Form)
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Bao gồm sẵn danh mục, validation và cấu hình cột mới nhất.
              </p>
              <Button onClick={handleDownloadTemplate} disabled={isLoading} variant="secondary">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Tải Mẫu Excel Mới Nhất
              </Button>
            </div>

            <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" /> 2. Upload Dữ Liệu (Upsert)
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Để trống ID để tạo mới, hoặc giữ nguyên ID để cập nhật.
              </p>
              <Input 
                type="file" 
                accept=".xlsx" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Hệ thống dùng <b>Strict Mode</b>. Nếu bạn vừa thay đổi cấu hình tính năng sản phẩm, hãy tải lại Template mới trước khi Import.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
            <Button onClick={handleImport} disabled={!file || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tiến hành Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
