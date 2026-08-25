import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { consumeRateLimit } from "./lib/rateLimit";
import { normalizeSearchText } from "./lib/search";

const AI_GROUP = "ai";
const AI_SECRET_KEY = "gemini_api_key";
const DEFAULT_CHATJPT_MODEL = "@cf/openai/gpt-oss-120b";
const CHATJPT_API_ENDPOINT = "https://chatjpt.rina.work/api/chat";

const AI_SETTING_KEYS = [
  "ai_chatbot_enabled",
  "ai_provider",
  "ai_model",
  "ai_temperature",
  "ai_system_prompt",
  "ai_widget_title",
  "ai_widget_greeting",
] as const;

const DEFAULT_CONFIG = {
  model: "gemini-3.5-flash-lite",
  systemPrompt:
    "Bạn là trợ lý AI của website. Trả lời bằng tiếng Việt, ngắn gọn, lịch sự, ưu tiên dựa trên dữ liệu site được cung cấp và gợi ý link phù hợp khi có.",
  temperature: 0.4,
};

const normalizeChatjptModel = (model: string) => (
  model.trim().startsWith("@cf/") ? model.trim() : DEFAULT_CHATJPT_MODEL
);

type AiProvider = "gemini" | "chatjpt";

const suggestionDoc = v.object({
  id: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  title: v.string(),
  type: v.union(
    v.literal("post"),
    v.literal("product"),
    v.literal("service"),
    v.literal("course"),
    v.literal("project"),
    v.literal("resource")
  ),
  url: v.string(),
});

type SearchItem = {
  id?: string;
  thumbnail?: string;
  title: string;
  type: "post" | "product" | "service" | "course" | "project" | "resource";
  url: string;
};

type ChatMessage = {
  content: string;
  role: "assistant" | "system" | "user";
};

type ChatjptAnswerArgs = {
  assistantContext: string;
  message: string;
  model: string;
  sourcePath?: string;
  suggestions: SearchItem[];
  systemPrompt: string;
};

type ChatjptRequestBody = {
  messages: ChatMessage[];
  model: string;
  stream?: boolean;
};

type SearchGroup = {
  items: SearchItem[];
};

type SearchResult = {
  posts: SearchGroup;
  products: SearchGroup;
  services: SearchGroup;
  courses: SearchGroup;
  projects: SearchGroup;
  resources: SearchGroup;
};

type SearchScope = {
  searchCourses: boolean;
  searchPosts: boolean;
  searchProducts: boolean;
  searchProjects: boolean;
  searchResources: boolean;
  searchServices: boolean;
};

type AssistantContext = {
  prompt: string;
  searchScope: SearchScope;
};

type RuntimeConfig = {
  apiKey: string;
  enabled: boolean;
  model: string;
  provider: AiProvider;
  systemPrompt: string;
  temperature: number;
};

type SendMessageResult = {
  message: string;
  model: string;
  provider: AiProvider;
  suggestions: SearchItem[];
};

const toStringValue = (value: unknown, fallback: string) => (
  typeof value === "string" && value.trim() ? value.trim() : fallback
);

const toBooleanValue = (value: unknown, fallback: boolean) => (
  typeof value === "boolean" ? value : fallback
);

const toNumberValue = (value: unknown, fallback: number, min: number, max: number) => {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, raw));
};

const normalizeProvider = (value: unknown): AiProvider => (
  value === "chatjpt" ? "chatjpt" : "gemini"
);

const normalizeRuntimeModel = (provider: AiProvider, value: unknown) => {
  const model = toStringValue(value, "");
  if (provider === "chatjpt") {
    return normalizeChatjptModel(model);
  }
  if (
    !model ||
    model === "gemini-2.5-flash-lite" ||
    model === "gemini-2.5-flash" ||
    model === "gemini-2.0-flash" ||
    model === "gemini-1.5-flash"
  ) {
    return "gemini-3.5-flash-lite";
  }
  return model.startsWith("gemini-") ? model : DEFAULT_CONFIG.model;
};

const sanitizeMessage = (message: string) => message.trim().slice(0, 1200);

const isHtmlResponse = (value: string) => /<(?:!doctype|html|head|body)\b/i.test(value);

