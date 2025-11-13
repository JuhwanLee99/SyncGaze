// src/components/GazeTracker/WebcamCheck.tsx

import React from 'react';

type QualitySetting = 'low' | 'medium' | 'high';
type RegressionModel = 'ridge' | 'threadedRidge' | 'weightedRidge';

interface WebcamCheckProps {
  quality: QualitySetting;
  onQualityChange: (quality: QualitySetting) => void;
  regressionModel: RegressionModel;
  onRegressionChange: (model: RegressionModel) => void;
  onComplete: () => void;
  // --- 2. 사전 검증 단계 강화 (수정) ---
  isGazeDetected: boolean; // 얼굴 감지 상태를 boolean prop으로 받음
  // --- 수정 끝 ---
}

// --- 2. 사전 검증 단계 강화 (수정) ---
// 감지 상태에 따라 다른 메시지와 스타일을 반환하는 헬퍼 컴포넌트
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
      {/* --- 수정: <strong>을 <h3>으로 변경하여 강조 --- */}
      <h3>{message}</h3>
      {/* --- 수정 끝 --- */}
    </div>
  );
};
// --- 수정 끝 ---


const WebcamCheck: React.FC<WebcamCheckProps> = ({
  quality,
  onQualityChange,
  regressionModel,
  onRegressionChange,
  onComplete,
  // --- 2. 사전 검증 단계 강화 (수정) ---
  isGazeDetected
  // --- 수정 끝 ---
}) => {
  
  return (
    <div className="instructions">
      <h3>웹캠 및 얼굴 인식 확인</h3>
      <p>캘리브레이션을 시작하기 전에, 아래 옵션을 설정하고 얼굴 인식이 정상적으로 작동하는지 확인하세요.</p>
      <ul>
        <li>화면 왼쪽 상단에 본인의 웹캠 영상이 나타나는지 확인하세요.</li>
        <li>영상 속 얼굴에 **녹색 사각형**과 **얼굴 특징 점**들이 표시되는지 확인하세요.</li>
        <li>만약 인식이 잘 되지 않는다면, 얼굴이 정면을 향하도록 자세를 바꾸거나 주변을 더 밝게 조절해 주세요.</li>
      </ul>

      {/* 🔽 품질 선택 UI 추가 */}
      <div className="quality-selector">
        <h4>시선 추적 품질 설정</h4>
        <div className="quality-options">
          <button
            className={quality === 'low' ? 'active' : ''}
            onClick={() => onQualityChange('low')}
          >
            낮음 (성능 우선)
          </button>
          <button
            className={quality === 'medium' ? 'active' : ''}
            onClick={() => onQualityChange('medium')}
          >
            중간 (권장)
          </button>
          <button
            className={quality === 'high' ? 'active' : ''}
            onClick={() => onQualityChange('high')}
          >
            높음 (정확도 우선)
          </button>
        </div>
      </div>
      
      {/* 🔽 회귀 모델 선택 UI 추가 */}
      <div className="selector-container">
        <h4>회귀 모델 선택</h4>
        <div className="options-group">
          <div className="option-item">
            <button className={regressionModel === 'threadedRidge' ? 'active' : ''} onClick={() => onRegressionChange('threadedRidge')}>
              Threaded Ridge (현재 오류)
            </button>
            <p className="option-description">별도 스레드로 동작하여 UI 끊김이 없습니다.</p>
          </div>
          <div className="option-item">
            <button className={regressionModel === 'weightedRidge' ? 'active' : ''} onClick={() => onRegressionChange('weightedRidge')}>
              Weighted Ridge
            </button>
            <p className="option-description">최신 데이터에 가중치를 둬 자세 변화에 빠르게 적응하지만, UI가 끊길 수 있습니다.</p>
          </div>
          <div className="option-item">
            <button className={regressionModel === 'ridge' ? 'active' : ''} onClick={() => onRegressionChange('ridge')}>
              Ridge
            </button>
            <p className="option-description">가장 기본적인 모델이며, UI가 끊길 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* --- 2. 사전 검증 단계 강화 (수정) --- */}
      {/* 감지 상태를 표시하는 UI 수정 */}
      <DetectionStatusDisplay isDetected={isGazeDetected} />
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        {/* 감지 성공 상태가 아니면 버튼 비활성화 */}
        <button onClick={onComplete} disabled={!isGazeDetected}>
          확인 완료, 캘리브레이션 시작
        </button>
      </div>
      {/* --- 수정 끝 --- */}
    </div>
  );
};

export default WebcamCheck;