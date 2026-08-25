import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// HIGH-004 FIX: Helper function to update promotionStats counter
export async function updatePromotionStats(
  ctx: MutationCtx,
  key: string,
  delta: number
) {
  const stats = await ctx.db
    .query("promotionStats")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (stats) {
    await ctx.db.patch(stats._id, { count: Math.max(0, stats.count + delta) });
  } else {
    await ctx.db.insert("promotionStats", { count: Math.max(0, delta), key });
  }
}

const promotionStatus = v.union(
  v.literal("Active"),
  v.literal("Inactive"),
  v.literal("Expired"),
  v.literal("Scheduled")
);

const promotionType = v.union(
  v.literal("coupon"),
  v.literal("campaign"),
  v.literal("flash_sale"),
  v.literal("bundle"),
  v.literal("loyalty")
);

const discountType = v.union(
  v.literal("percent"),
  v.literal("fixed"),
  v.literal("buy_x_get_y"),
  v.literal("buy_a_get_b"),
  v.literal("tiered"),
  v.literal("free_shipping"),
  v.literal("gift")
);

const applicableTo = v.union(
  v.literal("all"),
  v.literal("products"),
  v.literal("categories"),
  v.literal("brands"),
  v.literal("tags")
);

const customerType = v.union(
  v.literal("all"),
  v.literal("new"),
  v.literal("returning"),
  v.literal("vip")
);

const scheduleType = v.union(
  v.literal("always"),
  v.literal("dateRange"),
  v.literal("recurring")
);

const promotionDoc = v.object({
  _creationTime: v.number(),
  _id: v.id("promotions"),
  applicableIds: v.optional(v.array(v.string())),
  applicableTo: v.optional(applicableTo),
  budget: v.optional(v.number()),
  budgetUsed: v.optional(v.number()),
  code: v.optional(v.string()),
  customerGroupIds: v.optional(v.array(v.string())),
  customerTierIds: v.optional(v.array(v.string())),
  customerType: v.optional(customerType),
  description: v.optional(v.string()),
  discountConfig: v.optional(v.any()),
  discountType: discountType,
  discountValue: v.optional(v.number()),
  displayOnPage: v.optional(v.boolean()),
  endDate: v.optional(v.number()),
  excludeIds: v.optional(v.array(v.string())),
  featured: v.optional(v.boolean()),
  isPrivate: v.optional(v.boolean()),
  maxDiscountAmount: v.optional(v.number()),
  maxShippingDiscount: v.optional(v.number()),
  minOrderAmount: v.optional(v.number()),
  minOrderHistory: v.optional(v.number()),
  minQuantity: v.optional(v.number()),
  minTotalSpent: v.optional(v.number()),
  name: v.string(),
  order: v.number(),
  priority: v.optional(v.number()),
  promotionType: promotionType,
  recurringDays: v.optional(v.array(v.number())),
  recurringHours: v.optional(v.object({ from: v.number(), to: v.number() })),
  scheduleType: v.optional(scheduleType),
  stackable: v.optional(v.boolean()),
  startDate: v.optional(v.number()),
  status: promotionStatus,
  thumbnail: v.optional(v.string()),
  usageLimit: v.optional(v.number()),
  usagePerCustomer: v.optional(v.number()),
  usedCount: v.number(),
});

// HIGH-004 FIX: Thêm limit
export const listAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("promotions").take(500),
  returns: v.array(promotionDoc),
});

export const listAdminWithOffset = query({
  args: {
    discountType: v.optional(discountType),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    promotionType: v.optional(promotionType),
    search: v.optional(v.string()),
    status: v.optional(promotionStatus),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);
    const offset = args.offset ?? 0;
    const fetchLimit = Math.min(offset + limit + 50, 1000);

    let discountTypeFiltered = false;
    let promotions: Doc<"promotions">[] = [];
    if (args.status && args.promotionType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status_promotionType", (q) =>
          q.eq("status", args.status!).eq("promotionType", args.promotionType!)
        )
        .order("desc")
        .take(fetchLimit);
    } else if (args.status && args.discountType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status_discountType", (q) =>
          q.eq("status", args.status!).eq("discountType", args.discountType!)
        )
        .order("desc")
        .take(fetchLimit);
      discountTypeFiltered = true;
    } else if (args.status) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(fetchLimit);
    } else if (args.promotionType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_promotionType", (q) => q.eq("promotionType", args.promotionType!))
        .order("desc")
        .take(fetchLimit);
    } else if (args.discountType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_discountType", (q) => q.eq("discountType", args.discountType!))
        .order("desc")
        .take(fetchLimit);
    } else {
      promotions = await ctx.db.query("promotions").take(1000);
      promotions.sort((a, b) => a.order - b.order);
    }

    if (args.discountType && !discountTypeFiltered) {
      promotions = promotions.filter((promo) => promo.discountType === args.discountType);
    }

    if (args.search?.trim()) {
      const searchLower = args.search.toLowerCase().trim();
      promotions = promotions.filter((promo) =>
        promo.name.toLowerCase().includes(searchLower) ||
        (promo.code ?? '').toLowerCase().includes(searchLower)
      );
    }

    return promotions.slice(offset, offset + limit);
  },
  returns: v.array(promotionDoc),
});

export const countAdmin = query({
  args: {
    discountType: v.optional(discountType),
    promotionType: v.optional(promotionType),
    search: v.optional(v.string()),
    status: v.optional(promotionStatus),
  },
  handler: async (ctx, args) => {
    const limit = 5000;
    const fetchLimit = limit + 1;

    let discountTypeFiltered = false;
    let promotions: Doc<"promotions">[] = [];
    if (args.status && args.promotionType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status_promotionType", (q) =>
          q.eq("status", args.status!).eq("promotionType", args.promotionType!)
        )
        .take(fetchLimit);
    } else if (args.status && args.discountType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status_discountType", (q) =>
          q.eq("status", args.status!).eq("discountType", args.discountType!)
        )
        .take(fetchLimit);
      discountTypeFiltered = true;
    } else if (args.status) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(fetchLimit);
    } else if (args.promotionType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_promotionType", (q) => q.eq("promotionType", args.promotionType!))
        .take(fetchLimit);
    } else if (args.discountType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_discountType", (q) => q.eq("discountType", args.discountType!))
        .take(fetchLimit);
    } else {
      promotions = await ctx.db.query("promotions").take(fetchLimit);
    }

    if (args.discountType && !discountTypeFiltered) {
      promotions = promotions.filter((promo) => promo.discountType === args.discountType);
    }

    if (args.search?.trim()) {
      const searchLower = args.search.toLowerCase().trim();
      promotions = promotions.filter((promo) =>
        promo.name.toLowerCase().includes(searchLower) ||
        (promo.code ?? '').toLowerCase().includes(searchLower)
      );
    }

    return { count: Math.min(promotions.length, limit), hasMore: promotions.length > limit };
  },
  returns: v.object({ count: v.number(), hasMore: v.boolean() }),
});

