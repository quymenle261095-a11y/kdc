'use client';

import React from 'react';
import Link from 'next/link';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  Bot,
  Edit3,
  ExternalLink,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, cn } from '@/app/admin/components/ui';

type TelegramBotMiniAppProps = {
  appConfig?: Record<string, unknown>;
  appId?: Id<'miniApps'>;
  appName?: string;
  editable?: boolean;
  standalone?: boolean;
};

const getString = (value: unknown, fallback: string) => (
  typeof value === 'string' && value.trim() ? value : fallback
);

type CommandDraft = {
  active: boolean;
  command: string;
  id?: Id<'telegramBotCommands'>;
  order: number;
  replyText: string;
};

type ProductDraft = {
  active: boolean;
  description: string;
  icon: string;
  id?: Id<'telegramBotProducts'>;
  order: number;
  payload: string;
  price: number;
  qrImageUrl: string;
  slug: string;
  tag: string;
  title: string;
};

type AdminTab = 'config' | 'commands' | 'products';

const emptyCommand = (order = 1): CommandDraft => ({
  active: true,
  command: '',
  order,
  replyText: '',
});

const commandToDraft = (command: Doc<'telegramBotCommands'>): CommandDraft => ({
  active: command.active,
  command: command.command,
  id: command._id,
  order: command.order,
  replyText: command.replyText,
});

const emptyProduct = (order = 1): ProductDraft => ({
  active: true,
  description: '',
  icon: '🎁',
  order,
  payload: '',
  price: 0,
  qrImageUrl: '',
  slug: '',
  tag: 'NEW',
  title: '',
});

const productToDraft = (product: Doc<'telegramBotProducts'>): ProductDraft => ({
  active: product.active,
  description: product.description,
  icon: product.icon,
  id: product._id,
  order: product.order,
  payload: product.payload,
  price: product.price,
  qrImageUrl: product.qrImageUrl ?? '',
  slug: product.slug,
  tag: product.tag,
  title: product.title,
});

