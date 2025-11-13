// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import GazeTracker from './components/GazeTracker/GazeTracker'; // <--- 기존 트래커
import ScreenerSurvey from './components/Onboarding/ScreenerSurvey'; // <--- 새로 만들 컴포넌트
import ConsentForm from './components/Onboarding/ConsentForm'; // <--- 새로 만들 컴포넌트

function App() {
  return (
    <div className="App"> {/* 기존 App.css의 스타일을 유지할 수 있습니다 */}
      <Routes>
        {/* 1. 기본 경로: 스크리닝 설문조사 */}
        <Route path="/" element={<ScreenerSurvey />} />
        
        {/* 2. 동의서 페이지 */}
        <Route path="/consent" element={<ConsentForm />} />
        
        {/* 3. 기존 시선 추적 앱 (GazeTracker) */}
        <Route path="/tracker" element={<GazeTracker />} />

        {/* 기타 예외 경로 처리 (선택 사항) */}
        <Route path="*" element={<div>페이지를 찾을 수 없습니다.</div>} />
      </Routes>
    </div>
  );
}

export default App;