export const listAdminIds = query({
  args: {
    discountType: v.optional(discountType),
    limit: v.optional(v.number()),
    promotionType: v.optional(promotionType),
    search: v.optional(v.string()),
    status: v.optional(promotionStatus),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 5000, 5000);
    const fetchLimit = limit + 1;

    let discountTypeFiltered = false;
    let promotions: Doc<"promotions">[] = [];
    if (args.status && args.promotionType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status_promotionType", (q) =>
          q.eq("status", args.status!).eq("promotionType", args.promotionType!)
        )
        .take(fetchLimit);
    } else if (args.status && args.discountType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status_discountType", (q) =>
          q.eq("status", args.status!).eq("discountType", args.discountType!)
        )
        .take(fetchLimit);
      discountTypeFiltered = true;
    } else if (args.status) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(fetchLimit);
    } else if (args.promotionType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_promotionType", (q) => q.eq("promotionType", args.promotionType!))
        .take(fetchLimit);
    } else if (args.discountType) {
      promotions = await ctx.db
        .query("promotions")
        .withIndex("by_discountType", (q) => q.eq("discountType", args.discountType!))
        .take(fetchLimit);
    } else {
      promotions = await ctx.db.query("promotions").take(fetchLimit);
    }

    if (args.discountType && !discountTypeFiltered) {
      promotions = promotions.filter((promo) => promo.discountType === args.discountType);
    }

    if (args.search?.trim()) {
      const searchLower = args.search.toLowerCase().trim();
      promotions = promotions.filter((promo) =>
        promo.name.toLowerCase().includes(searchLower) ||
        (promo.code ?? '').toLowerCase().includes(searchLower)
      );
    }

    const hasMore = promotions.length > limit;
    return { ids: promotions.slice(0, limit).map((promo) => promo._id), hasMore };
  },
  returns: v.object({ ids: v.array(v.id("promotions")), hasMore: v.boolean() }),
});

// HIGH-004 FIX: Thêm limit
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const promotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .take(200);
    return promotions.filter((promo) => promo.isPrivate !== true);
  },
  returns: v.array(promotionDoc),
});

export const getById = query({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => ctx.db.get(args.id),
  returns: v.union(promotionDoc, v.null()),
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique(),
  returns: v.union(promotionDoc, v.null()),
});

// HIGH-004 FIX: Thêm limit
export const listByStatus = query({
  args: { status: promotionStatus },
  handler: async (ctx, args) => ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(200),
  returns: v.array(promotionDoc),
});

// MED-001 FIX: Thêm validation discountValue + HIGH-004: Update counters
export const create = mutation({
  args: {
    applicableIds: v.optional(v.array(v.string())),
    applicableTo: v.optional(applicableTo),
    budget: v.optional(v.number()),
    code: v.optional(v.string()),
    customerGroupIds: v.optional(v.array(v.string())),
    customerTierIds: v.optional(v.array(v.string())),
    customerType: v.optional(customerType),
    description: v.optional(v.string()),
    discountConfig: v.optional(v.any()),
    discountType: discountType,
    discountValue: v.optional(v.number()),
    displayOnPage: v.optional(v.boolean()),
    endDate: v.optional(v.number()),
    excludeIds: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    isPrivate: v.optional(v.boolean()),
    maxDiscountAmount: v.optional(v.number()),
    maxShippingDiscount: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    minOrderHistory: v.optional(v.number()),
    minQuantity: v.optional(v.number()),
    minTotalSpent: v.optional(v.number()),
    name: v.string(),
    priority: v.optional(v.number()),
    promotionType: promotionType,
    recurringDays: v.optional(v.array(v.number())),
    recurringHours: v.optional(v.object({ from: v.number(), to: v.number() })),
    scheduleType: v.optional(scheduleType),
    stackable: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    status: v.optional(promotionStatus),
    thumbnail: v.optional(v.string()),
    usageLimit: v.optional(v.number()),
    usagePerCustomer: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // MED-001: Validate discountValue
    if ((args.discountType === "percent" || args.discountType === "fixed") && (args.discountValue ?? 0) <= 0) {
      throw new Error("Giá trị giảm phải lớn hơn 0");
    }
    if (args.discountType === "percent" && (args.discountValue ?? 0) > 100) {
      throw new Error("Phần trăm giảm không được lớn hơn 100%");
    }
    if (["buy_x_get_y", "buy_a_get_b", "tiered", "gift"].includes(args.discountType) && !args.discountConfig) {
      throw new Error("Vui lòng cấu hình chi tiết giảm giá");
    }
    if (args.promotionType === "coupon" && !args.code?.trim()) {
      throw new Error("Voucher coupon cần mã giảm giá");
    }
    if (args.recurringDays?.some((day) => day < 0 || day > 6)) {
      throw new Error("Ngày lặp lại chỉ từ 0-6");
    }
    if (args.recurringHours && args.recurringHours.from >= args.recurringHours.to) {
      throw new Error("Khung giờ lặp lại không hợp lệ");
    }
    if (args.budget !== undefined && args.budget < 0) {
      throw new Error("Ngân sách không hợp lệ");
    }
    
    let code: string | undefined;
    if (args.code?.trim()) {
      code = args.code.trim().toUpperCase();
      const existing = await ctx.db
        .query("promotions")
        .withIndex("by_code", (q) => q.eq("code", code!))
        .unique();
      if (existing) {
        throw new ConvexError({
          code: "DUPLICATE_VOUCHER",
          message: "Mã voucher đã tồn tại, vui lòng chọn mã khác",
        });
      }
    }
    
    const promotions = await ctx.db.query("promotions").take(1000);
    const newOrder = promotions.reduce((max, promo) => Math.max(max, promo.order), -1) + 1;
    const status = args.status ?? "Active";
    const displayOnPage = args.displayOnPage ?? args.promotionType === "coupon";
    
    const id = await ctx.db.insert("promotions", {
      ...args,
      code,
      budgetUsed: args.budget ? 0 : undefined,
      displayOnPage,
      status,
      usedCount: 0,
      order: newOrder,
    });
    
    // Update counters
    await Promise.all([
      updatePromotionStats(ctx, "total", 1),
      updatePromotionStats(ctx, status, 1),
      updatePromotionStats(ctx, args.discountType, 1),
      updatePromotionStats(ctx, args.promotionType, 1),
    ]);
    
    return id;
  },
  returns: v.id("promotions"),
});

