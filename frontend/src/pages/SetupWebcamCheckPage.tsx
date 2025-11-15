// frontend/src/pages/SetupWebcamCheckPage.tsx
import React from 'react';
import WebcamCheck from '../components/GazeTracker/WebcamCheck';
import './SetupPage.css'; 

const SetupWebcamCheckPage: React.FC = () => (
  <div className="setup-page-container">
    <div className="setup-content-wrapper">
      <WebcamCheck />
    </div>
  </div>
);
export default SetupWebcamCheckPage;