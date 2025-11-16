import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CalibrationPage from './pages/CalibrationPage';
import TrainingPage from './pages/TrainingPage';
import ResultsPage from './pages/ResultsPage';
import TrackerAppPage from './pages/TrackerAppPage';
import TrackerFlowPage from './pages/TrackerFlowPage';
import { ReactElement } from 'react';

const getIsAuthenticated = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem('isAuthenticated') === 'true';
};

const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const isAuthenticated = getIsAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  const isAuthenticated = getIsAuthenticated();

  if (isAuthenticated) {
    const redirectTarget = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';
    return <Navigate to={redirectTarget} replace />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth"
          element={(
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/calibration"
          element={(
            <ProtectedRoute>
              <CalibrationPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/training"
          element={(
            <ProtectedRoute>
              <TrainingPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/results"
          element={(
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/tracker-app"
          element={(
            <ProtectedRoute>
              <TrackerAppPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/tracker-flow"
          element={(
            <ProtectedRoute>
              <TrackerFlowPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;