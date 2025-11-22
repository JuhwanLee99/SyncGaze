// frontend/src/pages/ResultsPage.tsx
// UPDATED: Stops WebGazer when mounting results page

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResultsPage.css';
import {
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { exportSessionData } from '../utils/sessionExport';
import { useWebgazer } from '../hooks/tracking/useWebgazer';  // NEW: Import useWebgazer
import { useAuth } from '../state/authContext';
import { persistLatestSession } from '../utils/resultsStorage';

interface Analytics {
  totalTargets: number;
  targetsHit: number;
  accuracy: number;
  avgReactionTime: number;
  gazeAccuracy: number;
  mouseAccuracy: number;
}
import { calculatePerformanceAnalytics, PerformanceAnalytics } from '../utils/analytics';

type AutoUploadStatus = 'idle' | 'success' | 'error' | 'skipped';

const UPLOAD_STATUS_STORAGE_KEY = 'resultsUploadStatus';

const loadStoredUploadStatus = (sessionId: string | undefined): AutoUploadStatus | null => {
  if (!sessionId) return null;
  try {
    const stored = window.sessionStorage.getItem(UPLOAD_STATUS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, AutoUploadStatus>;
    return parsed[sessionId] ?? null;
  } catch (error) {
    console.warn('Failed to read upload status from storage', error);
    return null;
  }
};

const persistUploadStatus = (sessionId: string | undefined, status: AutoUploadStatus) => {
  if (!sessionId) return;
  try {
    const stored = window.sessionStorage.getItem(UPLOAD_STATUS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Record<string, AutoUploadStatus>) : {};
    parsed[sessionId] = status;
    window.sessionStorage.setItem(UPLOAD_STATUS_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.warn('Failed to persist upload status to storage', error);
  }
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeSession,
    surveyResponses,
    consentAccepted,
    calibrationResult,
  } = useTrackingSession();
  
  // NEW: Get stopSession from WebGazer context
  const { stopSession } = useWebgazer();
  
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<TrainingSessionSummary | null>(activeSession);
  const [analytics, setAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [autoUploadAttemptedFor, setAutoUploadAttemptedFor] = useState<string | null>(null);
  const [autoUploadStatus, setAutoUploadStatus] = useState<AutoUploadStatus>('idle');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const participantLabel = user?.email ?? user?.displayName ?? user?.uid;
  const locationState = (location.state as { fromTrainingComplete?: boolean; sessionId?: string } | null) ?? null;

  // NEW: Stop WebGazer when results page mounts
  useEffect(() => {
    console.log('📊 Results page mounted - stopping WebGazer');
    stopSession();
  }, [stopSession]);

  useEffect(() => {
    if (!activeSession) {
      navigate('/dashboard');
      return;
    }
    setSessionData(activeSession);
    setAnalytics(calculatePerformanceAnalytics(activeSession.rawData));
    setAutoUploadAttemptedFor(null);
    setAutoUploadStatus(loadStoredUploadStatus(activeSession.id) ?? 'idle');
  }, [activeSession, navigate]);

  const calculateAnalytics = (data: TrainingDataPoint[]): Analytics => {
    if (data.length === 0) {
      return {
        totalTargets: 0,
        targetsHit: 0,
        accuracy: 0,
        avgReactionTime: 0,
        gazeAccuracy: 0,
        mouseAccuracy: 0,
      };
    }

    const hits = data.filter(d => d.targetHit);
    const totalTargets = data.filter(d => d.targetId !== null).length || hits.length;
    const targetsHit = hits.length;

    const reactionTimes = hits.map(d => d.timestamp);
    const avgReactionTime = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;

    const dataWithGaze = data.filter(d => d.gazeX !== null && d.gazeY !== null);
    const dataWithMouse = data.filter(d => d.mouseX !== null && d.mouseY !== null);

    const gazeAccuracy = (dataWithGaze.length / data.length) * 100;
    const mouseAccuracy = (dataWithMouse.length / data.length) * 100;
    const accuracy = totalTargets > 0 ? (targetsHit / totalTargets) * 100 : 0;

    return {
      totalTargets,
      targetsHit,
      accuracy,
      avgReactionTime,
      gazeAccuracy,
      mouseAccuracy,
    };
  };

  useEffect(() => {
    if (!sessionData) {
      return;
    }
    persistLatestSession(sessionData, calibrationResult);
  }, [sessionData, calibrationResult]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  const handleExport = useCallback(
    async ({ upload, download = true }: { upload?: boolean; download?: boolean } = {}) => {
      if (!sessionData) {
        return false;
      }

      try {
        setIsExporting(true);
        const idToken = user ? await user.getIdToken() : undefined;
        const exportResult = await exportSessionData(
          {
            session: sessionData,
            surveyResponses,
            consentAccepted,
            calibrationResult,
            participantLabel,
            screenSize: sessionData.screenSize,
          },
          {
            filename: `training-session-${sessionData.id}.csv`,
            download,
            upload: Boolean(upload),
            uploadOptions: {
              sessionId: sessionData.id,
              idToken,
            },
          },
        );
        const uploadPath = exportResult.uploadResult?.storagePath || exportResult.uploadResult?.downloadUrl;
        const successMessage = upload
          ? uploadPath
            ? `CSV uploaded to Firebase Storage: ${uploadPath}`
            : download
              ? 'CSV downloaded and uploaded successfully.'
              : 'CSV uploaded successfully.'
          : 'CSV downloaded successfully.';

        showToast(successMessage, 'success');
        return true;
      } catch (error) {
        console.error('Failed to export session data', error);
        const message = error instanceof Error ? error.message : 'Unexpected error occurred.';
        showToast(
          upload ? `CSV upload failed: ${message}` : `CSV export failed: ${message}`,
          'error',
        );
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [calibrationResult, consentAccepted, participantLabel, sessionData, showToast, surveyResponses, user],
  );

  useEffect(() => {
    if (!sessionData) {
      return;
    }

    const fromTrainingComplete = Boolean(locationState?.fromTrainingComplete);
    const sessionMatches = !locationState?.sessionId || locationState.sessionId === sessionData.id;

    if (!fromTrainingComplete || !sessionMatches) {
      setAutoUploadStatus(status => (status === 'idle' ? 'skipped' : status));
      return;
    }

    if (autoUploadAttemptedFor === sessionData.id) {
      return;
    }

    setAutoUploadAttemptedFor(sessionData.id);

    const attemptAutoUpload = async () => {
      const success = await handleExport({ upload: true, download: false });
      const status = success ? 'success' : 'error';
      setAutoUploadStatus(status);
      persistUploadStatus(sessionData.id, status);
    };

    attemptAutoUpload();
  }, [autoUploadAttemptedFor, handleExport, locationState, sessionData]);

  const handleTrainAgain = () => {
    navigate('/calibration');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleManualUpload = useCallback(async () => {
    const success = await handleExport({ upload: true, download: false });
    const status = success ? 'success' : 'error';
    setAutoUploadStatus(status);
    persistUploadStatus(sessionData?.id, status);
  }, [handleExport, sessionData?.id]);

  const handleOpenDetailed = (focusMetric?: string) => {
    if (sessionData) {
      persistLatestSession(sessionData, calibrationResult);
    }
    navigate('/results/detailed', { state: { focusMetric, sessionId: sessionData?.id } });
  };

  if (!sessionData || !analytics) {
    return (
      <div className="results-page">
        <div className="loading">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="results-page">
      {/* Header */}
      <header className="results-header">
        <div className="header-content">
          <h1>Training Results</h1>
          <div className="header-meta">
            <span>{new Date(sessionData.date).toLocaleString()}</span>
            <span>•</span>
            <span>{sessionData.duration}s session</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="results-main">
        {/* Key Metrics */}
        <section className="metrics-section">
          <h2>Performance Overview</h2>
          <div className="metrics-grid">
            <button
              type="button"
              className="metric-card actionable highlight"
              onClick={() => handleOpenDetailed('accuracy')}
            >
              <div className="metric-icon">🎯</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.accuracy.toFixed(1)}%</div>
                <div className="metric-label">Accuracy</div>
              </div>
            </button>

            <button
              type="button"
              className="metric-card actionable"
              onClick={() => handleOpenDetailed('targets')}
            >
              <div className="metric-icon">✓</div>
              <div className="metric-content">
                <div className="metric-value">
                  {analytics.targetsHit}/{analytics.totalTargets}
                </div>
                <div className="metric-label">Targets Hit</div>
              </div>
            </button>

            <button
              type="button"
              className="metric-card actionable"
              onClick={() => handleOpenDetailed('reaction')}
            >
              <div className="metric-icon">⚡</div>
              <div className="metric-content">
                <div className="metric-value">
                  {analytics.avgReactionTime.toFixed(0)}ms
                </div>
                <div className="metric-label">Avg Reaction Time</div>
              </div>
            </button>

            <button
              type="button"
              className="metric-card actionable"
              onClick={() => handleOpenDetailed('gaze')}
            >
              <div className="metric-icon">👁️</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.gazeAccuracy.toFixed(1)}%</div>
                <div className="metric-label">Gaze Accuracy</div>
              </div>
            </button>

            <button
              type="button"
              className="metric-card actionable"
              onClick={() => handleOpenDetailed('mouse')}
            >
              <div className="metric-icon">🖱️</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.mouseAccuracy.toFixed(1)}%</div>
                <div className="metric-label">Mouse Accuracy</div>
              </div>
            </button>
          </div>
        </section>

        {/* Visualizations */}
        <section className="viz-section">
          <h2>Session Visualizations</h2>
          <div className="viz-grid">
            {/* Accuracy Over Time */}
            <div className="viz-card">
              <h3>Accuracy Over Time</h3>
              <div className="viz-placeholder">
                <div className="chart-placeholder">
                  <div className="chart-line" style={{ height: '60%' }}></div>
                  <div className="chart-line" style={{ height: '75%' }}></div>
                  <div className="chart-line" style={{ height: '85%' }}></div>
                  <div className="chart-line" style={{ height: '70%' }}></div>
                  <div className="chart-line" style={{ height: '90%' }}></div>
                </div>
                <p className="viz-description">
                  Track your accuracy throughout the training session
                </p>
              </div>
            </div>

            {/* Gaze Heatmap */}
            <div className="viz-card">
              <h3>Gaze Heatmap</h3>
              <div className="viz-placeholder">
                <div className="heatmap-placeholder">
                  <div className="heatmap-dot" style={{ top: '30%', left: '40%' }}></div>
                  <div className="heatmap-dot" style={{ top: '50%', left: '50%' }}></div>
                  <div className="heatmap-dot" style={{ top: '60%', left: '30%' }}></div>
                  <div className="heatmap-dot" style={{ top: '40%', left: '70%' }}></div>
                </div>
                <p className="viz-description">
                  Visualize where your gaze was focused during the session
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Raw Data */}
        <section className="data-section">
          <h2>Session Data</h2>
          <div className="data-actions">
            {autoUploadStatus === 'error' && (
              <span className="upload-status error">Automatic upload failed. You can retry below.</span>
            )}
            <button
              className="download-button"
              onClick={() => handleExport({ upload: false })}
              disabled={isExporting}
            >
              {isExporting ? 'Preparing…' : 'Download CSV'}
            </button>
            {autoUploadStatus === 'success' ? (
              <span className="upload-status success upload-status-inline">
                CSV automatically uploaded to Firebase Storage.
              </span>
            ) : (
              <button
                className="upload-button"
                onClick={handleManualUpload}
                disabled={isExporting}
              >
                {isExporting
                  ? 'Uploading…'
                  : autoUploadStatus === 'error'
                    ? 'Retry Upload'
                    : 'Upload to Firebase Storage'}
              </button>
            )}
            <button className="secondary-button" onClick={handleTrainAgain}>
              Train Again
            </button>
            <button className="secondary-button" onClick={handleBackToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </section>
      </main>
      {toast && (
        <div className={`toast ${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
      {/* --- 연구 감사 인사용 페이지 이동 영역--- */}
      <div className="finish-action-area" style={{ 
        marginTop: '-50px', 
        padding: '15px', 
        textAlign: 'center',
        borderTop: '0.5px solid #eee' 
      }}>
        <p style={{ marginBottom: '15px', color: '#ffffffff' }}>
          모든 결과를 확인하셨나요? 아래 버튼을 눌러 연구 참여를 종료해 주세요.
        </p>
        <button 
          onClick={() => navigate('/onboarding/thank-you')}
          style={{
            padding: '15px 40px',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: '#760215ff', // 혹은 기존 테마의 primary color
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(36, 26, 26, 0.1)'
          }}
        >
          연구 참여 종료하기
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;
