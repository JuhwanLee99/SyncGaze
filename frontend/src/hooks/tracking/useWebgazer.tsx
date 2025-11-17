import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FORBIDDEN_ZONE, TOTAL_TASKS, RECALIBRATION_THRESHOLD } from '../../features/tracker/calibration/constants';
import {
  DataRecord,
  DotPosition,
  GameState,
  LiveGaze,
  TaskResult,
  QualitySetting,
} from '../../features/tracker/calibration/types';

interface WebgazerContextValue {
  gameState: GameState;
  isReady: boolean;
  liveGaze: LiveGaze;
  validationError: number | null;
  gazeStability: number | null;
  calStage3SuccessRate: number | null;
  currentDot: DotPosition | null;
  taskCount: number;
  taskResults: TaskResult[];
  isValidationSuccessful: boolean;
  validationSequence: number;
  quality: QualitySetting;
  isFaceDetected: boolean;
  startSession: () => void;
  setQuality: (quality: QualitySetting) => void;
  handleCalibrationComplete: () => void;
  handleWebcamCheckComplete: () => void;
  startValidation: () => void;
  startTaskPhase: () => void;
  handleRecalibrate: () => void;
  handleTaskDotClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleCalStage3Complete: (successRate: number) => void;
}

const USE_KALMAN_FILTER = true;
const CAMERA_SETTINGS: Record<QualitySetting, { width: number; height: number; frameRate: number }> = {
  low: { width: 640, height: 480, frameRate: 30 },
  medium: { width: 1280, height: 720, frameRate: 60 },
  high: { width: 1920, height: 1080, frameRate: 60 },
};

const WebgazerContext = createContext<WebgazerContextValue | undefined>(undefined);

