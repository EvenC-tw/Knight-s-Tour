<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // import { Box, Button, Center, Stack, Title, Text, Group, Paper } from '@svelteuidev/core'; // 暫時註解
  import Board from '$lib/components/Board.svelte';
  import { createInitialBoard, getValidMoves, type BoardData, type CellState } from '$lib/knightLogic.js';

  // 棋盤大小選項
  const boardSizes = [5, 6, 7, 8, 9, 10];
  let currentBoardSize: number = 8; // 預設棋盤大小

  // 頂層變數宣告
  let board: BoardData = createInitialBoard(currentBoardSize);
  let currentPos: [number, number] | null = null; // [r, c]
  let moveHistory: Array<[number, number, number]> = []; // 存放移動歷史 [[r,c, step], ...]
  let stepCount = 0;
  let gameStarted = false;
  let gameOver = false;
  let message = "棋盤已啟動。參賽者，請指定你的『騎士』初始位置。";
  let showHint = false;
  let hintText = "";
  let isCompetitionActive = false;
  let competitionLevel = 0; // 0: 未開始, 1: 6x6, 2: 7x7, 3: 8x8
  let timeLeft = 600; // 10 分鐘，單位：秒
  let timerInterval: number | undefined = undefined;

  const competitionLevels = [6, 7, 8]; // 競賽模式的棋盤大小

  // 更新棋盤大小並重置遊戲
  function changeBoardSize(newSize: number) {
    currentBoardSize = newSize;
    resetGame(false); // 傳入 false 表示非競賽模式下的重置
  }

  // 頂層函式定義: updateBoardVisuals
  function updateBoardVisuals() {
    board = board.map((row, r_idx) =>
      row.map((cell, c_idx) => {
        let newCell: CellState = { ...cell, isNextMove: false, isCurrent: false };
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
      })
    ) as BoardData;
  }

  // 頂層函式定義: handleCellClick
  function handleCellClick(r: number, c: number) {
    if (gameOver && !isCompetitionActive) return; // 非競賽時，遊戲結束則返回
    if (gameOver && isCompetitionActive && timeLeft > 0) { // 競賽中卡關但時間未到
        // 允許重置當前關卡，但不影響計時器
        message = `路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 卡住。棋盤已重置，請重新嘗試。`;
        resetGame(true); // 競賽模式重置
        return;
    }
    if (gameOver && isCompetitionActive && timeLeft <=0) return; // 時間到且卡關，不處理點擊

    if (!gameStarted) {
      currentPos = [r, c];
      stepCount = 1;
      board[r][c].visited = true;
      board[r][c].step = stepCount;
      moveHistory.push([r, c, stepCount]);
      gameStarted = true;
      if (isCompetitionActive && competitionLevel > 0 && !timerInterval && timeLeft > 0) {
        startTimer(); // 競賽模式下，第一步後啟動計時器
        message = `競賽開始！第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize})，計時開始！`;
      } else if (!isCompetitionActive) {
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
        if (!isCompetitionActive) {
            message = `序列第 ${stepCount} 步：『騎士』抵達座標 (${r+1}, ${String.fromCharCode(65+c)})。`;
        } else {
            message = `競賽第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) - 第 ${stepCount} 步。`;
        }

        if (stepCount === currentBoardSize * currentBoardSize) {
          if (isCompetitionActive) {
            if (competitionLevel < competitionLevels.length) {
              competitionLevel++;
              currentBoardSize = competitionLevels[competitionLevel - 1];
              message = `恭喜完成第 ${competitionLevel-1} 關！準備挑戰第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize})。`;
              resetGame(true); // 重置到下一關
            } else {
              // 完成所有競賽關卡
              gameOver = true;
              stopCompetition(true); // 傳true表示成功完成競賽
            }
          } else {
            gameOver = true;
            message = "演算完成。參賽者，你的『騎士』已成功遍歷棋盤所有節點。挑戰通過。";
          }
        } else {
          const nextPossibleMoves = getValidMoves(r, c, currentBoardSize);
          const canMoveFurther = nextPossibleMoves.some(([nr, nc]) => !board[nr][nc].visited);
          if (!canMoveFurther) {
            gameOver = true; // 標記卡住，但不一定是競賽失敗
            if (isCompetitionActive && timeLeft > 0) {
                message = `路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 卡住。點擊棋盤以重置本關。`;
                // 此處不直接 resetGame，讓玩家點擊後觸發上面的 gameOver && isCompetitionActive 判斷來重置
            } else if (isCompetitionActive && timeLeft <= 0) { // 時間到了且卡住
                message = `時間耗盡且路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 挑戰失敗。`;
                stopCompetition(false);
            } else {
                message = `路徑分析：『騎士』於第 ${stepCount} 步後已無可用路徑。參賽者，本次挑戰宣告失敗。`;
            }
          }
        }
      } else if (board[r][c].visited) {
        message = `座標 (${r+1}, ${String.fromCharCode(65+c)}) 已部署或曾途經。請選擇其他節點。`;
      } else {
        message = `指令無效：『騎士』無法移動至座標 (${r+1}, ${String.fromCharCode(65+c)})。請重新規劃路徑。`;
      }
    }
    updateBoardVisuals();
  }

  // 頂層函式定義: resetGame, 增加 isCompetitionMode 參數
  function resetGame(isCompetitionModeAction: boolean = false) {
    // 如果不是競賽中的動作 (例如主動點擊重置按鈕，或非競賽模式下的棋盤大小改變)
    // 且當前是競賽模式活躍狀態，則停止競賽
    if (!isCompetitionModeAction && isCompetitionActive) {
        stopCompetition(false); // 標記為非成功結束
    }

    board = createInitialBoard(currentBoardSize);
    currentPos = null;
    moveHistory = [];
    stepCount = 0;
    gameStarted = false;
    gameOver = false; // 重置時一定不是遊戲結束狀態 (除非是競賽時間到)

    if (isCompetitionActive && isCompetitionModeAction) {
        // 競賽模式中的重置 (卡關重試 或 進入下一關)
        // message 由呼叫方設定 (handleCellClick 或 startCompetition)
    } else if (isCompetitionActive && !isCompetitionModeAction) {
        // 玩家在競賽中主動點擊了"重置挑戰"按鈕，此時應結束競賽
        message = "競賽已重置並終止。";
    } else {
        message = "棋盤已重置。等待參賽者部署『騎士』。";
    }
    updateBoardVisuals();
  }

  function getHint(size: number): string {
    if (size < 5) {
        return `🔥 ${size}x${size} 棋盤太小，無法完成完整的騎士巡迴。<br><br><b>說明：</b><br>${size}x${size} 棋盤因為格子太少，騎士怎麼走都會有格子沒辦法踩到，就像在小房間裡繞圈圈，永遠無法每個角落都走過一次。<br><br><b>數學小知識：</b><br>數學家證明，只有 1x1、5x5 以上的部分棋盤，才有可能讓騎士走遍每一格。`;
    } else if (size === 5) {
        return `🔥 <b>5x5 棋盤建議：</b><br><br>每一步都盡量走到「四周出路最少」的格子，這樣比較不會太早卡住。<br><br><b>為什麼？</b><br>想像你在迷宮裡，每次都先走快沒路的地方，這樣比較不會讓其他地方變成死路。<br><br><b>數學小知識：</b><br>5x5 棋盤只能做到「開放巡迴」，也就是最後一步沒辦法回到起點。這是因為棋盤格數是奇數，起點和終點顏色會不同，無法首尾相連。`;
    } else if (size === 6) {
        return `🔥 <b>6x6 棋盤建議：</b><br><br>同樣建議每一步都走到「出路最少」的格子，這樣比較容易走完全部。<br><br><b>說明：</b><br>這種走法叫「Warnsdorff's rule」，意思是每次都優先走快沒路的地方。<br><br><b>數學小知識：</b><br>6x6 棋盤雖然格數是偶數，但因為格子排列的關係，還是無法首尾相連（封閉巡迴），只能做到開放巡迴。`;
    } else if (size === 7) {
        return `🔥 <b>7x7 棋盤建議：</b><br><br>建議還是每一步都走到「出路最少」的格子。<br><br><b>說明：</b><br>這種策略就像先把難走的地方解決，避免後面卡住。<br><br><b>數學小知識：</b><br>7x7 棋盤因為格數是奇數，和 5x5 一樣，無法首尾相連，只能做到開放巡迴。`;
    } else if (size >= 8) {
        return `🔥 <b>${size}x${size} 棋盤建議：</b><br><br>每一步都走到「出路最少」的格子，這樣比較容易完成整個巡迴。<br><br><b>為什麼這樣走？</b><br>就像打掃房間時，會先把最難清的角落處理掉，這樣最後才不會有地方進不去。<br><br><b>數學原理：</b><br>${size}x${size} 棋盤 (例如標準的 8x8 國際象棋棋盤)，數學家證明這種棋盤通常有「封閉巡迴」——也就是你可以從某一格出發，走遍全部格子，最後回到起點。<br>這是因為 ${size}x${size} 棋盤的格數是偶數 (如果 size 是偶數)，且每格都能連到足夠多的其他格子，比較不容易卡住。<br><br><b>趣味補充：</b><br>早在 18 世紀，數學家就對這個問題很有興趣，甚至連歐拉（Euler）都曾研究過。<br>"Warnsdorff's rule"這個方法，就是用來幫助人類和電腦更容易找到一條完整的路徑。<br>如果你想挑戰自己，可以試著讓最後一步回到起點，這就是「封閉巡迴」！`;
    }
    return ""; // 預設情況
  }

  function toggleHint() {
    showHint = !showHint;
    if (showHint) {
        hintText = getHint(currentBoardSize);
    }
  }

  function startCompetition() {
    isCompetitionActive = true;
    competitionLevel = 1; // 開始第一關 (6x6)
    currentBoardSize = competitionLevels[competitionLevel - 1];
    timeLeft = 600; // 重置時間
    message = `競賽模式：第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize})。請部署騎士。`;
    if (timerInterval) clearInterval(timerInterval); // 清除可能存在的舊計時器
    resetGame(true); // 競賽模式下的重置，不改變 message
  }

  function stopCompetition(success: boolean) {
    isCompetitionActive = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = undefined;
    if (success) {
      message = "競賽完成！恭喜你通過所有關卡！";
    } else {
      if (timeLeft <= 0) {
        message = "時間到！競賽挑戰失敗。";
      } else {
        message = "競賽提前結束。"; // 或者其他適當訊息
      }
    }
    competitionLevel = 0;
    // gameOver 狀態由 resetGame 或其他地方控制
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval); // 先清除，避免重複啟動
    if (!isCompetitionActive || timeLeft <= 0) return;

    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = undefined;
        gameOver = true; // 時間到，遊戲結束
        message = `時間耗盡！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 挑戰失敗。`;
        // 可能需要一個更明確的競賽失敗狀態
        isCompetitionActive = false; // 標記競賽結束
        updateBoardVisuals(); // 更新視覺，例如按鈕狀態
      }
    }, 1000);
  }

  // 初始設定
  onMount(() => {
    updateBoardVisuals();
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval); // 組件銷毀時清除計時器
  });

  // $: console.log(currentPos, stepCount, message); // 用於調試
