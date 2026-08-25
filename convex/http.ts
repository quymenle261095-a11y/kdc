import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

type TelegramMessage = {
  chat?: {
    id?: number | string;
  };
  from?: {
    id?: number | string;
  };
  text?: string;
};

type TelegramUpdate = {
  callback_query?: {
    data?: string;
    from?: {
      id?: number | string;
    };
    id?: string;
    message?: TelegramMessage;
  };
  message?: TelegramMessage;
};

const http = httpRouter();

http.route({
  handler: httpAction(async (ctx) => {
    const config = await ctx.runQuery(internal.telegramBot.getRuntimeConfigInternal, {});
    return new Response(JSON.stringify({
      ok: true,
      service: "telegram-convex-webhook",
      tokenConfigured: Boolean(config.botToken),
    }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }),
  method: "GET",
  path: "/telegram/webhook",
});

http.route({
  handler: httpAction(async (ctx, request) => {
    try {
      const update = await request.json() as TelegramUpdate;
      const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;

      if (!chatId) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }

      await ctx.runAction(api.telegramBot.handleWebhook, {
        callbackData: update.callback_query?.data,
        callbackQueryId: update.callback_query?.id,
        chatId,
        telegramUserId: String(update.message?.from?.id ?? update.callback_query?.from?.id ?? ""),
        text: update.message?.text,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Telegram Convex webhook error:", error);
      return new Response(JSON.stringify({ error: "Telegram webhook failed", ok: false }), {
        headers: { "content-type": "application/json" },
        status: 500,
      });
    }
  }),
  method: "POST",
  path: "/telegram/webhook",
});

export default http;
