// 파일 경로: src/components/GazeTracker/Calibration.tsx
// (이 파일의 내용을 아래 코드로 전부 덮어쓰세요.)

import React, { useState, useEffect, useRef } from 'react';
import { CALIBRATION_DOTS } from './constants';
import { useGazeTracker } from './GazeTrackerContext'; // 1. Context 훅 임포트
import './GazeTracker.css'; // 2. CSS 임포트

// 각 단계별 안내 페이지 (A안 원본과 동일)
const StageInstruction: React.FC<{ stage: number; onStart: () => void }> = ({ stage, onStart }) => {
  let title = '';
  let description = '';

  switch (stage) {
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
      <h2>캘리브레이션 ({stage - 1}/2)</h2>
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={onStart}>시작하기</button>
    </div>
  );
};

// --- 메인 Calibration 컴포넌트 ---
// 3. props 인터페이스 제거
const Calibration: React.FC = () => {
  
  // 4. Context 훅 사용
  const { handleCalibrationComplete, liveGaze, handleCalStage3Complete } = useGazeTracker();

  // --- 내부 상태 관리 (A안 원본과 100% 동일) ---
  const [step, setStep] = useState(2);
  const [dotIndex, setDotIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const CLICKS_PER_DOT = 3; 

  const [isInstructionVisible, setIsInstructionVisible] = useState(true);

  const [progress, setProgress] = useState(0);
  const [isGazeOnTarget, setIsGazeOnTarget] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const liveGazeRef = useRef(liveGaze);
  const dotRef = useRef<HTMLDivElement>(null);

  const stage3FrameCount = useRef(0);
  const stage3SuccessFrameCount = useRef(0);
  // --- 상태 관리 끝 ---


  useEffect(() => {
    liveGazeRef.current = liveGaze;
  }, [liveGaze]);

  // --- 5. 3단계(Pursuit) 로직 (A안 원본과 100% 동일) ---
  useEffect(() => {
    if (isInstructionVisible || step !== 3) return;

    setProgress(0);
    // (1단계에서 TrackerLayout.tsx를 수정했으므로 이 라인은 원본대로 유지)
    window.webgazer.showPredictionPoints(true); 

    if (step === 3) {
      stage3FrameCount.current = 0;
      stage3SuccessFrameCount.current = 0;
    }

    const dot = dotRef.current;
    if (!dot) return;

    // A안의 20초 DURATION 및 150 DWELL_RADIUS
    const DURATION = 20000; 
    const DWELL_RADIUS_PX = 150; 
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      
      // A안의 종료 조건: 시간 기반 (Goal-independent)
      const currentProgress = Math.min(elapsedTime / DURATION, 1);
      setProgress(currentProgress);

      // A안의 경로: sin(4*t) / cos(6*t)
      const radiusX = window.innerWidth * 0.45;
      const radiusY = window.innerHeight * 0.45;
      const x = window.innerWidth / 2 + radiusX * Math.sin(currentProgress * Math.PI * 4);
      const y = window.innerHeight / 2 + radiusY * Math.cos(currentProgress * Math.PI * 6);
      
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      // Gaze-Contingent 로직 (데이터 수집용)
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
      
      if (currentProgress < 1) { // 6. A안의 "시간 기반" 종료 조건
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        // 7. Context의 핸들러로 교체
        const successRate = stage3FrameCount.current > 0 
            ? stage3SuccessFrameCount.current / stage3FrameCount.current 
            : 0;
        handleCalStage3Complete(successRate);
        
        setStep(prev => prev + 1);
        setIsInstructionVisible(true);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
    
  // 8. Context 핸들러로 의존성 변경
  }, [step, isInstructionVisible, handleCalStage3Complete]); 
  // --- 3단계 로직 끝 ---

  // --- 2단계(Click) 로직 (A안 원본과 100% 동일) ---
  const handleDotClick = () => {
    const newClickCount = clickCount + 1;
    if (newClickCount < CLICKS_PER_DOT) {
      setClickCount(newClickCount);
    } else {
      if (dotIndex < CALIBRATION_DOTS.length - 1) {
        setDotIndex(dotIndex + 1);
        setClickCount(0);
      } else {
        setStep(prev => prev + 1);
        setIsInstructionVisible(true);
      }
    }
  };

  // --- 완료 처리 (A안 원본과 100% 동일) ---
  useEffect(() => {
    if (step > 3) {
      handleCalibrationComplete(); // 9. Context 핸들러로 교체
    }
  }, [step, handleCalibrationComplete]); // 10. 의존성 변경
  // --- 완료 처리 끝 ---

  // --- 렌더링 로직 (A안 원본 기반) ---
  if (isInstructionVisible && step <= 3) {
    return <StageInstruction stage={step} onStart={() => setIsInstructionVisible(false)} />;
  }

  switch (step) {
    case 3: // 3단계(Pursuit) 렌더링
      const message = "캘리브레이션 (2/2): 시선(빨간 점)을 움직이는 목표점 안에 유지해주세요.";
      return (
        <div className="pursuit-container">
          {/* 11. 2단계에서 추가한 CSS 클래스 적용 */}
          <p className="calibration-message">{message}</p>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>
          </div>
          <div id="pursuit-dot" ref={dotRef} className={`pursuit-dot ${isGazeOnTarget ? 'on-target' : ''}`} />
        </div>
      );
    case 2: // 2단계(Click) 렌더링
      return (
        <div>
          {/* 12. 2단계에서 추가한 CSS 클래스 적용 */}
          <p className="calibration-message">
            캘리브레이션 (1/2): 화면의 점을 클릭하세요. ({dotIndex + 1}/{CALIBRATION_DOTS.length})
            <br />
            <strong>({clickCount + 1}/{CLICKS_PER_DOT} 번째 클릭)</strong>
          </p>
          <div
            className="calibration-dot"
            // (참고) constants.ts의 '50%' 문자열을 그대로 사용
            style={{ 
              left: CALIBRATION_DOTS[dotIndex].x, 
              top: CALIBRATION_DOTS[dotIndex].y,
              zIndex: 100000 // (z-index는 제가 이전 답변에서 추가한 것 유지)
            }}
            onClick={handleDotClick}
          />
        </div>
      );
    default:
      return null;
  }
};

export default Calibration;