// src/components/GazeTracker/Calibration.tsx

import React, { useState, useEffect, useRef } from 'react';
import { CALIBRATION_DOTS } from './constants';

// 각 단계별 안내 페이지를 위한 내부 컴포넌트
const StageInstruction: React.FC<{ stage: number; onStart: () => void }> = ({ stage, onStart }) => {
  let title = '';
  let description = '';

  // --- 1. 3단계 제거 (수정) ---
  // 3단계(case 3)를 제거하고, 전체 단계를 2단계로 수정합니다.
  switch (stage) {
    case 1:
      title = '1단계: 초기 모델 생성';
      description = '화면에 나타나는 녹색 점이 원을 그리며 움직입니다. 눈으로 점을 최대한 부드럽게 따라가 주세요.';
      break;
    case 2:
      title = '2단계: 정밀 보정';
      description = '화면의 여러 위치에 빨간 점이 나타납니다. 각 점이 나타날 때마다 정확하게 3번씩 클릭해 주세요.';
      break;
    // case 3: 제거
  }

  return (
    <div className="instruction-box">
      {/* <h2>캘리브레이션 ({stage}/3)</h2> -> <h2>캘리브레이션 ({stage}/2)</h2> */}
      <h2>캘리브레이션 ({stage}/2)</h2>
      {/* --- 수정 끝 --- */}
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={onStart}>시작하기</button>
    </div>
  );
};

// 메인 캘리브레이션 컴포넌트
interface CalibrationProps {
  onComplete: () => void;
  liveGaze: { x: number | null; y: number | null };
  // --- 1. 3단계 제거 (수정) ---
  // 3단계 성공률 콜백 함수 제거
  // onCalStage3Complete: (successRate: number) => void;
  // --- 수정 끝 ---
}

const Calibration: React.FC<CalibrationProps> = ({ onComplete, liveGaze }) => {
  // --- 기존 상태 유지 및 확장 ---
  const [step, setStep] = useState(1);
  const [dotIndex, setDotIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const CLICKS_PER_DOT = 3; 

  const [isInstructionVisible, setIsInstructionVisible] = useState(true);

  // --- 1단계와 3단계(Smooth Pursuit)에 필요한 상태 추가 ---
  const [progress, setProgress] = useState(0);
  // const [isGazeOnTarget, setIsGazeOnTarget] = useState(false); // 3단계 제거
  const animationFrameId = useRef<number | null>(null);
  const liveGazeRef = useRef(liveGaze);
  const dotRef = useRef<HTMLDivElement>(null);

  // --- 1. 3단계 제거 (수정) ---
  // 3단계 성공률 추적을 위한 ref 제거
  // const stage3FrameCount = useRef(0);
  // const stage3SuccessFrameCount = useRef(0);
  // --- 수정 끝 ---


  useEffect(() => {
    liveGazeRef.current = liveGaze;
  }, [liveGaze]);

  // --- 1. 3단계 제거 (수정) ---
  // 1단계 로직만 남김 (기존 1, 3단계 통합 로직)
  useEffect(() => {
    // if (isInstructionVisible || (step !== 1 && step !== 3)) return; -> 1단계일 때만 실행
    if (isInstructionVisible || step !== 1) return;

    setProgress(0);
    // window.webgazer.showPredictionPoints(step === 3); -> 항상 false
    window.webgazer.showPredictionPoints(false); 

    // 3단계 카운터 초기화 로직 제거
    
    const dot = dotRef.current;
    if (!dot) return;

    // DURATION을 1단계(18초)로 고정
    const DURATION = 18000; 
    // DWELL_RADIUS_PX 제거 (3단계 전용)
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const currentProgress = Math.min(elapsedTime / DURATION, 1);
      setProgress(currentProgress);

      // 1단계 애니메이션 로직
      const radiusX = window.innerWidth * 0.4;
      const radiusY = window.innerHeight * 0.4;
      const x = window.innerWidth / 2 + radiusX * Math.sin(currentProgress * Math.PI * 4);
      const y = window.innerHeight / 2 + radiusY * Math.cos(currentProgress * Math.PI * 4);
      
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      // 3단계 로직 (isOnTarget, distance 계산 등) 모두 제거
      
      // 1단계 로직 (mouseMoveEvent만)
      const mouseMoveEvent = new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: x, clientY: y });
      document.dispatchEvent(mouseMoveEvent);
      
      if (currentProgress < 1) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        // 3단계 완료 콜백 로직 제거
        
        // 1단계 완료 시 2단계로 이동
        setStep(prev => prev + 1);
        setIsInstructionVisible(true);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
    // 1단계 로직만 남기므로 onComplete, onCalStage3Complete 의존성 제거
  }, [step, isInstructionVisible]);
  // --- 수정 끝 ---

  // --- 1. 3단계 제거 (수정) ---
  // 2단계 (Click) 로직 수정
  const handleDotClick = () => {
    const newClickCount = clickCount + 1;
    if (newClickCount < CLICKS_PER_DOT) {
      setClickCount(newClickCount);
    } else {
      if (dotIndex < CALIBRATION_DOTS.length - 1) {
        setDotIndex(dotIndex + 1);
        setClickCount(0);
      } else {
        // 2단계가 마지막 단계이므로, 3단계로 넘어가는 대신 onComplete() 호출
        onComplete();
        // setStep(prev => prev + 1); // 제거
        // setIsInstructionVisible(true); // 제거
      }
    }
  };

  // 3단계가 끝나면 전체 완료 처리 (useEffect) -> 제거
  // useEffect(() => {
  //   if (step > 3) {
  //     onComplete();
  //   }
  // }, [step, onComplete]);
  // --- 수정 끝 ---

  // --- 렌더링 로직 ---
  // if (isInstructionVisible && step <= 3) -> if (isInstructionVisible && step <= 2)
  if (isInstructionVisible && step <= 2) {
    return <StageInstruction stage={step} onStart={() => setIsInstructionVisible(false)} />;
  }

  // 각 단계별 실행 UI 렌더링
  switch (step) {
    // --- 1. 3단계 제거 (수정) ---
    // case 3 제거
    case 1:
      const message = "캘리브레이션 (1/2): 화면의 녹색 점을 눈으로 따라가세요.";
      return (
        <div className="pursuit-container">
          <p>{message}</p>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>
          </div>
          {/* 3단계에서 사용하던 'on-target' 클래스 로직 제거 */}
          <div id="pursuit-dot" ref={dotRef} className="pursuit-dot" />
        </div>
      );
    case 2:
      return (
        <div>
          <p>
            {/* 캘리브레이션 (2/3) -> (2/2) */}
            캘리브레이션 (2/2): 화면의 점을 클릭하세요. ({dotIndex + 1}/{CALIBRATION_DOTS.length})
            <br />
            <strong>({clickCount + 1}/{CLICKS_PER_DOT} 번째 클릭)</strong>
          </p>
          <div
            className="calibration-dot"
            style={{ left: CALIBRATION_DOTS[dotIndex].x, top: CALIBRATION_DOTS[dotIndex].y }}
            onClick={handleDotClick}
          />
        </div>
      );
    // --- 수정 끝 ---
    default:
      return null;
  }
};

export default Calibration;