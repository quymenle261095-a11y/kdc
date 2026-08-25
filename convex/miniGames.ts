import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const miniGameConfigValidator = v.object({
  source: v.string(),
  js: v.optional(v.string()),
  css: v.optional(v.string()),
  allowScripts: v.optional(v.boolean()),
  allowForms: v.optional(v.boolean()),
  allowPopups: v.optional(v.boolean()),
});

const miniGameDoc = v.object({
  _creationTime: v.number(),
  _id: v.id("miniGames"),
  active: v.boolean(),
  config: miniGameConfigValidator,
  order: v.number(),
  title: v.string(),
  slug: v.string(),
  category: v.string(),
  desc: v.optional(v.string()),
  image: v.optional(v.string()),
});

// Helper function to update stats counters
async function updateMiniGameStats(
  ctx: MutationCtx,
  key: string,
  delta: number
) {
  const stats = await ctx.db
    .query("miniGameStats")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (stats) {
    await ctx.db.patch(stats._id, { count: Math.max(0, stats.count + delta) });
  } else {
    await ctx.db.insert("miniGameStats", { count: Math.max(0, delta), key });
  }
}

// Get all games for Admin
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("miniGames").take(100);
    return games.sort((a, b) => a.order - b.order);
  },
  returns: v.array(miniGameDoc),
});

// Get active games for Client
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("miniGames")
      .withIndex("by_active_order", (q) => q.eq("active", true))
      .take(100);
    return games;
  },
  returns: v.array(miniGameDoc),
});

export const getById = query({
  args: { id: v.id("miniGames") },
  handler: async (ctx, args) => ctx.db.get(args.id),
  returns: v.union(miniGameDoc, v.null()),
});

// Toggle game active state
export const toggle = mutation({
  args: { id: v.id("miniGames") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.id);
    if (!game) {
      throw new Error("Game not found");
    }
    const nextActive = !game.active;
    await ctx.db.patch(args.id, { active: nextActive });

    // Update stats counters
    await Promise.all([
      updateMiniGameStats(ctx, nextActive ? "active" : "inactive", 1),
      updateMiniGameStats(ctx, nextActive ? "inactive" : "active", -1),
    ]);

    return null;
  },
  returns: v.null(),
});

// Reorder games order
export const reorder = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.id("miniGames"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.items.map(async (item) => ctx.db.patch(item.id, { order: item.order }))
    );
    return null;
  },
  returns: v.null(),
});

// Migrate 12 games from homeComponents to miniGames (runs once)
export const migrateFromHomeComponents = mutation({
  args: {},
  handler: async (ctx) => {
    const homeComponents = await ctx.db
      .query("homeComponents")
      .withIndex("by_type", (q) => q.eq("type", "CustomHome"))
      .collect();

    const GAME_METADATA_MAP: Record<
      string,
      { image: string; category: string; desc: string }
    > = {
      "cờ caro ai": {
        image: "/images/games/caro.png",
        category: "Strategy",
        desc: "Đấu cờ caro chiến thuật đỉnh cao với AI thông minh ở nhiều cấp độ khó.",
      },
      "xiangqi": {
        image: "/images/games/xiangqi.png",
        category: "Strategy",
        desc: "Trò chơi cờ tướng truyền thống đấu trí căng thẳng, so tài chiến lược sâu sắc.",
      },
      "ai chess": {
        image: "/images/games/chess.png",
        category: "Strategy",
        desc: "Đấu cờ vua chuyên nghiệp với công cụ phân tích và gợi ý nước đi tối ưu.",
      },
      "minesweeper": {
        image: "/images/games/minesweeper.png",
        category: "Puzzle",
        desc: "Trò chơi dò mìn cổ điển kết hợp hiệu ứng âm thanh và đồ họa cải tiến.",
      },
      "sudoku": {
        image: "/images/games/sudoku.png",
        category: "Puzzle",
        desc: "Điền số logic đầy thử thách trí não với hàng nghìn câu đố hóc búa.",
      },
      "tetris": {
        image: "/images/games/tetris.png",
        category: "Arcade",
        desc: "Xếp gạch cổ điển, phản xạ nhanh tay để dọn hàng gạch và ghi điểm kỷ lục.",
      },
      "solitaire": {
        image: "/images/games/solitaire.png",
        category: "Puzzle",
        desc: "Trò chơi xếp bài tây Klondike kinh điển giúp bạn thư giãn đầu óc hiệu quả.",
      },
      "tower defense": {
        image: "/images/games/towerdefense.png",
        category: "Strategy",
        desc: "Xây dựng và nâng cấp tháp phòng thủ ngăn chặn làn sóng robot tấn công.",
      },
      "2048": {
        image: "/images/games/game2048.png",
        category: "Puzzle",
        desc: "Trượt các ô số thông minh để cộng dồn và đạt được cột mốc ô số 2048.",
      },
      "brick breaker": {
        image: "/images/games/brickbreaker.png",
        category: "Arcade",
        desc: "Điều khiển thanh đỡ bắn bóng phá hủy các khối gạch màu sắc bắt mắt.",
      },
      "snake": {
        image: "/images/games/snake.png",
        category: "Arcade",
        desc: "Điều khiển rắn săn mồi ăn táo đỏ trong mê cung, tránh tự đâm vào thân.",
      },
      "towerstack": {
        image: "/images/games/towerstack.png",
        category: "Arcade",
        desc: "Thả các tầng tháp vật lý chồng lên nhau khéo léo để đạt độ cao tối đa.",
      },
    };

    let migratedCount = 0;
    for (const component of homeComponents) {
      const titleLower = component.title.toLowerCase().trim();
      const meta = GAME_METADATA_MAP[titleLower];
      if (meta) {
        // Build unique slug
        const slug = titleLower
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Check if already exists in miniGames
        const existing = await ctx.db
          .query("miniGames")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique();

        if (!existing) {
          const config = component.config || {};
          await ctx.db.insert("miniGames", {
            title: component.title,
            slug,
            category: meta.category,
            desc: meta.desc,
            image: meta.image,
            active: component.active,
            order: component.order,
            config: {
              source: config.source || "",
              js: config.js,
              css: config.css,
              allowScripts: config.allowScripts ?? true,
              allowForms: config.allowForms ?? true,
              allowPopups: config.allowPopups ?? true,
            },
          });
          migratedCount++;
        }
      }
    }

    // Recalculate stats
    const allGames = await ctx.db.query("miniGames").collect();
    const activeGames = allGames.filter((g) => g.active);

    const oldStats = await ctx.db.query("miniGameStats").collect();
    for (const stat of oldStats) {
      await ctx.db.delete(stat._id);
    }

    await ctx.db.insert("miniGameStats", { key: "total", count: allGames.length });
    await ctx.db.insert("miniGameStats", { key: "active", count: activeGames.length });
    await ctx.db.insert("miniGameStats", {
      key: "inactive",
      count: allGames.length - activeGames.length,
    });

    return { migratedCount, totalInNewTable: allGames.length };
  },
  returns: v.object({
    migratedCount: v.number(),
    totalInNewTable: v.number(),
  }),
});
