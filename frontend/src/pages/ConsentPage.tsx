// frontend/src/pages/ConsentPage.tsx

import React from 'react';
import ConsentForm from '../components/Onboarding/ConsentForm';
import './ConsentPage.css';

const ConsentPage: React.FC = () => {
  return (
    <div className="consent-page-container">
      <div className="consent-content-wrapper">
        {/* ConsentForm이 자체적으로 동의 처리 및 다음 페이지 이동 로직을 가집니다. */}
        <ConsentForm />
      </div>
    </div>
  );
};

export default ConsentPage;