const GREETING_ONLY_QUERIES = new Set([
  "alo",
  "cam on",
  "chao",
  "chao ban",
  "hello",
  "hey",
  "hi",
  "ok",
  "test",
  "thank you",
  "thanks",
  "xin chao",
  "xin chao ban",
]);

const isGreetingOnly = (message: string) => GREETING_ONLY_QUERIES.has(normalizeSearchText(message));

const DEFAULT_SEARCH_SCOPE: SearchScope = {
  searchCourses: true,
  searchPosts: true,
  searchProducts: true,
  searchProjects: true,
  searchResources: true,
  searchServices: true,
};

const formatSuggestionsForPrompt = (suggestions: SearchItem[]) => {
  if (suggestions.length === 0) {
    return "Không tìm thấy dữ liệu site khớp trực tiếp.";
  }
  return suggestions
    .map((item, index) => `${index + 1}. [${item.type}] ${item.title} - ${item.url}`)
    .join("\n");
};

function buildChatjptUserContent(args: ChatjptAnswerArgs) {
  return [
    args.assistantContext,
    `Câu hỏi khách: ${args.message}`,
    args.sourcePath ? `Trang hiện tại: ${args.sourcePath}` : "",
    "",
    "Dữ liệu site liên quan:",
    formatSuggestionsForPrompt(args.suggestions),
  ].filter(Boolean).join("\n");
}

function buildChatjptRequestBody(args: ChatjptAnswerArgs, stream = false): ChatjptRequestBody {
  const body: ChatjptRequestBody = {
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: buildChatjptUserContent(args) },
    ],
    model: normalizeChatjptModel(args.model),
  };

  return stream ? { ...body, stream: true } : body;
}

const flattenSuggestions = (result?: SearchResult): SearchItem[] => {
  if (!result) return [];
  const combined = [
    ...(result.products?.items ?? []),
    ...(result.posts?.items ?? []),
    ...(result.services?.items ?? []),
    ...(result.courses?.items ?? []),
    ...(result.projects?.items ?? []),
    ...(result.resources?.items ?? []),
  ];
  const unique = new Map<string, SearchItem>();
  for (const item of combined) {
    if (!unique.has(item.url)) {
      unique.set(item.url, {
        id: item.id,
        thumbnail: item.thumbnail,
        title: item.title,
        type: item.type,
        url: item.url,
      });
    }
  }
  return Array.from(unique.values()).slice(0, 3);
};

async function executeGeminiApiCall(args: {
  apiKey: string;
  assistantContext: string;
  message: string;
  model: string;
  sourcePath?: string;
  suggestions: SearchItem[];
  systemPrompt: string;
  temperature: number;
}): Promise<{ ok: boolean; message?: string; status?: number; text?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
      {
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: [
                    args.assistantContext,
                    `Câu hỏi khách: ${args.message}`,
                    args.sourcePath ? `Trang hiện tại: ${args.sourcePath}` : "",
                    "",
                    "Dữ liệu site liên quan:",
                    formatSuggestionsForPrompt(args.suggestions),
                  ].filter(Boolean).join("\n"),
                },
              ],
              role: "user",
            },
          ],
          generationConfig: {
            maxOutputTokens: 700,
            temperature: args.temperature,
          },
          systemInstruction: {
            parts: [{ text: args.systemPrompt }],
          },
        }),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": args.apiKey,
        },
        method: "POST",
        signal: controller.signal,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof data?.error?.message === "string"
        ? data.error.message
        : `Gemini API lỗi (${response.status})`;
      return { message, ok: false, status: response.status };
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return { message: "Gemini không trả về nội dung.", ok: false, status: 200 };
    }

    return { ok: true, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateGeminiAnswer(args: {
  apiKey: string;
  assistantContext: string;
  message: string;
  model: string;
  sourcePath?: string;
  suggestions: SearchItem[];
  systemPrompt: string;
  temperature: number;
}) {
  let targetModel = args.model;
  if (
    !targetModel ||
    targetModel === "gemini-2.5-flash-lite" ||
    targetModel === "gemini-2.5-flash" ||
    targetModel === "gemini-2.0-flash" ||
    targetModel === "gemini-1.5-flash"
  ) {
    targetModel = "gemini-3.5-flash-lite";
  }

  let result = await executeGeminiApiCall({ ...args, model: targetModel });

  // Tự động fallback sang các model thế hệ mới nếu model được chọn bị báo unavailable/not found
  if (!result.ok && result.message) {
    const isModelError = result.message.includes("not available") ||
      result.message.includes("not found") ||
      result.message.includes("no longer available") ||
      result.status === 404;

    if (isModelError) {
      const fallbackCandidates = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.0-flash"];
      for (const fallbackModel of fallbackCandidates) {
        if (fallbackModel === targetModel) continue;
        const retryResult = await executeGeminiApiCall({ ...args, model: fallbackModel });
        if (retryResult.ok && retryResult.text) {
          return retryResult.text;
        }
      }
    }
  }

  if (!result.ok) {
    throw new Error(result.message || "Gemini API không phản hồi hợp lệ.");
  }

  return result.text!;
}

function findFirstTextField(input: unknown): string {
  if (typeof input === "string") return input;
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findFirstTextField(item);
      if (found.trim().length > 0) return found;
    }
    return "";
  }
  if (typeof input !== "object" || input === null) return "";

  const record = input as Record<string, unknown>;
  const directKeys = ["content", "text", "output_text", "answer", "message", "response"];
  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }

  const priorityKeys = ["result", "output", "data", "choices", "messages", "message", "delta"];
  for (const key of priorityKeys) {
    if (!(key in record)) continue;
    const found = findFirstTextField(record[key]);
    if (found.trim().length > 0) return found;
  }

  for (const value of Object.values(record)) {
    const found = findFirstTextField(value);
    if (found.trim().length > 0) return found;
  }
  return "";
}

