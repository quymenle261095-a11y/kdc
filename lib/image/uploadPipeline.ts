import { buildImageFilename, getExtensionFromMime, slugify, type ImageNamingContext } from './uploadNaming';
import { getProductImageAspectRatioValue, isAspectRatioMatch, type ImageAspectRatioInput } from '@/lib/products/image-aspect-ratio';
import { smartCropLogoFile, type SmartLogoCropProgress } from './logoSmartCrop';

export const WEBP_UPLOAD_QUALITY = 0.85;

const DEFAULT_MAX_FILE_SIZE_MB = 10;

type PrepareImageOptions = {
  quality?: number;
  preserveGif?: boolean;
  preservePngWithTransparency?: boolean;
  crop?: ImageCropSelection;
  targetDimension?: number;
  naming?: ImageNamingContext;
  smartLogoCrop?: boolean;
  onProgress?: (progress: SmartLogoCropProgress) => void;
};

export type ImageCropSelection = {
  scale: number;
  xPercent: number;
  yPercent: number;
  aspectRatio: ImageAspectRatioInput;
};

export type PreparedUploadImage = {
  file: File;
  filename: string;
  height: number;
  mimeType: string;
  originalSize: number;
  size: number;
  width: number;
};

function buildLegacyFilename(originalName: string, mimeType: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  const ext = getExtensionFromMime(mimeType);
  return `${slugify(baseName)}-${timestamp}-${random}.${ext}`;
}

export async function getImageDimensions(file: File): Promise<{ height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.width;
      const height = img.height;
      URL.revokeObjectURL(objectUrl);
      resolve({ height, width });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc kích thước ảnh'));
    };

    img.src = objectUrl;
  });
}

export function getImageDimensionsFromUrl(url: string): Promise<{ height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error('Ảnh không có kích thước hợp lệ'));
        return;
      }
      resolve({ height: image.naturalHeight, width: image.naturalWidth });
    };

    image.onerror = () => reject(new Error('Không thể tải ảnh từ URL'));
    image.src = url;
  });
}

async function hasTransparency(file: File): Promise<boolean> {
  if (file.type !== 'image/png') {
    return false;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(true);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          URL.revokeObjectURL(objectUrl);
          resolve(true);
          return;
        }
      }

      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(true);
    };

    img.src = objectUrl;
  });
}

async function convertToWebP(file: File, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        resolve(blob);
      }, 'image/webp', quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}

async function cropImageToAspectRatio(file: File, selection: ImageCropSelection): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const sourceWidth = img.width;
      const sourceHeight = img.height;
      const safeScale = Number.isFinite(selection.scale) ? Math.max(1, selection.scale) : 1;
      const targetRatio = getProductImageAspectRatioValue(selection.aspectRatio);
      const sourceRatio = sourceWidth / sourceHeight;
      const baseWidth = sourceRatio >= targetRatio ? sourceHeight * targetRatio : sourceWidth;
      const baseHeight = sourceRatio >= targetRatio ? sourceHeight : sourceWidth / targetRatio;
      const cropWidth = baseWidth / safeScale;
      const cropHeight = baseHeight / safeScale;

      const maxX = Math.max(0, sourceWidth - cropWidth);
      const maxY = Math.max(0, sourceHeight - cropHeight);
      const xRatio = Number.isFinite(selection.xPercent) ? Math.min(1, Math.max(0, selection.xPercent)) : 0;
      const yRatio = Number.isFinite(selection.yPercent) ? Math.min(1, Math.max(0, selection.yPercent)) : 0;

      const srcX = maxX * xRatio;
      const srcY = maxY * yRatio;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Không thể khởi tạo canvas để cắt ảnh'));
        return;
      }

      const outputWidth = Math.max(1, Math.round(cropWidth));
      const outputHeight = Math.max(1, Math.round(cropHeight));
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      ctx.drawImage(img, srcX, srcY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error('Không thể tạo ảnh sau khi cắt'));
          return;
        }

        const extension = mimeType === 'image/png' ? 'png' : 'jpg';
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const croppedFile = new File([blob], `${baseName}-crop.${extension}`, { type: mimeType });
        resolve(croppedFile);
      }, mimeType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc ảnh để cắt'));
    };

    img.src = objectUrl;
  });
}

