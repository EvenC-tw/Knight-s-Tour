<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, scale } from 'svelte/transition'; // 引入 fly 和 scale transitions
  // import { Box, Button, Center, Stack, Title, Text, Group, Paper } from '@svelteuidev/core'; // 暫時註解
  import Board from '$lib/components/Board.svelte';
  import { createInitialBoard, getValidMoves, type BoardData, type CellState } from '$lib/knightLogic.js';

  // 棋盤大小選項
  const boardSizes = [5, 6, 7, 8, 9, 10];
  let currentBoardSize: number = 6; // 預設棋盤大小

  // 頂層變數宣告
  let board: BoardData = createInitialBoard(currentBoardSize);
  let currentPos: [number, number] | null = null; // [r, c]
  let moveHistory: Array<[number, number, number]> = []; // 存放移動歷史 [[r,c, step], ...]
  let stepCount = 0;
  let gameStarted = false;
  let gameOver = false;
  let message = '棋盤已啟動。參賽者，請指定你的『騎士』初始位置。';
  let showHint = false;
  
  // 定義提示內容的結構型別
  type ContentBlock =
    | { type: 'heading'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'bold-paragraph'; text: string }
    | { type: 'list'; items: string[] };

  let hintBlocks: ContentBlock[] = []; // 修改 hintText 為 hintBlocks，型別為 ContentBlock[]

  let isCompetitionActive = false;
  let competitionLevel = 0; // 0: 未開始, 1: 6x6, 2: 7x7, 3: 8x8
  let timeLeft = 600; // 10 分鐘，單位：秒
  let timerInterval: number | undefined = undefined;

  let showMenu = false; // For dropdown menu
  let menuButtonElement: HTMLButtonElement;
  let dropdownMenuElement: HTMLDivElement;

  const competitionLevels = [6, 7, 8]; // 挑戰模式的棋盤大小

  // 更新棋盤大小並重置遊戲
  function changeBoardSize(newSize: number) {
    currentBoardSize = newSize;
    resetGame(false); // 傳入 false 表示非挑戰模式下的重置
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
    if (gameOver && !isCompetitionActive) return; // 非遊戲時，遊戲結束則返回
    if (gameOver && isCompetitionActive && timeLeft > 0) {
      // 遊戲中卡關但時間未到
      // 允許重置當前關卡，但不影響計時器
      message = `路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 失敗。棋盤已重置，請重新嘗試。`;
      resetGame(true); // 挑戰模式重置
      return;
    }
    if (gameOver && isCompetitionActive && timeLeft <= 0) return; // 時間到且卡關，不處理點擊

    if (!gameStarted) {
      currentPos = [r, c];
      stepCount = 1;
      board[r][c].visited = true;
      board[r][c].step = stepCount;
      moveHistory.push([r, c, stepCount]);
      gameStarted = true;
      if (isCompetitionActive && competitionLevel > 0 && !timerInterval && timeLeft > 0) {
        startTimer(); // 挑戰模式下，第一步後啟動計時器
        message = `遊戲開始！第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize})，請繼續移動騎士`;
      } else if (!isCompetitionActive) {
        message = '『騎士』已配置。參賽者，請開始移動騎士。';
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
          message = `序列第 ${stepCount} 步：『騎士』抵達座標 (${r + 1}, ${String.fromCharCode(65 + c)})。`;
        } else {
          message = `遊戲第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) - 第 ${stepCount} 步。`;
        }

        if (stepCount === currentBoardSize * currentBoardSize) {
          if (isCompetitionActive) {
            if (competitionLevel < competitionLevels.length) {
              competitionLevel++;
              currentBoardSize = competitionLevels[competitionLevel - 1];
              message = `恭喜完成第 ${competitionLevel - 1} 關！準備挑戰第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize})。`;
              resetGame(true); // 重置到下一關
            } else {
              // 完成所有遊戲關卡
              gameOver = true;
              stopCompetition(true); // 傳true表示成功完成遊戲
            }
          } else {
            gameOver = true;
            message = '演算完成。參賽者，你的『騎士』已成功遍歷棋盤所有節點。挑戰通過。';
          }
        } else {
          const nextPossibleMoves = getValidMoves(r, c, currentBoardSize);
          const canMoveFurther = nextPossibleMoves.some(([nr, nc]) => !board[nr][nc].visited);
          if (!canMoveFurther) {
            gameOver = true; // 標記卡住，但不一定是遊戲失敗
            if (isCompetitionActive && timeLeft > 0) {
              message = `路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 卡住。點擊棋盤以重置本關。`;
            } else if (isCompetitionActive && timeLeft <= 0) {
              // 時間到了且卡住
              message = `時間耗盡且路徑中斷！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 挑戰失敗。`;
              stopCompetition(false);
            } else {
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

  function resetGame(isCompetitionModeAction: boolean = false) {
    if (!isCompetitionModeAction && isCompetitionActive) {
      stopCompetition(false);
    }
    board = createInitialBoard(currentBoardSize);
    currentPos = null;
    moveHistory = [];
    stepCount = 0;
    gameStarted = false;
    gameOver = false;
    if (isCompetitionActive && isCompetitionModeAction) {
      // message is set by caller
    } else if (isCompetitionActive && !isCompetitionModeAction) {
      message = '遊戲已重置並終止。';
    } else {
      message = '棋盤已重置。等待參賽者部署『騎士』。';
    }
    updateBoardVisuals();
  }

  function getHint(size: number): ContentBlock[] {
    if (size === 5) {
      return [
        { type: 'heading', text: '🔥 <b>5x5 棋盤建議：</b>' },
        { type: 'paragraph', text: '每一步都盡量走到「四周出路最少」的格子，這樣比較不會太早卡住。' },
        { type: 'bold-paragraph', text: '為什麼？'},
        { type: 'paragraph', text: '想像你在迷宮裡，每次都先走快沒路的地方，這樣比較不會讓其他地方變成死路。'},
        { type: 'bold-paragraph', text: '數學小知識：'},
        { type: 'paragraph', text: '5x5 棋盤只能做到「開放巡迴」，也就是最後一步沒辦法回到起點。這是因為棋盤格數是奇數，起點和終點顏色會不同，無法首尾相連。'}
      ];
    } else if (size === 6) {
      return [
        { type: 'heading', text: '🔥 <b>6x6 棋盤建議：</b>' },
        { type: 'paragraph', text: '同樣建議每一步都走到「出路最少」的格子，這樣比較容易走完全部。' },
        { type: 'bold-paragraph', text: '說明：'},
        { type: 'paragraph', text: `這種走法叫「Warnsdorff's rule」，意思是每次都優先走快沒路的地方。`},
        { type: 'bold-paragraph', text: '數學小知識：'},
        { type: 'paragraph', text: '6x6 棋盤雖然格數是偶數，但因為格子排列的關係，還是無法首尾相連（封閉巡迴），只能做到開放巡迴。'}
      ];
    } else if (size === 7) {
      return [
        { type: 'heading', text: '🔥 <b>7x7 棋盤建議：</b>' },
        { type: 'paragraph', text: '建議還是每一步都走到「出路最少」的格子。' },
        { type: 'bold-paragraph', text: '說明：'},
        { type: 'paragraph', text: '這種策略就像先把難走的地方解決，避免後面卡住。'},
        { type: 'bold-paragraph', text: '數學小知識：'},
        { type: 'paragraph', text: '7x7 棋盤因為格數是奇數，和 5x5 一樣，無法首尾相連，只能做到開放巡迴。'}
      ];
    } else if (size >= 8) {
      return [
        { type: 'heading', text: `🔥 <b>${size}x${size} 棋盤建議：</b>` },
        { type: 'paragraph', text: '每一步都走到「出路最少」的格子，這樣比較容易完成整個巡迴。' },
        { type: 'bold-paragraph', text: '為什麼這樣走？' },
        { type: 'paragraph', text: '就像打掃房間時，會先把最難清的角落處理掉，這樣最後才不會有地方進不去。' },
        { type: 'bold-paragraph', text: '數學原理：' },
        { type: 'list', items: [
            `${size}x${size} 棋盤 (例如標準的 8x8 國際象棋棋盤)，數學家證明這種棋盤通常有「封閉巡迴」——也就是你可以從某一格出發，走遍全部格子，最後回到起點。`,
            `這是因為 ${size}x${size} 棋盤的格數是偶數 (如果 size 是偶數)，且每格都能連到足夠多的其他格子，比較不容易卡住。`
        ]},
        { type: 'bold-paragraph', text: '趣味補充：' },
        { type: 'list', items: [
            "早在 18 世紀，數學家就對這個問題很有興趣，甚至連歐拉（Euler）都曾研究過。",
            `"Warnsdorff's rule"這個方法，就是用來幫助人類和電腦更容易找到一條完整的路徑。`,
            "如果你想挑戰自己，可以試著讓最後一步回到起點，這就是「封閉巡迴」！"
        ]}
      ];
    }
    return [];
  }

  function toggleHint() {
    showHint = !showHint;
    if (showHint) {
      hintBlocks = getHint(currentBoardSize); // 修改這裡
    }
  }

  function closeHintOnOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      showHint = false;
    }
  }

  function startCompetition() {
    isCompetitionActive = true;
    competitionLevel = 1;
    currentBoardSize = competitionLevels[competitionLevel - 1];
    timeLeft = 600;
    message = `挑戰模式：第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize})。`;
    if (timerInterval) clearInterval(timerInterval);
    resetGame(true);
  }

  function stopCompetition(success: boolean) {
    isCompetitionActive = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = undefined;
    if (success) {
      message = '遊戲完成！恭喜你通過所有關卡！';
    } else {
      if (timeLeft <= 0) {
        message = '時間到！遊戲挑戰失敗。';
      } else {
        message = '遊戲提前結束。';
      }
    }
    competitionLevel = 0;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (!isCompetitionActive || timeLeft <= 0) return;

    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = undefined;
        gameOver = true;
        message = `時間耗盡！『騎士』於第 ${competitionLevel} 關 (${currentBoardSize}x${currentBoardSize}) 挑戰失敗。`;
        isCompetitionActive = false;
        updateBoardVisuals();
      }
    }, 1000);
  }

  function toggleHintAndMenu() {
    toggleHint();
    showMenu = false; // Close main menu when hint is toggled
  }

  function startCompetitionAndMenu() {
    startCompetition();
    showMenu = false;
  }

  function stopCompetitionAndMenu(success: boolean) {
    stopCompetition(success);
    showMenu = false;
  }
  function resetGameAndMenu(isCompetitionModeAction: boolean = false) {
    resetGame(isCompetitionModeAction);
    showMenu = false;
  }

  function changeBoardSizeAndMenu(newSize: number) {
    changeBoardSize(newSize);
  }

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function handleClickOutsideMenu(event: MouseEvent) {
    if (
      dropdownMenuElement &&
      !dropdownMenuElement.contains(event.target as Node) &&
      menuButtonElement &&
      !menuButtonElement.contains(event.target as Node)
    ) {
      showMenu = false;
    }
  }

  onMount(() => {
    updateBoardVisuals();
    document.addEventListener('click', handleClickOutsideMenu, true);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
    document.removeEventListener('click', handleClickOutsideMenu, true);
  });
