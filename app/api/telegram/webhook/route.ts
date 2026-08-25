import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex';

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

async function getAdminConfig() {
  const client = getConvexClient();
  return client.query(api.telegramBot.getAdminConfig, {});
}

export async function GET() {
  const config = await getAdminConfig();
  return NextResponse.json({
    ok: true,
    service: 'telegram-webhook',
    tokenConfigured: config.hasToken,
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json() as TelegramUpdate;
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;

    if (!chatId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const client = getConvexClient();
    await client.action(api.telegramBot.handleWebhook, {
      callbackData: update.callback_query?.data,
      callbackQueryId: update.callback_query?.id,
      chatId,
      telegramUserId: String(update.message?.from?.id ?? update.callback_query?.from?.id ?? ''),
      text: update.message?.text,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { error: 'Telegram webhook failed', ok: false },
      { status: 500 },
    );
  }
}
