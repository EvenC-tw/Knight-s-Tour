// 檢查座標是否在棋盤內
export function isValidSquare(r, c, boardSize) {
    return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
}

// 獲取騎士在 (r, c) 的所有可能移動
export function getValidMoves(r, c, boardSize) {
    const moves = [];
    // 騎士的8個可能移動方向
    const dr = [-2, -2, -1, -1, 1, 1, 2, 2];
    const dc = [-1, 1, -2, 2, -2, 2, -1, 1];

    for (let i = 0; i < 8; i++) {
        const nr = r + dr[i];
        const nc = c + dc[i];
        if (isValidSquare(nr, nc, boardSize)) {
            moves.push([nr, nc]);
        }
    }
    return moves;
}

// 創建初始化的棋盤數據結構
export function createInitialBoard(boardSize) {
    const board = [];
    for (let i = 0; i < boardSize; i++) {
        const row = [];
        for (let j = 0; j < boardSize; j++) {
            row.push({
                visited: false,
                step: 0,        // 第幾步訪問
                isCurrent: false, // 是否為當前騎士位置
                isNextMove: false // 是否為下一步的可能位置
            });
        }
        board.push(row);
    }
    return board;
} 