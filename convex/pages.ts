import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import * as PagesModel from "./model/pages";
import { TRUST_PAGE_SLOTS, type TrustPageKey } from "../lib/ia/trust-pages";

const pageKeyValidator = v.union(
  v.literal("about"),
  v.literal("terms"),
  v.literal("privacy"),
  v.literal("returnPolicy"),
  v.literal("shipping"),
  v.literal("payment"),
  v.literal("faq")
);

const pageDocValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("pages"),
  key: pageKeyValidator,
  slug: v.string(),
  title: v.string(),
  excerpt: v.optional(v.string()),
  content: v.string(),
  renderType: v.optional(
    v.union(v.literal("content"), v.literal("markdown"), v.literal("html"))
  ),
  markdownRender: v.optional(v.string()),
  htmlRender: v.optional(v.string()),
  metaTitle: v.optional(v.string()),
  metaDescription: v.optional(v.string()),
  status: v.union(v.literal("Published"), v.literal("Draft")),
  publishedAt: v.optional(v.number()),
  updatedAt: v.number(),
});

/**
 * Public query: Lấy trang tin cậy theo key cho client site (chỉ trả về khi đã Published)
 */
export const getByKeyPublic = query({
  args: { key: pageKeyValidator },
  handler: async (ctx, args) => {
    const page = await PagesModel.getByKey(ctx, { key: args.key as TrustPageKey });
    if (!page) {
      return null;
    }
    // LOGIC: Kiểm tra trạng thái xuất bản
    const isVisible =
      page.status === "Published" &&
      (!page.publishedAt || page.publishedAt <= Date.now());
    if (!isVisible) {
      return null;
    }
    return page;
  },
  returns: v.union(pageDocValidator, v.null()),
});

/**
 * Public query: Lấy trang tin cậy theo slug cho client site (chỉ trả về khi đã Published)
 */
export const getBySlugPublic = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await PagesModel.getBySlug(ctx, { slug: args.slug });
    if (!page) {
      return null;
    }
    const isVisible =
      page.status === "Published" &&
      (!page.publishedAt || page.publishedAt <= Date.now());
    if (!isVisible) {
      return null;
    }
    return page;
  },
  returns: v.union(pageDocValidator, v.null()),
});

/**
 * Admin query: Lấy trang tin cậy theo key (bao gồm cả bản Draft)
 */
export const getByKey = query({
  args: { key: pageKeyValidator },
  handler: async (ctx, args) => {
    return PagesModel.getByKey(ctx, { key: args.key as TrustPageKey });
  },
  returns: v.union(pageDocValidator, v.null()),
});

/**
 * Admin query: Lấy toàn bộ danh sách 7 trang tin cậy
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return PagesModel.listAll(ctx);
  },
  returns: v.array(pageDocValidator),
});

/**
 * Admin mutation: Tạo mới hoặc cập nhật nội dung trang tin cậy
 */
export const upsertByKey = mutation({
  args: {
    key: pageKeyValidator,
    slug: v.string(),
    title: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(),
    renderType: v.optional(
      v.union(v.literal("content"), v.literal("markdown"), v.literal("html"))
    ),
    markdownRender: v.optional(v.string()),
    htmlRender: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    status: v.union(v.literal("Published"), v.literal("Draft")),
    publishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return PagesModel.upsertByKey(ctx, {
      key: args.key as TrustPageKey,
      slug: args.slug,
      title: args.title,
      excerpt: args.excerpt,
      content: args.content,
      renderType: args.renderType,
      markdownRender: args.markdownRender,
      htmlRender: args.htmlRender,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      status: args.status,
      publishedAt: args.publishedAt,
    });
  },
  returns: v.id("pages"),
});

/**
 * Migration mutation: Sao chép nội dung từ các bài viết posts cũ (gắn qua trust_page_*_post_id) sang bảng pages
 * QUYỀN / AN TOÀN: Đọc trước khi ghi (Read-Before-Write), không xóa post cũ, không xóa settings cũ.
 * Chỉ chạy khi người dùng chủ động kích hoạt.
 */
export const migrateFromLegacyPosts = mutation({
  args: {},
  handler: async (ctx) => {
    const legacyMappingKeys: Record<TrustPageKey, string> = {
      about: "trust_page_about_post_id",
      terms: "trust_page_terms_post_id",
      privacy: "trust_page_privacy_post_id",
      returnPolicy: "trust_page_return_policy_post_id",
      shipping: "trust_page_shipping_post_id",
      payment: "trust_page_payment_post_id",
      faq: "trust_page_faq_post_id",
    };

    const results: Array<{
      key: TrustPageKey;
      status: "migrated" | "skipped_no_post" | "skipped_no_setting";
      title?: string;
      pageId?: Id<"pages">;
    }> = [];

    for (const slot of TRUST_PAGE_SLOTS) {
      const settingKey = legacyMappingKeys[slot.key];
      const setting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", settingKey))
        .unique();

      const postId =
        typeof setting?.value === "string" && setting.value.trim()
          ? (setting.value.trim() as Id<"posts">)
          : null;

      if (!postId) {
        results.push({ key: slot.key, status: "skipped_no_setting" });
        continue;
      }

      // Read-before-write: Đọc bài viết post cũ
      const post = await ctx.db.get(postId);
      if (!post) {
        results.push({ key: slot.key, status: "skipped_no_post" });
        continue;
      }

      // Copy sang bảng pages
      const pageId = await PagesModel.upsertByKey(ctx, {
        key: slot.key,
        slug: slot.slug,
        title: post.title || slot.defaultTitle,
        excerpt: post.excerpt,
        content: post.content,
        renderType: post.renderType ?? "content",
        markdownRender: post.markdownRender,
        htmlRender: post.htmlRender,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        status: post.status,
        publishedAt: post.publishedAt,
      });

      results.push({
        key: slot.key,
        status: "migrated",
        title: post.title,
        pageId,
      });
    }

    return {
      migratedCount: results.filter((r) => r.status === "migrated").length,
      results,
    };
  },
  returns: v.object({
    migratedCount: v.number(),
    results: v.array(
      v.object({
        key: pageKeyValidator,
        status: v.union(
          v.literal("migrated"),
          v.literal("skipped_no_post"),
          v.literal("skipped_no_setting")
        ),
        title: v.optional(v.string()),
        pageId: v.optional(v.id("pages")),
      })
    ),
  }),
});