export function TelegramBotMiniApp({
  appConfig,
  appId,
  appName = 'Telegram Bot Mini App',
  editable = false,
  standalone = false,
}: TelegramBotMiniAppProps) {
  const accent = getString(appConfig?.accent, '#229ED9');
  const botUsername = getString(appConfig?.botUsername, 'your_bot');
  const botDisplayName = getString(appConfig?.botDisplayName, 'DienShopBot');
  const adminIds = getString(appConfig?.adminIds, '0');
  const dbPath = getString(appConfig?.dbPath, './data.sqlite');
  const webhookPath = getString(appConfig?.webhookPath, '/api/telegram/webhook');
  const deployDomain = getString(appConfig?.deployDomain, '');
  const isAdminMode = editable && !standalone;
  const saveAdminConfig = useMutation(api.telegramBot.saveAdminConfig);
  const ensureDefaults = useMutation(api.telegramBot.ensureDefaults);
  const saveCommand = useMutation(api.telegramBot.saveCommand);
  const deleteCommand = useMutation(api.telegramBot.deleteCommand);
  const saveProduct = useMutation(api.telegramBot.saveProduct);
  const deleteProduct = useMutation(api.telegramBot.deleteProduct);
  const setWebhook = useAction(api.telegramBot.setWebhook);
  const adminConfig = useQuery(api.telegramBot.getAdminConfig);
  const commands = useQuery(api.telegramBot.listCommands);
  const products = useQuery(api.telegramBot.listProducts);
  const [draft, setDraft] = React.useState({
    accent,
    adminIds,
    botDisplayName,
    botToken: '',
    botUsername,
    dbPath,
    deployDomain,
    webhookPath,
  });
  const [commandDraft, setCommandDraft] = React.useState<CommandDraft>(emptyCommand());
  const [productDraft, setProductDraft] = React.useState<ProductDraft>(emptyProduct());
  const [activeTab, setActiveTab] = React.useState<AdminTab>('config');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDraft({
      accent,
      adminIds,
      botDisplayName,
      botToken: '',
      botUsername,
      dbPath,
      deployDomain,
      webhookPath,
    });
  }, [accent, adminIds, botDisplayName, botUsername, dbPath, deployDomain, webhookPath]);

  const normalizedBotUsername = draft.botUsername.replace(/^@/, '').trim();
  const webhookUrl = draft.deployDomain
    ? `${draft.deployDomain.replace(/\/$/, '')}${draft.webhookPath.startsWith('/') ? draft.webhookPath : `/${draft.webhookPath}`}`
    : '';

  React.useEffect(() => {
    if (isAdminMode) {
      void ensureDefaults();
    }
  }, [ensureDefaults, isAdminMode]);

  const handleSaveConfig = async () => {
    if (!appId) {
      toast.error('Thiếu mini app id, không thể lưu cấu hình.');
      return;
    }
    setSaving(true);
    try {
      await saveAdminConfig({
        accent: draft.accent.trim() || '#229ED9',
        adminIds: draft.adminIds.trim() || '0',
        botDisplayName: draft.botDisplayName.trim() || 'Telegram Bot',
        botToken: draft.botToken.trim() || undefined,
        botUsername: normalizedBotUsername || 'your_bot',
        dbPath: draft.dbPath.trim(),
        deployDomain: draft.deployDomain.trim(),
        id: appId,
        webhookPath: draft.webhookPath.trim() || '/api/telegram/webhook',
      });
      setDraft((prev) => ({ ...prev, botToken: '' }));
      toast.success('Đã lưu cấu hình Telegram bot.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu cấu hình Telegram bot.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Thiếu Deploy domain.');
      return;
    }
    try {
      await setWebhook({ url: webhookUrl });
      toast.success('Đã gửi webhook cho Telegram.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không gửi được webhook.');
    }
  };

  const handleSaveCommand = async () => {
    try {
      const isEditing = Boolean(commandDraft.id);
      await saveCommand(commandDraft);
      setCommandDraft(emptyCommand((commands?.length ?? 0) + 1));
      toast.success(isEditing ? 'Đã cập nhật lệnh.' : 'Đã tạo lệnh.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không lưu được lệnh.');
    }
  };

  const handleDeleteCommand = async (id: Id<'telegramBotCommands'>) => {
    await deleteCommand({ id });
    toast.success('Đã xóa lệnh.');
  };

  const handleSaveProduct = async () => {
    try {
      const isEditing = Boolean(productDraft.id);
      await saveProduct({
        ...productDraft,
        qrImageUrl: productDraft.qrImageUrl || undefined,
      });
      setProductDraft(emptyProduct((products?.length ?? 0) + 1));
      toast.success(isEditing ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không lưu được sản phẩm.');
    }
  };

  const handleDeleteProduct = async (id: Id<'telegramBotProducts'>) => {
    await deleteProduct({ id });
    toast.success('Đã xóa sản phẩm.');
  };

  if (isAdminMode) {
    return (
      <div className="space-y-6">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')}>
            Cấu hình
          </TabButton>
          <TabButton active={activeTab === 'commands'} onClick={() => setActiveTab('commands')}>
            Lệnh bot
          </TabButton>
          <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
            Sản phẩm
          </TabButton>
        </div>

        <div className="grid gap-6">
          {activeTab === 'config' && (
          <Card className="overflow-hidden rounded-3xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Bot className="h-5 w-5 text-sky-500" />
                    Telegram bot control center
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Cấu hình động</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bot display name</Label>
                    <Input
                      value={draft.botDisplayName}
                      onChange={(event) => setDraft((prev) => ({ ...prev, botDisplayName: event.target.value }))}
                      placeholder="DienShopBot"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bot username</Label>
                    <Input
                      value={draft.botUsername}
                      onChange={(event) => setDraft((prev) => ({ ...prev, botUsername: event.target.value }))}
                      placeholder="DienShopBot"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deploy domain</Label>
                    <Input
                      value={draft.deployDomain}
                      onChange={(event) => setDraft((prev) => ({ ...prev, deployDomain: event.target.value }))}
                      placeholder="https://your-app.vercel.app"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook path</Label>
                    <Input
                      value={draft.webhookPath}
                      onChange={(event) => setDraft((prev) => ({ ...prev, webhookPath: event.target.value }))}
                      placeholder="/api/telegram/webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BOT_TOKEN</Label>
                    <Input
                      type="password"
                      value={draft.botToken}
                      onChange={(event) => setDraft((prev) => ({ ...prev, botToken: event.target.value }))}
                      placeholder={adminConfig?.maskedToken ?? 'Nhập BOT_TOKEN'}
                    />
                    <p className="text-xs text-slate-500">
                      {adminConfig?.hasToken ? `Đã lưu token: ${adminConfig.maskedToken}` : 'Chưa lưu token.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>ADMIN_IDS</Label>
                    <Input
                      value={draft.adminIds}
                      onChange={(event) => setDraft((prev) => ({ ...prev, adminIds: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DB_PATH</Label>
                    <Input
                      value={draft.dbPath}
                      onChange={(event) => setDraft((prev) => ({ ...prev, dbPath: event.target.value }))}
                      placeholder="./data.sqlite"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Accent color</Label>
                    <Input
                      value={draft.accent}
                      onChange={(event) => setDraft((prev) => ({ ...prev, accent: event.target.value }))}
                      placeholder="#229ED9"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={handleSaveConfig} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </Button>
                  <Button variant="outline" onClick={handleSetWebhook}>
                    Gửi webhook
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
          )}

          {activeTab === 'commands' && (
          <Card className="rounded-3xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl">{commandDraft.id ? 'Sửa lệnh bot' : 'Lệnh bot'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-3 md:grid-cols-[140px_1fr_auto]">
                <Input
                  value={commandDraft.command}
                  onChange={(event) => setCommandDraft((prev) => ({ ...prev, command: event.target.value }))}
                  placeholder="/start"
                />
                <textarea
                  value={commandDraft.replyText}
                  onChange={(event) => setCommandDraft((prev) => ({ ...prev, replyText: event.target.value }))}
                  placeholder="Nội dung bot trả lời"
                  className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveCommand}>
                    {commandDraft.id ? <Edit3 className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {commandDraft.id ? 'Cập nhật' : 'Tạo'}
                  </Button>
                  {commandDraft.id && (
                    <Button variant="outline" onClick={() => setCommandDraft(emptyCommand((commands?.length ?? 0) + 1))}>
                      Hủy
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {(commands ?? []).map((command) => (
                  <div key={command._id} className="flex flex-wrap items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => setCommandDraft(commandToDraft(command))}
                      className="font-mono text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {command.command}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{command.replyText}</span>
                    <Button variant="outline" size="sm" onClick={() => setCommandDraft(commandToDraft(command))}>
                      Sửa
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void handleDeleteCommand(command._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          {activeTab === 'products' && (
          <Card className="rounded-3xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl">{productDraft.id ? 'Sửa sản phẩm' : 'Sản phẩm'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-3 md:grid-cols-4">
                <Input value={productDraft.title} onChange={(event) => setProductDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tên sản phẩm" />
                <Input value={productDraft.slug} onChange={(event) => setProductDraft((prev) => ({ ...prev, slug: event.target.value }))} placeholder="slug" />
                <Input value={productDraft.icon} onChange={(event) => setProductDraft((prev) => ({ ...prev, icon: event.target.value }))} placeholder="Icon" />
                <Input value={productDraft.tag} onChange={(event) => setProductDraft((prev) => ({ ...prev, tag: event.target.value }))} placeholder="Tag" />
                <Input type="number" value={productDraft.price} onChange={(event) => setProductDraft((prev) => ({ ...prev, price: Number(event.target.value) }))} placeholder="Giá" />
                <Input value={productDraft.qrImageUrl} onChange={(event) => setProductDraft((prev) => ({ ...prev, qrImageUrl: event.target.value }))} placeholder="QR image URL" />
                <Input value={productDraft.payload} onChange={(event) => setProductDraft((prev) => ({ ...prev, payload: event.target.value }))} placeholder="Payload giao hàng" />
                <div className="flex gap-2">
                  <Button onClick={handleSaveProduct}>
                    {productDraft.id ? <Edit3 className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {productDraft.id ? 'Cập nhật' : 'Tạo'}
                  </Button>
                  {productDraft.id && (
                    <Button variant="outline" onClick={() => setProductDraft(emptyProduct((products?.length ?? 0) + 1))}>
                      Hủy
                    </Button>
                  )}
                </div>
              </div>
              <textarea
                value={productDraft.description}
                onChange={(event) => setProductDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Mô tả sản phẩm"
                className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {(products ?? []).map((product) => (
                  <div key={product._id} className="flex flex-wrap items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => setProductDraft(productToDraft(product))}
                      className="font-semibold text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {product.icon} {product.title}
                    </button>
                    <span className="text-sm text-slate-500">{product.price.toLocaleString('vi-VN')}đ</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400">{product.slug}</span>
                    <Button variant="outline" size="sm" onClick={() => setProductDraft(productToDraft(product))}>
                      Sửa
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void handleDeleteProduct(product._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-[calc(100vh-120px)] overflow-hidden rounded-3xl bg-slate-950 text-white',
        standalone && 'min-h-screen rounded-none',
      )}
      style={{ '--telegram-accent': accent } as React.CSSProperties}
    >
      <section className="relative overflow-hidden px-5 py-10 md:px-10 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,158,217,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">{appName}</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`https://t.me/${botUsername}`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                <Send className="mr-2 h-4 w-4" />
                Mở @{botUsername}
              </Link>
              <Link
                href="/admin/mini-apps/telegram-bot"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/15"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Admin dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] bg-white p-4 text-slate-900">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold">@{botUsername}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
      )}
    >
      {children}
    </button>
  );
}
