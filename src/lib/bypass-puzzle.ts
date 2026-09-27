export type PipeType = 'straight' | 'lShape' | 'battery' | 'engine';

export interface Point {
  x: number; // column
  y: number; // row
}

export interface BypassPuzzleTile {
  r: number;
  c: number;
  type: PipeType;
  rotation: number; // 0: 0deg, 1: 90deg, 2: 180deg, 3: 270deg
  isFixed: boolean;
}

/**
 * タイルが持つ接続端子の方向を返す (0: 上, 1: 右, 2: 下, 3: 左)
 */
export function getTileConnections(type: PipeType, rotation: number): number[] {
  switch (type) {
    case 'straight':
      return rotation % 2 === 0 ? [0, 2] : [1, 3];
    case 'lShape':
      return [rotation % 4, (rotation + 1) % 4];
    case 'battery':
      return [1, 2]; // 右と下に接続口
    case 'engine':
      return [0, 3]; // 上と左に接続口
  }
}

export class BypassPuzzleLogic {
  readonly rows: number;
  readonly cols: number;
  grid: BypassPuzzleTile[][];
  poweredTiles: Set<string>; // 'r,c'
  moveCount: number;
  isSolved: boolean;
  initialTiles: BypassPuzzleTile[][];

  constructor(rows = 4, cols = 4) {
    this.rows = rows;
    this.cols = cols;
    this.grid = [];
    this.poweredTiles = new Set<string>();
    this.moveCount = 0;
    this.isSolved = false;
    this.initialTiles = [];
    this.initialize();
  }

