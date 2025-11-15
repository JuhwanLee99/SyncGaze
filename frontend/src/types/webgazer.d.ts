// src/types/webgazer.d.ts
// Global type definitions for WebGazer library

declare global {
  interface Window {
    webgazer: {
      begin(): void;
      end(): void;
      pause(): void;
      resume(): void;
      showPredictionPoints(show: boolean): void;
      setGazeListener(listener: (data: { x: number; y: number } | null) => void): void;
      clearGazeListener(): void;
      clearData(): void;
      setTracker(tracker: string): void;
      setRegression(regression: string): void;
      applyKalmanFilter(apply: boolean): void;
      params?: {
        checkClick?: boolean;
        checkMove?: boolean;
      };

      // --- 여기에 누락된 함수 정의 추가 ---
      setCameraConstraints(constraints: MediaStreamConstraints): Promise<MediaStream | null>;

      recordScreenPosition(x: number, y: number, eventType: string): void;
      // ------------------------------------

    };
  }
}

export {};