// MED-001 FIX: Thêm validation + HIGH-004: Update counters khi status thay đổi
// Update promotion by ID - hỗ trợ isPrivate & maxShippingDiscount
export const update = mutation({
  args: {
    applicableIds: v.optional(v.array(v.string())),
    applicableTo: v.optional(applicableTo),
    budget: v.optional(v.number()),
    code: v.optional(v.string()),
    customerGroupIds: v.optional(v.array(v.string())),
    customerTierIds: v.optional(v.array(v.string())),
    customerType: v.optional(customerType),
    description: v.optional(v.string()),
    discountConfig: v.optional(v.any()),
    discountType: v.optional(discountType),
    discountValue: v.optional(v.number()),
    displayOnPage: v.optional(v.boolean()),
    endDate: v.optional(v.number()),
    id: v.id("promotions"),
    excludeIds: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    isPrivate: v.optional(v.boolean()),
    maxDiscountAmount: v.optional(v.number()),
    maxShippingDiscount: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    minOrderHistory: v.optional(v.number()),
    minQuantity: v.optional(v.number()),
    minTotalSpent: v.optional(v.number()),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
    priority: v.optional(v.number()),
    promotionType: v.optional(promotionType),
    recurringDays: v.optional(v.array(v.number())),
    recurringHours: v.optional(v.object({ from: v.number(), to: v.number() })),
    scheduleType: v.optional(scheduleType),
    stackable: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    status: v.optional(promotionStatus),
    thumbnail: v.optional(v.string()),
    usageLimit: v.optional(v.number()),
    usagePerCustomer: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const promotion = await ctx.db.get(id);
    if (!promotion) {throw new Error("Promotion not found");}
    
    // MED-001: Validate discountValue nếu được cập nhật
    if (args.discountValue !== undefined) {
      if ((args.discountType ?? promotion.discountType) === "percent" && args.discountValue > 100) {
        throw new Error("Phần trăm giảm không được lớn hơn 100%");
      }
      if ((args.discountType ?? promotion.discountType) === "percent" || (args.discountType ?? promotion.discountType) === "fixed") {
        if (args.discountValue <= 0) {
          throw new Error("Giá trị giảm phải lớn hơn 0");
        }
      }
    }

    if (args.discountType && ["buy_x_get_y", "buy_a_get_b", "tiered", "gift"].includes(args.discountType) && !args.discountConfig && !promotion.discountConfig) {
      throw new Error("Vui lòng cấu hình chi tiết giảm giá");
    }

    if (args.recurringDays?.some((day) => day < 0 || day > 6)) {
      throw new Error("Ngày lặp lại chỉ từ 0-6");
    }
    if (args.recurringHours && args.recurringHours.from >= args.recurringHours.to) {
      throw new Error("Khung giờ lặp lại không hợp lệ");
    }
    if (args.budget !== undefined && args.budget < 0) {
      throw new Error("Ngân sách không hợp lệ");
    }

    const currentPromotionType = (args.promotionType ?? promotion.promotionType) ?? (promotion.code ? "coupon" : "campaign");
    if (currentPromotionType === "coupon") {
      const nextCode = args.code?.trim() ?? promotion.code ?? '';
      if (!nextCode) {
        throw new Error("Voucher coupon cần mã giảm giá");
      }
    }

    if (args.code !== undefined && args.code?.trim()) {
      const code = args.code.trim().toUpperCase();
      if (code !== promotion.code) {
        const existing = await ctx.db
          .query("promotions")
          .withIndex("by_code", (q) => q.eq("code", code))
          .unique();
        if (existing) {
          throw new ConvexError({
            code: "DUPLICATE_VOUCHER",
            message: "Mã voucher đã tồn tại, vui lòng chọn mã khác",
          });
        }
      }
      updates.code = code;
    } else if (args.code === '') {
      updates.code = undefined;
    }
    
    await ctx.db.patch(id, updates);
    
    // Update counters nếu status thay đổi
    if (args.status && args.status !== promotion.status) {
      await Promise.all([
        updatePromotionStats(ctx, promotion.status, -1),
        updatePromotionStats(ctx, args.status, 1),
      ]);
    }
    
    // Update counters nếu discountType thay đổi
    if (args.discountType && args.discountType !== promotion.discountType) {
      await Promise.all([
        updatePromotionStats(ctx, promotion.discountType, -1),
        updatePromotionStats(ctx, args.discountType, 1),
      ]);
    }

    // Update counters nếu promotionType thay đổi
    if (args.promotionType && args.promotionType !== promotion.promotionType) {
      const currentPromotionType = promotion.promotionType ?? (promotion.code ? "coupon" : "campaign");
      await Promise.all([
        updatePromotionStats(ctx, currentPromotionType, -1),
        updatePromotionStats(ctx, args.promotionType, 1),
      ]);
    }
    
    return null;
  },
  returns: v.null(),
});

// HIGH-004 FIX: Update totalUsed counter
export const incrementUsage = mutation({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion) {throw new Error("Promotion not found");}
    await ctx.db.patch(args.id, { usedCount: promotion.usedCount + 1 });
    
    // Update totalUsed counter
    await updatePromotionStats(ctx, "totalUsed", 1);
    
    return null;
  },
  returns: v.null(),
});

// HIGH-004 FIX: Update counters khi remove
export const remove = mutation({
  args: { cascade: v.optional(v.boolean()), id: v.id("promotions") },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion) {throw new Error("Promotion not found");}

    const usagePreview = await ctx.db
      .query("promotionUsage")
      .withIndex("by_promotion", (q) => q.eq("promotionId", args.id))
      .take(1);
    if (usagePreview.length > 0 && !args.cascade) {
      throw new Error("Khuyến mãi đã có lịch sử sử dụng. Vui lòng xác nhận xóa tất cả.");
    }

    if (args.cascade) {
      const usage = await ctx.db
        .query("promotionUsage")
        .withIndex("by_promotion", (q) => q.eq("promotionId", args.id))
        .collect();
      await Promise.all(usage.map( async (record) => ctx.db.delete(record._id)));
    }
    
    await ctx.db.delete(args.id);
    
    // Update counters
    await Promise.all([
      updatePromotionStats(ctx, "total", -1),
      updatePromotionStats(ctx, promotion.status, -1),
      updatePromotionStats(ctx, promotion.discountType, -1),
      updatePromotionStats(ctx, promotion.promotionType ?? (promotion.code ? "coupon" : "campaign"), -1),
      updatePromotionStats(ctx, "totalUsed", -promotion.usedCount),
    ]);
    
    return null;
  },
  returns: v.null(),
});

