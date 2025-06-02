<script lang="ts">
  import { onMount, beforeUpdate, afterUpdate } from 'svelte';
  import { spring } from 'svelte/motion';

  export let boardData: any[][]; // 棋盤的二維陣列數據
  export let onCellClick: (r: number, c: number) => void; // 點擊儲存格的回調函式

  let currentKnightRow: number = -1;
  let currentKnightCol: number = -1;
  let prevKnightRow: number = -1;
  let prevKnightCol: number = -1;

  let knightVisible = false;

  // Spring store for knight's position (x, y in pixels) and opacity
  const knightStyle = spring(
    { x: 0, y: 0, opacity: 0 },
    {
      stiffness: 0.02, // Further reduced for a more deliberate movement
      damping: 0.3,   // Slightly reduced damping to avoid being too sluggish
    }
  );

  let boardElement: HTMLElement | undefined;
  let cellElements: HTMLElement[][] = [];
  let cellSize = 50; // Default, will be updated
  let gapSize = 4;   // Default, will be updated

  function updateKnightPosition(r: number, c: number, animate: boolean) {
    if (!boardElement || !cellElements[r] || !cellElements[r][c]) {
      // Elements not ready, or target cell doesn't exist
      // Try to find the cell again if not populated
      if(boardElement && (!cellElements[r] || !cellElements[r][c])) {
        populateCellElements();
        if (!cellElements[r] || !cellElements[r][c]) {
          // console.warn('Cell element not found for animation', r, c);
          return;
        }
      }
      // If still not ready, defer or skip
      // console.warn('Board or cell elements not ready for knight position update.');
      return;
    }

    const boardRect = boardElement.getBoundingClientRect();
    const cellRect = cellElements[r][c].getBoundingClientRect();

    // Calculate target x, y relative to the .board container for the knight
    const targetX = cellRect.left - boardRect.left + cellRect.width / 2;
    const targetY = cellRect.top - boardRect.top + cellRect.height / 2;

    if (animate) {
      knightStyle.set({ x: targetX, y: targetY, opacity: 1 });
    } else {
      // Snap to position without animation (e.g., initial placement)
      knightStyle.set({ x: targetX, y: targetY, opacity: 1 }, { hard: true });
    }
    knightVisible = true;
  }

  // Reactive statement to find current knight position and trigger animation
  beforeUpdate(() => {
    prevKnightRow = currentKnightRow;
    prevKnightCol = currentKnightCol;

    let found = false;
    for (let r = 0; r < boardData.length; r++) {
      for (let c = 0; c < boardData[r].length; c++) {
        if (boardData[r][c].isCurrent) {
          currentKnightRow = r;
          currentKnightCol = c;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) { // Knight is not on the board (e.g. game reset)
        currentKnightRow = -1;
        currentKnightCol = -1;
        if (knightVisible) {
            // Make knight fly off or fade out
            const currentVal = $knightStyle;
            knightStyle.set({ ...currentVal, opacity: 0 });
            knightVisible = false;
        }
    } else if (found && (currentKnightRow !== prevKnightRow || currentKnightCol !== prevKnightCol)) {
        if (prevKnightRow !== -1 && prevKnightCol !== -1) { // It's a move, not initial placement
            updateKnightPosition(currentKnightRow, currentKnightCol, true);
        } else { // Initial placement or board changed, snap to position
            updateKnightPosition(currentKnightRow, currentKnightCol, false); 
        }
    }
  });
  
  function populateCellElements() {
    if (!boardElement) return;
    const rows = boardElement.querySelectorAll('.board-row');
    cellElements = Array.from(rows).map(rowEl => 
      Array.from(rowEl.querySelectorAll('.cell')) as HTMLElement[]
    );
    // Update cell and gap sizes from CSS (might be complex if dynamic)
    // For simplicity, assume fixed values or use CSS variables if possible
    // This part might need refinement if cell sizes change drastically or are hard to get from JS
    if (cellElements[0] && cellElements[0][0]) {
        const computedStyle = getComputedStyle(cellElements[0][0]);
        // cellSize = parseFloat(computedStyle.width); // This might be tricky due to box-sizing
        // A more robust way would be to use offsetWidth/Height if available and accurate
        // Or, if using grid-template-columns with fixed px values, parse that.
        // For now, using a hardcoded or prop-based value might be safer for initial setup
    }
    // console.log('Populated cell elements', cellElements);
  }

  onMount(() => {
    // boardElement should be available here
    populateCellElements();
    if (currentKnightRow !== -1 && currentKnightCol !== -1) {
      updateKnightPosition(currentKnightRow, currentKnightCol, false); // Initial placement
    }

    // Fallback for when boardData loads/changes and knight needs initial placement
    // This is tricky because onMount runs once. beforeUpdate handles subsequent changes.
    // Check if knight is already on board from initial boardData prop
    let initialR = -1, initialC = -1;
    for (let r = 0; r < boardData.length; r++) {
      for (let c = 0; c < boardData[r].length; c++) {
        if (boardData[r][c].isCurrent) {
          initialR = r;
          initialC = c;
          break;
        }
      }
      if (initialR !== -1) break;
    }
    if (initialR !== -1 && initialC !== -1) {
      currentKnightRow = initialR;
      currentKnightCol = initialC;
      // Defer to ensure DOM elements are fully rendered and styles applied for measurements
      requestAnimationFrame(() => {
        populateCellElements(); // Re-populate in case of dynamic rendering
        updateKnightPosition(initialR, initialC, false); // Initial placement, no animation
      });
    }
  });

  // $: console.log("Board.svelte received boardData:", boardData); // 用於調試
</script>

<div class="board-container">
  <div
    class="board"
    bind:this={boardElement} 
    style={`--board-columns: ${boardData.length > 0 ? boardData[0].length : 8};`}
  >
    {#each boardData as row, r (r)} 
      <div class="board-row" data-row-index={r}>
        {#each row as cell, c (c)} 
          <div
            class="cell"
            class:visited={cell.visited}
            class:current={cell.isCurrent} 
            class:next-move={cell.isNextMove}
            on:click={() => onCellClick(r, c)}
            on:keypress={() => onCellClick(r, c)}
            role="button"
            tabindex="0"
            aria-label={`Cell ${r + 1}-${String.fromCharCode(65 + c)}${cell.visited ? ' visited step ' + cell.step : ''}${cell.isCurrent ? ' current position' : ''}${cell.isNextMove ? ' possible next move' : ''}`}
            data-cell-row={r}
            data-cell-col={c}
          >
            {#if cell.step > 0 && !cell.isCurrent} 
              <span class="step-number">{cell.step}</span>
            {/if}
            <!-- Knight marker is now separate and animated -->
            <!-- Render next move marker if applicable and not the current (animated) knight's cell -->
            {#if cell.isNextMove && !(currentKnightRow === r && currentKnightCol === c)}
              <span class="marker next-move-marker">●</span>
            {/if}
          </div>
        {/each}
      </div>
    {/each}

    <!-- Animated Knight Marker -->
    {#if knightVisible}
      <span 
        class="marker knight-marker animated-knight-marker"
        style="left: {$knightStyle.x}px; top: {$knightStyle.y}px; opacity: {$knightStyle.opacity}; transform: translate(-50%, -50%);"
      >
        ♘
      </span>
    {/if}
  </div>
</div>

<style>
  .board-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    width: 100%; /* 確保容器能感知父級寬度 */
    position: relative; /* Needed for absolute positioning of the knight within board-container if board itself is not positioned */
  }
  .board {
    display: grid;
    /* grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); */ /* 舊的設定 */
    grid-template-columns: repeat(var(--board-columns, 8), 50px); /* N x N 格子，每個 50px 寬 */
    gap: 4px; /* 格子間距，參考 index.html */
    padding: 16px; /* 棋盤內邊距，參考 index.html */
    border-radius: 16px; /* 圓角，參考 index.html */
    border: 2px solid #666;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
    background-color: #2c2c2c;
    width: fit-content; /* 讓棋盤寬度適應內容 */
    margin: 0 auto; /* 居中棋盤 */
    max-width: 100%; /* 棋盤本身不超過容器寬度 */
    box-sizing: border-box; /* padding and border do not add to the total width */
    position: relative; /* Crucial for animated knight positioning relative to the board */
  }
  .board-row {
    display: contents;
  }
  .cell {
    width: 50px;
    height: 50px;
    border: 1px solid #444;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    position: relative; /* Keep for absolute positioning of marker */
    font-size: 1.2em;
    color: #ccc;
    overflow: hidden; /* Add this to prevent content spillover */
  }
  /*交錯背景色暫時移除*/

  .cell.visited {
    background-color: #ffd600; /* 改為亮黃色，與 index.html 一致 */
    color: #232326; /* 改為深色文字，與 index.html 一致 */
    font-weight: bold; /* 參考 index.html 加上粗體 */
    cursor: not-allowed;
  }
  .cell.current {
    background-color: #ffd700 !important; /* 確保覆蓋 visited */
    border: 2px solid #fff;
    color: #111;
    box-shadow:
      0 0 10px #ffd700,
      inset 0 0 5px #00000066;
  }
  .cell.next-move {
    background-color: rgba(255, 215, 0, 0.3);
    border: 1px dashed #ffd700;
  }
  .cell.next-move:hover {
    background-color: rgba(255, 215, 0, 0.5);
  }
  .step-number {
    font-size: 0.8em;
    font-weight: bold;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }
  .marker {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5em;
    pointer-events: none;
    z-index: 2; /* Higher z-index to be on top */
  }
  .knight-marker {
    color: #000000; /* Black knight */
    /* Attempt to make it look more solid black with text-shadow */
    text-shadow: 
      1px 0 0 #000000, 
      -1px 0 0 #000000, 
      0 1px 0 #000000, 
      0 -1px 0 #000000,
      1px 1px 0 #000000,
      -1px -1px 0 #000000,
      1px -1px 0 #000000,
      -1px 1px 0 #000000,
      0 0 3px rgba(100,100,100,0.7); /* Softer, darker outer glow */
  }
  .next-move-marker {
    color: #ffd700;
    opacity: 0.7;
  }
  .animated-knight-marker {
    /* Style is mostly inline via spring store for x, y, opacity */
    /* Ensure it's on top and pointer events don't interfere with cells if it ever gets them */
    z-index: 10; 
    pointer-events: none; 
    /* transition: opacity 0.3s ease; Implicitly handled by spring */
  }

  /* RWD Styles for Board Component */
  @media (max-width: 768px) {
    .board-container {
      padding: 5px;
    }
    .board {
      /* For 8 columns: 8*40px + 7*3px + 2*10px(padding) + 2*2px(border) = 320 + 21 + 20 + 4 = 365px approx */
      grid-template-columns: repeat(var(--board-columns, 8), minmax(35px, 40px)); 
      gap: 3px;
      padding: 10px;
    }
    .cell {
      width: auto; /* Let grid define width based on template columns */
      height: 0; /* Reset height */
      padding-bottom: 100%; /* Maintain aspect ratio 1:1 based on width */
      /* width: 40px; Fallback, prefer auto with aspect ratio */
      /* height: 40px; Fallback */
      font-size: 1em; 
    }
    .step-number {
      font-size: 0.7em;
    }
    .marker {
      font-size: 1.4em;
    }
  }

  @media (max-width: 480px) {
    .board {
      /* For 8 columns on a 320px screen: 8*X + 7*2 + 2*8 + 2*1 = 320 => 8X = 320 - 14 - 16 - 2 = 288 => X = 36px */
      /* For 10 columns: 10*X + 9*2 + 2*8 + 2*1 = 320 => 10X = 320 - 18 - 16 - 2 = 284 => X = 28.4px */
      /* Using minmax to allow flexibility based on --board-columns */
      grid-template-columns: repeat(var(--board-columns, 8), minmax(28px, 35px)); 
      gap: 2px;
      padding: 8px;
      border-width: 1px; /* Thinner border for smaller screens */
    }
    .cell {
      /* Width and height are implicitly set by grid and aspect ratio trick */
      font-size: 0.8em; 
    }
    .cell.current {
      border-width: 1.5px;
    }
    .step-number {
      font-size: 0.7em;
    }
    .marker {
      font-size: 1.3em;
      max-width: 90%; 
    }
  }

  /* Fallback for very small screens if board is still too wide */
  @media (max-width: 350px) { 
    .board-container {
        /* On very small screens, if the board (e.g. 10x10) cannot shrink further, allow scrolling */
        /* This threshold might need adjustment based on max board size and min cell size */
        /* Example: 10 columns * 28px cell + 9 * 2px gap + 2 * 8px padding + 2 * 1px border = 280 + 18 + 16 + 2 = 316px */
        /* If screen is smaller than this, scrolling is inevitable for large boards */
        overflow-x: auto; 
    }
    .board {
        /* Potentially further reduce padding or gap if absolutely necessary */
        /* padding: 5px; */ 
        /* gap: 1px; */
    }
  }
</style>
