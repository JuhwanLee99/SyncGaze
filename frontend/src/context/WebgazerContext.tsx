// frontend/src/context/WebgazerContext.tsx

import React, {createContext, useContext, useState, useEffect, ReactNode, useRef} from 'react';
// 1. 페이지 이동을 위해 useNavigate 훅을 import 합니다.
import { useNavigate } from 'react-router-dom';

// Webgazer 전역 타입을 선언합니다.
declare const webgazer: any;

// tracker-app/src/components/GazeTracker/types.ts 에서 필요한 타입
type QualitySetting = 'low' | 'medium' | 'high';
type RegressionModel = 'ridge' | 'weightedRidge' | 'threadedRidge';

// 2. Context가 제공해야 할 값들의 타입을 정의합니다.
// (tracker-app/TrackerLayout.tsx 의 providerValue 참고)
interface WebgazerContextType {
  // 기본 Webgazer 상태
  webgazerInstance: any;
  isInitialized: boolean;
  isCalibrated: boolean;
  setIsCalibrated: React.Dispatch<React.SetStateAction<boolean>>;
  startWebgazer: () => Promise<void>;
  stopWebgazer: () => Promise<void>;

  // --- tracker-app/TrackerLayout.tsx 로부터 가져온 상태 ---
  // WebcamCheck.tsx가 사용
  quality: QualitySetting;
  regressionModel: RegressionModel;
  isGazeDetected: boolean;
  setQuality: React.Dispatch<React.SetStateAction<QualitySetting>>;
  setRegressionModel: React.Dispatch<React.SetStateAction<RegressionModel>>;
  
  // Calibration.tsx가 사용
  liveGaze: { x: number | null; y: number | null };
  
  // Validation.tsx가 사용
  validationError: number | null;
  gazeStability: number | null;
  
  // ValidationPage.tsx (페이지)가 사용
  setValidationError: React.Dispatch<React.SetStateAction<number | null>>;
  setGazeStability: React.Dispatch<React.SetStateAction<number | null>>;
  validationGazePoints: React.MutableRefObject<{ x: number; y: number }[]>;

  // --- tracker-app/TrackerLayout.tsx 로부터 가져온 핸들러 ---
  handleStart: () => void;                 // Instructions -> WebcamCheck
  handleCalibrationStart: () => void;      // WebcamCheck -> Calibration
  handleCalibrationComplete: () => void;   // Calibration -> ConfirmValidation
  handleCalStage3Complete: (successRate: number) => void; // Calibration (내부)
  startValidation: () => void;             // ConfirmValidation -> Validation
  startTask: () => void;                   // Validation -> Dashboard (설정 완료)
  handleRecalibrate: () => void;           // Validation -> Calibration
}

// Context 생성 (기본값은 null)
const WebgazerContext = createContext<WebgazerContextType | null>(null);

