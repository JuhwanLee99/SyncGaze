// src/components/GazeTracker/GazeTracker.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './GazeTracker.css';

// 분리된 파일들 import
import { GameState, DataRecord, TaskResult, DotPosition } from './types';
import { FORBIDDEN_ZONE, TOTAL_TASKS } from './constants';
import Instructions from './Instructions';
import WebcamCheck from './WebcamCheck';
import Calibration from './Calibration';
import Validation from './Validation';
import Task from './Task';
import Results from './Results';

// 품질별 카메라 설정 값을 상수로 정의
const CAMERA_SETTINGS = {
  low: { width: 640, height: 480, frameRate: 30 },
  medium: { width: 1280, height: 720, frameRate: 30 },
  high: { width: 1280, height: 720, frameRate: 60 },
};
// 품질 설정을 위한 타입 정의
type QualitySetting = 'low' | 'medium' | 'high';
// 회귀 모델 선택을 위한 타입과 상태 추가
type RegressionModel = 'ridge' | 'threadedRidge' | 'weightedRidge';

// A/B 테스트 및 로깅을 위한 파라미터 상수화
const USE_KALMAN_FILTER = true; 
const CALIBRATION_DWELL_RADIUS = 150; 


const GazeTracker: React.FC = () => {
  // --- 상태 관리 (State Management) ---
  const [gameState, setGameState] = useState<GameState>('idle');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const collectedData = useRef<DataRecord[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [currentDot, setCurrentDot] = useState<DotPosition | null>(null);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const taskStartTime = useRef<number | null>(null);
  const [validationError, setValidationError] = useState<number | null>(null);
  const validationGazePoints = useRef<{ x: number; y: number }[]>([]);
  const [screenSize, setScreenSize] = useState<{ width: number; height: number } | null>(null); 
  const [quality, setQuality] = useState<QualitySetting>('medium');
  const [regressionModel, setRegressionModel] = useState<RegressionModel>('ridge'); 
  const [liveGaze, setLiveGaze] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  // --- 변경/추가 ---
  // 2. 캘리브레이션 품질 지표 저장을 위한 state 추가
  const [recalibrationCount, setRecalibrationCount] = useState(0);
  const [gazeStability, setGazeStability] = useState<number | null>(null); // 시선 안정성 (표준편차)
  const [calStage3SuccessRate, setCalStage3SuccessRate] = useState<number | null>(null); // 캘리브레이션 3단계 성공률
  // --- 변경/추가 끝 ---


  // --- useEffect 훅 (Side Effects) ---

  // WebGazer.js 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/webgazer.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      if (window.webgazer) window.webgazer.end();
    };
  }, []);

  // gameState에 따른 시선 예측 점(빨간 점) 표시 여부 제어
  useEffect(() => {
    if (!isScriptLoaded || !window.webgazer) return;
    const shouldShow = gameState === 'validating' || gameState === 'task';
    window.webgazer.showPredictionPoints(shouldShow);
  }, [gameState, isScriptLoaded]);

  // 정확도 측정 로직
  useEffect(() => {
    if (gameState !== 'validating') return;
    
    // --- 변경/추가 ---
    // 측정 시작 시 기존 안정성/오차 값 초기화
    validationGazePoints.current = [];
    setValidationError(null);
    setGazeStability(null);
    // --- 변경/추가 끝 ---

    const validationListener = (data: any) => {
      if (data) validationGazePoints.current.push({ x: data.x, y: data.y });
    };
    window.webgazer.setGazeListener(validationListener);

    const timer = setTimeout(() => {
      window.webgazer.clearGazeListener();
      if (validationGazePoints.current.length === 0) {
        alert("시선이 감지되지 않았습니다. 재보정을 진행합니다.");
        handleRecalibrate(); // handleRecalibrate가 recalibrationCount를 증가시킴
        return;
      }

      // --- 변경/추가 ---
      // 1. 평균 계산 (기존 로직)
      const avgGaze = validationGazePoints.current.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
      );
      avgGaze.x /= validationGazePoints.current.length;
      avgGaze.y /= validationGazePoints.current.length;

      // 2. 평균 오차 계산 (기존 로직)
      const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const error = Math.sqrt(Math.pow(target.x - avgGaze.x, 2) + Math.pow(target.y - avgGaze.y, 2));
      setValidationError(error);

      // 3. 시선 안정성 (표준 편차) 계산
      const sumSqDiffX = validationGazePoints.current.reduce((acc, p) => acc + Math.pow(p.x - avgGaze.x, 2), 0);
      const sumSqDiffY = validationGazePoints.current.reduce((acc, p) => acc + Math.pow(p.y - avgGaze.y, 2), 0);
      const stdDevX = Math.sqrt(sumSqDiffX / validationGazePoints.current.length);
      const stdDevY = Math.sqrt(sumSqDiffY / validationGazePoints.current.length);
      
      // X, Y 표준편차의 평균을 시선 안정성 지표로 사용
      const stability = (stdDevX + stdDevY) / 2;
      setGazeStability(stability);
      // --- 변경/추가 끝 ---

    }, 3000);
    return () => clearTimeout(timer);
  }, [gameState]); // handleRecalibrate가 useCallback으로 감싸져 있지 않다면 dependency list에 추가해야 할 수 있으나, 현재 구조에서는 괜찮음.

  // 과제용 랜덤 점 생성
  useEffect(() => {
    if (gameState === 'task' && taskCount < TOTAL_TASKS) {
      let x, y;
      const padding = 50;
      do {
        x = Math.floor(Math.random() * (window.innerWidth - padding * 2)) + padding;
        y = Math.floor(Math.random() * (window.innerHeight - padding * 2)) + padding;
      } while (x < FORBIDDEN_ZONE.width && y < FORBIDDEN_ZONE.height);
      setCurrentDot({ x, y });
      taskStartTime.current = performance.now();
    }
  }, [gameState, taskCount]);

  // 데이터 수집 리스너
  useEffect(() => {
    if (gameState !== 'task' || !window.webgazer) return;
    const gazeListener = (data: any) => {
      if (data) {
        collectedData.current.push({
          timestamp: performance.now(), taskId: taskCount + 1,
          targetX: currentDot?.x ?? null, targetY: currentDot?.y ?? null,
          gazeX: data.x, gazeY: data.y, mouseX: null, mouseY: null,
        });
      }
    };
    window.webgazer.setGazeListener(gazeListener);
    const mouseMoveListener = (event: MouseEvent) => {
      collectedData.current.push({
        timestamp: performance.now(), taskId: taskCount + 1,
        targetX: currentDot?.x ?? null, targetY: currentDot?.y ?? null,
        gazeX: null, gazeY: null, mouseX: event.clientX, mouseY: event.clientY,
      });
    };
    document.addEventListener('mousemove', mouseMoveListener);
    return () => {
      window.webgazer.clearGazeListener();
      document.removeEventListener('mousemove', mouseMoveListener);
    };
  }, [gameState, taskCount, currentDot]);

  // 캘리브레이션 중에만 시선 데이터를 state에 업데이트하는 useEffect 추가
  useEffect(() => {
    if (gameState === 'calibrating' && window.webgazer) {
      const gazeListener = (data: any) => {
        if (data) {
          setLiveGaze({ x: data.x, y: data.y });
        }
      };
      window.webgazer.setGazeListener(gazeListener);
      return () => window.webgazer.clearGazeListener();
    }
  }, [gameState]);


  // --- 이벤트 핸들러 (Event Handlers) ---

  const handleStart = () => {
    setTaskResults([]);
    setScreenSize({ width: window.innerWidth, height: window.innerHeight }); 
    if (!isScriptLoaded) return;
    
    window.webgazer.setTracker('TFFacemesh');
    window.webgazer.setRegression('ridge');
    collectedData.current = [];
    window.webgazer.begin();
    window.webgazer.applyKalmanFilter(USE_KALMAN_FILTER); 

    // --- 변경/추가 ---
    // 시작 시 재보정 횟수 및 관련 지표 초기화
    setRecalibrationCount(0);
    setGazeStability(null);
    setValidationError(null);
    setCalStage3SuccessRate(null);
    // --- 변경/추가 끝 ---

    setGameState('webcamCheck');
  };

  const handleCalibrationStart = () => {
    if (!window.webgazer) return;
    const constraints = CAMERA_SETTINGS[quality];
    window.webgazer.setCameraConstraints({ video: constraints });
    window.webgazer.setRegression(regressionModel);
    setGameState('calibrating');
  };

  const handleCalibrationComplete = useCallback(() => {
    setGameState('confirmValidation');
  }, [setGameState]);

  // --- 변경/추가 ---
  // 캘리브레이션 3단계 성공률을 받는 콜백 함수
  const handleCalStage3Complete = useCallback((successRate: number) => {
    setCalStage3SuccessRate(successRate);
  }, []);
  // --- 변경/추가 끝 ---


  const handleRecalibrate = () => {
    setValidationError(null);
    setGazeStability(null); // --- 변경/추가 ---
    window.webgazer.clearData();
    setGameState('calibrating');
    
    // --- 변경/추가 ---
    // 재보정 횟수 증가
    setRecalibrationCount(prevCount => prevCount + 1);
    // --- 변경/추가 끝 ---
  };
  

  const handleTaskDotClick = (event: React.MouseEvent<HTMLDivElement>) => {
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
        gazeToTargetDistance = Math.sqrt(Math.pow(targetPos.x - lastGazePos.x!, 2) + Math.pow(targetPos.y - lastGazePos.y!, 2));
      }
      gazeToClickDistance = Math.sqrt(Math.pow(clickPos.x - lastGazePos.x!, 2) + Math.pow(clickPos.y - lastGazePos.y!, 2));
    }

    setTaskResults(prevResults => [...prevResults, { taskId: taskCount + 1, timeTaken, gazeToTargetDistance, gazeToClickDistance }]);

    if (taskCount < TOTAL_TASKS - 1) {
      setTaskCount(taskCount + 1);
    } else {
      setGameState('finished');
      if (window.webgazer) window.webgazer.end();
    }
  };

  const downloadCSV = () => {
    // 1. 시스템 환경 메타데이터
    const systemMetaData = [
      `# --- System & Environment Settings ---`,
      `# Camera Quality: ${quality}`,
      `# Regression Model: ${regressionModel}`,
      `# Kalman Filter Enabled: ${USE_KALMAN_FILTER}`,
      `# Calibration Dwell Radius (px): ${CALIBRATION_DWELL_RADIUS}`,
    ].join('\n');

    // --- 변경/추가 ---
    // 2. 측정 메타데이터 (캘리브레이션 품질 지표 포함)
    const measurementMetaData = [
      `# --- Measurement Results ---`,
      `# Screen Size (width x height): ${screenSize ? `${screenSize.width}x${screenSize.height}` : 'N/A'}`,
      `# Recalibration Count: ${recalibrationCount}`,
      `# Calibration Stage 3 Success Rate: ${calStage3SuccessRate ? (calStage3SuccessRate * 100).toFixed(1) + '%' : 'N/A'}`,
      `# Validation Error (pixels): ${validationError ? validationError.toFixed(2) : 'N/A'}`,
      `# Gaze Stability (Avg. StdDev px): ${gazeStability ? gazeStability.toFixed(2) : 'N/A'}`,
    ].join('\n');
    // --- 변경/추가 끝 ---

    const header = 'timestamp,taskId,targetX,targetY,gazeX,gazeY,mouseX,mouseY';
    const rows = collectedData.current.map(d => `${d.timestamp},${d.taskId ?? ''},${d.targetX ?? ''},${d.targetY ?? ''},${d.gazeX ?? ''},${d.gazeY ?? ''},${d.mouseX ?? ''},${d.mouseY ?? ''}`).join('\n');
    
    const csvContent = `${systemMetaData}\n${measurementMetaData}\n\n${header}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'gaze_mouse_task_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UI 렌더링 (Rendering) ---
  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return <Instructions onStart={handleStart} isScriptLoaded={isScriptLoaded} />;
      case 'webcamCheck':
        return <WebcamCheck quality={quality} onQualityChange={setQuality} regressionModel={regressionModel} onRegressionChange={setRegressionModel}onComplete={handleCalibrationStart} />;
      case 'calibrating':
        // --- 변경/추가 ---
        // 캘리브레이션 3단계 성공률 콜백 함수 전달
        return <Calibration 
                  onComplete={handleCalibrationComplete} 
                  liveGaze={liveGaze} 
                  onCalStage3Complete={handleCalStage3Complete} 
                />;
        // --- 변경/추가 끝 ---
      case 'confirmValidation':
         return ( 
          <div className="validation-container">
            <div className="confirmation-box">
              <h2>캘리브레이션 완료</h2>
              <p>이제 정확도 측정 단계로 진행합니다.</p>
              <button onClick={() => setGameState('validating')}>정확도 측정 시작</button>
            </div>
          </div>
        );
      case 'validating':
        // --- 변경/추가 ---
        // 시선 안정성(gazeStability) 값도 Validation 컴포넌트로 전달 (표시용)
        return <Validation 
                  validationError={validationError} 
                  gazeStability={gazeStability} // <-- 추가
                  onRecalibrate={handleRecalibrate} 
                  onStartTask={() => setGameState('task')} 
                />;
        // --- 변경/추가 끝 ---
      case 'task':
        return <Task taskCount={taskCount} currentDot={currentDot} onDotClick={handleTaskDotClick} />;
      case 'finished':
        return <Results taskResults={taskResults} onDownload={downloadCSV} screenSize={screenSize} />;
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <h1>시선 & 마우스 추적 데모</h1>
      {renderContent()}
    </div>
  );
};

export default GazeTracker;