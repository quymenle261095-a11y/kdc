export type AiImportJsonObject = Record<string, unknown>;

type MergeOptions = {
  appendArrayItems?: boolean;
};

type FillMissingPromptOptions = {
  contextLabel?: string;
  maxContextChars?: number;
  rootKey?: string;
};

const DEFAULT_MAX_CONTEXT_CHARS = 12_000;

const isPlainObject = (value: unknown): value is AiImportJsonObject => (
  Object.prototype.toString.call(value) === '[object Object]'
);

export const isAiImportValueEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) {return true;}
  if (typeof value === 'string') {return value.trim().length === 0;}
  if (Array.isArray(value)) {return value.length === 0;}
  if (isPlainObject(value)) {
    return Object.values(value).every(isAiImportValueEmpty);
  }
  return false;
};

const normalizeForJson = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeForJson(item, seen))
      .filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) {
    try {
      const serialized = JSON.stringify(value);
      return serialized === undefined ? undefined : JSON.parse(serialized);
    } catch {
      return undefined;
    }
  }

  const output: AiImportJsonObject = {};
  Object.entries(value).forEach(([key, item]) => {
    const normalized = normalizeForJson(item, seen);
    if (normalized !== undefined) {
      output[key] = normalized;
    }
  });
  return output;
};

export const formatAiImportJson = (value: unknown, maxChars = DEFAULT_MAX_CONTEXT_CHARS): string => {
  const normalized = normalizeForJson(value);
  const text = JSON.stringify(normalized ?? {}, null, 2);
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n...TRUNCATED_FOR_PROMPT`;
};

const mergeArrayItems = (current: unknown[], generated: unknown[], options: MergeOptions): unknown[] => {
  if (current.length === 0) {
    return normalizeForJson(generated) as unknown[];
  }
  if (generated.length === 0) {
    return normalizeForJson(current) as unknown[];
  }
  if (!current.every(isPlainObject) || !generated.every(isPlainObject)) {
    if (options.appendArrayItems) {
      const seen = new Set(current.map((item) => JSON.stringify(normalizeForJson(item))));
      return [
        ...current,
        ...generated.filter((item) => {
          const key = JSON.stringify(normalizeForJson(item));
          if (seen.has(key)) {return false;}
          seen.add(key);
          return true;
        }),
      ].map((item) => normalizeForJson(item));
    }
    return normalizeForJson(current) as unknown[];
  }

  const merged: unknown[] = current.map((item, index) => (
    mergeAiMissingFields(item, generated[index] ?? {}, options)
  ));
  if (options.appendArrayItems && generated.length > current.length) {
    merged.push(...generated.slice(current.length).map((item) => normalizeForJson(item)));
  }
  return merged;
};

export function mergeAiMissingFields<T>(currentData: T, generatedData: unknown, options: MergeOptions = {}): T {
  if (isAiImportValueEmpty(currentData)) {
    return normalizeForJson(generatedData) as T;
  }
  if (isAiImportValueEmpty(generatedData)) {
    return normalizeForJson(currentData) as T;
  }
  if (Array.isArray(currentData) && Array.isArray(generatedData)) {
    return mergeArrayItems(currentData, generatedData, options) as T;
  }
  if (isPlainObject(currentData) && isPlainObject(generatedData)) {
    const output: AiImportJsonObject = {};
    const keys = new Set([...Object.keys(currentData), ...Object.keys(generatedData)]);
    keys.forEach((key) => {
      const currentValue = currentData[key];
      const generatedValue = generatedData[key];
      if (isAiImportValueEmpty(currentValue)) {
        output[key] = normalizeForJson(generatedValue);
        return;
      }
      if (
        (isPlainObject(currentValue) && isPlainObject(generatedValue))
        || (Array.isArray(currentValue) && Array.isArray(generatedValue))
      ) {
        output[key] = mergeAiMissingFields(currentValue, generatedValue, options);
        return;
      }
      output[key] = normalizeForJson(currentValue);
    });
    return output as T;
  }
  return normalizeForJson(currentData) as T;
}

export const buildAiFillMissingPrompt = (
  basePrompt: string,
  currentData: unknown,
  options: FillMissingPromptOptions = {},
) => {
  const contextLabel = options.contextLabel ?? 'Dữ liệu hiện có trong form';
  const contextValue = options.rootKey ? { [options.rootKey]: currentData } : currentData;
  const currentJson = formatAiImportJson(contextValue, options.maxContextChars);
  const rootRule = options.rootKey
    ? `- Root JSON vẫn phải là object có key "${options.rootKey}" như schema gốc.`
    : '- Root JSON vẫn phải giữ đúng schema gốc.';

  return `${basePrompt.trim()}

CHẾ ĐỘ TẠO PHẦN CÒN LẠI ĐANG BẬT:
- ${contextLabel} bên dưới là source of truth bắt buộc.
- Không viết lại, không đổi ý, không rút gọn và không ghi đè các field đã có giá trị.
- Chỉ tạo nội dung cho field đang rỗng, null, undefined, mảng rỗng hoặc object rỗng.
- Vẫn trả về JSON đầy đủ đúng schema. Với field đã có giá trị, copy nguyên giá trị hiện có vào JSON trả về.
- Nếu field mới phụ thuộc field đã có, hãy bám field đã có. Ví dụ title/name đã có thì slug, meta, excerpt và nội dung mới phải ăn khớp title/name đó.
${rootRule}

${contextLabel}:
${currentJson}`;
};

const cleanJsonInput = (raw: string) => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
};

export const buildAiFillMissingSample = (
  sample: string,
  currentData: unknown,
  rootKey?: string,
) => {
  try {
    const parsed = JSON.parse(cleanJsonInput(sample)) as unknown;
    const samplePayload = rootKey && isPlainObject(parsed) && parsed[rootKey] !== undefined
      ? parsed[rootKey]
      : parsed;
    const merged = mergeAiMissingFields(currentData, samplePayload);
    const output = rootKey ? { [rootKey]: merged } : merged;
    return JSON.stringify(normalizeForJson(output), null, 2);
  } catch {
    return sample;
  }
};