  initialize(): void {
    this.moveCount = 0;
    this.isSolved = false;

    // 空のグリッドを作成
    this.grid = Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => ({
        r,
        c,
        type: 'straight' as PipeType,
        rotation: 0,
        isFixed: false,
      }))
    );

    // 有効な解経路を生成
    const path = this.generateValidPath();
    this.placeTilesAlongPath(path);

    // 経路外のセルをランダムに埋める
    const pathSet = new Set(path.map((p) => `${p.y},${p.x}`));
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!pathSet.has(`${r},${c}`)) {
          this.grid[r][c] = {
            r,
            c,
            type: Math.random() < 0.5 ? 'straight' : 'lShape',
            rotation: Math.floor(Math.random() * 4),
            isFixed: false,
          };
        }
      }
    }

    // 始点(バッテリー)と終点(エンジン)を固定
    this.grid[0][0] = {
      r: 0,
      c: 0,
      type: 'battery',
      rotation: 0,
      isFixed: true,
    };
    this.grid[this.rows - 1][this.cols - 1] = {
      r: this.rows - 1,
      c: this.cols - 1,
      type: 'engine',
      rotation: 0,
      isFixed: true,
    };

    // 非固定タイルをランダムに回転させてシャッフル
    this.shuffleTiles();

    // 初期状態を保存（リセット用）
    this.saveInitialState();

    this.updatePoweredTiles();
  }

  private shuffleTiles(): void {
    // 確実に未クリアの状態からスタートするようにシャッフル
    let attempts = 0;
    do {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.grid[r][c].isFixed) {
            this.grid[r][c].rotation = Math.floor(Math.random() * 4);
          }
        }
      }
      this.updatePoweredTiles();
      attempts++;
    } while (this.checkSolved() && attempts < 20);

    // 万一まだ解けていたら1つ回転
    if (this.checkSolved()) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.grid[r][c].isFixed) {
            this.grid[r][c].rotation = (this.grid[r][c].rotation + 1) % 4;
            break;
          }
        }
      }
    }
  }

  private saveInitialState(): void {
    this.initialTiles = this.grid.map((row) =>
      row.map((tile) => ({ ...tile }))
    );
  }

  resetToInitial(): void {
    this.grid = this.initialTiles.map((row) =>
      row.map((tile) => ({ ...tile }))
    );
    this.moveCount = 0;
    this.isSolved = false;
    this.updatePoweredTiles();
  }

  private generateValidPath(): Point[] {
    const path: Point[] = [{ x: 0, y: 0 }];
    let current: Point = { x: 0, y: 0 };
    const visited = new Set<string>(['0,0']);
    const targetX = this.cols - 1;
    const targetY = this.rows - 1;

    while (current.x !== targetX || current.y !== targetY) {
      const neighbors: Point[] = [];
      if (current.x + 1 < this.cols) neighbors.push({ x: current.x + 1, y: current.y });
      if (current.y + 1 < this.rows) neighbors.push({ x: current.x, y: current.y + 1 });
      if (current.y - 1 >= 0) neighbors.push({ x: current.x, y: current.y - 1 });
      if (current.x - 1 >= 0) neighbors.push({ x: current.x - 1, y: current.y });

      const validNeighbors = neighbors.filter((p) => !visited.has(`${p.y},${p.x}`));

      if (validNeighbors.length === 0) {
        // 袋小路に入った場合は再生成
        return this.generateValidPath();
      }

      // マンハッタン距離でソート（ゴールに近い方を優先しつつランダム性を持たせる）
      validNeighbors.sort((a, b) => {
        const distA = Math.abs(targetX - a.x) + Math.abs(targetY - a.y);
        const distB = Math.abs(targetX - b.x) + Math.abs(targetY - b.y);
        return distA - distB;
      });

      const poolSize = Math.min(2, validNeighbors.length);
      current = validNeighbors[Math.floor(Math.random() * poolSize)];
      path.push(current);
      visited.add(`${current.y},${current.x}`);
    }

    return path;
  }

  private placeTilesAlongPath(path: Point[]): void {
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];

      const inDir = this.getDirection(curr, prev);
      const outDir = this.getDirection(curr, next);

      if (inDir % 2 === outDir % 2) {
        this.grid[curr.y][curr.x] = {
          r: curr.y,
          c: curr.x,
          type: 'straight',
          rotation: inDir % 2 === 0 ? 0 : 1,
          isFixed: false,
        };
      } else {
        let rot = 0;
        const dirs = [inDir, outDir].sort((a, b) => a - b);
        if (dirs[0] === 0 && dirs[1] === 1) rot = 0;
        else if (dirs[0] === 1 && dirs[1] === 2) rot = 1;
        else if (dirs[0] === 2 && dirs[1] === 3) rot = 2;
        else if (dirs[0] === 0 && dirs[1] === 3) rot = 3;

        this.grid[curr.y][curr.x] = {
          r: curr.y,
          c: curr.x,
          type: 'lShape',
          rotation: rot,
          isFixed: false,
        };
      }
    }
  }

  private getDirection(from: Point, to: Point): number {
    if (to.y < from.y) return 0; // 上
    if (to.x > from.x) return 1; // 右
    if (to.y > from.y) return 2; // 下
    if (to.x < from.x) return 3; // 左
    return 0;
  }

  rotateTile(r: number, c: number): boolean {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    const tile = this.grid[r][c];
    if (tile.isFixed) return false;

    tile.rotation = (tile.rotation + 1) % 4;
    this.moveCount++;
    this.updatePoweredTiles();
    this.isSolved = this.checkSolved();
    return true;
  }

  updatePoweredTiles(): void {
    this.poweredTiles.clear();
    this.tracePower(0, 0);
  }

  private tracePower(r: number, c: number): void {
    this.poweredTiles.add(`${r},${c}`);
    const tile = this.grid[r][c];
    const connections = getTileConnections(tile.type, tile.rotation);

    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];
    const opposite = [2, 3, 0, 1];

    for (const dir of connections) {
      const nr = r + dr[dir];
      const nc = c + dc[dir];

      if (
        nr >= 0 &&
        nr < this.rows &&
        nc >= 0 &&
        nc < this.cols &&
        !this.poweredTiles.has(`${nr},${nc}`)
      ) {
        const neighbor = this.grid[nr][nc];
        const neighborConnections = getTileConnections(neighbor.type, neighbor.rotation);
        if (neighborConnections.includes(opposite[dir])) {
          this.tracePower(nr, nc);
        }
      }
    }
  }

  checkSolved(): boolean {
    return this.poweredTiles.has(`${this.rows - 1},${this.cols - 1}`);
  }

  isPowered(r: number, c: number): boolean {
    return this.poweredTiles.has(`${r},${c}`);
  }
}