export const getDeleteInfo = query({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => {
    const preview = await ctx.db
      .query("promotionUsage")
      .withIndex("by_promotion", (q) => q.eq("promotionId", args.id))
      .take(10);
    const count = await ctx.db
      .query("promotionUsage")
      .withIndex("by_promotion", (q) => q.eq("promotionId", args.id))
      .take(1001);

    return {
      canDelete: true,
      dependencies: [
        {
          count: Math.min(count.length, 1000),
          hasMore: count.length > 1000,
          label: "Lịch sử sử dụng",
          preview: preview.map((usage) => ({ id: usage._id, name: usage.orderId })),
        },
      ],
    };
  },
  returns: v.object({
    canDelete: v.boolean(),
    dependencies: v.array(v.object({
      count: v.number(),
      hasMore: v.boolean(),
      label: v.string(),
      preview: v.array(v.object({ id: v.string(), name: v.string() })),
    })),
  }),
});

export const reorder = mutation({
  args: { items: v.array(v.object({ id: v.id("promotions"), order: v.number() })) },
  handler: async (ctx, args) => {
    await Promise.all(args.items.map(async (item) => ctx.db.patch(item.id, { order: item.order })));
    return null;
  },
  returns: v.null(),
});

// HIGH-004 FIX: Dùng counter table thay vì fetch ALL
export const count = query({
  args: { status: v.optional(promotionStatus) },
  handler: async (ctx, args) => {
    const key = args.status ?? "total";
    const stats = await ctx.db
      .query("promotionStats")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return stats?.count ?? 0;
  },
  returns: v.number(),
});

// HIGH-004 FIX: Dùng counter table thay vì fetch ALL
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    // Fetch tất cả stats 1 lần
    const allStats = await ctx.db.query("promotionStats").take(100);
    const statsMap = new Map(allStats.map(s => [s.key, s.count]));

    return {
      activeCount: statsMap.get("Active") ?? 0,
      bundleCount: statsMap.get("bundle") ?? 0,
      campaignCount: statsMap.get("campaign") ?? 0,
      couponCount: statsMap.get("coupon") ?? 0,
      expiredCount: statsMap.get("Expired") ?? 0,
      fixedTypeCount: statsMap.get("fixed") ?? 0,
      flashSaleCount: statsMap.get("flash_sale") ?? 0,
      freeShippingCount: statsMap.get("free_shipping") ?? 0,
      giftCount: statsMap.get("gift") ?? 0,
      buyAGetBCount: statsMap.get("buy_a_get_b") ?? 0,
      buyXGetYCount: statsMap.get("buy_x_get_y") ?? 0,
      loyaltyCount: statsMap.get("loyalty") ?? 0,
      percentTypeCount: statsMap.get("percent") ?? 0,
      scheduledCount: statsMap.get("Scheduled") ?? 0,
      tieredCount: statsMap.get("tiered") ?? 0,
      totalCount: statsMap.get("total") ?? 0,
      totalUsed: statsMap.get("totalUsed") ?? 0,
    };
  },
  returns: v.object({
    activeCount: v.number(),
    bundleCount: v.number(),
    campaignCount: v.number(),
    couponCount: v.number(),
    expiredCount: v.number(),
    fixedTypeCount: v.number(),
    flashSaleCount: v.number(),
    freeShippingCount: v.number(),
    giftCount: v.number(),
    buyAGetBCount: v.number(),
    buyXGetYCount: v.number(),
    loyaltyCount: v.number(),
    percentTypeCount: v.number(),
    scheduledCount: v.number(),
    tieredCount: v.number(),
    totalCount: v.number(),
    totalUsed: v.number(),
  }),
});

const publicVoucherDoc = v.object({
  code: v.string(),
  description: v.optional(v.string()),
  discountType: discountType,
  discountValue: v.optional(v.number()),
  endDate: v.optional(v.number()),
  maxDiscountAmount: v.optional(v.number()),
  name: v.string(),
  thumbnail: v.optional(v.string()),
});

const parseTimestamp = (val: unknown): number | undefined => {
  if (typeof val === "number" && !Number.isNaN(val)) {return val;}
  if (typeof val === "string" && val.trim()) {
    const parsed = new Date(val).getTime();
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const isPublicPromotion = (promo: Doc<"promotions">, now: number) => {
  if (promo.isPrivate === true) {return false;}
  if (promo.displayOnPage === false) {return false;}

  const start = parseTimestamp(promo.startDate);
  if (start !== undefined && now < start) {return false;}

  const end = parseTimestamp(promo.endDate);
  if (end !== undefined && now > end) {return false;}

  if (promo.usageLimit && (promo.usedCount + (promo.reservedCount ?? 0)) >= promo.usageLimit) {
    return false;
  }
  if (promo.budget !== undefined && ((promo.budgetUsed ?? 0) + (promo.reservedBudget ?? 0)) >= promo.budget) {
    return false;
  }
  return true;
};

export const listPublicPromotions = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const promotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .take(200);

    return promotions.filter((promo) => isPublicPromotion(promo, now));
  },
  returns: v.array(promotionDoc),
});

export const listPublicVouchers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 4, 12));
    const now = Date.now();

    let promotions = await ctx.db
      .query("promotions")
      .withIndex("by_status", (q) => q.eq("status", "Active"))
      .take(200);

    if (promotions.length === 0) {
      const allPromos = await ctx.db.query("promotions").take(200);
      promotions = allPromos.filter(
        (p) => p.status === "Active" || (p.status as string) === "active"
      );
    }

    const validVouchers = promotions.filter(
      (promo) => isPublicPromotion(promo, now) && Boolean(promo.code && promo.code.trim())
    );

    return validVouchers.slice(0, limit).map((promo) => ({
      _id: promo._id,
      code: promo.code!.trim().toUpperCase(),
      description: promo.description ?? undefined,
      discountType: promo.discountType,
      discountValue: promo.discountValue ?? undefined,
      endDate: parseTimestamp(promo.endDate),
      maxDiscountAmount: promo.maxDiscountAmount ?? undefined,
      name: promo.name,
      thumbnail: promo.thumbnail ?? undefined,
    }));
  },
  returns: v.array(
    v.object({
      _id: v.optional(v.id("promotions")),
      code: v.string(),
      description: v.optional(v.string()),
      discountType: discountType,
      discountValue: v.optional(v.number()),
      endDate: v.optional(v.number()),
      maxDiscountAmount: v.optional(v.number()),
      name: v.string(),
      thumbnail: v.optional(v.string()),
    })
  ),
});