function extractResponseFromRawStream(raw: string): string {
  const normalized = raw.replace(/\r/g, "");
  const matches = [...normalized.matchAll(/"response"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
  if (matches.length === 0) return "";

  let out = "";
  for (const match of matches) {
    const piece = match[1];
    if (!piece) continue;
    try {
      out += JSON.parse(`"${piece}"`) as string;
    } catch {
      out += piece;
    }
  }

  return out.trim();
}

function buildChatjptHttpError(status: number, raw: string): string {
  const prefix = `ChatJPT API error: HTTP ${status}`;
  const trimmed = raw.trim();
  if (!trimmed) return prefix;
  if (isHtmlResponse(trimmed)) {
    return `${prefix}: ChatJPT đang từ chối yêu cầu hoặc trả về HTML thay vì JSON. Vui lòng thử lại sau hoặc chuyển provider AI sang Gemini.`;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const apiError = findFirstTextField(parsed).trim();
    return apiError ? `${prefix}: ${apiError.slice(0, 240)}` : prefix;
  } catch {
    return `${prefix}: ${trimmed.slice(0, 240)}`;
  }
}

class ChatjptHttpError extends Error {
  status: number;

  constructor(status: number, raw: string) {
    super(buildChatjptHttpError(status, raw));
    this.name = "ChatjptHttpError";
    this.status = status;
  }
}

async function generateChatjptAnswer(args: ChatjptAnswerArgs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(CHATJPT_API_ENDPOINT, {
      body: JSON.stringify(buildChatjptRequestBody(args)),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new ChatjptHttpError(response.status, raw);
    }

    let text = "";
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.response === "string" && parsed.response.trim()) {
        text = parsed.response.trim();
      } else if (parsed.result && typeof parsed.result.response === "string") {
        text = parsed.result.response.trim();
      } else if (parsed.result && typeof parsed.result.output_text === "string") {
        text = parsed.result.output_text.trim();
      } else {
        text = findFirstTextField(parsed);
      }
    } catch {
      text = extractResponseFromRawStream(raw) || raw;
    }

    if (!text.trim()) {
      throw new Error("ChatJPT không trả về nội dung.");
    }

    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export const getRuntimeConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await Promise.all(AI_SETTING_KEYS.map((key) =>
      ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    ));
    const settings = Object.fromEntries(rows.filter(Boolean).map((row) => [row!.key, row!.value]));
    const secret = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_group_key", (q) => q.eq("group", AI_GROUP).eq("key", AI_SECRET_KEY))
      .unique();
    const provider = normalizeProvider(settings.ai_provider);

    return {
      apiKey: secret?.value ?? "",
      enabled: toBooleanValue(settings.ai_chatbot_enabled, false),
      model: normalizeRuntimeModel(provider, settings.ai_model),
      provider,
      systemPrompt: toStringValue(settings.ai_system_prompt, DEFAULT_CONFIG.systemPrompt),
      temperature: toNumberValue(settings.ai_temperature, DEFAULT_CONFIG.temperature, 0, 1),
    };
  },
  returns: v.object({
    apiKey: v.string(),
    enabled: v.boolean(),
    model: v.string(),
    provider: v.union(v.literal("gemini"), v.literal("chatjpt")),
    systemPrompt: v.string(),
    temperature: v.number(),
  }),
});

