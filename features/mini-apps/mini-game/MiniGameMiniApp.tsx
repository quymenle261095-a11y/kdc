'use client';

import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Gamepad2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Trophy,
  Gamepad,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge, Button, Card, cn } from '@/app/admin/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/app/admin/components/ui';
import { CustomHomeRuntimeSection } from '@/components/site/home/sections/CustomHomeRuntimeSection';
import { DEFAULT_MINI_GAMES } from './defaultMiniGames';

type MiniGameMiniAppProps = {
  appConfig?: Record<string, unknown>;
  appName?: string;
  editable?: boolean;
  standalone?: boolean;
};

type GameStaticMetadata = {
  image: string;
  category: 'Strategy' | 'Puzzle' | 'Arcade' | 'Casual';
  categoryLabel: string;
  desc: string;
};

// Bộ dữ liệu tĩnh map các game với hình ảnh 3D và thể loại tương ứng
const GAME_METADATA_MAP: Record<string, GameStaticMetadata> = {
  'cờ caro ai': {
    image: '/images/games/caro.png',
    category: 'Strategy',
    categoryLabel: 'Trí tuệ',
    desc: 'Đấu cờ caro chiến thuật đỉnh cao với AI thông minh ở nhiều cấp độ khó.',
  },
  'xiangqi': {
    image: '/images/games/xiangqi.png',
    category: 'Strategy',
    categoryLabel: 'Cờ tướng',
    desc: 'Trò chơi cờ tướng truyền thống đấu trí căng thẳng, so tài chiến lược sâu sắc.',
  },
  'ai chess': {
    image: '/images/games/chess.png',
    category: 'Strategy',
    categoryLabel: 'Cờ vua',
    desc: 'Đấu cờ vua chuyên nghiệp với công cụ phân tích và gợi ý nước đi tối ưu.',
  },
  'minesweeper': {
    image: '/images/games/minesweeper.png',
    category: 'Puzzle',
    categoryLabel: 'Dò mìn',
    desc: 'Trò chơi dò mìn cổ điển kết hợp hiệu ứng âm thanh và đồ họa cải tiến.',
  },
  'sudoku': {
    image: '/images/games/sudoku.png',
    category: 'Puzzle',
    categoryLabel: 'Điền số',
    desc: 'Điền số logic đầy thử thách trí não với hàng nghìn câu đố hóc búa.',
  },
  'tetris': {
    image: '/images/games/tetris.png',
    category: 'Arcade',
    categoryLabel: 'Xếp gạch',
    desc: 'Xếp gạch cổ điển, phản xạ nhanh tay để dọn hàng gạch và ghi điểm kỷ lục.',
  },
  'solitaire': {
    image: '/images/games/solitaire.png',
    category: 'Puzzle',
    categoryLabel: 'Xếp bài',
    desc: 'Trò chơi xếp bài tây Klondike kinh điển giúp bạn thư giãn đầu óc hiệu quả.',
  },
  'tower defense': {
    image: '/images/games/towerdefense.png',
    category: 'Strategy',
    categoryLabel: 'Thủ thành',
    desc: 'Xây dựng và nâng cấp tháp phòng thủ ngăn chặn làn sóng robot tấn công.',
  },
  '2048': {
    image: '/images/games/game2048.png',
    category: 'Puzzle',
    categoryLabel: 'Hợp số',
    desc: 'Trượt các ô số thông minh để cộng dồn và đạt được cột mốc ô số 2048.',
  },
  'brick breaker': {
    image: '/images/games/brickbreaker.png',
    category: 'Arcade',
    categoryLabel: 'Bắn bóng',
    desc: 'Điều khiển thanh đỡ bắn bóng phá hủy các khối gạch màu sắc bắt mắt.',
  },
  'snake': {
    image: '/images/games/snake.png',
    category: 'Arcade',
    categoryLabel: 'Rắn săn mồi',
    desc: 'Điều khiển rắn săn mồi ăn táo đỏ trong mê cung, tránh tự đâm vào thân.',
  },
  'towerstack': {
    image: '/images/games/towerstack.png',
    category: 'Arcade',
    categoryLabel: 'Chồng tháp',
    desc: 'Thả các tầng tháp vật lý chồng lên nhau khéo léo để đạt độ cao tối đa.',
  },
};

const getRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const getString = (value: unknown, fallback: string) => (
  typeof value === 'string' && value.trim() ? value : fallback
);

