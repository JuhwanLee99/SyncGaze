// frontend/src/pages/SetupCalibrationPage.tsx
import React from 'react';
import Calibration from '../components/GazeTracker/Calibration';
import '../components/GazeTracker/GazeTracker.css';

// 캘리브레이션은 전체 화면을 사용하므로 래퍼(wrapper)를 제거합니다.
const SetupCalibrationPage: React.FC = () => (
  <Calibration />
);
export default SetupCalibrationPage;