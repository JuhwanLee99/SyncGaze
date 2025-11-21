// frontend/src/hooks/tracking/useWebgazer.tsx
// FIXED: Prevent duplicate overlays and align face tracking properly

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
  actualResolution: { width: number; height: number } | null;
  isFaceDetected: boolean;
  startSession: () => void;
  stopSession: () => void;
  pauseSession: () => void;
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

const VIEWPORT_SIZE = {
  width: 320,
  height: 240
};

const QUALITY_STORAGE_KEY = 'webgazer_camera_quality';

const getPersistedQuality = (): QualitySetting => {
  try {
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY);
    if (stored && ['low', 'medium', 'high'].includes(stored)) {
      console.log('📹 Retrieved persisted camera quality:', stored);
      return stored as QualitySetting;
    }
  } catch (error) {
    console.warn('Failed to retrieve persisted quality:', error);
  }
  console.log('📹 Using default camera quality: medium');
  return 'medium';
};

// FIXED: Complete cleanup of all WebGazer elements
const cleanupAllWebgazerElements = () => {
  console.log('🧹 Cleaning up all WebGazer elements');
  
  // Remove all elements with webgazer in the ID
  const webgazerElements = document.querySelectorAll('[id*="webgazer"]');
  webgazerElements.forEach(el => {
    console.log('  Removing:', el.id);
    el.remove();
  });
  
  // Also remove by class names that WebGazer might use
  const webgazerClasses = document.querySelectorAll('.webgazer-nav, .webgazer');
  webgazerClasses.forEach(el => el.remove());
  
  // Remove our custom elements
  const customElements = ['#webgazer-viewport-styles', '#resolution-indicator'];
  customElements.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.remove();
  });
};

