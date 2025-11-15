// frontend/src/pages/TrainingPage.tsx
// (V2 코드를 버리고 V1 원본으로 복구 + import 수정)

import React from 'react';
// 1. [수정] Scene은 명명된 내보내기(export const)입니다.
import { Scene } from '../components/Scene'; 
import './TrainingPage.css';

// 2. [수정] V2 코드(CSV 로직, useEyeTracking 등)를 모두 제거합니다.
//    이 페이지의 유일한 역할은 Scene을 렌더링하는 것입니다.

const TrainingPage: React.FC = () => {
  return (
    <div className="training-page-container">
      {/* 3. [복구] V1의 Scene 컴포넌트만 렌더링합니다. */}
      <Scene />
    </div>
  );
};

export default TrainingPage;