// Migration: bổ sung promotionType cho data cũ
export const migrateAddPromotionType = mutation({
  args: {},
  handler: async (ctx) => {
    const promotions = await ctx.db.query("promotions").take(500);
    let updated = 0;

    for (const promo of promotions) {
      if (!promo.promotionType) {
        const promotionType = promo.code ? "coupon" : "campaign";
        await ctx.db.patch(promo._id, { promotionType });
        updated++;
      }
    }

    return { updated };
  },
  returns: v.object({ updated: v.number() }),
});

// Migration: bổ sung displayOnPage cho data cũ
export const migrateAddDisplayOnPage = mutation({
  args: {},
  handler: async (ctx) => {
    const promotions = await ctx.db.query("promotions").take(500);
    let updated = 0;

    for (const promo of promotions) {
      if (promo.displayOnPage === undefined) {
        await ctx.db.patch(promo._id, { displayOnPage: true });
        updated++;
      }
    }

    return { updated };
  },
  returns: v.object({ updated: v.number() }),
});

export const recordUsage = mutation({
  args: {
    customerId: v.id("customers"),
    discountAmount: v.number(),
    orderId: v.id("orders"),
    promotionId: v.id("promotions"),
  },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.promotionId);
    if (!promotion) {throw new Error("Promotion not found");}

    await ctx.db.insert("promotionUsage", {
      customerId: args.customerId,
      discountAmount: args.discountAmount,
      orderId: args.orderId,
      promotionId: args.promotionId,
      usedAt: Date.now(),
    });

    await ctx.db.patch(args.promotionId, {
      budgetUsed: promotion.budgetUsed !== undefined ? promotion.budgetUsed + args.discountAmount : promotion.budgetUsed,
      usedCount: promotion.usedCount + 1,
    });

    await updatePromotionStats(ctx, "totalUsed", 1);

    return null;
  },
  returns: v.null(),
});

export const validateCode = query({
  args: {
    categoryIds: v.optional(v.array(v.id("productCategories"))),
    code: v.string(),
    customerId: v.optional(v.id("customers")),
    orderAmount: v.optional(v.number()),
    productIds: v.optional(v.array(v.id("products"))),
    totalQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!promotion) {
      return { discountAmount: 0, message: "Mã voucher không tồn tại", promotion: null, valid: false };
    }

    if (promotion.status !== "Active") {
      return { discountAmount: 0, message: "Mã voucher không còn hiệu lực", promotion: null, valid: false };
    }

    const promotionType = promotion.promotionType ?? "campaign";
    if (promotionType !== "coupon") {
      return { discountAmount: 0, message: "Mã voucher không hợp lệ", promotion: null, valid: false };
    }

    const now = Date.now();
    if (promotion.startDate && now < promotion.startDate) {
      return { discountAmount: 0, message: "Mã voucher chưa đến thời gian sử dụng", promotion: null, valid: false };
    }
    if (promotion.endDate && now > promotion.endDate) {
      return { discountAmount: 0, message: "Mã voucher đã hết hạn", promotion: null, valid: false };
    }

    if (promotion.scheduleType === "recurring") {
      const nowDate = new Date(now);
      if (promotion.recurringDays && promotion.recurringDays.length > 0) {
        const day = nowDate.getDay();
        if (!promotion.recurringDays.includes(day)) {
          return { discountAmount: 0, message: "Chưa đến thời gian khuyến mãi", promotion: null, valid: false };
        }
      }
      if (promotion.recurringHours) {
        const minutes = nowDate.getHours() * 60 + nowDate.getMinutes();
        if (minutes < promotion.recurringHours.from || minutes > promotion.recurringHours.to) {
          return { discountAmount: 0, message: "Chưa đến khung giờ khuyến mãi", promotion: null, valid: false };
        }
      }
    }

    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      return { discountAmount: 0, message: "Mã voucher đã hết lượt sử dụng", promotion: null, valid: false };
    }

    if (promotion.budget !== undefined && promotion.budgetUsed !== undefined && promotion.budgetUsed >= promotion.budget) {
      return { discountAmount: 0, message: "Ngân sách khuyến mãi đã hết", promotion: null, valid: false };
    }

    const orderAmount = args.orderAmount ?? 0;
    if (promotion.minOrderAmount && orderAmount < promotion.minOrderAmount) {
      return { 
        discountAmount: 0, 
        message: `Đơn hàng tối thiểu ${promotion.minOrderAmount.toLocaleString()}đ`, 
        promotion: null, 
        valid: false 
      };
    }

    if (promotion.minQuantity && (args.totalQuantity ?? 0) < promotion.minQuantity) {
      return { discountAmount: 0, message: "Chưa đạt số lượng tối thiểu", promotion: null, valid: false };
    }

    if (promotion.applicableTo && promotion.applicableTo !== "all") {
      const applicableIds = new Set(promotion.applicableIds ?? []);
      const excludeIds = new Set(promotion.excludeIds ?? []);
      const productIds = (args.productIds ?? []).map((id) => id.toString());
      const categoryIds = (args.categoryIds ?? []).map((id) => id.toString());
      const hasExcluded = productIds.some((id) => excludeIds.has(id)) || categoryIds.some((id) => excludeIds.has(id));
      if (hasExcluded) {
        return { discountAmount: 0, message: "Sản phẩm không hợp lệ", promotion: null, valid: false };
      }

      if (promotion.applicableTo === "products" && applicableIds.size > 0) {
        const matched = productIds.some((id) => applicableIds.has(id));
        if (!matched) {
          return { discountAmount: 0, message: "Không áp dụng cho sản phẩm này", promotion: null, valid: false };
        }
      }

      if (promotion.applicableTo === "categories" && applicableIds.size > 0) {
        const matched = categoryIds.some((id) => applicableIds.has(id));
        if (!matched) {
          return { discountAmount: 0, message: "Không áp dụng cho danh mục này", promotion: null, valid: false };
        }
      }
    }

    if (promotion.customerType && promotion.customerType !== "all") {
      if (!args.customerId) {
        return { discountAmount: 0, message: "Khuyến mãi chỉ áp dụng cho khách đã đăng nhập", promotion: null, valid: false };
      }
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        return { discountAmount: 0, message: "Khách hàng không hợp lệ", promotion: null, valid: false };
      }
      if (promotion.customerType === "new" && customer.ordersCount > 0) {
        return { discountAmount: 0, message: "Chỉ áp dụng cho khách mới", promotion: null, valid: false };
      }
      if (promotion.customerType === "returning" && customer.ordersCount === 0) {
        return { discountAmount: 0, message: "Chỉ áp dụng cho khách quay lại", promotion: null, valid: false };
      }
      if (promotion.customerType === "vip" && customer.totalSpent < 1) {
        return { discountAmount: 0, message: "Chỉ áp dụng cho khách VIP", promotion: null, valid: false };
      }
      if (promotion.minOrderHistory && customer.ordersCount < promotion.minOrderHistory) {
        return { discountAmount: 0, message: "Chưa đủ số đơn tối thiểu", promotion: null, valid: false };
      }
      if (promotion.minTotalSpent && customer.totalSpent < promotion.minTotalSpent) {
        return { discountAmount: 0, message: "Chưa đủ tổng chi tiêu", promotion: null, valid: false };
      }
    }

    if (promotion.usagePerCustomer) {
      if (!args.customerId) {
        return { discountAmount: 0, message: "Khuyến mãi yêu cầu đăng nhập", promotion: null, valid: false };
      }
      const usage = await ctx.db
        .query("promotionUsage")
        .withIndex("by_customer_promotion", (q) =>
          q.eq("customerId", args.customerId!).eq("promotionId", promotion._id)
        )
        .take(promotion.usagePerCustomer + 1);
      if (usage.length >= promotion.usagePerCustomer) {
        return { discountAmount: 0, message: "Bạn đã dùng hết lượt khuyến mãi", promotion: null, valid: false };
      }
    }

    let discountAmount = 0;
    if (promotion.discountType === "percent") {
      const discountValue = promotion.discountValue ?? 0;
      discountAmount = Math.round(orderAmount * discountValue / 100);
      if (promotion.maxDiscountAmount && discountAmount > promotion.maxDiscountAmount) {
        discountAmount = promotion.maxDiscountAmount;
      }
    } else if (promotion.discountType === "fixed") {
      discountAmount = promotion.discountValue ?? 0;
    } else {
      return { discountAmount: 0, message: "Loại giảm giá chưa hỗ trợ", promotion: null, valid: false };
    }

    return { discountAmount, message: "Áp dụng thành công", promotion, valid: true };
  },
  returns: v.object({
    discountAmount: v.number(),
    message: v.string(),
    promotion: v.union(promotionDoc, v.null()),
    valid: v.boolean(),
  }),
});

