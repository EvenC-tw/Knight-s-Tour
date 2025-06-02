<script lang="ts">
  export let boardData: any[][]; // 棋盤的二維陣列數據
  export let onCellClick: (r: number, c: number) => void; // 點擊儲存格的回調函式

  // $: console.log("Board.svelte received boardData:", boardData); // 用於調試
</script>

<div class="board-container">
  <div
    class="board"
    style={`--board-columns: ${boardData.length > 0 ? boardData[0].length : 8};`}
  >
    {#each boardData as row, r}
      <div class="board-row">
        {#each row as cell, c}
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
          >
            {#if cell.step > 0}
              <span class="step-number">{cell.step}</span>
            {/if}
            {#if cell.isCurrent}
              <span class="marker knight-marker">♘</span>
            {:else if cell.isNextMove}
              <span class="marker next-move-marker">●</span>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .board-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
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
    position: relative;
    font-size: 1.2em;
    color: #ccc;
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
  }
  .marker {
    position: absolute;
    font-size: 1.5em;
    pointer-events: none;
  }
  .knight-marker {
    color: #111;
    text-shadow: 0 0 2px #fff;
  }
  .next-move-marker {
    color: #ffd700;
    opacity: 0.7;
  }
</style>
