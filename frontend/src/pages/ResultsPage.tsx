// src/pages/ResultsPage.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResultsPage.css';
import {
  TrainingDataPoint,
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { exportSessionData } from '../utils/sessionExport';
import { useAuth } from '../state/authContext';

interface Analytics {
  totalTargets: number;
  targetsHit: number;
  accuracy: number;
  avgReactionTime: number;
  gazeAccuracy: number;
  mouseAccuracy: number;
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeSession,
    surveyResponses,
    consentAccepted,
    calibrationResult,
  } = useTrackingSession();
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<TrainingSessionSummary | null>(activeSession);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [autoUploadAttemptedFor, setAutoUploadAttemptedFor] = useState<string | null>(null);
  const [autoUploadStatus, setAutoUploadStatus] = useState<'idle' | 'success' | 'error' | 'skipped'>('idle');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const participantLabel = user?.email ?? user?.displayName ?? user?.uid;
  const locationState = (location.state as { fromTrainingComplete?: boolean; sessionId?: string } | null) ?? null;

  useEffect(() => {
    if (!activeSession) {
      navigate('/dashboard');
      return;
    }
    setSessionData(activeSession);
    setAnalytics(calculateAnalytics(activeSession.rawData));
    setAutoUploadAttemptedFor(null);
    setAutoUploadStatus('idle');
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
      setAutoUploadStatus(success ? 'success' : 'error');
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
    setAutoUploadStatus(success ? 'success' : 'error');
  }, [handleExport]);

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
            <div className="metric-card highlight">
              <div className="metric-icon">🎯</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.accuracy.toFixed(1)}%</div>
                <div className="metric-label">Accuracy</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⚡</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.avgReactionTime.toFixed(0)}ms</div>
                <div className="metric-label">Avg Reaction Time</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">✓</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.targetsHit}</div>
                <div className="metric-label">Targets Hit</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">👁️</div>
              <div className="metric-content">
                <div className="metric-value">{analytics.gazeAccuracy.toFixed(1)}%</div>
                <div className="metric-label">Gaze Tracking</div>
              </div>
            </div>
          </div>
        </section>

        {/* Visualizations */}
        <section className="visualizations-section">
          <h2>Data Visualizations</h2>

          <div className="viz-grid">
            {/* Accuracy Over Time */}
            <div className="viz-card">
              <h3>Accuracy Over Time</h3>
              <div className="viz-placeholder">
                <div className="placeholder-chart">
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
    </div>
  );
};

export default ResultsPage;