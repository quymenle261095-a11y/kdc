import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { TrustPageKey } from "../../lib/ia/trust-pages";

// ============================================================
// HELPER FUNCTIONS - Pages Model Layer (7 Trang tin cậy cố định)
// ============================================================

/**
 * Lấy trang theo key (about, terms, privacy, returnPolicy, shipping, payment, faq)
 */
export async function getByKey(
  ctx: QueryCtx,
  { key }: { key: TrustPageKey }
): Promise<Doc<"pages"> | null> {
  return ctx.db
    .query("pages")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

/**
 * Lấy trang theo slug (/about, /terms, v.v.)
 */
export async function getBySlug(
  ctx: QueryCtx,
  { slug }: { slug: string }
): Promise<Doc<"pages"> | null> {
  return ctx.db
    .query("pages")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
}

/**
 * Lấy trang theo Id bản ghi
 */
export async function getById(
  ctx: QueryCtx,
  { id }: { id: Id<"pages"> }
): Promise<Doc<"pages"> | null> {
  return ctx.db.get(id);
}

/**
 * Lấy toàn bộ danh sách 7 trang tin cậy
 */
export async function listAll(ctx: QueryCtx): Promise<Doc<"pages">[]> {
  return ctx.db.query("pages").collect();
}

export type UpsertPageParams = {
  key: TrustPageKey;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  renderType?: "content" | "markdown" | "html";
  markdownRender?: string;
  htmlRender?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "Published" | "Draft";
  publishedAt?: number;
};

/**
 * Tạo mới hoặc cập nhật nội dung trang theo key
 */
export async function upsertByKey(
  ctx: MutationCtx,
  params: UpsertPageParams
): Promise<Id<"pages">> {
  // LOGIC: Đọc bản ghi hiện có theo key (Read-Before-Write)
  const existing = await getByKey(ctx, { key: params.key });
  const now = Date.now();

  const publishedAt =
    params.status === "Published"
      ? params.publishedAt ?? existing?.publishedAt ?? now
      : undefined;

  const payload = {
    key: params.key,
    slug: params.slug,
    title: params.title.trim(),
    excerpt: params.excerpt?.trim() || undefined,
    content: params.content,
    renderType: params.renderType ?? "content",
    markdownRender: params.markdownRender || undefined,
    htmlRender: params.htmlRender || undefined,
    metaTitle: params.metaTitle?.trim() || undefined,
    metaDescription: params.metaDescription?.trim() || undefined,
    status: params.status,
    publishedAt,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return ctx.db.insert("pages", payload);
}

/**
 * Xóa trang theo key nếu cần
 */
export async function removeByKey(
  ctx: MutationCtx,
  { key }: { key: TrustPageKey }
): Promise<boolean> {
  const existing = await getByKey(ctx, { key });
  if (!existing) {
    return false;
  }
  await ctx.db.delete(existing._id);
  return true;
}
