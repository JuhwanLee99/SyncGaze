// frontend/src/pages/SetupConfirmPage.tsx
import React from 'react';
import ConfirmValidation from '../components/GazeTracker/ConfirmValidation';
import './SetupPage.css';

const SetupConfirmPage: React.FC = () => (
  <div className="setup-page-container">
    <div className="setup-content-wrapper">
      <ConfirmValidation />
    </div>
  </div>
);
export default SetupConfirmPage;