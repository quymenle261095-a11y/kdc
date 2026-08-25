import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const GROUP = "telegramBot";
const TOKEN_KEY = "bot_token";
const MINI_APP_KEY = "telegram-bot";

const maskSecret = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-6)}`;
};

const toStringValue = (value: unknown, fallback: string) => (
  typeof value === "string" && value.trim() ? value.trim() : fallback
);

const commandDoc = v.object({
  _creationTime: v.number(),
  _id: v.id("telegramBotCommands"),
  active: v.boolean(),
  command: v.string(),
  createdAt: v.number(),
  order: v.number(),
  replyText: v.string(),
  updatedAt: v.number(),
});

const productDoc = v.object({
  _creationTime: v.number(),
  _id: v.id("telegramBotProducts"),
  active: v.boolean(),
  createdAt: v.number(),
  description: v.string(),
  icon: v.string(),
  order: v.number(),
  payload: v.string(),
  price: v.number(),
  qrImageUrl: v.optional(v.string()),
  slug: v.string(),
  tag: v.string(),
  title: v.string(),
  updatedAt: v.number(),
});

function normalizeCommand(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;

async function readTokenSecret(ctx: QueryCtx | MutationCtx) {
  return ctx.db
    .query("integrationSecrets")
    .withIndex("by_group_key", (q) => q.eq("group", GROUP).eq("key", TOKEN_KEY))
    .unique();
}

async function upsertTokenSecret(ctx: MutationCtx, value: string) {
  const token = value.trim();
  if (!token) {
    return;
  }

  const existing = await ctx.db
    .query("integrationSecrets")
    .withIndex("by_group_key", (q) => q.eq("group", GROUP).eq("key", TOKEN_KEY))
    .unique();
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, { updatedAt: now, value: token });
    return;
  }

  await ctx.db.insert("integrationSecrets", {
    group: GROUP,
    key: TOKEN_KEY,
    updatedAt: now,
    value: token,
  });
}

export const getAdminConfig = query({
  args: {},
  handler: async (ctx) => {
    const secret = await readTokenSecret(ctx);
    return {
      hasToken: Boolean(secret?.value),
      maskedToken: secret?.value ? maskSecret(secret.value) : undefined,
    };
  },
  returns: v.object({
    hasToken: v.boolean(),
    maskedToken: v.optional(v.string()),
  }),
});

export const saveAdminConfig = mutation({
  args: {
    accent: v.string(),
    botDisplayName: v.string(),
    adminIds: v.string(),
    botToken: v.optional(v.string()),
    botUsername: v.string(),
    dbPath: v.string(),
    deployDomain: v.string(),
    id: v.id("miniApps"),
    webhookPath: v.string(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.id);
    if (!app || app.key !== MINI_APP_KEY) {
      throw new ConvexError({ code: "TELEGRAM_MINI_APP_NOT_FOUND", message: "Mini app Telegram Bot không tồn tại." });
    }

    if (args.botToken?.trim()) {
      await upsertTokenSecret(ctx, args.botToken);
    }

    await ctx.db.patch(args.id, {
      config: {
        ...(app.config && typeof app.config === "object" && !Array.isArray(app.config) ? app.config : {}),
        accent: args.accent.trim() || "#229ED9",
        adminIds: args.adminIds.trim() || "0",
        botDisplayName: args.botDisplayName.trim() || "Telegram Bot",
        botUsername: args.botUsername.replace(/^@/, "").trim() || "your_bot",
        dbPath: args.dbPath.trim(),
        deployDomain: args.deployDomain.trim(),
        webhookPath: args.webhookPath.trim() || "/api/telegram/webhook",
      },
      updatedAt: Date.now(),
    });

    return null;
  },
  returns: v.null(),
});

export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const commands = [
      {
        command: "/start",
        order: 1,
        replyText: "Xin chào! Chọn /products để xem sản phẩm hoặc /help để xem hướng dẫn.",
      },
      {
        command: "/help",
        order: 2,
        replyText: "Các lệnh hiện có: /start, /products, /help.",
      },
      {
        command: "/products",
        order: 3,
        replyText: "Danh sách sản phẩm:",
      },
    ];
    for (const item of commands) {
      const existing = await ctx.db
        .query("telegramBotCommands")
        .withIndex("by_command", (q) => q.eq("command", item.command))
        .unique();
      if (!existing) {
        await ctx.db.insert("telegramBotCommands", {
          active: true,
          command: item.command,
          createdAt: now,
          order: item.order,
          replyText: item.replyText,
          updatedAt: now,
        });
      }
    }

    const product = await ctx.db
      .query("telegramBotProducts")
      .withIndex("by_slug", (q) => q.eq("slug", "prompt-pack"))
      .unique();
    if (!product) {
      await ctx.db.insert("telegramBotProducts", {
        active: true,
        createdAt: now,
        description: "20 prompt mẫu để viết bài bán hàng, inbox, chăm khách.",
        icon: "🧲",
        order: 1,
        payload: "PROMPT-PACK-DEMO",
        price: 49000,
        qrImageUrl: "",
        slug: "prompt-pack",
        tag: "DEMO",
        title: "Prompt Pack bán hàng",
        updatedAt: now,
      });
    }
    return null;
  },
  returns: v.null(),
});

export const listCommands = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("telegramBotCommands").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
  returns: v.array(commandDoc),
});

export const saveCommand = mutation({
  args: {
    active: v.boolean(),
    command: v.string(),
    id: v.optional(v.id("telegramBotCommands")),
    order: v.number(),
    replyText: v.string(),
  },
  handler: async (ctx, args) => {
    const command = normalizeCommand(args.command);
    const now = Date.now();
    if (!command || command === "/") {
      throw new ConvexError({ code: "INVALID_COMMAND", message: "Command không hợp lệ." });
    }
    const existing = await ctx.db
      .query("telegramBotCommands")
      .withIndex("by_command", (q) => q.eq("command", command))
      .unique();
    if (existing && existing._id !== args.id) {
      throw new ConvexError({ code: "COMMAND_EXISTS", message: "Command đã tồn tại." });
    }
    if (args.id) {
      await ctx.db.patch(args.id, {
        active: args.active,
        command,
        order: args.order,
        replyText: args.replyText,
        updatedAt: now,
      });
      return args.id;
    }
    return await ctx.db.insert("telegramBotCommands", {
      active: args.active,
      command,
      createdAt: now,
      order: args.order,
      replyText: args.replyText,
      updatedAt: now,
    });
  },
  returns: v.id("telegramBotCommands"),
});

export const deleteCommand = mutation({
  args: { id: v.id("telegramBotCommands") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
  returns: v.null(),
});

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("telegramBotProducts").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
  returns: v.array(productDoc),
});

export const saveProduct = mutation({
  args: {
    active: v.boolean(),
    description: v.string(),
    icon: v.string(),
    id: v.optional(v.id("telegramBotProducts")),
    order: v.number(),
    payload: v.string(),
    price: v.number(),
    qrImageUrl: v.optional(v.string()),
    slug: v.string(),
    tag: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug || args.title);
    const now = Date.now();
    if (!slug) {
      throw new ConvexError({ code: "INVALID_PRODUCT_SLUG", message: "Slug sản phẩm không hợp lệ." });
    }
    const existing = await ctx.db
      .query("telegramBotProducts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing && existing._id !== args.id) {
      throw new ConvexError({ code: "PRODUCT_EXISTS", message: "Slug sản phẩm đã tồn tại." });
    }
    const data = {
      active: args.active,
      description: args.description,
      icon: args.icon || "🎁",
      order: args.order,
      payload: args.payload,
      price: Math.max(0, Math.round(args.price)),
      qrImageUrl: args.qrImageUrl?.trim() || "",
      slug,
      tag: args.tag || "NEW",
      title: args.title,
      updatedAt: now,
    };
    if (args.id) {
      await ctx.db.patch(args.id, data);
      return args.id;
    }
    return await ctx.db.insert("telegramBotProducts", {
      ...data,
      createdAt: now,
    });
  },
  returns: v.id("telegramBotProducts"),
});

export const deleteProduct = mutation({
  args: { id: v.id("telegramBotProducts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
  returns: v.null(),
});

export const getRuntimeConfigInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [app, secret] = await Promise.all([
      ctx.db
        .query("miniApps")
        .withIndex("by_key", (q) => q.eq("key", MINI_APP_KEY))
        .unique(),
      readTokenSecret(ctx),
    ]);
    const config = app?.config && typeof app.config === "object" && !Array.isArray(app.config)
      ? app.config as Record<string, unknown>
      : {};

    return {
      botDisplayName: toStringValue(config.botDisplayName, "Telegram Bot"),
      botToken: secret?.value ?? "",
      botUsername: toStringValue(config.botUsername, "your_bot").replace(/^@/, ""),
      adminIds: toStringValue(config.adminIds, "0"),
    };
  },
  returns: v.object({
    adminIds: v.string(),
    botDisplayName: v.string(),
    botToken: v.string(),
    botUsername: v.string(),
  }),
});

export const getCommandReplyInternal = internalQuery({
  args: { command: v.string() },
  handler: async (ctx, args) => {
    const command = normalizeCommand(args.command);
    const row = await ctx.db
      .query("telegramBotCommands")
      .withIndex("by_command", (q) => q.eq("command", command))
      .unique();
    return row?.active ? row.replyText : null;
  },
  returns: v.union(v.string(), v.null()),
});

export const listActiveProductsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("telegramBotProducts")
      .withIndex("by_active_order", (q) => q.eq("active", true))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
  returns: v.array(productDoc),
});

export const getProductInternal = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("telegramBotProducts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return product?.active ? product : null;
  },
  returns: v.union(productDoc, v.null()),
});

export const createOrderInternal = internalMutation({
  args: {
    chatId: v.string(),
    productSlug: v.string(),
    telegramUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("telegramBotProducts")
      .withIndex("by_slug", (q) => q.eq("slug", args.productSlug))
      .unique();
    if (!product) {
      return null;
    }
    const now = Date.now();
    const orderCode = `TG${now}`;
    await ctx.db.insert("telegramBotOrders", {
      amount: product.price,
      createdAt: now,
      orderCode,
      payload: product.payload,
      productSlug: product.slug,
      status: "pending_payment",
      telegramChatId: args.chatId,
      telegramUserId: args.telegramUserId,
      updatedAt: now,
    });
    return {
      orderCode,
      product,
    };
  },
  returns: v.union(v.object({
    orderCode: v.string(),
    product: productDoc,
  }), v.null()),
});

async function sendMessage(token: string, chatId: number | string, text: string, replyMarkup?: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
      text,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status}`);
  }
}