// FIXED: Unified viewport setup that ensures proper alignment
const setFixedViewport = (qualitySetting: QualitySetting) => {
  console.log('📐 Setting fixed viewport with proper alignment');
  
  // First, ensure no duplicates exist
  const existingContainers = document.querySelectorAll('#webgazerVideoContainer');
  if (existingContainers.length > 1) {
    console.warn('⚠️ Found multiple video containers, removing duplicates');
    for (let i = 1; i < existingContainers.length; i++) {
      existingContainers[i].remove();
    }
  }
  
  const settings = CAMERA_SETTINGS[qualitySetting];
  const scaleX = VIEWPORT_SIZE.width / settings.width;
  const scaleY = VIEWPORT_SIZE.height / settings.height;
  const scale = Math.min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio
  
  // Calculate scaled dimensions
  const scaledWidth = settings.width * scale;
  const scaledHeight = settings.height * scale;
  
  console.log('📏 Scaling calculations:');
  console.log('  Original:', `${settings.width}x${settings.height}`);
  console.log('  Scale factor:', scale);
  console.log('  Scaled to:', `${scaledWidth}x${scaledHeight}`);
  
  setTimeout(() => {
    // Container style
    const containerStyle = `
      position: fixed !important;
      top: 10px !important;
      left: 10px !important;
      width: ${VIEWPORT_SIZE.width}px !important;
      height: ${VIEWPORT_SIZE.height}px !important;
      z-index: 9999 !important;
      overflow: hidden !important;
      background: black !important;
    `;
    
    // Video element style - maintain aspect ratio
    const videoStyle = `
      width: ${VIEWPORT_SIZE.width}px !important;
      height: ${VIEWPORT_SIZE.height}px !important;
      object-fit: cover !important;
      transform: scaleX(-1) !important;
    `;
    
    // Canvas style - MUST match video dimensions exactly
    const canvasStyle = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: ${VIEWPORT_SIZE.width}px !important;
      height: ${VIEWPORT_SIZE.height}px !important;
      transform: scaleX(-1) !important;
      pointer-events: none !important;
    `;
    
    // Apply to container
    const videoContainer = document.querySelector('#webgazerVideoContainer') as HTMLDivElement;
    if (videoContainer) {
      videoContainer.style.cssText = containerStyle;
      
      // Ensure container is unique
      videoContainer.dataset.initialized = 'true';
    }
    
    // Apply to video
    const videoElement = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement;
    if (videoElement) {
      videoElement.style.cssText = videoStyle;
    }
    
    // Apply to ALL canvases - they must all align
    const videoCanvas = document.querySelector('#webgazerVideoCanvas') as HTMLCanvasElement;
    if (videoCanvas) {
      videoCanvas.width = VIEWPORT_SIZE.width;
      videoCanvas.height = VIEWPORT_SIZE.height;
      videoCanvas.style.cssText = canvasStyle;
    }
    
    const faceFeedbackBox = document.querySelector('#webgazerFaceFeedbackBox') as HTMLCanvasElement;
    if (faceFeedbackBox) {
      // CRITICAL: Face feedback must use same dimensions
      faceFeedbackBox.width = VIEWPORT_SIZE.width;
      faceFeedbackBox.height = VIEWPORT_SIZE.height;
      faceFeedbackBox.style.cssText = canvasStyle + 'z-index: 10001 !important;';
      
      // Force WebGazer to recalculate face overlay scaling
      if (window.webgazer && window.webgazer.getVideoElementCanvas) {
        try {
          const canvas = window.webgazer.getVideoElementCanvas();
          if (canvas) {
            canvas.width = VIEWPORT_SIZE.width;
            canvas.height = VIEWPORT_SIZE.height;
          }
        } catch (e) {
          console.warn('Could not update video element canvas:', e);
        }
      }
    }
    
    const faceOverlay = document.querySelector('#webgazerFaceOverlay') as HTMLCanvasElement;
    if (faceOverlay) {
      faceOverlay.width = VIEWPORT_SIZE.width;
      faceOverlay.height = VIEWPORT_SIZE.height;
      faceOverlay.style.cssText = canvasStyle + 'z-index: 10002 !important;';
    }
    
    // Create or update style tag
    let styleTag = document.querySelector('#webgazer-viewport-styles') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'webgazer-viewport-styles';
      document.head.appendChild(styleTag);
    }
    
    // FIXED: Ensure no duplicate containers can be created
    styleTag.textContent = `
      /* Ensure single container */
      #webgazerVideoContainer {
        ${containerStyle}
      }
      
      #webgazerVideoContainer[data-initialized="true"] ~ #webgazerVideoContainer {
        display: none !important;
      }
      
      /* Video element */
      #webgazerVideoFeed {
        ${videoStyle}
      }
      
      /* All canvases must align */
      #webgazerVideoCanvas,
      #webgazerFaceFeedbackBox,
      #webgazerFaceOverlay {
        ${canvasStyle}
      }
      
      #webgazerFaceFeedbackBox {
        z-index: 10001 !important;
      }
      
      #webgazerFaceOverlay {
        z-index: 10002 !important;
      }
      
      /* Gaze dot */
      #webgazerGazeDot {
        position: fixed !important;
        z-index: 10003 !important;
      }
      
      /* Resolution indicator */
      #resolution-indicator {
        position: fixed;
        top: 260px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 10000;
        font-family: monospace;
      }
    `;
    
    console.log('✅ Viewport styling applied');
  }, 500);
};

// Verify actual resolution
const verifyActualResolution = (qualitySetting: QualitySetting): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const videoElement = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement;
      
      if (videoElement) {
        const actualWidth = videoElement.videoWidth;
        const actualHeight = videoElement.videoHeight;
        const expected = CAMERA_SETTINGS[qualitySetting];
        
        console.log('🔍 Resolution Verification:');
        console.log('   Quality Setting:', qualitySetting);
        console.log('   Expected:', `${expected.width}x${expected.height}`);
        console.log('   Actual:', `${actualWidth}x${actualHeight}`);
        console.log('   Display:', `${VIEWPORT_SIZE.width}x${VIEWPORT_SIZE.height}`);
        
        if (actualWidth === expected.width && actualHeight === expected.height) {
          console.log('✅ Resolution matches!');
        } else if (actualWidth > 0 && actualHeight > 0) {
          console.warn('⚠️ Resolution differs (camera limitation)');
        }
        
        resolve({ width: actualWidth, height: actualHeight });
      } else {
        console.error('❌ Video element not found');
        resolve({ width: 0, height: 0 });
      }
    }, 1000);
  });
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
  const [quality, setQualityState] = useState<QualitySetting>(getPersistedQuality);
  const [actualResolution, setActualResolution] = useState<{ width: number; height: number } | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  
  const updateQuality = useCallback((nextQuality: QualitySetting) => {
    console.log('📹 Setting camera quality:', nextQuality);
    setQualityState(nextQuality);
    
    try {
      localStorage.setItem(QUALITY_STORAGE_KEY, nextQuality);
    } catch (error) {
      console.warn('Failed to persist quality:', error);
    }
    
    if (hasWebgazerStarted.current && window.webgazer) {
      console.log('🔄 Restarting with new quality');
      const currentGameState = gameState;
      safelyEndWebgazer();
      setTimeout(() => {
        startSessionWithQuality(nextQuality);
        setGameState(currentGameState);
      }, 200); // Slightly longer delay for cleanup
    }
  }, [gameState]);

  const validationGazePoints = useRef<{ x: number; y: number }[]>([]);
  const hasWebgazerStarted = useRef(false);
  const startupLock = useRef(false); // FIXED: Prevent concurrent starts

  const safelyEndWebgazer = useCallback(() => {
    if (!window.webgazer || !hasWebgazerStarted.current) {
      return;
    }
    try {
      console.log('🛑 Stopping WebGazer');
      window.webgazer.clearGazeListener();
      window.webgazer.pause();
      window.webgazer.end();
      cleanupAllWebgazerElements();
    } catch (error) {
      console.error('Failed to stop WebGazer', error);
    } finally {
      hasWebgazerStarted.current = false;
      startupLock.current = false;
      setActualResolution(null);
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

  // Show/hide prediction points
  useEffect(() => {
    if (!isReady || !window.webgazer) return;
    const shouldShow = gameState === 'validating' || gameState === 'calibrating';
    window.webgazer.showPredictionPoints(shouldShow);
  }, [gameState, isReady]);

  // Face detection
  useEffect(() => {
    if (gameState !== 'webcamCheck' || !window.webgazer) return;
    
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

  // Start session with specific quality
  const startSessionWithQuality = useCallback(async (qualitySetting: QualitySetting) => {
    if (!isReady || !window.webgazer) return;
    
    // FIXED: Prevent duplicate starts
    if (startupLock.current) {
      console.warn('⚠️ WebGazer startup already in progress');
      return;
    }
    startupLock.current = true;
    
    // FIXED: Clean up any existing elements first
    cleanupAllWebgazerElements();
    
    console.log('🚀 Starting WebGazer session');
    console.log('   Quality:', qualitySetting);
    console.log('   Target:', CAMERA_SETTINGS[qualitySetting]);
    
    setValidationError(null);
    setGazeStability(null);
    setCalStage3SuccessRate(null);
    setIsValidationSuccessful(false);
    validationGazePoints.current = [];

    // Set constraints BEFORE begin()
    if (window.webgazer.setCameraConstraints) {
      const settings = CAMERA_SETTINGS[qualitySetting];
      window.webgazer.setCameraConstraints({
        video: {
          width: { ideal: settings.width },
          height: { ideal: settings.height },
          frameRate: { ideal: settings.frameRate },
        },
      });
    }

    window.webgazer.setTracker('TFFacemesh');
    window.webgazer.setRegression('ridge');
    
    if (window.webgazer.params) {
      window.webgazer.params.checkClick = false;
      window.webgazer.params.checkMove = false;
    }
    
    window.webgazer.begin();
    hasWebgazerStarted.current = true;
    window.webgazer.applyKalmanFilter(USE_KALMAN_FILTER);

    // Apply viewport with quality for proper scaling
    setFixedViewport(qualitySetting);
    
    // Verify resolution
    const resolution = await verifyActualResolution(qualitySetting);
    setActualResolution(resolution);
    
    // Update indicator
    let indicator = document.querySelector('#resolution-indicator') as HTMLDivElement;
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'resolution-indicator';
      document.body.appendChild(indicator);
    }
    indicator.textContent = `${qualitySetting.toUpperCase()}: ${resolution.width}x${resolution.height} → ${VIEWPORT_SIZE.width}x${VIEWPORT_SIZE.height}`;
    
    // Apply viewport again to ensure alignment
    setTimeout(() => setFixedViewport(qualitySetting), 1000);
    
    startupLock.current = false;
    setGameState('webcamCheck');
  }, [isReady]);

  // Start WebGazer session
  const startSession = useCallback(() => {
    startSessionWithQuality(quality);
  }, [quality, startSessionWithQuality]);

  // Stop WebGazer session
  const stopSession = useCallback(() => {
    console.log('🛑 Stopping WebGazer session');
    safelyEndWebgazer();
    setGameState('idle');
    setLiveGaze({ x: null, y: null });
  }, [safelyEndWebgazer]);

  // Pause WebGazer session
  const pauseSession = useCallback(() => {
    console.log('⏸️ Pausing WebGazer session');
    safelyPauseWebgazer();
    setLiveGaze({ x: null, y: null });
  }, [safelyPauseWebgazer]);

  const handleWebcamCheckComplete = useCallback(() => {
    setGameState('calibrating');
  }, []);

  const handleCalibrationComplete = useCallback(() => {
    setGameState('confirmValidation');
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
    if (!isReady || !window.webgazer) return;
    if (gameState !== 'validating' && gameState !== 'calibrating') return;

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
    if (gameState !== 'validating' || !window.webgazer) return;

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
    actualResolution,
    isFaceDetected,
    startSession,
    stopSession,
    pauseSession,
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