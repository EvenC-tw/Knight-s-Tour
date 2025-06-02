export interface CellState {
    visited: boolean;
    step: number;
    isCurrent: boolean;
    isNextMove: boolean;
}

export type BoardRow = CellState[];
export type BoardData = BoardRow[];

export function isValidSquare(r: number, c: number, boardSize: number): boolean;

export function getValidMoves(r: number, c: number, boardSize: number): [number, number][];

export function createInitialBoard(boardSize: number): BoardData; 