async function answerCallback(token: string, callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

export const setWebhook = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(internal.telegramBot.getRuntimeConfigInternal, {});
    if (!config.botToken) {
      throw new ConvexError({ code: "MISSING_TELEGRAM_TOKEN", message: "Chưa cấu hình BOT_TOKEN." });
    }
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
      body: JSON.stringify({ url: args.url }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json() as { ok?: boolean; description?: string };
    if (!response.ok || !body.ok) {
      throw new Error(body.description || `setWebhook failed: ${response.status}`);
    }
    return body;
  },
  returns: v.any(),
});

export const handleWebhook = action({
  args: {
    callbackData: v.optional(v.string()),
    callbackQueryId: v.optional(v.string()),
    chatId: v.union(v.number(), v.string()),
    text: v.optional(v.string()),
    telegramUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(internal.telegramBot.getRuntimeConfigInternal, {});
    if (!config.botToken) {
      throw new ConvexError({ code: "MISSING_TELEGRAM_TOKEN", message: "Chưa cấu hình BOT_TOKEN trong Telegram Bot mini app." });
    }

    if (args.callbackQueryId) {
      await answerCallback(config.botToken, args.callbackQueryId);
    }

    const command = (args.text ?? "").trim().split(/\s+/)[0];
    const callbackData = args.callbackData ?? "";

    if (command === "/products" || callbackData === "products") {
      const products = await ctx.runQuery(internal.telegramBot.listActiveProductsInternal, {});
      const rows = products.map((product) => ([{
        callback_data: `product:${product.slug}`,
        text: `${product.icon} ${product.title} - ${money(product.price)}`,
      }]));
      await sendMessage(config.botToken, args.chatId, "Danh sách sản phẩm:", {
        inline_keyboard: rows,
      });
      return { ok: true };
    }

    if (callbackData.startsWith("product:")) {
      const slug = callbackData.replace("product:", "");
      const product = await ctx.runQuery(internal.telegramBot.getProductInternal, { slug });
      if (!product) {
        await sendMessage(config.botToken, args.chatId, "Sản phẩm không tồn tại.");
        return { ok: true };
      }
      await sendMessage(
        config.botToken,
        args.chatId,
        `${product.icon} <b>${product.title}</b>\n\n${product.description}\n\nGiá: ${money(product.price)}`,
        { inline_keyboard: [[{ callback_data: `buy:${product.slug}`, text: "Mua sản phẩm" }]] },
      );
      return { ok: true };
    }

    if (callbackData.startsWith("buy:")) {
      const slug = callbackData.replace("buy:", "");
      const order = await ctx.runMutation(internal.telegramBot.createOrderInternal, {
        chatId: String(args.chatId),
        productSlug: slug,
        telegramUserId: args.telegramUserId,
      });
      if (!order) {
        await sendMessage(config.botToken, args.chatId, "Không tạo được đơn hàng.");
        return { ok: true };
      }
      const qrText = order.product.qrImageUrl
        ? `\n\nQR thanh toán:\n${order.product.qrImageUrl}`
        : "";
      await sendMessage(
        config.botToken,
        args.chatId,
        `Đơn hàng: <b>${order.orderCode}</b>\nSản phẩm: ${order.product.title}\nSố tiền: ${money(order.product.price)}${qrText}\n\nSau khi thanh toán, admin xác nhận và gửi payload.`,
      );
      return { ok: true };
    }

    const reply = command
      ? await ctx.runQuery(internal.telegramBot.getCommandReplyInternal, { command })
      : null;

    if (reply) {
      const markup = command === "/start"
        ? { inline_keyboard: [[{ callback_data: "products", text: "Sản phẩm" }]] }
        : undefined;
      await sendMessage(config.botToken, args.chatId, reply, markup);
      return { ok: true };
    }

    await sendMessage(config.botToken, args.chatId, "Command chưa được cấu hình.");
    return { ok: true };
  },
  returns: v.object({ ok: v.boolean() }),
});