export function MiniGameMiniApp({
  appConfig,
  appName = 'Mini Game Portal',
  editable = false,
  standalone = false,
}: MiniGameMiniAppProps) {
  const config = getRecord(appConfig);
  const accent = getString(config.accent, '#7c3aed');

  // Phân biệt chế độ Admin thực sự (trong Workspace Admin) với chế độ Site (Client Portal)
  const isAdminMode = editable && !standalone;

  // Query dữ liệu tương ứng
  const allGames = useQuery(api.miniGames.listAll);
  const activeGamesQuery = useQuery(api.miniGames.listActive);

  // Mutations
  const toggleGame = useMutation(api.miniGames.toggle);
  const reorderGames = useMutation(api.miniGames.reorder);
  const runMigration = useMutation(api.miniGames.migrateFromHomeComponents);

  // ViewMode quản lý giữa việc hiển thị Sảnh game ('lobby') và chơi game ('play')
  const [viewMode, setViewMode] = React.useState<'lobby' | 'play'>('lobby');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isMigrating, setIsMigrating] = React.useState(false);

  // Map dữ liệu game đầy đủ
  const games = React.useMemo(() => {
    const dbGames = isAdminMode
      ? (allGames ?? []).filter((g) => g.active)
      : (activeGamesQuery ?? []);
    const rawGames = isAdminMode
      ? dbGames
      : dbGames.length > 0 ? dbGames : DEFAULT_MINI_GAMES;

    const sortedGames = [...rawGames].sort((a, b) => a.order - b.order);

    return sortedGames.map((game) => {
      const lowerTitle = game.title.toLowerCase().trim();
      const meta = GAME_METADATA_MAP[lowerTitle] || {
        image: game.image || '/images/games/chess.png',
        category: (game.category as 'Strategy' | 'Puzzle' | 'Arcade' | 'Casual') || 'Casual',
        categoryLabel:
          game.category === 'Strategy'
            ? 'Trí tuệ'
            : game.category === 'Puzzle'
              ? 'Giải đố'
              : game.category === 'Arcade'
                ? 'Cổ điển'
                : 'Giải trí',
        desc: game.desc || getString(getRecord(game.config).preview, 'Trò chơi HTML5 thú vị.'),
      };

      return {
        ...game,
        meta,
      };
    });
  }, [allGames, activeGamesQuery, isAdminMode]);

  React.useEffect(() => {
    if (games.length === 0) {
      setSelectedId(null);
      setViewMode('lobby');
      return;
    }
    setSelectedId((current) => (
      current && games.some((game) => game._id === current) ? current : games[0]._id
    ));
  }, [games]);

  const selectedGame = React.useMemo(
    () => games.find((game) => game._id === selectedId) ?? games[0],
    [games, selectedId],
  );

  // Phân chia danh mục game cho Lobby
  const gamesByCategory = React.useMemo(() => {
    const strategy = games.filter((g) => g.meta.category === 'Strategy');
    const puzzle = games.filter((g) => g.meta.category === 'Puzzle');
    const arcade = games.filter((g) => g.meta.category === 'Arcade' || g.meta.category === 'Casual');
    return { strategy, puzzle, arcade };
  }, [games]);

  const handlePlayGame = (gameId: string) => {
    setSelectedId(gameId);
    setViewMode('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ADMIN ACTION: Bật/Tắt game
  const handleToggleActive = async (gameId: string) => {
    try {
      await toggleGame({ id: gameId as Id<'miniGames'> });
    } catch (err) {
      console.error('Error toggling game state:', err);
    }
  };

  // ADMIN ACTION: Thay đổi thứ tự (Lên / Xuống)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!allGames) return;
    const sorted = [...allGames].sort((a, b) => a.order - b.order);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    // Tráo đổi order của 2 phần tử
    const tempOrder = sorted[index].order;
    sorted[index].order = sorted[targetIdx].order;
    sorted[targetIdx].order = tempOrder;

    const payload = sorted.map((g) => ({
      id: g._id,
      order: g.order,
    }));

    try {
      await reorderGames({ items: payload });
    } catch (err) {
      console.error('Error reordering games:', err);
    }
  };

  // ADMIN ACTION: Đồng bộ dữ liệu ban đầu
  const handleMigrateData = async () => {
    setIsMigrating(true);
    try {
      const result = await runMigration();
      alert(`Đồng bộ thành công! Đã chép ${result.migratedCount} game mới sang bảng riêng.`);
    } catch (err) {
      console.error('Error migrating game data:', err);
      alert('Đã xảy ra lỗi trong quá trình đồng bộ dữ liệu game.');
    } finally {
      setIsMigrating(false);
    }
  };

  // Loading state
  const isDataLoading = isAdminMode ? allGames === undefined : activeGamesQuery === undefined;
  if (isDataLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Trường hợp không có dữ liệu game nào
  const hasNoGames = isAdminMode ? (allGames?.length ?? 0) === 0 : games.length === 0;
  if (hasNoGames) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950 space-y-6 max-w-2xl mx-auto my-8">
        <Gamepad2 className="mx-auto h-16 w-16 text-slate-400" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chưa có game HTML nào</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isAdminMode
              ? 'Dữ liệu trò chơi trong bảng riêng chưa được khởi tạo. Bạn cần thực hiện đồng bộ dữ liệu từ Custom Home Components.'
              : 'Trò chơi hiện chưa khả dụng. Vui lòng quay lại sau.'}
          </p>
        </div>
        {isAdminMode && (
          <Button
            onClick={handleMigrateData}
            disabled={isMigrating}
            className="mx-auto flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-6 py-2.5 shadow-md shadow-violet-500/10 transition-all active:scale-95"
          >
            {isMigrating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Đồng bộ 12 game mặc định ngay</span>
          </Button>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // GIAO DIỆN ADMIN: QUẢN LÝ GAME (Chỉ hiển thị ở Admin)
  // ----------------------------------------------------
  if (isAdminMode) {
    const sortedAllGames = [...(allGames ?? [])].sort((a, b) => a.order - b.order);

    return (
      <div className="space-y-6">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Danh sách trò chơi cổng game</h2>
              <p className="text-xs text-slate-500 mt-0.5">Admin chỉ cần bật/tắt hiển thị và sắp xếp vị trí các game.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMigrateData}
              disabled={isMigrating}
              className="flex items-center gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-xl"
            >
              {isMigrating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Đồng bộ/Reset game mặc định</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-center">Thứ tự</TableHead>
                  <TableHead className="w-[80px] text-center">Ảnh</TableHead>
                  <TableHead className="min-w-[150px]">Tên Trò Chơi</TableHead>
                  <TableHead className="w-[120px]">Thể Loại</TableHead>
                  <TableHead className="min-w-[250px]">Mô Tả Trực Quan</TableHead>
                  <TableHead className="w-[120px] text-center">Bật / Tắt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAllGames.map((game, index) => {
                  const lowerTitle = game.title.toLowerCase().trim();
                  const meta = GAME_METADATA_MAP[lowerTitle] || {
                    image: game.image || '/images/games/chess.png',
                    categoryLabel: 'Giải trí',
                    desc: game.desc || 'Mô tả game.',
                  };

                  return (
                    <TableRow key={game._id} className="group transition-colors duration-300">
                      {/* Cột Reorder */}
                      <TableCell className="align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveOrder(index, 'up')}
                            disabled={index === 0}
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveOrder(index, 'down')}
                            disabled={index === sortedAllGames.length - 1}
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Cột Image */}
                      <TableCell className="align-middle text-center">
                        <div className="mx-auto h-12 w-12 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-inner">
                          <img
                            src={meta.image}
                            alt={game.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </TableCell>

                      {/* Cột Tên */}
                      <TableCell className="align-middle">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 transition-colors">
                          {game.title}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5 select-all">
                          {game.slug}
                        </span>
                      </TableCell>

                      {/* Cột Thể Loại */}
                      <TableCell className="align-middle">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-bold border-none uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md',
                            game.category === 'Strategy' && 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                            game.category === 'Puzzle' && 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
                            game.category === 'Arcade' && 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
                          )}
                        >
                          {meta.categoryLabel}
                        </Badge>
                      </TableCell>

                      {/* Cột Mô Tả */}
                      <TableCell className="align-middle">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-[400px]">
                          {meta.desc}
                        </p>
                      </TableCell>

                      {/* Cột Switch Bật/Tắt */}
                      <TableCell className="align-middle text-center">
                        <div className="inline-flex items-center justify-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={game.active}
                              onChange={() => handleToggleActive(game._id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600" />
                          </label>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------
  // GIAO DIỆN LOBBY (SẢNH GAME CHÍNH - Chỉ hiển thị ở Site)
  // ----------------------------------------------------
  if (viewMode === 'lobby') {
    return (
      <div
        className={cn(
          'mini-game-app min-h-[calc(100vh-120px)] space-y-8 rounded-3xl bg-slate-50 p-4 pb-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-all duration-500',
          standalone && 'min-h-screen rounded-none p-4 md:p-6 md:pb-16',
        )}
      >
        {/* Banner Hero Cực Đẹp */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_45%)]" />
          <div className="absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
          <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Trải nghiệm Arcade & Trí tuệ độc quyền</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                {appName}
              </h1>
              <p className="text-white/80 text-sm md:text-base leading-relaxed">
                Kho tàng trò chơi HTML5 phong phú, gọn nhẹ. Đấu trí với AI Chess, chinh phục Caro, xếp gạch Tetris cổ điển hay kiểm tra phản xạ của bạn ngay lập tức!
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-white/70">Tổng số trò chơi</p>
                <p className="text-xl font-bold">{games.length} Games Sẵn Sàng</p>
              </div>
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-md shadow-black/10 animate-pulse"
                style={{ color: accent }}
              >
                <Gamepad2 className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: CHIẾN THUẬT & TRÍ TUỆ (Strategy Games) */}
        {gamesByCategory.strategy.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-extrabold tracking-tight">Chiến Thuật & Trí Tuệ</h2>
              <Badge variant="outline" className="ml-2 border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                Board Games
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gamesByCategory.strategy.map((game) => (
                <div
                  key={game._id}
                  onClick={() => handlePlayGame(game._id)}
                  className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-500/40 dark:hover:border-violet-500/40 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
                >
                  <div className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                    <img
                      src={game.meta.image}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                      {game.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {game.meta.desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {game.meta.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: GIẢI ĐỐ & SỐ HỌC (Puzzle Games) */}
        {gamesByCategory.puzzle.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <h2 className="text-xl font-extrabold tracking-tight">Giải Đố & Logic</h2>
              <Badge variant="outline" className="ml-2 border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                Puzzles
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gamesByCategory.puzzle.map((game) => (
                <div
                  key={game._id}
                  onClick={() => handlePlayGame(game._id)}
                  className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-500/40 dark:hover:border-violet-500/40 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
                >
                  <div className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                    <img
                      src={game.meta.image}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                      {game.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {game.meta.desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {game.meta.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: HÀNH ĐỘNG & CỔ ĐIỂN (Arcade Games) */}
        {gamesByCategory.arcade.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <Gamepad className="h-5 w-5 text-rose-500" />
              <h2 className="text-xl font-extrabold tracking-tight">Hành Động & Cổ Điển</h2>
              <Badge variant="outline" className="ml-2 border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400">
                Arcades
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gamesByCategory.arcade.map((game) => (
                <div
                  key={game._id}
                  onClick={() => handlePlayGame(game._id)}
                  className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-500/40 dark:hover:border-violet-500/40 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
                >
                  <div className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                    <img
                      src={game.meta.image}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                      {game.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {game.meta.desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {game.meta.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // GIAO DIỆN CHƠI GAME (PLAY MODE)
  // ----------------------------------------------------
  return (
    <div
      className={cn(
        'mini-game-app min-h-[calc(100vh-120px)] space-y-5 rounded-3xl bg-slate-100 p-4 dark:bg-slate-950 dark:text-slate-100 transition-all duration-500',
        standalone && 'min-h-screen rounded-none p-4 md:p-6',
      )}
    >
      {/* Header Điều Hướng Chơi Game */}
      <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
        <div className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewMode('lobby')}
              className="h-10 px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Sảnh Game
            </Button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                <img
                  src={selectedGame.meta.image}
                  alt={selectedGame.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-extrabold text-lg leading-none">{selectedGame.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>{selectedGame.meta.categoryLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={editable ? 'success' : 'secondary'} className="font-bold border-none">
              {editable ? 'Admin' : 'Public'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Xếp dọc: Khung game ở trên 100% width, trò chơi đề xuất ở dưới */}
      <div className="flex flex-col gap-6 w-full">
        {/* Khung chơi game chính (100% width) */}
        <Card className="w-full overflow-hidden border-none shadow-md bg-white dark:bg-slate-900 rounded-3xl">
          <div className="p-0">
            <CustomHomeRuntimeSection
              brandColor={accent}
              config={selectedGame.config as Record<string, unknown>}
              mode="single"
              secondary="#06b6d4"
              title={selectedGame.title}
            />
          </div>
        </Card>

        {/* Trò chơi đề xuất ở phía dưới */}
        <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
          <h3 className="font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Gamepad2 className="h-4 w-4 text-violet-500" />
            <span>Trò chơi đề xuất</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {games
              .filter((g) => g._id !== selectedGame._id)
              .slice(0, 6)
              .map((game) => (
                <div
                  key={game._id}
                  onClick={() => handlePlayGame(game._id)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/40 border border-slate-100/60 dark:border-slate-800/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group"
                >
                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <img
                      src={game.meta.image}
                      alt={game.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {game.title}
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {game.meta.categoryLabel}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
