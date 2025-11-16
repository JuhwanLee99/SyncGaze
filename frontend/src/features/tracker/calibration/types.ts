export type GameState =
  | 'idle'
  | 'calibrating'
  | 'confirmValidation'
  | 'validating'
  | 'task'
  | 'finished';

export interface DataRecord {
  timestamp: number;
  taskId: number | null;
  targetX: number | null;
  targetY: number | null;
  gazeX: number | null;
  gazeY: number | null;
  mouseX: number | null;
  mouseY: number | null;
}

export interface TaskResult {
  taskId: number;
  timeTaken: number;
  gazeToTargetDistance: number | null;
  gazeToClickDistance: number | null;
}

export interface DotPosition {
  x: number;
  y: number;
}

export interface LiveGaze {
  x: number | null;
  y: number | null;
}