</script>

<!-- 暫時註解掉 SvelteUI 元件 -->
<!--
<Paper shadow="xl" p="xl" withBorder css={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)'}}>
    <Stack spacing="xl" align="center">
        <Title order={1} align="center" css={{color: '#E0E0E0', textShadow: '0 0 10px #FFD700, 0 0 20px #FFD700'}}>"騎士的密謀巡遊"</Title>
        <Text color="dimmed" align="center" css={{maxWidth: '600px', color: '#B0B0B0'}}>
            {message}
        </Text>

        <Board boardData={board} onCellClick={handleCellClick} />

        <Group position="center" spacing="lg">
            <Button
                size="lg"
                variant="gradient"
                gradient={{ from: 'rgba(100,100,100,0.8)', to: 'rgba(50,50,50,0.8)', deg: 45 }}
                onClick={() => resetGame()}
                disabled={!gameStarted && !gameOver}
                css={{ color: '#E0E0E0', border: '1px solid #FFD700' }}
            >
                重置棋局
            </Button>
        </Group>

        {#if moveHistory.length > 0}
            <Box css={{ maxHeight: '150px', overflowY: 'auto', width: '100%', padding: '0.5rem', border: '1px solid #444', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.3)'}}>
                <Text size="sm" color="dimmed" mb="xs">行動序列日誌:</Text>
                <Stack spacing="xs">
                    {#each moveHistory as [r, c, step], i (i)}
                        <Text size="xs" css={{color: '#A0A0A0'}}>
                            第 {step} 步: ({r+1}, {String.fromCharCode(65+c)})
                        </Text>
                    {/each}
                </Stack>
    </Box>
        {/if}
    </Stack>
</Paper>
-->

<!-- 最簡化的遊戲介面，用於測試核心邏輯 -->
<h1>騎士巡遊</h1>

<div class="controls">
    <label for="board-size-select">選擇棋盤大小 (N x N): </label>
    <select id="board-size-select" bind:value={currentBoardSize} on:change={(event) => changeBoardSize(parseInt((event.target as HTMLSelectElement).value))} disabled={isCompetitionActive}>
        {#each boardSizes as size}
            <option value={size}>{size} x {size}</option>
        {/each}
    </select>
    <button on:click={toggleHint} style="margin-left: 10px;" disabled={isCompetitionActive}>
        {showHint ? '隱藏提示' : '顯示提示'}
    </button>
    <button on:click={startCompetition} disabled={isCompetitionActive} style="margin-left: 10px; background-color: #28a745; color: white;">
        開始競賽模式
    </button>
    {#if isCompetitionActive}
        <button on:click={() => stopCompetition(false)} style="margin-left: 10px; background-color: #dc3545; color: white;">
            結束競賽
        </button>
    {/if}
</div>

{#if isCompetitionActive}
    <div class="competition-status">
        <p>競賽模式進行中 - 第 {competitionLevel} 關 ({currentBoardSize}x{currentBoardSize})</p>
        <p>剩餘時間：{Math.floor(timeLeft / 60)} 分 {timeLeft % 60} 秒</p>
    </div>
{/if}

<p>{message}</p>

{#if showHint}
    <div class="hint-box">
        {@html hintText}
    </div>
{/if}

<Board boardData={board} onCellClick={handleCellClick} />

<button on:click={() => resetGame()} disabled={!gameStarted && !gameOver}>
    重置挑戰
</button>

{#if moveHistory.length > 0}
    <div>
        <h3>行動序列日誌:</h3>
        <ul>
            {#each moveHistory as [r, c, step], i (i)}
                <li>第 {step} 步: 部署於 ({r+1}, {String.fromCharCode(65+c)})</li>
            {/each}
        </ul>
    </div>
{/if}

    <style>
    :global(body) {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background-color: #1a1a1a;
        color: #e0e0e0;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        padding-top: 2rem;
    }
    h1 {
        color: #FFD700; /* 金色，呼應主題 */
        text-shadow: 0 0 8px #000;
        margin-bottom: 1rem;
    }
    p {
        min-height: 2em; /* 給予訊息區域足夠空間 */
        margin-bottom: 1.5rem;
        font-size: 1.1em;
        color: #c0c0c0;
        text-align: center;
        max-width: 600px;
    }
    button {
        background-color: #333;
        color: #FFD700;
        border: 1px solid #FFD700;
        padding: 10px 20px;
        font-size: 1em;
        cursor: pointer;
        transition: background-color 0.3s, box-shadow 0.3s;
        border-radius: 4px;
        margin-top: 1rem;
        box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    }
    button:hover:not(:disabled) {
        background-color: #444;
        box-shadow: 0 0 8px #FFD700;
    }
    button:disabled {
        border-color: #555;
        color: #555;
        cursor: not-allowed;
        background-color: #222;
    }
    div > h3 {
        color: #FFD700;
        margin-top: 1.5rem;
        text-align: center;
    }
    ul {
        list-style-type: none;
        padding: 0.5rem 1rem;
        max-height: 200px; /* 增加日誌最大高度 */
        overflow-y: auto;
        border: 1px solid #444; /* 深色邊框 */
        border-radius: 4px;
        margin-top: 0.5rem;
        background-color: rgba(0,0,0,0.2); /* 半透明背景 */
        min-width: 300px; /* 最小寬度 */
        text-align: center;
    }
    li {
        font-size: 0.9em;
        color: #b0b0b0; /* 柔和的文字顏色 */
        padding: 4px 0;
        border-bottom: 1px dashed #333; /* 分隔線 */
    }
    li:last-child {
        border-bottom: none;
    }

    /* 美化捲軸 (Webkit browsers) */
    ul::-webkit-scrollbar {
        width: 8px;
    }
    ul::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 4px;
    }
    ul::-webkit-scrollbar-thumb {
        background-color: #555;
        border-radius: 4px;
        border: 2px solid #2a2a2a;
    }
    ul::-webkit-scrollbar-thumb:hover {
        background-color: #777;
    }
    .controls {
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    label {
        font-size: 1em;
    }
    select {
        padding: 8px 12px;
        font-size: 1em;
        border-radius: 4px;
        border: 1px solid #555;
        background-color: #333;
        color: #e0e0e0;
    }
    .hint-box {
        background: #22242a;
        color: #f5f6fa;
        border-radius: 12px;
        padding: 18px 20px;
        max-width: 600px;
        font-size: 0.9em; /* 稍微調整字體大小以適應排版 */
        box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        line-height: 1.7;
        word-break: break-word;
        margin-bottom: 1rem;
        text-align: left; /* 提示文字靠左對齊 */
    }
    .hint-box b {
        color: #ffd600; /* 提示中的粗體也用金色 */
    }
    .competition-status {
        border: 1px solid #FFD700;
        padding: 10px;
        margin-bottom: 1rem;
        border-radius: 8px;
        background-color: rgba(255, 215, 0, 0.1);
        color: #FFD700;
        text-align: center;
    }
    .competition-status p {
        margin: 5px 0;
        color: #FFD700; /* 確保文字顏色也是金色 */
    }
    </style>