// Provider 컴포넌트
export const WebgazerProvider = ({ children }: { children: ReactNode }) => {
  // 3. useNavigate 훅을 Provider 내부에서 초기화합니다.
  const navigate = useNavigate();

  // --- 기본 Webgazer 상태 ---
  const [webgazerInstance, setWebgazerInstance] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  // --- tracker-app/TrackerLayout.tsx 로부터 가져온 상태 ---
  const [quality, setQuality] = useState<QualitySetting>('medium');
  // TrackerLayout.tsx는 'ridge'를,
  // 이전 요청에서는 'tffacemesh'를 사용했습니다. tracker-app의 기본값('ridge')을 따르겠습니다.
  const [regressionModel, setRegressionModel] = useState<RegressionModel>('ridge'); 
  const [liveGaze, setLiveGaze] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isGazeDetected, setIsGazeDetected] = useState(false);
  const [validationError, setValidationError] = useState<number | null>(null);
  const [gazeStability, setGazeStability] = useState<number | null>(null);
  const [recalibrationCount, setRecalibrationCount] = useState(0);
  const validationGazePoints = useRef<{ x: number; y: number }[]>([]);

  // Webgazer 시작 함수 (모델 설정 포함)
  const startWebgazer = async () => {
    if (typeof webgazer !== 'undefined' && !isInitialized) {
      try {
        // 4. TrackerLayout.tsx 및 이전 요청에 따라 모델 설정
        await webgazer.setRegression(regressionModel); 
        await webgazer.setTracker('tffacemesh'); // 이전 요청(tffacemesh) 반영
        
        // TrackerLayout.tsx의 handleStart 로직
        await webgazer.begin();
        webgazer.showPredictionPoints(true); 
        webgazer.applyKalmanFilter(true); // (TrackerLayout.tsx의 USE_KALMAN_FILTER)
        
        setWebgazerInstance(webgazer);
        setIsInitialized(true);
        console.log('Webgazer initialized with ridge and tffacemesh');
      } catch (err) {
        console.error('Error initializing Webgazer:', err);
      }
    } else if (isInitialized) {
      console.log('Webgazer is already initialized.');
    } else {
      console.error('Webgazer script not loaded');
    }
  };

  // Webgazer 중지 함수
  const stopWebgazer = async () => {
    if (webgazerInstance && typeof webgazerInstance.end === 'function') {
      try {
        await webgazerInstance.end();
        setIsInitialized(false);
        setIsCalibrated(false);
        setWebgazerInstance(null);
        console.log('Webgazer stopped');
      } catch (err) {
        console.error('Error stopping Webgazer:', err);
      }
    }
  };

  // --- 5. tracker-app/TrackerLayout.tsx 의 핸들러들 구현 ---
  
  // Instructions.tsx가 호출
  const handleStart = async () => {
    if (!isInitialized) {
      await startWebgazer(); // webgazer 시작
    }
    // webgazer가 시작된 후 다음 페이지로 이동
    navigate('/setup/webcam-check');
  };

  // WebcamCheck.tsx가 호출
  const handleCalibrationStart = () => {
    if (webgazerInstance) {
      // TrackerLayout.tsx의 로직
      webgazerInstance.clearGazeListener(); 
      const constraints = { low: { width: 640, height: 480 }, medium: { width: 1280, height: 720 }, high: { width: 1920, height: 1080 } };
      webgazerInstance.setCameraConstraints({ video: constraints[quality] });
      webgazerInstance.setRegression(regressionModel);
    }
    navigate('/setup/calibrate');
  };
  
  // Calibration.tsx가 호출
  const handleCalibrationComplete = () => {
    setIsCalibrated(true); // 캘리브레이션 완료 상태 설정
    navigate('/setup/confirm-validation');
  };

  // Calibration.tsx가 호출
  const handleCalStage3Complete = (successRate: number) => {
    // (TrackerLayout.tsx와 동일)
    console.log(`Calibration Stage 3 Success Rate: ${successRate}`);
  };

  // ConfirmValidation.tsx가 호출
  const startValidation = () => {
    navigate('/setup/validate');
  };

  // Validation.tsx가 호출
  const startTask = () => {
    // 설정 완료. 계획한 '/dashboard'로 이동
    console.log('Gaze setup complete. Navigating to dashboard...');
    navigate('/dashboard'); 
  };

  // Validation.tsx가 호출
  const handleRecalibrate = () => {
    // TrackerLayout.tsx의 로직
    setValidationError(null);
    setGazeStability(null);
    if (webgazerInstance) webgazerInstance.clearData();
    setRecalibrationCount(prevCount => prevCount + 1);
    setIsCalibrated(false); // 재보정이 필요함
    navigate('/setup/calibrate'); // 재보정 시 캘리브레이션 페이지로
  };

  // --- 6. tracker-app/TrackerLayout.tsx 의 Gaze 리스너 useEffect ---
  // (WebcamCheck 및 Calibration 페이지에서 사용)
  useEffect(() => {
    if (!isInitialized || !webgazerInstance) return;

    // Validation 페이지는 자체 로직(타이머)이 있으므로 이 리스너는
    // WebcamCheck (시선 감지)와 Calibration (실시간 점 추적)에만 필요합니다.
    
    const gazeListener = (data: any) => {
      if (data) {
        setLiveGaze({ x: data.x, y: data.y });
        
        // WebcamCheck.tsx를 위한 로직
        if (!isGazeDetected && data.x !== null && data.y !== null) {
          setIsGazeDetected(true);
        }
      }
    };
    
    webgazerInstance.setGazeListener(gazeListener);

    return () => {
      if (webgazerInstance) webgazerInstance.clearGazeListener();
    };
    
    // isGazeDetected를 의존성에 추가하여 감지되면 리스너 재설정을 멈추도록 함
  }, [isInitialized, webgazerInstance, isGazeDetected]);


  // 7. Context Provider에게 전달할 값
  const value = {
    webgazerInstance,
    isInitialized,
    isCalibrated,
    setIsCalibrated,
    startWebgazer,
    stopWebgazer,
    
    // 추가된 상태
    quality,
    regressionModel,
    isGazeDetected,
    liveGaze,
    validationError,
    gazeStability,
    
    // 추가된 상태 변경자
    setQuality,
    setRegressionModel,
    setValidationError,
    setGazeStability,
    validationGazePoints, // Ref는 setter가 필요 없음

    // 추가된 핸들러
    handleStart,
    handleCalibrationStart,
    handleCalibrationComplete,
    handleCalStage3Complete,
    startValidation,
    startTask,
    handleRecalibrate,
  };

  return (
    <WebgazerContext.Provider value={value}>
      {children}
    </WebgazerContext.Provider>
  );
};

// Context를 쉽게 사용하기 위한 Custom Hook (변경 없음)
export const useWebgazer = () => {
  const context = useContext(WebgazerContext);
  if (context === null) {
    throw new Error('useWebgazer must be used within a WebgazerProvider');
  }
  return context;
};