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
  medium: { width: 1280, height: 720, frameRate: 60 },
  high: { width: 1920, height: 1080, frameRate: 60 },
};
// 품질 설정을 위한 타입 정의
type QualitySetting = 'low' | 'medium' | 'high';
// 회귀 모델 선택을 위한 타입과 상태 추가
type RegressionModel = 'ridge' | 'threadedRidge' | 'weightedRidge';

// A/B 테스트 및 로깅을 위한 파라미터 상수화
const USE_KALMAN_FILTER = true;
// --- 3단계 복원 ---
const CALIBRATION_DWELL_RADIUS = 150; // 3단계 Dwell Radius 복원
// --- 복원 끝 ---


const GazeTracker: React.FC = () => {
  // --- 1. 상태 관리 (State Management) ---
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

  // 2. 캘리브레이션 품질 지표 state
  const [recalibrationCount, setRecalibrationCount] = useState(0);
  const [gazeStability, setGazeStability] = useState<number | null>(null);
  // --- 3단계 복원 ---
  const [calStage3SuccessRate, setCalStage3SuccessRate] = useState<number | null>(null);
  // --- 복원 끝 ---

  // 3. 과제 수행 파생 데이터 state
  const [avgGazeMouseDivergence, setAvgGazeMouseDivergence] = useState<number | null>(null);
  const [avgGazeTimeToTarget, setAvgGazeTimeToTarget] = useState<number | null>(null);
  
  // Results.tsx에서 계산하던 통계 2개를 GazeTracker state로 이동
  const [avgClickTimeTaken, setAvgClickTimeTaken] = useState<number | null>(null);
  const [avgGazeToClickError, setAvgGazeToClickError] = useState<number | null>(null);
  
  // 각 과제의 시작 시간을 기록하기 위한 ref
  const taskStartTimes = useRef<Record<number, number>>({});
  
  // 2. 사전 검증 단계 강화 (수정)
  // WebGazer의 얼굴 감지 상태를 저장 (boolean으로 변경)
  const [isGazeDetected, setIsGazeDetected] = useState(false);

  // --- Vercel Blob 업로드 상태 추가 ---
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');


  // --- 2. 이벤트 핸들러 (Event Handlers) ---

  const handleRecalibrate = useCallback(() => {
    setValidationError(null);
    setGazeStability(null);
    window.webgazer.clearData();
    setGameState('calibrating');
    
    setRecalibrationCount(prevCount => prevCount + 1);
  }, []);

  const handleCalibrationComplete = useCallback(() => {
    setGameState('confirmValidation');
  }, []);

  // --- 3단계 복원 ---
  const handleCalStage3Complete = useCallback((successRate: number) => {
    setCalStage3SuccessRate(successRate);
  }, []);
  // --- 복원 끝 ---

  const handleStart = () => {
    setTaskResults([]);
    setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    if (!isScriptLoaded) return;
    
    window.webgazer.setTracker('TFFacemesh');
    window.webgazer.setRegression('ridge');
    collectedData.current = [];

    // --- '선별적' 자가 보정 (수정) ---
    // (1단계) 기본(Default) 리스너 중지
    // webgazer.begin()이 호출되기 전에 파라미터를 설정합니다.
    // 'checkClick'과 'checkMove'를 false로 설정하여,
    // WebGazer가 '모든' 클릭과 마우스 이동을
    // 자동으로 학습하는 기본 동작을 중지시킵니다.
    if (window.webgazer.params) {
      window.webgazer.params.checkClick = false;
      window.webgazer.params.checkMove = false;
      console.log("WebGazer default click/move listeners DISABLED for selective calibration.");
    }
    
    window.webgazer.begin(); 
    window.webgazer.applyKalmanFilter(USE_KALMAN_FILTER);

    // 모든 지표 초기화
    setRecalibrationCount(0);
    setGazeStability(null);
    setValidationError(null);
    setCalStage3SuccessRate(null);
    setAvgGazeMouseDivergence(null);
    setAvgGazeTimeToTarget(null);
    setAvgClickTimeTaken(null);
    setAvgGazeToClickError(null);
    setIsGazeDetected(false); // 얼굴 감지 상태 초기화
    setUploadStatus('idle'); // 업로드 상태 초기화

    taskStartTimes.current = {};

    setGameState('webcamCheck');
  };

  const handleCalibrationStart = () => {
    if (!window.webgazer) return;
    // webgazerCheck 상태에서 사용한 GazeListener를 정리합니다.
    window.webgazer.clearGazeListener();
    
    const constraints = CAMERA_SETTINGS[quality];
    window.webgazer.setCameraConstraints({ video: constraints });
    window.webgazer.setRegression(regressionModel);
    setGameState('calibrating');
  };
  
  const handleTaskDotClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // '선별적 자가 보정' 로직 (수정됨)
    if (window.webgazer && typeof window.webgazer.recordScreenPosition === 'function') {
      window.webgazer.recordScreenPosition(
        event.clientX,
        event.clientY,
        'click' 
      );
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

  // 3.1. 파생 데이터 계산 함수 (useCallback으로 감쌈)
  const analyzeTaskData = useCallback(() => {
    const data = collectedData.current;
    if (data.length === 0) return;

    // 3.1.1. 평균 시선-마우스 이격도
    let lastMousePos = { x: 0, y: 0 };
    const divergences: number[] = [];
    for (const record of data) {
      if (record.mouseX !== null && record.mouseY !== null) {
        lastMousePos = { x: record.mouseX, y: record.mouseY };
      }
      if (record.gazeX !== null && record.gazeY !== null && lastMousePos.x !== 0) {
        const dist = Math.sqrt(Math.pow(record.gazeX - lastMousePos.x, 2) + Math.pow(record.gazeY - lastMousePos.y, 2));
        divergences.push(dist);
      }
    }
    if (divergences.length > 0) {
      const avgDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;
      setAvgGazeMouseDivergence(avgDivergence);
    }

    // 3.1.2. 평균 시선 반응 속도
    const reactionTimes: number[] = [];
    const GAZE_HIT_RADIUS = 100;
    for (let i = 1; i <= TOTAL_TASKS; i++) {
      const startTime = taskStartTimes.current[i];
      if (!startTime) continue;
      const taskGazeEvents = data.filter(d => d.taskId === i && d.gazeX !== null && d.timestamp >= startTime);
      if (taskGazeEvents.length === 0) continue;
      const target = { x: taskGazeEvents[0].targetX, y: taskGazeEvents[0].targetY };
      if (target.x === null || target.y === null) continue;
      for (const event of taskGazeEvents) {
        const dist = Math.sqrt(Math.pow(event.gazeX! - target.x, 2) + Math.pow(event.gazeY! - target.y, 2));
        if (dist < GAZE_HIT_RADIUS) {
          reactionTimes.push(event.timestamp - startTime);
          break;
        }
      }
    }
    if (reactionTimes.length > 0) {
      const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
      setAvgGazeTimeToTarget(avgReactionTime);
    }
  }, []); // collectedData.current는 ref이므로 의존성 배열에 필요 없음


  // --- (신규) CSV 콘텐츠 생성 로직 분리 ---
  const generateCsvContent = useCallback(() => {
    // 0. (신규) sessionStorage에서 설문조사 및 동의 데이터 가져오기
    const surveyDataString = sessionStorage.getItem('surveyData');
    const consentTimestamp = sessionStorage.getItem('consentTimestamp');
    let participantMetaData = [`# --- Participant Survey & Consent ---`];

    if (surveyDataString) {
      try {
        // SurveyData 타입을 여기서 다시 정의하거나 any로 캐스팅합니다.
        // 간단하게 any를 사용하겠습니다.
        const surveyData: any = JSON.parse(surveyDataString);
        participantMetaData.push(`# Survey Age Check: ${surveyData.ageCheck}`);
        participantMetaData.push(`# Survey Webcam Check: ${surveyData.webcamCheck}`);
        participantMetaData.push(`# Survey Games Played: ${Array.isArray(surveyData.gamesPlayed) ? surveyData.gamesPlayed.join('; ') : surveyData.gamesPlayed}`);
        participantMetaData.push(`# Survey Main Game: ${surveyData.mainGame}`);
        participantMetaData.push(`# Survey In-Game Rank: ${surveyData.inGameRank}`);
        participantMetaData.push(`# Survey Play Time: ${surveyData.playTime}`);
        participantMetaData.push(`# Survey Self-Assessment: ${surveyData.selfAssessment}`);
      } catch (e: any) {
        participantMetaData.push(`# Error Parsing Survey Data: ${e.message}`);
      }
    } else {
      participantMetaData.push(`# Survey Data: NOT_FOUND`);
    }
    participantMetaData.push(`# Consent Timestamp: ${consentTimestamp || 'NOT_FOUND'}`);
    const participantMetaDataCSV = participantMetaData.join('\n');

    // 1. 시스템 환경 메타데이터
    const systemMetaData = [
      `# --- System & Environment Settings ---`,
      `# Camera Quality: ${quality}`,
      `# Regression Model: ${regressionModel}`,
      `# Kalman Filter Enabled: ${USE_KALMAN_FILTER}`,
      `# Calibration Dwell Radius (px): ${CALIBRATION_DWELL_RADIUS}`,
    ].join('\n');

    // 2. 측정 메타데이터 (요약 지표)
    const measurementMetaData = [
      `# --- Measurement Summary ---`,
      `# Screen Size (width x height): ${screenSize ? `${screenSize.width}x${screenSize.height}` : 'N/A'}`,
      `# Recalibration Count: ${recalibrationCount}`,
      `# Calibration Stage 3 Success Rate: ${calStage3SuccessRate ? (calStage3SuccessRate * 100).toFixed(1) + '%' : 'N/A'}`,
      `# Validation Error (pixels): ${validationError ? validationError.toFixed(2) : 'N/A'}`,
      `# Gaze Stability (Avg. StdDev px): ${gazeStability ? gazeStability.toFixed(2) : 'N/A'}`,
      '', // 항목 사이 공백
      `# --- Derived Task Metrics ---`,
      `# Avg. Click Time Taken (ms): ${avgClickTimeTaken ? avgClickTimeTaken.toFixed(2) : 'N/A'}`,
      `# Avg. Gaze-to-Click Error (px): ${avgGazeToClickError ? avgGazeToClickError.toFixed(2) : 'N/A'}`,
      `# Avg. Gaze-Mouse Divergence (px): ${avgGazeMouseDivergence ? avgGazeMouseDivergence.toFixed(2) : 'N/A'}`,
      `# Avg. Gaze Time-to-Target (ms): ${avgGazeTimeToTarget ? avgGazeTimeToTarget.toFixed(2) : 'N/A'}`,
    ].join('\n');

    // 3. 개별 과제 결과 (taskResults state 기반)
    const taskResultsHeader = `# --- Individual Task Results ---`;
    const taskResultsColumns = `taskId,timeTaken(ms),gazeToTargetDistance(px),gazeToClickDistance(px)`;
    const taskResultsRows = taskResults.map(r =>
      `${r.taskId},${r.timeTaken.toFixed(2)},${r.gazeToTargetDistance !== null ? r.gazeToTargetDistance.toFixed(2) : 'N/A'},${r.gazeToClickDistance !== null ? r.gazeToClickDistance.toFixed(2) : 'N/A'}`
    ).join('\n');
    const taskResultsCSV = `${taskResultsHeader}\n${taskResultsColumns}\n${taskResultsRows}`;

    // 4. 원시 데이터 (Raw Data)
    const rawDataHeader = `# --- Raw Gaze & Mouse Data --- \n# (Note: gazeX/gazeY and mouseX/mouseY are mutually exclusive per row)`;
    const rawDataColumns = 'timestamp,taskId,targetX,targetY,gazeX,gazeY,mouseX,mouseY';
    const rawDataRows = collectedData.current.map(d => `${d.timestamp},${d.taskId ?? ''},${d.targetX ?? ''},${d.targetY ?? ''},${d.gazeX ?? ''},${d.gazeY ?? ''},${d.mouseX ?? ''},${d.mouseY ?? ''}`).join('\n');
    const rawDataCSV = `${rawDataHeader}\n${rawDataColumns}\n${rawDataRows}`;

    // 5. 모든 CSV 섹션 조합
    const csvContent = `${participantMetaDataCSV}\n\n${systemMetaData}\n\n${measurementMetaData}\n\n${taskResultsCSV}\n\n${rawDataCSV}`;
    
    return csvContent;
  }, [
    quality, regressionModel, screenSize, recalibrationCount, calStage3SuccessRate,
    validationError, gazeStability, avgClickTimeTaken, avgGazeToClickError,
    avgGazeMouseDivergence, avgGazeTimeToTarget, taskResults
  ]);


  // --- (수정) 3.2. CSV 다운로드 함수 ---
  // 이제 분리된 generateCsvContent()를 호출합니다.
  const downloadCSV = () => {
    // 1. CSV 콘텐츠 생성
    const csvContent = generateCsvContent();

    // 2. Blob 생성 및 다운로드 링크 클릭
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'gaze_mouse_task_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 3. (기존) 다운로드 후 스토리지 비우기
    sessionStorage.removeItem('surveyData');
    sessionStorage.removeItem('consentTimestamp');
  };

  // --- 3. useEffect 훅 (Side Effects) ---

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
    
    // --- 수정 ---
    // 'validating' (정확도 측정)과 'task' (과제 수행) 상태에서만
    // 시선 예측 점(빨간 점)을 표시합니다.
    // 'webcamCheck' 상태에서는 빨간 점을 숨겨 사용자가
    // 예측 점에 영향을 받지 않고 얼굴 인식(녹색 사각형)만 확인하도록 합니다.
    const shouldShow = gameState === 'validating' || gameState === 'task';
    window.webgazer.showPredictionPoints(shouldShow);
  }, [gameState, isScriptLoaded]);

  // 정확도 측정 로직
  useEffect(() => {
    if (gameState !== 'validating') return;
    
    validationGazePoints.current = [];
    setValidationError(null);
    setGazeStability(null);

    const validationListener = (data: any) => {
      if (data) validationGazePoints.current.push({ x: data.x, y: data.y });
    };
    window.webgazer.setGazeListener(validationListener);

    const timer = setTimeout(() => {
      window.webgazer.clearGazeListener();
      if (validationGazePoints.current.length === 0) {
        alert("시선이 감지되지 않았습니다. 재보정을 진행합니다.");
        handleRecalibrate();
        return;
      }

      const avgGaze = validationGazePoints.current.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
      );
      avgGaze.x /= validationGazePoints.current.length;
      avgGaze.y /= validationGazePoints.current.length;

      const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const error = Math.sqrt(Math.pow(target.x - avgGaze.x, 2) + Math.pow(target.y - avgGaze.y, 2));
      setValidationError(error);

      const sumSqDiffX = validationGazePoints.current.reduce((acc, p) => acc + Math.pow(p.x - avgGaze.x, 2), 0);
      const sumSqDiffY = validationGazePoints.current.reduce((acc, p) => acc + Math.pow(p.y - avgGaze.y, 2), 0);
      const stdDevX = Math.sqrt(sumSqDiffX / validationGazePoints.current.length);
      const stdDevY = Math.sqrt(sumSqDiffY / validationGazePoints.current.length);
      
      const stability = (stdDevX + stdDevY) / 2;
      setGazeStability(stability);

    }, 3000);
    return () => clearTimeout(timer);
  }, [gameState, handleRecalibrate]);

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
      
      const startTime = performance.now();
      taskStartTime.current = startTime;
      taskStartTimes.current[taskCount + 1] = startTime;
    }
  }, [gameState, taskCount]);

  // 데이터 수집 리스너
  useEffect(() => {
    if (gameState !== 'task' || !window.webgazer) return;
    
    // 1. 시선 데이터 수집 리스너
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
    
    // 2. 마우스 데이터 수집 리스너
    const mouseMoveListener = (event: MouseEvent) => {
      // 2.1. (기존) 데이터 수집
      collectedData.current.push({
        timestamp: performance.now(), taskId: taskCount + 1,
        targetX: currentDot?.x ?? null, targetY: currentDot?.y ?? null,
        gazeX: null, gazeY: null, mouseX: event.clientX, mouseY: event.clientY,
      });
      
      // --- 3. '선별적' 자가 보정 (수정) ---
      // 'mousemove'는 '노이즈'로 간주하므로,
      // WebGazer가 학습하지 않도록 관련 코드를 모두 제거합니다.
      // --- 수정 끝 ---
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


  // gameState이 'webcamCheck'일 때 WebGazer의 시선 감지 리스너를 설정합니다.
  useEffect(() => {
    if (gameState === 'webcamCheck' && window.webgazer) {
      setIsGazeDetected(false); // 상태 초기화

      const gazeListener = (data: any) => {
        if (data && data.x !== null && data.y !== null) {
          setIsGazeDetected(true); // 감지 성공으로 상태 변경
          if (window.webgazer) {
            window.webgazer.clearGazeListener();
          }
        }
      };
      
      window.webgazer.setGazeListener(gazeListener);
      
      return () => {
        if (window.webgazer) {
          window.webgazer.clearGazeListener();
        }
      };
    }
  }, [gameState]);


  // --- (수정) gameState 'finished' 시, 통계 계산 *및* 자동 업로드 실행 ---
  useEffect(() => {
    // 1. 'finished' 상태가 아니면 아무것도 하지 않음
    if (gameState !== 'finished') {
      return;
    }

    // 2. (기존) 통계 계산
    analyzeTaskData();

    if (taskResults.length > 0) {
      const avgTime = taskResults.reduce((acc, r) => acc + r.timeTaken, 0) / taskResults.length;
      setAvgClickTimeTaken(avgTime);

      const validGazeToClick = taskResults.filter(r => r.gazeToClickDistance !== null);
      if (validGazeToClick.length > 0) {
        const avgError = validGazeToClick.reduce((acc, r) => acc + r.gazeToClickDistance!, 0) / validGazeToClick.length;
        setAvgGazeToClickError(avgError);
      } else {
        setAvgGazeToClickError(null);
      }
    }

    // 3. (신규) 자동 업로드 함수 정의 및 즉시 실행 (IIFE)
    (async () => {
      // state 계산이 완료될 때까지 잠시 대기 (안전을 위해)
      await new Promise(resolve => setTimeout(resolve, 0)); 
      
      setUploadStatus('uploading');
      
      // 3.1. CSV 콘텐츠 생성 (분리된 함수 호출)
      const csvContent = generateCsvContent();

      // 3.2. Vercel 서버리스 함수(/api/upload-csv)로 업로드 요청
      try {
        const response = await fetch('/api/upload-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8;',
          },
          body: csvContent,
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Upload Success:', result.url);
        setUploadStatus('success');

        // (선택 사항) 업로드 성공 시 스토리지 비우기
        // downloadCSV를 누를 때 이미 비워지므로, 이쪽이 더 적절할 수 있습니다.
        sessionStorage.removeItem('surveyData');
        sessionStorage.removeItem('consentTimestamp');

      } catch (error) {
        console.error('Upload Failed:', error);
        setUploadStatus('error');
      }
    })();
    
  // 의존성 배열에 generateCsvContent 추가
  }, [gameState, analyzeTaskData, taskResults, generateCsvContent]);


  // --- 4. UI 렌더링 (Rendering) ---
  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return <Instructions onStart={handleStart} isScriptLoaded={isScriptLoaded} />;
      case 'webcamCheck':
        return <WebcamCheck
                  quality={quality}
                  onQualityChange={setQuality}
                  regressionModel={regressionModel}
                  onRegressionChange={setRegressionModel}
                  onComplete={handleCalibrationStart}
                  isGazeDetected={isGazeDetected}
                />;
      case 'calibrating':
        return <Calibration
                  onComplete={handleCalibrationComplete}
                  liveGaze={liveGaze}
                  // --- 3단계 복원 ---
                  onCalStage3Complete={handleCalStage3Complete} 
                  // --- 복원 끝 ---
                />;
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
        return <Validation
                  validationError={validationError}
                  gazeStability={gazeStability}
                  onRecalibrate={handleRecalibrate}
                  onStartTask={() => {
                    setGameState('task');
                  }}
                />;
      case 'task':
        return <Task taskCount={taskCount} currentDot={currentDot} onDotClick={handleTaskDotClick} />;
      case 'finished':
        return <Results
                  taskResults={taskResults}
                  onDownload={downloadCSV}
                  screenSize={screenSize}
                  avgGazeMouseDivergence={avgGazeMouseDivergence}
                  avgGazeTimeToTarget={avgGazeTimeToTarget}
                  avgClickTimeTaken={avgClickTimeTaken}
                  avgGazeToClickError={avgGazeToClickError}
                  // (참고) 업로드 상태를 표시하려면 Results.tsx props 수정 필요
                  // uploadStatus={uploadStatus} 
                />;
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