// src/components/GazeTracker/Validation.tsx

import React from 'react';

interface ValidationProps {
  validationError: number | null;
  gazeStability: number | null; // --- 변경/추가 ---
  onRecalibrate: () => void;
  onStartTask: () => void;
}

const RECALIBRATION_THRESHOLD = 80; 

// --- 변경/추가 ---
const Validation: React.FC<ValidationProps> = ({ validationError, gazeStability, onRecalibrate, onStartTask }) => {
// --- 변경/추가 끝 ---
  const needsRecalibration = validationError !== null && validationError > RECALIBRATION_THRESHOLD;
  return (
    <div className="validation-container">
      <div className="validation-dot" />
      {validationError === null ? (
        <p>정확도 측정 중... 화면 중앙의 파란 점을 3초간 응시하세요.</p>
      ) : (
        <div className="result-container">
          <p>측정된 평균 오차: <strong>{validationError.toFixed(2)} 픽셀</strong></p>
          
          {/* --- 변경/추가 --- */}
          {gazeStability !== null && (
            <p>시선 안정성 (Avg. StdDev): <strong>{gazeStability.toFixed(2)} 픽셀</strong></p>
          )}
          {/* --- 변경/추가 끝 --- */}


          {needsRecalibration && (
            <p style={{ color: 'red', fontWeight: 'bold' }}>
              오차가 크게 측정되었습니다. 정확한 측정을 위해 재보정을 진행해 주세요.
            </p>
          )}

          <div className="controls">
            <button onClick={onStartTask}>과제 시작</button>
            <button onClick={onRecalibrate}>재보정</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Validation;