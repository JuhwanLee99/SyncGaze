// frontend/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

// --- 기존 Frontend 페이지 ---
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TrainingPage from './pages/TrainingPage';
import ResultsPage from './pages/ResultsPage';
// import CalibrationPage from './pages/CalibrationPage'; // 1. 기존 CalibrationPage 제거

// --- (1단계) tracker-app에서 마이그레이션한 페이지 ---
// (SurveyPage, ConsentPage)
import SurveyPage from './pages/SurveyPage';
import ConsentPage from './pages/ConsentPage';

// --- (2단계) GazeSetupPage 대신 추가된 개별 설정 페이지 5개 ---
// (SetupInstructionsPage, SetupWebcamCheckPage, SetupCalibrationPage, 
//  SetupConfirmPage, SetupValidationPage)
import SetupInstructionsPage from './pages/SetupInstructionsPage';
import SetupWebcamCheckPage from './pages/SetupWebcamCheckPage';
import SetupCalibrationPage from './pages/SetupCalibrationPage';
import SetupConfirmPage from './pages/SetupConfirmPage';
import SetupValidationPage from './pages/SetupValidationPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- 기존 플로우 --- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* --- 3. 온보딩(Survey, Consent) 플로우 추가 --- */}
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/consent" element={<ConsentPage />} />

        {/* --- 4. GazeTracker 설정 플로우 추가 (GazeSetupPage 대체) --- */}
        
        {/* tracker-app의 '/' (시작) */}
        <Route path="/setup" element={<SetupInstructionsPage />} /> 
        
        {/* tracker-app의 '/webcam-check' */}
        <Route path="/setup/webcam-check" element={<SetupWebcamCheckPage />} />
        
        {/* tracker-app의 '/calibrate' (기존 /calibration 경로는 이것으로 대체됨) */}
        <Route path="/setup/calibrate" element={<SetupCalibrationPage />} /> 
        
        {/* tracker-app의 '/confirm-validation' */}
        <Route path="/setup/confirm-validation" element={<SetupConfirmPage />} />
        
        {/* tracker-app의 '/validate' */}
        <Route path="/setup/validate" element={<SetupValidationPage />} />

        {/* --- 5. 설정 완료 후 기존 플로우 --- */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/results" element={<ResultsPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;