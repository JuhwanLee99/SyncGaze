// frontend/src/hooks/tracking/useWebgazer.tsx
// UPDATED: Added stopSession() and pauseSession() methods for proper cleanup

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RECALIBRATION_THRESHOLD } from '../../features/tracker/calibration/constants';
import {
  GameState,
  LiveGaze,
  QualitySetting,
} from '../../features/tracker/calibration/types';

interface WebgazerContextValue {
  gameState: GameState;
  isReady: boolean;
  liveGaze: LiveGaze;
  validationError: number | null;
  gazeStability: number | null;
  calStage3SuccessRate: number | null;
  isValidationSuccessful: boolean;
  validationSequence: number;
  quality: QualitySetting;
  isFaceDetected: boolean;
  startSession: () => void;
  stopSession: () => void;  // NEW: Stop WebGazer completely
  pauseSession: () => void; // NEW: Pause WebGazer (can be resumed)
  setQuality: (quality: QualitySetting) => void;
  handleCalibrationComplete: () => void;
  handleWebcamCheckComplete: () => void;
  startValidation: () => void;
  handleRecalibrate: () => void;
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
  const [isValidationSuccessful, setIsValidationSuccessful] = useState(false);
  const [validationSequence, setValidationSequence] = useState(0);
  const [quality, setQuality] = useState<QualitySetting>('high');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  
  const updateQuality = useCallback((nextQuality: QualitySetting) => {
    setQuality(nextQuality);
  }, []);

  const validationGazePoints = useRef<{ x: number; y: number }[]>([]);
  const hasWebgazerStarted = useRef(false);

  const safelyEndWebgazer = useCallback(() => {
    if (!window.webgazer || !hasWebgazerStarted.current) {
      return;
    }
    try {
      console.log('🛑 Stopping WebGazer');
      window.webgazer.end();
    } catch (error) {
      console.error('Failed to stop WebGazer', error);
    } finally {
      hasWebgazerStarted.current = false;
    }
  }, []);

  const safelyPauseWebgazer = useCallback(() => {
    if (!window.webgazer || !hasWebgazerStarted.current) {
      return;
    }
    try {
      console.log('⏸️ Pausing WebGazer');
      window.webgazer.pause();
      window.webgazer.clearGazeListener();
    } catch (error) {
      console.error('Failed to pause WebGazer', error);
    }
  }, []);

  // Load WebGazer script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/webgazer.js';
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

  // Show/hide prediction points based on game state
  useEffect(() => {
    if (!isReady || !window.webgazer) {
      return;
    }
    const shouldShow = gameState === 'validating' || gameState === 'calibrating';
    window.webgazer.showPredictionPoints(shouldShow);
  }, [gameState, isReady]);

  // Face detection for webcam check
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

  // Start WebGazer session
  const startSession = useCallback(() => {
    if (!isReady || !window.webgazer) {
      return;
    }
    console.log('▶️ Starting WebGazer session');
    setValidationError(null);
    setGazeStability(null);
    setCalStage3SuccessRate(null);
    setIsValidationSuccessful(false);
    validationGazePoints.current = [];

    window.webgazer.setTracker('TFFacemesh');
    window.webgazer.setRegression('ridge');
    if (window.webgazer.params) {
      window.webgazer.params.checkClick = false;
      window.webgazer.params.checkMove = false;
    }
    window.webgazer.begin();
    hasWebgazerStarted.current = true;
    window.webgazer.applyKalmanFilter(USE_KALMAN_FILTER);

    if (window.webgazer.setCameraConstraints) {
      const settings = CAMERA_SETTINGS[quality];
      window.webgazer.setCameraConstraints({
        video: {
          width: { ideal: settings.width },
          height: { ideal: settings.height },
          frameRate: { ideal: settings.frameRate },
        },
      });
    }

    setGameState('webcamCheck');
  }, [isReady, quality]);

  // NEW: Stop WebGazer session completely
  const stopSession = useCallback(() => {
    console.log('🛑 Stopping WebGazer session');
    safelyEndWebgazer();
    setGameState('idle');
    setLiveGaze({ x: null, y: null });
  }, [safelyEndWebgazer]);

  // NEW: Pause WebGazer session (can be resumed)
  const pauseSession = useCallback(() => {
    console.log('⏸️ Pausing WebGazer session');
    safelyPauseWebgazer();
    setLiveGaze({ x: null, y: null });
  }, [safelyPauseWebgazer]);

  const handleWebcamCheckComplete = useCallback(() => {
    setGameState('calibrating');
  }, []);

  const handleCalibrationComplete = useCallback(() => {
    setGameState('validating');
  }, []);

  const handleRecalibrate = useCallback(() => {
    if (window.webgazer) {
      window.webgazer.clearData();
    }
    setValidationError(null);
    setGazeStability(null);
    setIsValidationSuccessful(false);
    setValidationSequence(0);
    setGameState('calibrating');
  }, []);

  const handleCalStage3Complete = useCallback((successRate: number) => {
    setCalStage3SuccessRate(successRate);
  }, []);

  const startValidation = useCallback(() => {
    validationGazePoints.current = [];
    setValidationError(null);
    setGazeStability(null);
    setGameState('validating');
  }, []);

  // Live gaze tracking
  useEffect(() => {
    if (!isReady || !window.webgazer || gameState !== 'validating') {
      return;
    }

    const gazeListener = (data: { x: number; y: number } | null) => {
      if (data?.x != null && data?.y != null) {
        setLiveGaze({ x: data.x, y: data.y });
      }
    };

    window.webgazer.setGazeListener(gazeListener);
    return () => {
      window.webgazer?.clearGazeListener();
    };
  }, [gameState, isReady]);

  // Validation measurement
  useEffect(() => {
    if (gameState !== 'validating' || !window.webgazer) {
      return;
    }

    validationGazePoints.current = [];
    const validationListener = (data: { x: number; y: number } | null) => {
      if (data?.x != null && data?.y != null) {
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
      
      setGameState('validationResult');
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.webgazer?.clearGazeListener();
    };
  }, [gameState, handleRecalibrate]);

  const value: WebgazerContextValue = {
    gameState,
    isReady,
    liveGaze,
    validationError,
    gazeStability,
    calStage3SuccessRate,
    isValidationSuccessful,
    validationSequence,
    quality,
    isFaceDetected,
    startSession,
    stopSession,      // NEW
    pauseSession,     // NEW
    setQuality: updateQuality,
    handleCalibrationComplete,
    handleWebcamCheckComplete,
    startValidation,
    handleRecalibrate,
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