export const WebgazerProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [isReady, setIsReady] = useState(false);
  const [liveGaze, setLiveGaze] = useState<LiveGaze>({ x: null, y: null });
  const [validationError, setValidationError] = useState<number | null>(null);
  const [gazeStability, setGazeStability] = useState<number | null>(null);
  const [calStage3SuccessRate, setCalStage3SuccessRate] = useState<number | null>(null);
  const [currentDot, setCurrentDot] = useState<DotPosition | null>(null);
  const [taskCount, setTaskCount] = useState(0);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const [isValidationSuccessful, setIsValidationSuccessful] = useState(false);
  const [validationSequence, setValidationSequence] = useState(0);
  const [quality, setQuality] = useState<QualitySetting>('high');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const updateQuality = useCallback((nextQuality: QualitySetting) => {
    setQuality(nextQuality);
  }, []);

  const collectedData = useRef<DataRecord[]>([]);
  const validationGazePoints = useRef<{ x: number; y: number }[]>([]);
  const taskStartTime = useRef<number | null>(null);
  const taskStartTimes = useRef<Record<number, number>>({});
  const hasWebgazerStarted = useRef(false);

  const safelyEndWebgazer = useCallback(() => {
    if (!window.webgazer || !hasWebgazerStarted.current) {
      return;
    }
    try {
      window.webgazer.end();
    } catch (error) {
      console.error('Failed to stop WebGazer', error);
    } finally {
      hasWebgazerStarted.current = false;
    }
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.async = true;
    script.onload = () => setIsReady(true);
    script.onerror = () => {
      console.error('Failed to load WebGazer script');
      setIsReady(false);
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      safelyEndWebgazer();
    };
  }, [safelyEndWebgazer]);

  useEffect(() => {
    if (!isReady || !window.webgazer) {
      return;
    }
    const shouldShow = gameState === 'validating' || gameState === 'task' || gameState === 'calibrating';
    window.webgazer.showPredictionPoints(shouldShow);
  }, [gameState, isReady]);

  useEffect(() => {
    if (gameState !== 'webcamCheck' || !window.webgazer) {
      return;
    }
    setIsFaceDetected(false);
    const detectionListener = (data: { x: number; y: number } | null) => {
      if (data?.x != null && data?.y != null) {
        setIsFaceDetected(true);
        window.webgazer?.clearGazeListener();
      }
    };
    window.webgazer.clearGazeListener();
    window.webgazer.setGazeListener(detectionListener);
    return () => {
      window.webgazer?.clearGazeListener();
    };
  }, [gameState]);

  const startSession = useCallback(() => {
    if (!isReady || !window.webgazer) {
      return;
    }
    setTaskResults([]);
    setTaskCount(0);
    setCurrentDot(null);
    setValidationError(null);
    setGazeStability(null);
    setCalStage3SuccessRate(null);
    setIsValidationSuccessful(false);
    collectedData.current = [];
    validationGazePoints.current = [];
    taskStartTimes.current = {};

    window.webgazer.setTracker('TFFacemesh');
    window.webgazer.setRegression('ridge');
    if (window.webgazer.params) {
      window.webgazer.params.checkClick = false;
      window.webgazer.params.checkMove = false;
    }
    window.webgazer.begin();
    hasWebgazerStarted.current = true;
    window.webgazer.applyKalmanFilter(USE_KALMAN_FILTER);
    setIsFaceDetected(false);
    setGameState('webcamCheck');
  }, [isReady]);

  const handleCalibrationComplete = useCallback(() => {
    setGameState('confirmValidation');
  }, []);

  const handleWebcamCheckComplete = useCallback(() => {
    if (!window.webgazer) {
      return;
    }
    const constraints = CAMERA_SETTINGS[quality];
    if (typeof window.webgazer.setCameraConstraints === 'function') {
      window.webgazer.setCameraConstraints({
        video: {
          width: constraints.width,
          height: constraints.height,
          frameRate: constraints.frameRate,
        },
      });
    }
    window.webgazer.setRegression('ridge');
    setGameState('calibrating');
  }, [quality]);

  const startValidation = useCallback(() => {
    setValidationError(null);
    setGazeStability(null);
    setIsValidationSuccessful(false);
    setGameState('validating');
  }, []);

  const startTaskPhase = useCallback(() => {
    setTaskCount(0);
    setTaskResults([]);
    setCurrentDot(null);
    setGameState('task');
  }, []);

  const handleRecalibrate = useCallback(() => {
    setValidationError(null);
    setGazeStability(null);
    setIsValidationSuccessful(false);
    setCalStage3SuccessRate(null);
    setTaskResults([]);
    setTaskCount(0);
    setCurrentDot(null);
    if (window.webgazer) {
      window.webgazer.clearData();
    }
    setGameState('calibrating');
  }, []);

  const handleTaskDotClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!window.webgazer) {
      return;
    }
    if (typeof window.webgazer.recordScreenPosition === 'function') {
      window.webgazer.recordScreenPosition(event.clientX, event.clientY, 'click');
    }

    const clickTime = performance.now();
    const lastGazeRecord = [...collectedData.current].reverse().find(d => d.gazeX !== null && d.gazeY !== null);
    const lastGazePos = lastGazeRecord ? { x: lastGazeRecord.gazeX, y: lastGazeRecord.gazeY } : null;
    const clickPos = { x: event.clientX, y: event.clientY };
    const targetPos = currentDot;
    const timeTaken = taskStartTime.current ? clickTime - taskStartTime.current : 0;

    let gazeToTargetDistance: number | null = null;
    let gazeToClickDistance: number | null = null;

    if (lastGazePos) {
      if (targetPos) {
        gazeToTargetDistance = Math.sqrt((targetPos.x - (lastGazePos.x ?? 0)) ** 2 + (targetPos.y - (lastGazePos.y ?? 0)) ** 2);
      }
      gazeToClickDistance = Math.sqrt((clickPos.x - (lastGazePos.x ?? 0)) ** 2 + (clickPos.y - (lastGazePos.y ?? 0)) ** 2);
    }

    setTaskResults(prev => [...prev, {
      taskId: taskCount + 1,
      timeTaken,
      gazeToTargetDistance,
      gazeToClickDistance,
    }]);

    if (taskCount < TOTAL_TASKS - 1) {
      setTaskCount(prev => prev + 1);
    } else {
      setGameState('finished');
      safelyEndWebgazer();
    }
  }, [currentDot, taskCount, safelyEndWebgazer]);

  const handleCalStage3Complete = useCallback((successRate: number) => {
    setCalStage3SuccessRate(successRate);
  }, []);

  useEffect(() => {
    if (gameState === 'calibrating' && window.webgazer) {
      const gazeListener = (data: { x: number; y: number } | null) => {
        if (data) {
          setLiveGaze({ x: data.x, y: data.y });
        }
      };
      window.webgazer.setGazeListener(gazeListener);
      return () => {
        window.webgazer?.clearGazeListener();
      };
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'validating' || !window.webgazer) {
      return;
    }

    validationGazePoints.current = [];
    setValidationError(null);
    setGazeStability(null);

    const validationListener = (data: { x: number; y: number } | null) => {
      if (data) {
        validationGazePoints.current.push({ x: data.x, y: data.y });
      }
    };

    window.webgazer.setGazeListener(validationListener);

    const timer = setTimeout(() => {
      window.webgazer?.clearGazeListener();
      if (validationGazePoints.current.length === 0) {
        handleRecalibrate();
        return;
      }

      const avgGaze = validationGazePoints.current.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
      );
      avgGaze.x /= validationGazePoints.current.length;
      avgGaze.y /= validationGazePoints.current.length;

      const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const error = Math.sqrt((target.x - avgGaze.x) ** 2 + (target.y - avgGaze.y) ** 2);
      setValidationError(error);

      const sumSqDiffX = validationGazePoints.current.reduce((acc, p) => acc + (p.x - avgGaze.x) ** 2, 0);
      const sumSqDiffY = validationGazePoints.current.reduce((acc, p) => acc + (p.y - avgGaze.y) ** 2, 0);
      const stdDevX = Math.sqrt(sumSqDiffX / validationGazePoints.current.length);
      const stdDevY = Math.sqrt(sumSqDiffY / validationGazePoints.current.length);
      const stability = (stdDevX + stdDevY) / 2;
      setGazeStability(stability);

      if (error <= RECALIBRATION_THRESHOLD) {
        setIsValidationSuccessful(true);
        setValidationSequence(seq => seq + 1);
      } else {
        setIsValidationSuccessful(false);
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.webgazer?.clearGazeListener();
    };
  }, [gameState, handleRecalibrate]);

  useEffect(() => {
    if (gameState === 'task' && taskCount < TOTAL_TASKS) {
      let x: number;
      let y: number;
      const padding = 50;
      do {
        x = Math.floor(Math.random() * (window.innerWidth - padding * 2)) + padding;
        y = Math.floor(Math.random() * (window.innerHeight - padding * 2)) + padding;
      } while (x < FORBIDDEN_ZONE.width && y < FORBIDDEN_ZONE.height);
      setCurrentDot({ x, y });

      const startTime = performance.now();
      taskStartTime.current = startTime;
      taskStartTimes.current[taskCount + 1] = startTime;
    }
  }, [gameState, taskCount]);

  useEffect(() => {
    if (gameState !== 'task' || !window.webgazer) {
      return;
    }

    const gazeListener = (data: { x: number; y: number } | null) => {
      if (data) {
        collectedData.current.push({
          timestamp: performance.now(),
          taskId: taskCount + 1,
          targetX: currentDot?.x ?? null,
          targetY: currentDot?.y ?? null,
          gazeX: data.x,
          gazeY: data.y,
          mouseX: null,
          mouseY: null,
        });
      }
    };
    window.webgazer.setGazeListener(gazeListener);

    const mouseMoveListener = (event: MouseEvent) => {
      collectedData.current.push({
        timestamp: performance.now(),
        taskId: taskCount + 1,
        targetX: currentDot?.x ?? null,
        targetY: currentDot?.y ?? null,
        gazeX: null,
        gazeY: null,
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
    };

    document.addEventListener('mousemove', mouseMoveListener);

    return () => {
      window.webgazer?.clearGazeListener();
      document.removeEventListener('mousemove', mouseMoveListener);
    };
  }, [gameState, taskCount, currentDot]);

  const value: WebgazerContextValue = {
    gameState,
    isReady,
    liveGaze,
    validationError,
    gazeStability,
    calStage3SuccessRate,
    currentDot,
    taskCount,
    taskResults,
    isValidationSuccessful,
    validationSequence,
    quality,
    isFaceDetected,
    startSession,
    setQuality: updateQuality,
    handleCalibrationComplete,
    handleWebcamCheckComplete,
    startValidation,
    startTaskPhase,
    handleRecalibrate,
    handleTaskDotClick,
    handleCalStage3Complete,
  };

  return <WebgazerContext.Provider value={value}>{children}</WebgazerContext.Provider>;
};

export const useWebgazer = () => {
  const context = useContext(WebgazerContext);
  if (!context) {
    throw new Error('useWebgazer must be used within a WebgazerProvider');
  }
  return context;
};