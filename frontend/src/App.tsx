// frontend/src/App.tsx (수정된 코드)

// 1. BrowserRouter import 제거 (Routes, Route만 남김)
import { Routes, Route } from 'react-router-dom'; 
import './App.css';

// --- 기존 Frontend 페이지 ---
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TrainingPage from './pages/TrainingPage';
import ResultsPage from './pages/ResultsPage';

// --- (1단계) tracker-app에서 마이그레이션한 페이지 ---
import SurveyPage from './pages/SurveyPage';
import ConsentPage from './pages/ConsentPage';

// --- (2단계) GazeSetupPage 대신 추가된 개별 설정 페이지 5개 ---
import SetupInstructionsPage from './pages/SetupInstructionsPage';
import SetupWebcamCheckPage from './pages/SetupWebcamCheckPage';
import SetupCalibrationPage from './pages/SetupCalibrationPage';
import SetupConfirmPage from './pages/SetupConfirmPage';
import SetupValidationPage from './pages/SetupValidationPage';

// --- (3단계) 방금 추가한 TrackerLayout 임포트 ---
import TrackerLayout from './components/GazeTracker/TrackerLayout';


function App() {
  return (
    // 3. App.css의 스타일이 적용될 수 있도록
    //    최상위 <div> (혹은 <main> 등)를 추가합니다.
    //    (아마도 className="App"을 사용하실 것입니다.)
    <div className="App"> 
      <Routes>
        {/* --- 기존 플로우 --- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* --- 온보딩(Survey, Consent) 플로우 --- */}
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/consent" element={<ConsentPage />} />

        
        {/* --- 4. GazeTracker 설정 플로우 (중첩 라우트 구조) --- */}
        <Route path="/setup" element={<TrackerLayout />}>
          <Route index element={<SetupInstructionsPage />} /> 
          <Route path="webcam-check" element={<SetupWebcamCheckPage />} />
          <Route path="calibrate" element={<SetupCalibrationPage />} /> 
          <Route path="confirm-validation" element={<SetupConfirmPage />} />
          <Route path="validate" element={<SetupValidationPage />} />
        </Route>

        {/* --- 5. 설정 완료 후 기존 플로우 --- */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/results" element={<ResultsPage />} />

      </Routes>
    </div> // 4. 최상위 <div> 닫기
  );
}

export default App;