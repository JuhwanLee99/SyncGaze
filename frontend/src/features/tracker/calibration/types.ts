export type GameState =
  | 'idle'
  | 'webcamCheck'
  | 'calibrating'
  | 'confirmValidation'
  | 'validating';

export type QualitySetting = 'low' | 'medium' | 'high';

export interface DotPosition {
  x: number;
  y: number;
}

export interface LiveGaze {
  x: number | null;
  y: number | null;
}