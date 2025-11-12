// src/components/GazeTracker/Calibration.tsx

import React, { useState, useEffect, useRef } from 'react';
import { CALIBRATION_DOTS } from './constants';

// 각 단계별 안내 페이지를 위한 내부 컴포넌트
const StageInstruction: React.FC<{ stage: number; onStart: () => void }> = ({ stage, onStart }) => {
  let title = '';
  let description = '';

  // --- 1단계 제거 (수정) ---
  // case 1 (Smooth Pursuit) 제거
  // case 2를 1단계로, case 3을 2단계로 변경
  switch (stage) {
    // case 1: 제거
    case 2:
      title = '1단계: 정밀 보정';
      description = '화면의 여러 위치에 빨간 점이 나타납니다. 각 점이 나타날 때마다 정확하게 3번씩 클릭해 주세요.';
      break;
    case 3:
      title = '2단계: 최종 미세조정';
      description = '다시 움직이는 녹색 점이 나타납니다. 이번에는 화면에 표시되는 자신의 시선(빨간 점)을 녹색 점 안에 유지하도록 노력해 주세요.';
      break;
  }

  return (
    <div className="instruction-box">
      {/* step 값이 2, 3이므로 (step-1)을 사용해 1/2, 2/2로 표시 */}
      <h2>캘리브레이션 ({stage - 1}/2)</h2>
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
  // --- 3단계 복원 ---
  onCalStage3Complete: (successRate: number) => void;
  // --- 복원 끝 ---
}

const Calibration: React.FC<CalibrationProps> = ({ onComplete, liveGaze, onCalStage3Complete }) => {
  // --- 1단계 제거 (수정) ---
  // step state의 초기값을 2로 변경하여 1단계를 건너뜀
  const [step, setStep] = useState(2);
  // --- 수정 끝 ---
  const [dotIndex, setDotIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const CLICKS_PER_DOT = 3; 

  const [isInstructionVisible, setIsInstructionVisible] = useState(true);

  // --- 1단계 제거 / 3단계 복원 (수정) ---
  // 1단계(Smooth Pursuit) 상태 제거, 3단계 상태 복원
  const [progress, setProgress] = useState(0);
  const [isGazeOnTarget, setIsGazeOnTarget] = useState(false); // 3단계 복원
  const animationFrameId = useRef<number | null>(null);
  const liveGazeRef = useRef(liveGaze);
  const dotRef = useRef<HTMLDivElement>(null);

  // 3단계 성공률 추적 ref 복원
  const stage3FrameCount = useRef(0);
  const stage3SuccessFrameCount = useRef(0);
  // --- 수정 끝 ---


  useEffect(() => {
    liveGazeRef.current = liveGaze;
  }, [liveGaze]);

  // --- 1단계 제거 / 3단계 복원 (수정) ---
  // 1단계 로직 제거, 3단계 로직만 남김
  useEffect(() => {
    // 3단계일 때만 실행
    if (isInstructionVisible || step !== 3) return;

    setProgress(0);
    // 3단계이므로 항상 true
    window.webgazer.showPredictionPoints(true); 

    // 3단계 카운터 초기화 (복원)
    if (step === 3) {
      stage3FrameCount.current = 0;
      stage3SuccessFrameCount.current = 0;
    }

    const dot = dotRef.current;
    if (!dot) return;

    // 3단계 DURATION (20초) 및 DWELL_RADIUS (150) 복원
    const DURATION = 20000; 
    const DWELL_RADIUS_PX = 150; 
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const currentProgress = Math.min(elapsedTime / DURATION, 1);
      setProgress(currentProgress);

      // 3단계 애니메이션 로직 (복원)
      const radiusX = window.innerWidth * 0.45;
      const radiusY = window.innerHeight * 0.45;
      const x = window.innerWidth / 2 + radiusX * Math.sin(currentProgress * Math.PI * 4);
      const y = window.innerHeight / 2 + radiusY * Math.cos(currentProgress * Math.PI * 6);
      
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      // 3단계 Gaze-Contingent 로직 (복원)
      stage3FrameCount.current += 1;

      let isOnTarget = false;
      const currentGaze = liveGazeRef.current;
      if (currentGaze.x !== null && currentGaze.y !== null) {
        const distance = Math.sqrt(Math.pow(x - currentGaze.x, 2) + Math.pow(y - currentGaze.y, 2));
        if (distance < DWELL_RADIUS_PX) isOnTarget = true;
      }
      setIsGazeOnTarget(isOnTarget);

      if (isOnTarget) {
        stage3SuccessFrameCount.current += 1;
        const mouseMoveEvent = new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: x, clientY: y });
        document.dispatchEvent(mouseMoveEvent);
      }
      
      // 1단계(Smooth Pursuit)의 'else' 블록 (무조건 mousemove) 제거
      
      if (currentProgress < 1) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        // 3단계 완료 콜백 (복원)
        if (step === 3) {
          const successRate = stage3FrameCount.current > 0 
            ? stage3SuccessFrameCount.current / stage3FrameCount.current 
            : 0;
          onCalStage3Complete(successRate);
        }
        
        setStep(prev => prev + 1);
        setIsInstructionVisible(true);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
    // onCalStage3Complete 의존성 복원
  }, [step, isInstructionVisible, onCalStage3Complete]);
  // --- 수정 끝 ---

  // --- 1단계 제거 (수정) ---
  // 2단계 (Click) 로직 수정 (완료 시 3단계로 이동하도록 복원)
  const handleDotClick = () => {
    const newClickCount = clickCount + 1;
    if (newClickCount < CLICKS_PER_DOT) {
      setClickCount(newClickCount);
    } else {
      if (dotIndex < CALIBRATION_DOTS.length - 1) {
        setDotIndex(dotIndex + 1);
        setClickCount(0);
      } else {
        // 2단계가 마지막이 아니므로, 3단계로 이동 (이전 'onComplete()' 호출 수정)
        setStep(prev => prev + 1);
        setIsInstructionVisible(true);
      }
    }
  };

  // 3단계 완료 처리용 useEffect (복원)
  useEffect(() => {
    if (step > 3) {
      onComplete();
    }
  }, [step, onComplete]);
  // --- 수정 끝 ---

  // --- 렌더링 로직 ---
  // (step <= 2) -> (step <= 3) 복원
  if (isInstructionVisible && step <= 3) {
    return <StageInstruction stage={step} onStart={() => setIsInstructionVisible(false)} />;
  }

  // 각 단계별 실행 UI 렌더링
  switch (step) {
    // --- 1단계 제거 (수정) ---
    // case 1 제거
    case 3: // 3단계 렌더링 로직 복원 (case 1과 합쳐져 있던 것 분리)
      const message = "캘리브레이션 (2/2): 시선(빨간 점)을 움직이는 목표점 안에 유지해주세요.";
      return (
        <div className="pursuit-container">
          <p>{message}</p>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>
          </div>
          {/* 'on-target' 클래스 로직 복원 */}
          <div id="pursuit-dot" ref={dotRef} className={`pursuit-dot ${isGazeOnTarget ? 'on-target' : ''}`} />
        </div>
      );
    case 2:
      return (
        <div>
          <p>
            {/* 캘리브레이션 (1/2)로 수정 */}
            캘리브레이션 (1/2): 화면의 점을 클릭하세요. ({dotIndex + 1}/{CALIBRATION_DOTS.length})
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