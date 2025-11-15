// tracker-app/src/components/GazeTracker/Validation.tsx

import React from 'react';
import { useGazeTracker } from './GazeTrackerContext'; // 1. Context 훅 임포트
import './GazeTracker.css'; // 2. 기존 스타일 유지를 위해 CSS 임포트

// 3. props 인터페이스(ValidationProps) 정의 제거

// 4. 컴포넌트 시그니처에서 props 매개변수를 제거합니다.
const Validation: React.FC = () => {
  
  // 5. Context 훅을 사용하여 GazeTracker(Layout)의 상태와 핸들러를 가져옵니다.
  const {
    validationError,
    gazeStability,
    handleRecalibrate, // 'onRecalibrate' 대신 'handleRecalibrate'
    startTask           // 'onStartTask' 대신 'startTask'
  } = useGazeTracker();

  // 6. 렌더링 로직은 props 값(validationError)에 따라 분기합니다.
  const renderContent = () => {
    // 6.1. validationError가 null이면 (GazeTracker.tsx의 3초 타이머가 실행 중)
    // GazeTracker.tsx의 useEffect(gameState === 'validating') 로직이 실행 중임을 의미
    if (validationError === null) {
      return (
        <div className="validation-status">
          <h2>정확도 측정 중</h2>
          <p>화면 중앙의 점을 3초간 편안하게 응시하세요...</p>
          {/* GazeTracker.css에 정의된 스타일 사용 */}
          <div className="validation-dot"></div> 
        </div>
      );
    }

    // 6.2. validationError가 null이 아니면 (측정 완료)
    
    // (GazeTracker.tsx 원본에는 없었지만, 일반적으로 사용하는 로직 추가)
    // GazeTracker.css의 .status-error, .status-success 클래스를 활용
    const isErrorTooHigh = validationError > 150; 
    const isStabilityTooLow = gazeStability !== null && gazeStability > 50;

    return (
      <div className="validation-results">
        <h3>정확도 측정 완료</h3>
        <p className={isErrorTooHigh ? 'status-error' : 'status-success'}>
          평균 오차: <strong>{validationError.toFixed(2)} pixels</strong>
          {isErrorTooHigh && " (오차가 너무 큽니다)"}
        </p>
        <p className={isStabilityTooLow ? 'status-error' : 'status-success'}>
          시선 안정성 (Jitter): <strong>{gazeStability ? gazeStability.toFixed(2) : 'N/A'} px</strong>
          {isStabilityTooLow && " (시선이 불안정합니다)"}
        </p>
        
        <div className="recommendation"> {/* GazeTracker.css에 스타일 정의 필요 */}
          {isErrorTooHigh || isStabilityTooLow
            ? "정확도가 낮습니다. '재보정' 버튼을 눌러 다시 시도하는 것을 권장합니다."
            : "정확도가 양호합니다. '과제 시작' 버튼을 눌러주세요."}
        </div>

        <div className="validation-actions"> {/* GazeTracker.css에 스타일 정의 필요 */}
          {/* 7. Context의 핸들러를 버튼에 연결합니다. */}
          <button onClick={handleRecalibrate} className="recalibrate-button">
            재보정 (Recalibrate)
          </button>
          <button onClick={startTask} className="start-button">
            과제 시작
          </button>
        </div>
      </div>
    );
  };

  return (
    // GazeTracker.css의 .validation-container 스타일을 재사용합니다.
    <div className="validation-container">
      {renderContent()}
    </div>
  );
};

export default Validation;