// ============================================================
// COUPON ENGINE V1: EVALUATE, RESERVE, COMMIT, RELEASE, CLEANUP
// ============================================================

export const CouponErrorCode = {
  COUPON_NOT_FOUND: "COUPON_NOT_FOUND",
  COUPON_INACTIVE: "COUPON_INACTIVE",
  COUPON_EXPIRED: "COUPON_EXPIRED",
  USAGE_LIMIT_EXHAUSTED: "USAGE_LIMIT_EXHAUSTED",
  BUDGET_EXHAUSTED: "BUDGET_EXHAUSTED",
  MIN_SUBTOTAL_NOT_MET: "MIN_SUBTOTAL_NOT_MET",
  MIN_QTY_NOT_MET: "MIN_QTY_NOT_MET",
  CUSTOMER_LIMIT_REACHED: "CUSTOMER_LIMIT_REACHED",
  CUSTOMER_AUTH_REQUIRED: "CUSTOMER_AUTH_REQUIRED",
  EXCLUDED_PRODUCTS: "EXCLUDED_PRODUCTS",
  UNSUPPORTED_DISCOUNT_TYPE: "UNSUPPORTED_DISCOUNT_TYPE",
} as const;

const evaluateCartItemValidator = v.object({
  brandId: v.optional(v.string()),
  categoryId: v.optional(v.string()),
  price: v.number(),
  productId: v.string(),
  quantity: v.number(),
  tags: v.optional(v.array(v.string())),
});

const discountAllocationValidator = v.object({
  allocatedDiscount: v.number(),
  productId: v.string(),
});