export const consumeAiChatRateLimit = internalMutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const key = args.identifier.trim().slice(0, 160) || "anonymous";
    return await consumeRateLimit(ctx, key, "aiChat");
  },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetIn: v.number(),
  }),
});

export const consumePublicAiChatRateLimit = mutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const key = args.identifier.trim().slice(0, 160) || "anonymous";
    return await consumeRateLimit(ctx, key, "aiChat");
  },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetIn: v.number(),
  }),
});

export const sendMessage = action({
  args: {
    message: v.string(),
    sessionId: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SendMessageResult> => {
    const message = sanitizeMessage(args.message);
    if (!message) {
      throw new Error("Vui lòng nhập nội dung cần hỏi.");
    }

    const identifier = `ai-chat:${(args.sessionId ?? args.sourcePath ?? "anonymous").slice(0, 140)}`;
    const rateLimit: { allowed: boolean; remaining: number; resetIn: number } = await ctx.runMutation(
      internal.aiChat.consumeAiChatRateLimit,
      { identifier }
    );
    if (!rateLimit.allowed) {
      throw new Error("Bạn đang hỏi hơi nhanh. Vui lòng thử lại sau ít phút.");
    }

    const config: RuntimeConfig = await ctx.runQuery(internal.aiChat.getRuntimeConfig, {});
    if (!config.enabled) {
      throw new Error("Chatbot AI đang tắt.");
    }
    if (config.provider === "gemini" && !config.apiKey) {
      throw new Error("Chatbot AI chưa có API key.");
    }

    let assistantContext: AssistantContext = { prompt: "", searchScope: DEFAULT_SEARCH_SCOPE };
    try {
      assistantContext = await ctx.runQuery(api.systemIntegrations.getPublicAiAssistantContext, {});
    } catch {
      assistantContext = { prompt: "", searchScope: DEFAULT_SEARCH_SCOPE };
    }

    const suggestions = isGreetingOnly(message)
      ? []
      : flattenSuggestions(await ctx.runQuery(api.search.autocomplete, {
        limit: 3,
        query: message.slice(0, 180),
        searchCourses: assistantContext.searchScope.searchCourses,
        searchPosts: assistantContext.searchScope.searchPosts,
        searchProducts: assistantContext.searchScope.searchProducts,
        searchProjects: assistantContext.searchScope.searchProjects,
        searchResources: assistantContext.searchScope.searchResources,
        searchServices: assistantContext.searchScope.searchServices,
      }) as SearchResult);

    let answer = "";
    if (config.provider === "gemini") {
      answer = await generateGeminiAnswer({
        apiKey: config.apiKey,
        assistantContext: assistantContext.prompt,
        message,
        model: config.model,
        sourcePath: args.sourcePath,
        suggestions,
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
      });
    } else if (config.provider === "chatjpt") {
      answer = await generateChatjptAnswer({
        assistantContext: assistantContext.prompt,
        message,
        model: config.model,
        sourcePath: args.sourcePath,
        suggestions,
        systemPrompt: config.systemPrompt,
      });
    } else {
      throw new Error("Provider AI không hợp lệ.");
    }

    return {
      message: answer,
      model: config.model,
      provider: config.provider,
      suggestions,
    };
  },
  returns: v.object({
    message: v.string(),
    model: v.string(),
    provider: v.union(v.literal("gemini"), v.literal("chatjpt")),
    suggestions: v.array(suggestionDoc),
  }),
});
