// frontend/src/pages/SurveyPage.tsx

import React from 'react';
import ScreenerSurvey from '../components/Onboarding/ScreenerSurvey';
import './SurveyPage.css';

const SurveyPage: React.FC = () => {
  return (
    <div className="survey-page-container">
      <div className="survey-content-wrapper">
        {/* ScreenerSurvey 컴포넌트에서 onComplete prop을 제거합니다. */}
        <ScreenerSurvey />
      </div>
    </div>
  );
};

export default SurveyPage;