export async function evaluateCouponHelper(
  ctx: QueryCtx | MutationCtx,
  args: {
    cartItems: Array<{
      brandId?: string;
      categoryId?: string;
      price: number;
      productId: string;
      quantity: number;
      tags?: string[];
    }>;
    code: string;
    customerId?: Id<"customers">;
    shippingFee?: number;
  }
) {
    const codeClean = args.code.trim().toUpperCase();
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", codeClean))
      .unique();

    if (!promotion) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.COUPON_NOT_FOUND,
        errorMessage: "Mã giảm giá không tồn tại",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    if (promotion.status !== "Active") {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.COUPON_INACTIVE,
        errorMessage: "Mã giảm giá không ở trạng thái hoạt động",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    const promotionType = promotion.promotionType ?? "campaign";
    if (promotionType !== "coupon") {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.COUPON_INACTIVE,
        errorMessage: "Chương trình không phải là mã giảm giá coupon",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    const now = Date.now();
    if (promotion.startDate && now < promotion.startDate) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.COUPON_INACTIVE,
        errorMessage: "Mã giảm giá chưa đến thời gian áp dụng",
        isValid: false,
        shippingDiscount: 0,
      };
    }
    if (promotion.endDate && now > promotion.endDate) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.COUPON_EXPIRED,
        errorMessage: "Mã giảm giá đã hết hạn sử dụng",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    // Checking 3-tier limits: total limit + active reservations
    const effectiveUsedCount = promotion.usedCount + (promotion.reservedCount ?? 0);
    if (promotion.usageLimit && effectiveUsedCount >= promotion.usageLimit) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.USAGE_LIMIT_EXHAUSTED,
        errorMessage: "Mã giảm giá đã hết lượt sử dụng",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    const effectiveBudgetUsed = (promotion.budgetUsed ?? 0) + (promotion.reservedBudget ?? 0);
    if (promotion.budget !== undefined && effectiveBudgetUsed >= promotion.budget) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.BUDGET_EXHAUSTED,
        errorMessage: "Ngân sách chương trình giảm giá đã hết",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    // Customer eligibility check
    if (promotion.customerType && promotion.customerType !== "all") {
      if (!args.customerId) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_AUTH_REQUIRED,
          errorMessage: "Vui lòng đăng nhập để sử dụng mã giảm giá này",
          isValid: false,
          shippingDiscount: 0,
        };
      }
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_AUTH_REQUIRED,
          errorMessage: "Tài khoản khách hàng không hợp lệ",
          isValid: false,
          shippingDiscount: 0,
        };
      }
      if (promotion.customerType === "new" && customer.ordersCount > 0) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_LIMIT_REACHED,
          errorMessage: "Mã giảm giá chỉ dành cho đơn hàng đầu tiên của khách mới",
          isValid: false,
          shippingDiscount: 0,
        };
      }
      if (promotion.customerType === "returning" && customer.ordersCount === 0) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_LIMIT_REACHED,
          errorMessage: "Mã giảm giá chỉ dành cho khách hàng thân thiết",
          isValid: false,
          shippingDiscount: 0,
        };
      }
      if (promotion.minOrderHistory && customer.ordersCount < promotion.minOrderHistory) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_LIMIT_REACHED,
          errorMessage: `Yêu cầu tối thiểu ${promotion.minOrderHistory} đơn hàng trước đó`,
          isValid: false,
          shippingDiscount: 0,
        };
      }
      if (promotion.minTotalSpent && customer.totalSpent < promotion.minTotalSpent) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_LIMIT_REACHED,
          errorMessage: `Yêu cầu tổng chi tiêu đạt tối thiểu ${promotion.minTotalSpent.toLocaleString()}đ`,
          isValid: false,
          shippingDiscount: 0,
        };
      }
    }

    if (promotion.usagePerCustomer) {
      if (!args.customerId) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_AUTH_REQUIRED,
          errorMessage: "Vui lòng đăng nhập để sử dụng mã này",
          isValid: false,
          shippingDiscount: 0,
        };
      }
      const usageList = await ctx.db
        .query("promotionUsage")
        .withIndex("by_customer_promotion", (q) =>
          q.eq("customerId", args.customerId!).eq("promotionId", promotion._id)
        )
        .take(promotion.usagePerCustomer + 1);

      if (usageList.length >= promotion.usagePerCustomer) {
        return {
          allocations: [],
          discountAmount: 0,
          eligibleSubtotal: 0,
          errorCode: CouponErrorCode.CUSTOMER_LIMIT_REACHED,
          errorMessage: "Bạn đã sử dụng hết lượt cho phép đối với mã giảm giá này",
          isValid: false,
          shippingDiscount: 0,
        };
      }
    }

    // Filter eligible items & Exclude rule (Exclusion > Inclusion)
    const excludeSet = new Set(promotion.excludeIds ?? []);
    const applicableSet = new Set(promotion.applicableIds ?? []);
    const applicableTo = promotion.applicableTo ?? "all";

    const eligibleItems = args.cartItems.filter((item) => {
      const pId = item.productId.toString();
      const cId = item.categoryId ? item.categoryId.toString() : "";
      if (excludeSet.has(pId) || (cId && excludeSet.has(cId))) {
        return false;
      }
      if (applicableTo === "all") {
        return true;
      }
      if (applicableTo === "products" && applicableSet.size > 0) {
        return applicableSet.has(pId);
      }
      if (applicableTo === "categories" && applicableSet.size > 0) {
        return cId && applicableSet.has(cId);
      }
      return true;
    });

    if (eligibleItems.length === 0) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal: 0,
        errorCode: CouponErrorCode.EXCLUDED_PRODUCTS,
        errorMessage: "Không có sản phẩm nào trong giỏ hàng đủ điều kiện áp dụng mã này",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

    if (promotion.minOrderAmount && eligibleSubtotal < promotion.minOrderAmount) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal,
        errorCode: CouponErrorCode.MIN_SUBTOTAL_NOT_MET,
        errorMessage: `Giá trị sản phẩm đủ điều kiện tối thiểu ${promotion.minOrderAmount.toLocaleString()}đ`,
        isValid: false,
        shippingDiscount: 0,
      };
    }

    if (promotion.minQuantity && eligibleQuantity < promotion.minQuantity) {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal,
        errorCode: CouponErrorCode.MIN_QTY_NOT_MET,
        errorMessage: `Số lượng sản phẩm đủ điều kiện tối thiểu ${promotion.minQuantity} món`,
        isValid: false,
        shippingDiscount: 0,
      };
    }

    let calculatedDiscount = 0;
    let shippingDiscount = 0;

    if (promotion.discountType === "percent") {
      const percent = promotion.discountValue ?? 0;
      calculatedDiscount = Math.round((eligibleSubtotal * percent) / 100);
      if (promotion.maxDiscountAmount && calculatedDiscount > promotion.maxDiscountAmount) {
        calculatedDiscount = promotion.maxDiscountAmount;
      }
    } else if (promotion.discountType === "fixed") {
      calculatedDiscount = promotion.discountValue ?? 0;
    } else if (promotion.discountType === "free_shipping") {
      const baseShipping = args.shippingFee ?? 0;
      shippingDiscount = baseShipping;
      if (promotion.maxShippingDiscount && shippingDiscount > promotion.maxShippingDiscount) {
        shippingDiscount = promotion.maxShippingDiscount;
      }
    } else {
      return {
        allocations: [],
        discountAmount: 0,
        eligibleSubtotal,
        errorCode: CouponErrorCode.UNSUPPORTED_DISCOUNT_TYPE,
        errorMessage: "Loại ưu đãi này chưa được hỗ trợ trong v1",
        isValid: false,
        shippingDiscount: 0,
      };
    }

    // Clamping Guard (RULE-FIXED-DISCOUNT-CAP)
    const discountAmount = Math.min(calculatedDiscount, eligibleSubtotal);

    // Allocation logic (RULE-DISCOUNT-ALLOCATION & RULE-MONEY-ROUNDING)
    const allocations: { productId: string; allocatedDiscount: number }[] = [];
    if (discountAmount > 0 && eligibleSubtotal > 0) {
      let allocatedSum = 0;
      for (let i = 0; i < eligibleItems.length; i++) {
        const item = eligibleItems[i];
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = Math.floor((itemSubtotal / eligibleSubtotal) * discountAmount);

        allocations.push({
          allocatedDiscount: itemDiscount,
          productId: item.productId,
        });
        allocatedSum += itemDiscount;
      }

      // Adjust rounding surplus to first item
      const diff = discountAmount - allocatedSum;
      if (diff !== 0 && allocations.length > 0) {
        allocations[0].allocatedDiscount += diff;
      }
    }

    return {
      allocations,
      discountAmount,
      eligibleSubtotal,
      isValid: true,
      shippingDiscount,
    };
}

