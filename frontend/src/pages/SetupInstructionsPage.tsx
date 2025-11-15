// frontend/src/pages/SetupInstructionsPage.tsx
import React from 'react';
import Instructions from '../components/GazeTracker/Instructions';
import './SetupPage.css'; // 공통 스타일 사용

const SetupInstructionsPage: React.FC = () => (
  <div className="setup-page-container">
    <div className="setup-content-wrapper">
      <Instructions />
    </div>
  </div>
);
export default SetupInstructionsPage;