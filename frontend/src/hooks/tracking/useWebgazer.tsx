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
      window.webgazer.end();
    } catch (error) {
      console.error('Failed to stop WebGazer', error);
    } finally {
      hasWebgazerStarted.current = false;
    }
  }, []);

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

  useEffect(() => {
    if (!isReady || !window.webgazer) {
      return;
    }
    const shouldShow = gameState === 'validating' || gameState === 'calibrating';
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

  const handleRecalibrate = useCallback(() => {
    setValidationError(null);
    setGazeStability(null);
    setIsValidationSuccessful(false);
    setCalStage3SuccessRate(null);
    if (window.webgazer) {
      window.webgazer.clearData();
    }
    setGameState('calibrating');
  }, []);

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