</script>

<!-- HTML Markup -->
<div class="title-bar">
  <h1>騎士巡遊</h1>
  <div class="menu-container">
    <button
      class="menu-toggle-button"
      on:click={toggleMenu}
      aria-expanded={showMenu}
      aria-controls="game-menu"
      aria-label="選單"
      bind:this={menuButtonElement}
    >
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
    {#if showMenu}
      <div
        class="dropdown-menu"
        id="game-menu"
        role="menu"
        in:scale={{ duration: 200, start: 0.95, opacity: 0.8, delay: 50 }}
        out:scale={{ duration: 150, start: 1, opacity: 0 }}
        bind:this={dropdownMenuElement}
      >
        <button role="menuitem" on:click={toggleHintAndMenu} disabled={isCompetitionActive}>
          {showHint ? '隱藏提示' : '顯示提示'}
        </button>

        <div class="menu-item-group">
          <label for="board-size-select-menu">棋盤大小:</label>
          <select
            id="board-size-select-menu"
            bind:value={currentBoardSize}
            on:change={(event) => changeBoardSizeAndMenu(parseInt((event.target as HTMLSelectElement).value))}
            disabled={isCompetitionActive}
            class="dropdown-select"
          >
            {#each boardSizes as size}
              <option value={size}>{size} x {size}</option>
            {/each}
          </select>
        </div>

        <button role="menuitem" on:click={startCompetitionAndMenu} disabled={isCompetitionActive}>
          開始挑戰模式
        </button>
        {#if isCompetitionActive}
          <button role="menuitem" on:click={() => stopCompetitionAndMenu(false)}> 結束遊戲 </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<div class="controls">
  <!-- Removed label and select for board size from here -->

  <!-- Main Reset Button - Kept outside menu -->
  <button
    class="reset-board-button main-action-button"
    on:click={() => resetGame()}
    disabled={!gameStarted && !gameOver}
  >
    重置棋盤
  </button>

  <!-- Removed menu container from here -->
</div>

{#if isCompetitionActive}
  <div class="competition-status">
    <p>挑戰模式進行中 - 第 {competitionLevel} 關 ({currentBoardSize}x{currentBoardSize})</p>
    <p>剩餘時間：{Math.floor(timeLeft / 60)} 分 {timeLeft % 60} 秒</p>
  </div>
{/if}

<p>{message}</p>

<!-- New Hint Modal -->
{#if showHint}
  <div class="hint-modal-overlay" on:click={closeHintOnOverlayClick} role="presentation">
    <div
      class="hint-modal-content scroll-style"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hint-title"
      in:scale={{ duration: 600, start: 0.5, opacity: 0, delay: 100 }}
      out:scale={{ duration: 500, start: 1, opacity: 0 }}
    >
      <button class="close-hint-button" on:click={toggleHint} aria-label="關閉提示">×</button>
      <h2 id="hint-title" class="modal-title">智者的建言</h2>
      <div class="scroll-text-content">
        {#each hintBlocks as block}
          {#if block.type === 'heading'}
            <h4 style="margin-top: 0.8em; margin-bottom: 0.5em;">{@html block.text}</h4>
          {:else if block.type === 'paragraph'}
            <p style="margin-top: 0.5em; margin-bottom: 0.5em;">{@html block.text}</p>
          {:else if block.type === 'bold-paragraph'}
            <p style="margin-top: 0.8em; margin-bottom: 0.3em;"><b>{@html block.text}</b></p>
          {:else if block.type === 'list'}
            <ul style="margin-top: 0.3em; margin-bottom: 0.8em; padding-left: 20px; list-style-type: disc;">
              {#each block.items as item}
                <li style="margin-bottom: 0.2em;">{@html item}</li>
              {/each}
            </ul>
          {/if}
        {/each}
      </div>
    </div>
  </div>
{/if}

<Board boardData={board} onCellClick={handleCellClick} />

{#if moveHistory.length > 0}
  <div>
    <h3>行動序列日誌:</h3>
    <ul>
      {#each moveHistory as [r, c, step], i (i)}
        <li>第 {step} 步: 部署於 ({r + 1}, {String.fromCharCode(65 + c)})</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  :global(body) {
    font-family: 'Georgia', 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif;
    background-color: #120e1c;
    color: #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    margin: 0;
    padding-top: 2rem;
    overflow: hidden; /* Lock screen scrolling */
  }
  p {
    min-height: 2em;
    margin-bottom: 1.5rem;
    font-size: 1.1em;
    color: #d0d0d0;
    text-align: center;
    max-width: 600px;
    line-height: 1.6;
  }

  button {
    background-color: #3b2f5a;
    color: #ffd700;
    border: 1px solid #8b7500;
    padding: 10px 20px;
    font-size: 1em;
    font-family: 'Georgia', sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.2s,
      box-shadow 0.2s,
      border-color 0.2s,
      color 0.2s;
    border-radius: 5px;
    margin-top: 1rem;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.4),
      inset 0 1px 1px rgba(255, 223, 102, 0.05);
  }
  button:hover:not(:disabled) {
    background-color: #4f3d73;
    color: #fff;
    border-color: #ffd700;
    box-shadow:
      0 0 10px #ffd700,
      0 3px 6px rgba(0, 0, 0, 0.6);
  }
  button:disabled {
    background-color: #2a223d;
    color: #666;
    border-color: #444;
    cursor: not-allowed;
    box-shadow: none;
  }

  div > h3 {
    color: #ffd700;
    margin-top: 1.5rem;
    text-align: center;
    font-family: 'Georgia', sans-serif;
    font-weight: 600;
  }
  ul {
    list-style-type: none;
    padding: 0.8rem 1.2rem;
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid #3b2f5a;
    border-radius: 6px;
    margin-top: 0.5rem;
    background-color: rgba(18, 12, 28, 0.7);
    min-width: 300px;
    text-align: center;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  }
  li {
    font-size: 0.9em;
    color: #b0b0b0;
    padding: 5px 0;
    border-bottom: 1px solid #302048;
  }
  li:last-child {
    border-bottom: none;
  }

  ul::-webkit-scrollbar {
    width: 8px;
  }
  ul::-webkit-scrollbar-track {
    background: rgba(18, 12, 28, 0.5);
    border-radius: 4px;
  }
  ul::-webkit-scrollbar-thumb {
    background-color: #4f3d73;
    border-radius: 4px;
    border: 2px solid rgba(18, 12, 28, 0.5);
  }
  ul::-webkit-scrollbar-thumb:hover {
    background-color: #6a5299;
  }

  .controls {
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  label {
    font-size: 1em;
    font-family: 'Georgia', sans-serif;
    font-weight: 500;
  }
  select {
    padding: 9px 14px;
    font-size: 0.95em;
    font-family: 'Georgia', sans-serif;
    border-radius: 5px;
    border: 1px solid #8b7500;
    background-color: #201533;
    color: #ffd700;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }
  select:hover {
    border-color: #ffd700;
  }

  .main-action-button {
    /* Specific styles if needed to differentiate from menu buttons, or keep consistent */
    /* For now, it inherits general button styles */
  }

  .menu-container {
    position: absolute; /* Changed for absolute positioning */
    top: 50%;
    right: 15px; /* Default right padding */
    transform: translateY(-50%);
    /* display: inline-block; /* Removed */
    z-index: 101; /* Ensure it's above title if text is too long */
  }

  .menu-toggle-button {
    padding: 6px; /* Adjusted padding */
    font-size: 1em; /* Adjusted font size if necessary for icon scaling */
    line-height: 1;
    border: none;
    background-color: transparent;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    width: 30px; /* Reduced width */
    height: 24px; /* Reduced height */
    color: #ffd700;
  }

  .hamburger-line {
    display: block;
    width: 100%;
    height: 2px; /* Reduced thickness */
    background-color: currentColor;
    border-radius: 1px;
    transition:
      transform 0.3s ease-in-out,
      opacity 0.3s ease-in-out;
  }

  .menu-toggle-button[aria-expanded='true'] .hamburger-line:nth-child(1) {
    transform: translateY(4px) rotate(45deg); /* Adjusted for new height */
  }
  .menu-toggle-button[aria-expanded='true'] .hamburger-line:nth-child(2) {
    opacity: 0;
  }
  .menu-toggle-button[aria-expanded='true'] .hamburger-line:nth-child(3) {
    transform: translateY(-4px) rotate(-45deg); /* Adjusted for new height */
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 5px); /* Position below the toggle button */
    right: 0; /* Align to the right of the toggle button */
    background-color: #201533; /* Dark purple menu background */
    border: 1px solid #8b7500; /* Gold border */
    border-radius: 5px;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 0 0 1px #3b2f5a; /* Deeper shadow, inner accent */
    z-index: 100; /* Ensure menu is on top */
    min-width: 180px; /* Minimum width for menu items */
    padding: 8px; /* Padding inside the menu */
    display: flex;
    flex-direction: column;
    gap: 5px; /* Gap between menu items */
    transform-origin: top right; /* Animation origin */
  }

  .dropdown-menu .menu-item-group {
    padding: 5px 0;
    border-top: 1px solid #3b2f5a; /* Separator */
    border-bottom: 1px solid #3b2f5a; /* Separator */
    margin: 5px 0;
  }

  .dropdown-menu label {
    display: block;
    color: #ffd700; /* Gold label */
    font-size: 0.9em;
    margin-bottom: 4px;
    padding: 0 15px; /* Match button padding */
    font-weight: 500;
  }

  .dropdown-menu .dropdown-select {
    width: calc(100% - 30px); /* Full width minus padding */
    margin: 0 15px; /* Align with button text */
    padding: 8px 10px;
    font-size: 0.9em;
    font-family: 'Georgia', sans-serif;
    border-radius: 3px;
    border: 1px solid #8b7500;
    background-color: #120e1c; /* Match page background or slightly lighter */
    color: #ffd700;
    box-sizing: border-box;
  }

  .dropdown-menu button {
    display: block;
    width: 100%;
    text-align: left; /* Align text to the left */
    padding: 10px 15px; /* Consistent padding for menu items */
    margin-top: 0; /* Reset margin from general button style */
    /* Ensure hover/disabled styles are consistent or specifically styled for menu */
  }
  .dropdown-menu button:hover:not(:disabled) {
    background-color: #3b2f5a;
  }

  .title-bar {
    display: flex;
    justify-content: center; /* Horizontally center the h1 */
    align-items: center; /* Vertically center the h1 */
    position: relative; /* For positioning menu-container absolutely within title-bar */
    width: 100%;
    max-width: 800px;
    margin-bottom: 1.5rem;
    padding: 0 10px; /* Keep side padding for overall alignment */
    box-sizing: border-box;
  }

  .title-bar h1 {
    font-family: 'Cinzel Decorative', Georgia, 'Times New Roman', 'Kaiti SC', 'STKaiti', 'SimSun', serif;
    font-weight: 700;
    font-size: 2.8em;
    color: #ffd700;
    text-shadow:
      0 0 5px #ffd700,
      0 0 10px #000,
      0 0 15px #000;
    letter-spacing: 1px;
    margin: 0; /* Ensure no extra margins affecting flex centering */
    text-align: center; /* Ensure text is centered */
    flex-grow: 1; /* Removed to simplify centering with absolute menu */
    padding-right: 50px;
    padding-left: 50px;
    box-sizing: border-box;
  }

  .main-action-button {
    /* Specific styles if needed to differentiate from menu buttons, or keep consistent */
    /* For now, it inherits general button styles */
  }

  .competition-status {
    border: 1px solid #ffd700;
    padding: 12px 15px;
    margin-bottom: 1.5rem;
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(60, 30, 90, 0.4), rgba(30, 15, 50, 0.6));
    color: #ffd700;
    text-align: center;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
  }
  .competition-status p {
    margin: 6px 0;
    color: #fff;
    font-weight: 500;
    text-shadow: 0 0 3px #000;
  }
  .competition-status p:first-child {
    color: #ffd700;
    font-weight: bold;
  }

  /* Hint Modal Styles */
  .hint-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8); /* Darker overlay */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(3px); /* Frosted glass effect for background */
  }

  .hint-modal-content {
    background-color: #f5e8c8;
    color: #4b341b;
    padding: 20px; /* Base padding */
    border-radius: 8px; /* Slightly more rounded for a softer retro feel */
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.6),
      0 0 0 8px #604028,
      0 0 0 12px #b08d57; /* Darker wood, softer gold */
    position: relative;
    max-width: 700px; /* Max width for larger screens */
    width: 90vw; /* Responsive width */
    max-height: 70vh; /* Adjusted max-height */
    display: flex;
    flex-direction: column;
    transform-origin: center center; /* For scale animation */
  }

  /* Scroll-like top/bottom "caps" using pseudo-elements */
  .hint-modal-content::before,
  .hint-modal-content::after {
    content: '';
    position: absolute;
    left: 12px; /* Adjusted inset */
    right: 12px; /* Adjusted inset */
    height: 30px; /* Slightly thicker roll */
    background: linear-gradient(to right, #a07d50, #c09d70, #a07d50); /* Wood grain effect */
    border: 2px solid #4a3b2a; /* Darker wood border */
    border-left-width: 3px;
    border-right-width: 3px;
    box-shadow:
      inset 0 0 6px rgba(0, 0, 0, 0.3),
      0 1px 2px rgba(0, 0, 0, 0.2); /* More depth */
    z-index: 1;
    border-radius: 4px; /* Rounded ends for the rolls */
  }

  .hint-modal-content::before {
    top: 12px; /* Adjusted position */
    border-bottom: 1px solid #705030; /* Shadow line */
    border-radius: 6px 6px 0 0; /* Match main border radius for roll ends */
  }

  .hint-modal-content::after {
    bottom: 12px; /* Adjusted position */
    border-top: 1px solid #705030; /* Shadow line */
    border-radius: 0 0 6px 6px; /* Match main border radius for roll ends */
  }

  .close-hint-button {
    position: absolute;
    top: 0px; /* Further adjustment down */
    right: 35px; /* Further adjustment right */
    background: none;
    border: none;
    font-size: 2.2em; /* Slightly larger for better visibility */
    font-family: 'Times New Roman', Times, serif;
    color: #705030; /* Dark wood/bronze color */
    cursor: pointer;
    padding: 0;
    line-height: 1;
    font-weight: bold;
    text-shadow: 0 0 2px rgba(245, 232, 200, 0.5); /* Subtle parchment glow */
    box-shadow: none;
    margin-top: 0;
    z-index: 3;
    transition:
      color 0.2s,
      text-shadow 0.2s;
  }
  .close-hint-button:hover {
    color: #b08d57; /* Gold on hover */
    text-shadow: 0 0 5px #b08d57;
    background: none;
    box-shadow: none;
  }

  .modal-title {
    font-family: 'Cinzel Decorative', serif;
    color: #4b341b;
    text-align: center;
    font-size: 1.6em;
    margin-top: 35px; /* Increased space for thicker top roll */
    margin-bottom: 20px; /* Increased space */
    padding-left: 30px;
    padding-right: 30px;
    z-index: 2;
    position: relative;
  }

  .scroll-text-content {
    overflow-y: auto;
    padding: 10px 25px; /* Adjusted padding */
    margin-top: 5px;
    margin-bottom: 35px; /* Increased space for thicker bottom roll */
    font-family: Georgia, serif; /* 改為 Georgia 字體 */
    font-size: 1em;
    line-height: 1.7;
    flex-grow: 1;
    position: relative;
    z-index: 2;
    background-color: transparent; /* Make transparent to see modal bg if needed or set to main parchment */
    border-radius: 3px;
  }

  .scroll-text-content::-webkit-scrollbar {
    width: 14px; /* Slightly wider scrollbar */
  }
  .scroll-text-content::-webkit-scrollbar-track {
    background: #d8c8a8; /* Aged parchment/light wood track */
    border-radius: 7px;
    border: 1px solid #b09d80;
    margin: 5px 0;
  }
  .scroll-text-content::-webkit-scrollbar-thumb {
    background-color: #8b7500; /* Gold/Brass color */
    border-radius: 7px;
    border: 2px solid #604028; /* Dark wood border for thumb */
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.3);
  }
  .scroll-text-content::-webkit-scrollbar-thumb:hover {
    background-color: #af9500; /* Brighter gold on hover */
    border-color: #4a3b2a;
  }

  /* 強制設定提示框內文字顏色以確保可讀性 */
  .scroll-text-content h4,
  .scroll-text-content p,
  .scroll-text-content li {
    color: #4b341b; /* 深棕色，確保在淺色提示背景上的可讀性 */
  }
  /* 修正列表項目符號顏色 (如果需要) */
  .scroll-text-content ul {
    /* 如果項目符號顏色也需要調整，可以考慮 color 屬性是否影響，或使用 ::marker */
    /* 但通常 li 的 color 屬性會影響其項目符號 */
  }

  /* RWD Styles */
  @media (max-width: 768px) {
    :global(body) {
      padding-top: 1.5rem;
    }

    /* h1 styles are now controlled by .title-bar h1 */

    .title-bar h1 {
      font-size: 2.2em;
      padding-right: 45px; /* Adjust padding for RWD */
      padding-left: 45px; /* Adjust padding for RWD */
    }

    p {
      font-size: 1em;
      max-width: 90%;
    }

    .controls {
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      width: 90%;
    }

    button {
      padding: 12px 18px;
      font-size: 0.9em;
    }

    .controls button,
    .reset-board-button {
      /* .menu-toggle-button is NOT full width */
      width: 100%;
      max-width: 300px;
      box-sizing: border-box;
    }

    .menu-container {
      /* width: 100%; */ /* Removed: menu-container is absolutely positioned and small */
      /* max-width: 300px; */ /* Removed */
      right: 10px; /* Adjusted position for 768px */
    }

    select {
      padding: 10px 12px;
      font-size: 0.9em;
    }

    ul {
      min-width: auto;
      width: 90%;
      max-width: 340px;
      box-sizing: border-box;
    }

    /* .hint-box RWD is removed, modal has its own */
    .competition-status {
      width: 90%;
      box-sizing: border-box;
      padding: 10px;
    }

    /* Modal RWD */
    .hint-modal-content {
      max-width: 90vw;
      width: 90vw;
      padding: 15px;
      max-height: 70vh;
      box-shadow:
        0 8px 20px rgba(0, 0, 0, 0.5),
        0 0 0 6px #604028,
        0 0 0 10px #b08d57; /* Adjusted borders */
      border-radius: 6px;
    }
    .hint-modal-content::before,
    .hint-modal-content::after {
      height: 25px;
      left: 8px;
      right: 8px;
      border-radius: 4px; /* Roll ends on RWD */
    }
    .hint-modal-content::before {
      top: 8px;
      border-radius: 4px 4px 0 0;
      border-bottom: 1px solid #705030;
    }
    .hint-modal-content::after {
      bottom: 8px;
      border-radius: 0 0 4px 4px;
      border-top: 1px solid #705030;
    }

    .close-hint-button {
      font-size: 2em;
      top: 25px; /* RWD adjustment */
      right: 28px; /* RWD adjustment */
    }
    .modal-title {
      font-size: 1.4em;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .scroll-text-content {
      font-size: 0.95em;
      margin-bottom: 30px;
      padding: 8px 15px;
    }
  }

  @media (max-width: 480px) {
    :global(body) {
      padding-top: 1rem;
    }
    /* h1 styles are now controlled by .title-bar h1 */

    .title-bar h1 {
      font-size: 2em;
      letter-spacing: 0.5px;
      padding-right: 40px; /* Adjust padding for RWD */
      padding-left: 40px; /* Adjust padding for RWD */
    }

    p {
      font-size: 0.95em;
      margin-bottom: 1rem;
    }

    .controls {
      gap: 0.8rem;
    }

    .controls button,
    .reset-board-button {
      font-size: 0.9em;
      background-color: #201533;
      color: #ffd700;
      border: 1px solid #8b7500;
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.6),
        inset 0 1px 0px rgba(255, 223, 102, 0.1);
      transition:
        background-color 0.2s ease-in-out,
        box-shadow 0.2s ease-in-out,
        color 0.2s ease-in-out,
        border-color 0.2s ease-in-out;
    }

    .controls button:hover:not(:disabled),
    .reset-board-button:hover:not(:disabled) {
      background-color: #3b2f5a;
      color: #ffffff;
      border-color: #ffd700;
      box-shadow:
        0 0 8px #ffd700,
        0 2px 5px rgba(0, 0, 0, 0.7);
    }

    .controls button:disabled,
    .reset-board-button:disabled {
      background-color: #1a1229;
      color: #504070;
      border-color: #302048;
      box-shadow: none;
    }

    .competition-status {
      padding: 10px;
      font-size: 0.85em;
    }
    .competition-status p {
      line-height: 1.4;
    }

    /* Modal RWD for very small screens */
    .hint-modal-content {
      padding: 10px;
      max-height: 70vh;
      box-shadow:
        0 5px 15px rgba(0, 0, 0, 0.4),
        0 0 0 4px #604028,
        0 0 0 8px #b08d57; /* Further adjusted borders */
      border-radius: 5px;
    }
    .hint-modal-content::before,
    .hint-modal-content::after {
      height: 22px;
      left: 6px;
      right: 6px;
      border-radius: 3px; /* Roll ends on small RWD */
    }
    .hint-modal-content::before {
      top: 6px;
      border-radius: 3px 3px 0 0;
      border-bottom: 1px solid #705030;
    }
    .hint-modal-content::after {
      bottom: 6px;
      border-radius: 0 0 3px 3px;
      border-top: 1px solid #705030;
    }

    .close-hint-button {
      font-size: 1.8em;
      top: 20px; /* Small RWD adjustment */
      right: 22px; /* Small RWD adjustment */
    }
    .modal-title {
      font-size: 1.2em;
      margin-top: 25px; /* Adjusted for smaller roll */
    }
    .scroll-text-content {
      font-size: 0.9em;
      margin-bottom: 25px; /* Adjusted for smaller roll */
      padding: 5px 10px;
    }

    .menu-container {
      right: 5px; /* Adjusted position for 480px */
    }
  }
</style>
