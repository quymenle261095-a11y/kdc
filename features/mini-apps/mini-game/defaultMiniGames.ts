const createGameSource = (slug: string, title: string) => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; min-height: 100%; background: transparent; }
    iframe { display: block; width: 100%; min-height: 720px; border: 0; background: transparent; }
  </style>
</head>
<body>
  <iframe src="/mini-games/${slug}.html" title="${title}" loading="lazy" allow="fullscreen"></iframe>
</body>
</html>`;

const game = (
  title: string,
  slug: string,
  order: number,
  category: 'Strategy' | 'Puzzle' | 'Arcade',
  image: string,
  desc: string,
) => ({
  _creationTime: 0,
  _id: `code-${slug}`,
  active: true,
  category,
  config: {
    allowForms: true,
    allowPopups: true,
    allowScripts: true,
    heightMode: 'fixed',
    minHeight: 720,
    preview: desc,
    source: createGameSource(slug, title),
  },
  desc,
  image,
  order,
  slug,
  title,
});

export const DEFAULT_MINI_GAMES = [
  game('Cờ caro AI', 'co-caro-ai', 1, 'Strategy', '/images/games/caro.png', 'Đấu cờ caro 5 quân trực tiếp trên bàn 15x15.'),
  game('Xiangqi', 'xiangqi', 2, 'Strategy', '/images/games/xiangqi.png', 'Bản cờ chiến thuật nhẹ dạng ghép quân để luyện trí nhớ vị trí quân.'),
  game('AI Chess', 'ai-chess', 3, 'Strategy', '/images/games/chess.png', 'Bản cờ vua nhẹ dạng ghép cặp quân cờ và tính điểm.'),
  game('Minesweeper', 'minesweeper', 4, 'Puzzle', '/images/games/minesweeper.png', 'Dò mìn 8x8, tránh bom và mở ô an toàn để ghi điểm.'),
  game('Sudoku', 'sudoku', 5, 'Puzzle', '/images/games/sudoku.png', 'Điền số Sudoku 9x9 từ puzzle có sẵn.'),
  game('Tetris', 'tetris', 6, 'Arcade', '/images/games/tetris.png', 'Bản arcade canvas nhẹ, điều khiển nhanh và ghi điểm.'),
  game('Solitaire', 'solitaire', 7, 'Puzzle', '/images/games/solitaire.png', 'Bản solitaire nhẹ dạng ghép cặp lá bài.'),
  game('Tower Defense', 'tower-defense', 8, 'Strategy', '/images/games/towerdefense.png', 'Xây thủ thành bằng cách ghép cặp nâng cấp và nhận điểm.'),
  game('2048', '2048', 9, 'Puzzle', '/images/games/game2048.png', 'Trượt ô số bằng phím mũi tên để đạt 2048.'),
  game('Brick Breaker', 'brick-breaker', 10, 'Arcade', '/images/games/brickbreaker.png', 'Điều khiển thanh đỡ phá gạch bằng canvas.'),
  game('Snake', 'snake', 11, 'Arcade', '/images/games/snake.png', 'Điều khiển rắn bằng phím mũi tên để ăn mồi.'),
  game('TowerStack', 'towerstack', 12, 'Arcade', '/images/games/towerstack.png', 'Canh thời điểm thả tầng để chồng tháp và ghi điểm.'),
] as const;