async function resizeImageToDimension(file: File, targetDimension: number): Promise<File> {
  if (!Number.isInteger(targetDimension) || targetDimension <= 0) {
    return file;
  }

  const dimensions = await getImageDimensions(file);
  if (dimensions.width !== dimensions.height) {
    throw new Error(`Ảnh phải là ảnh vuông trước khi resize về ${targetDimension}x${targetDimension}px`);
  }
  if (dimensions.width === targetDimension) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Không thể khởi tạo canvas để resize ảnh'));
        return;
      }

      canvas.width = targetDimension;
      canvas.height = targetDimension;
      context.drawImage(image, 0, 0, targetDimension, targetDimension);

      const mimeType = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/svg+xml'
        ? 'image/png'
        : file.type === 'image/jpeg'
          ? 'image/jpeg'
          : 'image/webp';
      const quality = mimeType === 'image/png' ? undefined : 0.92;

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error('Không thể tạo ảnh sau khi resize'));
          return;
        }

        const extension = mimeType.split('/')[1];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        resolve(new File([blob], `${baseName}-${targetDimension}x${targetDimension}.${extension}`, { type: mimeType }));
      }, mimeType, quality);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc ảnh để resize'));
    };

    image.src = objectUrl;
  });
}

export function validateImageFile(file: File, maxFileSizeMb: number = DEFAULT_MAX_FILE_SIZE_MB): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Vui lòng chọn file hình ảnh';
  }

  if (file.size > maxFileSizeMb * 1024 * 1024) {
    return `Kích thước file không được vượt quá ${maxFileSizeMb}MB`;
  }

  return null;
}

export async function prepareImageForUpload(
  file: File,
  options: PrepareImageOptions = {}
): Promise<PreparedUploadImage> {
  const quality = options.quality ?? WEBP_UPLOAD_QUALITY;
  const preserveGif = options.preserveGif ?? true;
  const preservePngWithTransparency = options.preservePngWithTransparency ?? true;

  const cropSelection = 'crop' in options ? options.crop : undefined;
  const initialDimensions = await getImageDimensions(file);
  let sourceFile = file;
  let dimensions = initialDimensions;

  if (options.smartLogoCrop) {
    sourceFile = await smartCropLogoFile(sourceFile, {
      onProgress: options.onProgress,
      useModelFallback: true,
    });
    dimensions = await getImageDimensions(sourceFile);
  }

  if (cropSelection && !isAspectRatioMatch(dimensions, cropSelection.aspectRatio)) {
    sourceFile = await cropImageToAspectRatio(sourceFile, cropSelection);
    dimensions = await getImageDimensions(sourceFile);
  }

  if (options.targetDimension) {
    sourceFile = await resizeImageToDimension(sourceFile, options.targetDimension);
    dimensions = await getImageDimensions(sourceFile);
  }

  let targetMimeType = sourceFile.type;
  let targetBlob: Blob = sourceFile;

  const isGif = sourceFile.type === 'image/gif';
  const isPng = sourceFile.type === 'image/png';
  const isSvg = sourceFile.type === 'image/svg+xml';

  const shouldKeepGif = preserveGif && isGif;
  const shouldKeepPng = preservePngWithTransparency && isPng && await hasTransparency(sourceFile);
  const shouldKeepOriginal = shouldKeepGif || shouldKeepPng || isSvg;

  if (!shouldKeepOriginal) {
    const webpBlob = await convertToWebP(sourceFile, quality);
    if (webpBlob) {
      targetBlob = webpBlob;
      targetMimeType = 'image/webp';
    }
  }

  const filename = options.naming
    ? buildImageFilename({ context: options.naming, originalName: sourceFile.name, mimeType: targetMimeType })
    : buildLegacyFilename(sourceFile.name, targetMimeType);
  const uploadFile = new File([targetBlob], filename, { type: targetMimeType });

  return {
    file: uploadFile,
    filename,
    height: dimensions.height,
    mimeType: targetMimeType,
    originalSize: file.size,
    size: uploadFile.size,
    width: dimensions.width,
  };
}
