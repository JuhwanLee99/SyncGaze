// tracker-app/src/components/GazeTracker/WebcamCheck.tsx

import React from 'react';
import { useGazeTracker } from './GazeTrackerContext'; // 1. Context 훅 임포트
import './GazeTracker.css'; // 2. 기존 스타일 유지를 위해 CSS 임포트

// 3. props 관련 타입 정의(QualitySetting, RegressionModel, WebcamCheckProps)를 모두 제거합니다.
// (이 타입들은 types.ts 또는 Context에서 관리됩니다.)

// --- (수정 없음) 감지 상태 헬퍼 컴포넌트는 그대로 유지 ---
// 이 컴포넌트는 WebcamCheck의 props가 아닌,
// 내부에서 사용할 props (isDetected)를 받으므로 수정할 필요가 없습니다.
const DetectionStatusDisplay: React.FC<{ isDetected: boolean }> = ({ isDetected }) => {
  let message = '';
  let className = '';

  if (isDetected) {
    message = '상태: 안정적 - 얼굴 특징점이 명확히 감지되었습니다. 캘리브레이션을 시작하세요.';
    className = 'status-success';
  } else {
    message = '상태: 감지 중... 웹캠 화면에 얼굴 특징점이 표시되는지 확인하세요. (조명이 어둡거나 역광이면 감지가 안 될 수 있습니다.)';
    className = 'status-pending';
  }

  return (
    <div className={`detection-status-container ${className}`}>
      <h3>{message}</h3>
    </div>
  );
};
// --- 수정 끝 ---


// 4. 컴포넌트 시그니처에서 props 매개변수를 제거합니다.
const WebcamCheck: React.FC = () => {
  
  // 5. Context 훅을 사용하여 GazeTracker(Layout)의 상태와 핸들러를 가져옵니다.
  const {
    quality,
    setQuality,       // onQualityChange -> setQuality
    regressionModel,
    setRegressionModel, // onRegressionChange -> setRegressionModel
    handleCalibrationStart, // onComplete -> handleCalibrationStart
    isGazeDetected
  } = useGazeTracker();

  return (
    // 6. 기존 JSX와 클래스명은 그대로 유지합니다.
    <div className="instructions">
      <h3>웹캠 및 얼굴 인식 확인</h3>
      <p>캘리브레이션을 시작하기 전에, 아래 옵션을 설정하고 얼굴 인식이 정상적으로 작동하는지 확인하세요.</p>
      <ul>
        <li>화면 왼쪽 상단에 본인의 웹캠 영상이 나타나는지 확인하세요.</li>
        <li>영상 속 얼굴에 **녹색 사각형**과 **얼굴 특징 점**들이 표시되는지 확인하세요.</li>
        <li>만약 인식이 잘 되지 않는다면, 얼굴이 정면을 향하도록 자세를 바꾸거나 주변을 더 밝게 조절해 주세요.</li>
      </ul>

      {/* 🔽 품질 선택 UI (핸들러만 Context의 'set' 함수로 변경) */}
      <div className="quality-selector">
        <h4>시선 추적 품질 설정</h4>
        <div className="quality-options">
          <button
            className={quality === 'low' ? 'active' : ''}
            onClick={() => setQuality('low')} // 'onQualityChange' -> 'setQuality'
          >
            낮음 (성능 우선)
          </button>
          <button
            className={quality === 'medium' ? 'active' : ''}
            onClick={() => setQuality('medium')} // 'onQualityChange' -> 'setQuality'
          >
            중간 (권장)
          </button>
          <button
            className={quality === 'high' ? 'active' : ''}
            onClick={() => setQuality('high')} // 'onQualityChange' -> 'setQuality'
          >
            높음 (정확도 우선)
          </button>
        </div>
      </div>
      
      {/* 🔽 회귀 모델 선택 UI (핸들러만 Context의 'set' 함수로 변경) */}
      <div className="selector-container">
        <h4>회귀 모델 선택</h4>
        <div className="options-group">
          <div className="option-item">
            <button className={regressionModel === 'threadedRidge' ? 'active' : ''} onClick={() => setRegressionModel('threadedRidge')}>
              Threaded Ridge (현재 오류)
            </button>
            <p className="option-description">별도 스레드로 동작하여 UI 끊김이 없습니다.</p>
          </div>
          <div className="option-item">
            <button className={regressionModel === 'weightedRidge' ? 'active' : ''} onClick={() => setRegressionModel('weightedRidge')}>
              Weighted Ridge
            </button>
            <p className="option-description">최신 데이터에 가중치를 둬 자세 변화에 빠르게 적응하지만, UI가 끊길 수 있습니다.</p>
          </div>
          <div className="option-item">
            <button className={regressionModel === 'ridge' ? 'active' : ''} onClick={() => setRegressionModel('ridge')}>
              Ridge
            </button>
            <p className="option-description">가장 기본적인 모델이며, UI가 끊길 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* --- (수정 없음) 감지 상태 표시는 Context의 isGazeDetected로 잘 동작합니다. --- */}
      <DetectionStatusDisplay isDetected={isGazeDetected} />
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        {/* 'onComplete' -> 'handleCalibrationStart'로 변경 */}
        <button onClick={handleCalibrationStart} disabled={!isGazeDetected}>
          확인 완료, 캘리브레이션 시작
        </button>
      </div>
      {/* --- 수정 끝 --- */}
    </div>
  );
};

export default WebcamCheck;