export const evaluateCoupon = query({
  args: {
    cartItems: v.array(evaluateCartItemValidator),
    code: v.string(),
    customerId: v.optional(v.id("customers")),
    shippingFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return evaluateCouponHelper(ctx, args);
  },
  returns: v.object({
    allocations: v.array(discountAllocationValidator),
    discountAmount: v.number(),
    eligibleSubtotal: v.number(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    isValid: v.boolean(),
    shippingDiscount: v.number(),
  }),
});

export const reserveCoupon = mutation({
  args: {
    cartItems: v.array(evaluateCartItemValidator),
    code: v.string(),
    customerId: v.optional(v.id("customers")),
    orderId: v.id("orders"),
    shippingFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const codeClean = args.code.trim().toUpperCase();
    const promotion = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", codeClean))
      .unique();

    if (!promotion) {
      throw new ConvexError({
        code: CouponErrorCode.COUPON_NOT_FOUND,
        message: "Mã giảm giá không tồn tại",
      });
    }

    // Check existing reservation for this order
    const existing = await ctx.db
      .query("promotionReservations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (existing && existing.status === "reserved") {
      if (existing.promotionId === promotion._id) {
        return {
          discountAmount: existing.reservedDiscountAmount,
          promotionId: promotion._id,
          reservationId: existing._id,
        };
      }
      // Khách đổi mã: giải phóng reservation của mã cũ
      await ctx.db.patch(existing._id, { status: "released" });
      const oldPromo = await ctx.db.get(existing.promotionId);
      if (oldPromo) {
        await ctx.db.patch(oldPromo._id, {
          reservedBudget: Math.max(0, (oldPromo.reservedBudget ?? existing.reservedDiscountAmount) - existing.reservedDiscountAmount),
          reservedCount: Math.max(0, (oldPromo.reservedCount ?? 1) - 1),
        });
      }
    }

    // Re-evaluate limits & discount amount
    const evalResult = await evaluateCouponHelper(ctx, {
      cartItems: args.cartItems,
      code: args.code,
      customerId: args.customerId,
      shippingFee: args.shippingFee,
    });

    if (!evalResult.isValid) {
      throw new ConvexError({
        code: evalResult.errorCode ?? "COUPON_INVALID",
        message: evalResult.errorMessage ?? "Mã giảm giá không hợp lệ",
      });
    }

    const totalDiscount = evalResult.discountAmount + evalResult.shippingDiscount;
    const reservedAt = Date.now();
    const expiresAt = reservedAt + 15 * 60 * 1000; // 15-minute TTL

    let reservationId: Id<"promotionReservations">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        customerId: args.customerId,
        expiresAt,
        promotionId: promotion._id,
        reservedAt,
        reservedDiscountAmount: totalDiscount,
        status: "reserved",
      });
      reservationId = existing._id;
    } else {
      reservationId = await ctx.db.insert("promotionReservations", {
        customerId: args.customerId,
        expiresAt,
        orderId: args.orderId,
        promotionId: promotion._id,
        reservedAt,
        reservedDiscountAmount: totalDiscount,
        status: "reserved",
      });
    }

    // Atomic increment of reserved fields
    await ctx.db.patch(promotion._id, {
      reservedBudget: (promotion.reservedBudget ?? 0) + totalDiscount,
      reservedCount: (promotion.reservedCount ?? 0) + 1,
    });

    return {
      discountAmount: evalResult.discountAmount,
      promotionId: promotion._id,
      reservationId,
      shippingDiscount: evalResult.shippingDiscount,
    };
  },
  returns: v.object({
    discountAmount: v.number(),
    promotionId: v.id("promotions"),
    reservationId: v.id("promotionReservations"),
    shippingDiscount: v.optional(v.number()),
  }),
});

export const commitCoupon = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("promotionReservations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (!reservation || reservation.status !== "reserved") {
      return { committed: false };
    }

    const promotion = await ctx.db.get(reservation.promotionId);
    if (!promotion) {
      return { committed: false };
    }

    await ctx.db.patch(reservation._id, { status: "committed" });

    const newReservedCount = Math.max(0, (promotion.reservedCount ?? 1) - 1);
    const newReservedBudget = Math.max(
      0,
      (promotion.reservedBudget ?? reservation.reservedDiscountAmount) - reservation.reservedDiscountAmount
    );
    const newUsedCount = promotion.usedCount + 1;
    const newBudgetUsed = (promotion.budgetUsed ?? 0) + reservation.reservedDiscountAmount;

    await ctx.db.patch(promotion._id, {
      budgetUsed: newBudgetUsed,
      reservedBudget: newReservedBudget,
      reservedCount: newReservedCount,
      usedCount: newUsedCount,
    });

    if (reservation.customerId) {
      await ctx.db.insert("promotionUsage", {
        customerId: reservation.customerId,
        discountAmount: reservation.reservedDiscountAmount,
        orderId: args.orderId,
        promotionId: promotion._id,
        usedAt: Date.now(),
      });
    }

    await updatePromotionStats(ctx, "totalUsed", 1);
    return { committed: true };
  },
  returns: v.object({ committed: v.boolean() }),
});

export const releaseCoupon = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("promotionReservations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (!reservation || reservation.status !== "reserved") {
      return { released: false };
    }

    const promotion = await ctx.db.get(reservation.promotionId);
    if (!promotion) {
      return { released: false };
    }

    await ctx.db.patch(reservation._id, { status: "released" });

    const newReservedCount = Math.max(0, (promotion.reservedCount ?? 1) - 1);
    const newReservedBudget = Math.max(
      0,
      (promotion.reservedBudget ?? reservation.reservedDiscountAmount) - reservation.reservedDiscountAmount
    );

    await ctx.db.patch(promotion._id, {
      reservedBudget: newReservedBudget,
      reservedCount: newReservedCount,
    });

    return { released: true };
  },
  returns: v.object({ released: v.boolean() }),
});

export const cleanupStaleReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleList = await ctx.db
      .query("promotionReservations")
      .withIndex("by_status_expiresAt", (q) =>
        q.eq("status", "reserved").lt("expiresAt", now)
      )
      .take(100);

    let releasedCount = 0;
    for (const reservation of staleList) {
      await ctx.db.patch(reservation._id, { status: "released" });

      const promotion = await ctx.db.get(reservation.promotionId);
      if (promotion) {
        const newReservedCount = Math.max(0, (promotion.reservedCount ?? 1) - 1);
        const newReservedBudget = Math.max(
          0,
          (promotion.reservedBudget ?? reservation.reservedDiscountAmount) - reservation.reservedDiscountAmount
        );

        await ctx.db.patch(promotion._id, {
          reservedBudget: newReservedBudget,
          reservedCount: newReservedCount,
        });
      }
      releasedCount++;
    }

    return { releasedCount };
  },
  returns: v.object({ releasedCount: v.number() }),
});

export const recordManualDiscount = internalMutation({
  args: {
    adminUserId: v.id("users"),
    amount: v.number(),
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("manualDiscountLogs", {
      adminUserId: args.adminUserId,
      amount: args.amount,
      createdAt: Date.now(),
      orderId: args.orderId,
      reason: args.reason.trim(),
    });
    return id;
  },
  returns: v.id("manualDiscountLogs"),
});

