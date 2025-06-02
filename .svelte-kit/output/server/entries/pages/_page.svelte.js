import { d as current_component, f as ensure_array_like, h as attr_style, i as attr_class, j as attr, e as escape_html, k as bind_props, c as pop, p as push, m as maybe_selected } from "../../chunks/index.js";
function onDestroy(fn) {
  var context = (
    /** @type {Component} */
    current_component
  );
  (context.d ??= []).push(fn);
}
function Board($$payload, $$props) {
  push();
  let boardData = $$props["boardData"];
  let onCellClick = $$props["onCellClick"];
  const each_array = ensure_array_like(boardData);
  $$payload.out += `<div class="board-container svelte-s7umiu"><div class="board svelte-s7umiu"${attr_style(`--board-columns: ${boardData.length > 0 ? boardData[0].length : 8};`)}><!--[-->`;
  for (let r = 0, $$length = each_array.length; r < $$length; r++) {
    let row = each_array[r];
    const each_array_1 = ensure_array_like(row);
    $$payload.out += `<div class="board-row svelte-s7umiu"><!--[-->`;
    for (let c = 0, $$length2 = each_array_1.length; c < $$length2; c++) {
      let cell = each_array_1[c];
      $$payload.out += `<div${attr_class("cell svelte-s7umiu", void 0, {
        "visited": cell.visited,
        "current": cell.isCurrent,
        "next-move": cell.isNextMove
      })} role="button" tabindex="0"${attr("aria-label", `Cell ${r + 1}-${String.fromCharCode(65 + c)}${cell.visited ? " visited step " + cell.step : ""}${cell.isCurrent ? " current position" : ""}${cell.isNextMove ? " possible next move" : ""}`)}>`;
      if (cell.step > 0) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<span class="step-number svelte-s7umiu">${escape_html(cell.step)}</span>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> `;
      if (cell.isCurrent) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<span class="marker knight-marker svelte-s7umiu">♘</span>`;
      } else if (cell.isNextMove) {
        $$payload.out += "<!--[1-->";
        $$payload.out += `<span class="marker next-move-marker svelte-s7umiu">●</span>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></div>`;
    }
    $$payload.out += `<!--]--></div>`;
  }
  $$payload.out += `<!--]--></div></div>`;
  bind_props($$props, { boardData, onCellClick });
  pop();
}
function isValidSquare(r, c, boardSize) {
  return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
}
function getValidMoves(r, c, boardSize) {
  const moves = [];
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
function createInitialBoard(boardSize) {
  const board = [];
  for (let i = 0; i < boardSize; i++) {
    const row = [];
    for (let j = 0; j < boardSize; j++) {
      row.push({
        visited: false,
        step: 0,
        // 第幾步訪問
        isCurrent: false,
        // 是否為當前騎士位置
        isNextMove: false
        // 是否為下一步的可能位置
      });
    }
    board.push(row);
  }
  return board;
}
function _page($$payload, $$props) {
  push();
  const boardSizes = [5, 6, 7, 8, 9, 10];
  let currentBoardSize = 8;
  let board = createInitialBoard(currentBoardSize);
  let currentPos = null;
  let moveHistory = [];
  let stepCount = 0;
  let gameStarted = false;
  let gameOver = false;
  let message = "棋盤已啟動。參賽者，請指定你的『騎士』初始位置。";
  let isCompetitionActive = false;
  let competitionLevel = 0;
  let timeLeft = 600;
  function updateBoardVisuals() {
    board = board.map((row, r_idx) => row.map((cell, c_idx) => {
      let newCell = { ...cell, isNextMove: false, isCurrent: false };
      if (currentPos && currentPos[0] === r_idx && currentPos[1] === c_idx) {
        newCell.isCurrent = true;
      }
      if (gameStarted && currentPos) {
        const moves = getValidMoves(currentPos[0], currentPos[1], currentBoardSize);
        if (moves.some(([nr, nc]) => nr === r_idx && nc === c_idx)) {
          if (!cell.visited) {
            newCell.isNextMove = true;
          }
        }
      }
      return newCell;
    }));
  }
  function handleCellClick(r, c) {
    if (gameOver && true) return;
    if (gameOver && isCompetitionActive && timeLeft > 0) {
      message = `路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 卡住。棋盤已重置，請重新嘗試。`;
      resetGame(true);
      return;
    }
    if (gameOver && isCompetitionActive && timeLeft <= 0) return;
    if (!gameStarted) {
      currentPos = [r, c];
      stepCount = 1;
      board[r][c].visited = true;
      board[r][c].step = stepCount;
      moveHistory.push([r, c, stepCount]);
      gameStarted = true;
      {
        message = "『騎士』已配置。參賽者，請規劃其行動序列。";
      }
    } else {
      if (!currentPos) return;
      const validMoves = getValidMoves(currentPos[0], currentPos[1], currentBoardSize);
      const isMoveValid = validMoves.some(([nr, nc]) => nr === r && nc === c);
      if (isMoveValid && !board[r][c].visited) {
        currentPos = [r, c];
        stepCount++;
        board[r][c].visited = true;
        board[r][c].step = stepCount;
        moveHistory.push([r, c, stepCount]);
        {
          message = `序列第 ${stepCount} 步：『騎士』抵達座標 (${r + 1}, ${String.fromCharCode(65 + c)})。`;
        }
        if (stepCount === currentBoardSize * currentBoardSize) {
          {
            gameOver = true;
            message = "演算完成。參賽者，你的『騎士』已成功遍歷棋盤所有節點。挑戰通過。";
          }
        } else {
          const nextPossibleMoves = getValidMoves(r, c, currentBoardSize);
          const canMoveFurther = nextPossibleMoves.some(([nr, nc]) => !board[nr][nc].visited);
          if (!canMoveFurther) {
            gameOver = true;
            {
              message = `路徑分析：『騎士』於第 ${stepCount} 步後已無可用路徑。參賽者，本次挑戰宣告失敗。`;
            }
          }
        }
      } else if (board[r][c].visited) {
        message = `座標 (${r + 1}, ${String.fromCharCode(65 + c)}) 已部署或曾途經。請選擇其他節點。`;
      } else {
        message = `指令無效：『騎士』無法移動至座標 (${r + 1}, ${String.fromCharCode(65 + c)})。請重新規劃路徑。`;
      }
    }
    updateBoardVisuals();
  }
  function resetGame(isCompetitionModeAction = false) {
    board = createInitialBoard(currentBoardSize);
    currentPos = null;
    moveHistory = [];
    stepCount = 0;
    gameStarted = false;
    gameOver = false;
    {
      message = "棋盤已重置。等待參賽者部署『騎士』。";
    }
    updateBoardVisuals();
  }
  onDestroy(() => {
  });
  const each_array = ensure_array_like(boardSizes);
  $$payload.out += `<h1 class="svelte-1mj1dqo">騎士巡遊</h1> <div class="controls svelte-1mj1dqo"><label for="board-size-select" class="svelte-1mj1dqo">選擇棋盤大小 (N x N):</label> <select id="board-size-select"${attr("disabled", isCompetitionActive, true)} class="svelte-1mj1dqo">`;
  $$payload.select_value = currentBoardSize;
  $$payload.out += `<!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let size = each_array[$$index];
    $$payload.out += `<option${attr("value", size)}${maybe_selected($$payload, size)}>${escape_html(size)} x ${escape_html(size)}</option>`;
  }
  $$payload.out += `<!--]-->`;
  $$payload.select_value = void 0;
  $$payload.out += `</select> <button style="margin-left: 10px;"${attr("disabled", isCompetitionActive, true)} class="svelte-1mj1dqo">${escape_html("顯示提示")}</button> <button${attr("disabled", isCompetitionActive, true)} style="margin-left: 10px; background-color: #28a745; color: white;" class="svelte-1mj1dqo">開始競賽模式</button> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <p class="svelte-1mj1dqo">${escape_html(message)}</p> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  Board($$payload, {
    boardData: board,
    onCellClick: handleCellClick
  });
  $$payload.out += `<!----> <button${attr("disabled", !gameStarted && !gameOver, true)} class="svelte-1mj1dqo">重置挑戰</button> `;
  if (moveHistory.length > 0) {
    $$payload.out += "<!--[-->";
    const each_array_1 = ensure_array_like(moveHistory);
    $$payload.out += `<div class="svelte-1mj1dqo"><h3 class="svelte-1mj1dqo">行動序列日誌:</h3> <ul class="svelte-1mj1dqo"><!--[-->`;
    for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
      let [r, c, step] = each_array_1[i];
      $$payload.out += `<li class="svelte-1mj1dqo">第 ${escape_html(step)} 步: 部署於 (${escape_html(r + 1)}, ${escape_html(String.fromCharCode(65 + c))})</li>`;
    }
    $$payload.out += `<!--]--></ul></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  pop();
}
export {
  _page as default
};
