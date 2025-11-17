//tracker-app/src/App.tsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
// import GazeTracker from './components/GazeTracker/GazeTracker'; // <--- 기존 컴포넌트 대신 Layout을 사용
import ScreenerSurvey from './components/Onboarding/ScreenerSurvey';
import ConsentForm from './components/Onboarding/ConsentForm';

// --- 새로 만들거나 분리할 컴포넌트들 ---
import TrackerLayout from './components/GazeTracker/TrackerLayout'; // 1. 상태 관리를 할 레이아웃
import Instructions from './components/GazeTracker/Instructions';
import WebcamCheck from './components/GazeTracker/WebcamCheck';
import Calibration from './components/GazeTracker/Calibration';
import ConfirmValidation from './components/GazeTracker/ConfirmValidation'; // 2. 분리될 컴포넌트
import Validation from './components/GazeTracker/Validation';
import Task from './components/GazeTracker/Task';
import Results from './components/GazeTracker/Results';
// ------------------------------------

function App() {
  return (
    <div className="App">
      <Routes>
        {/* 1. 기본 경로: 스크리닝 설문조사 */}
        <Route path="/" element={<ScreenerSurvey />} />
        
        {/* 2. 동의서 페이지 */}
        <Route path="/consent" element={<ConsentForm />} />
        
        {/* 3. 시선 추적 앱 (중첩 라우트 구조로 변경) */}
        <Route path="/tracker" element={<TrackerLayout />}>
          {/* /tracker 의 기본 페이지 */}
          <Route index element={<Instructions />} /> 
          {/* /tracker/webcam-check */}
          <Route path="webcam-check" element={<WebcamCheck />} /> 
          {/* /tracker/calibrate */}
          <Route path="calibrate" element={<Calibration />} />
          {/* /tracker/confirm-validation */}
          <Route path="confirm-validation" element={<ConfirmValidation />} />
          {/* /tracker/validate */}
          <Route path="validate" element={<Validation />} />
          {/* /tracker/task */}
          <Route path="task" element={<Task />} />
          {/* /tracker/results */}
          <Route path="results" element={<Results />} />
        </Route>

        {/* 기타 예외 경로 처리 */}
        <Route path="*" element={<div>페이지를 찾을 수 없습니다.</div>} />
      </Routes>
    </div>
  );
}

export default App;