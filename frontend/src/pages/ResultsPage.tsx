// src/pages/ResultsPage.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultsPage.css';
import {
  TrainingDataPoint,
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { exportSessionData } from '../utils/sessionExport';

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
  const {
    activeSession,
    surveyResponses,
    consentAccepted,
    calibrationResult,
  } = useTrackingSession();
  const [sessionData, setSessionData] = useState<TrainingSessionSummary | null>(activeSession);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeSession) {
      navigate('/dashboard');
      return;
    }
    setSessionData(activeSession);
    setAnalytics(calculateAnalytics(activeSession.rawData));
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
    async ({ upload }: { upload?: boolean } = {}) => {
      if (!sessionData) {
        return;
      }

      try {
        setIsExporting(true);
        await exportSessionData(
          {
            session: sessionData,
            surveyResponses,
            consentAccepted,
            calibrationResult,
          },
          {
            filename: `training-session-${sessionData.id}.csv`,
            download: true,
            upload: Boolean(upload),
          },
        );
        showToast(
          upload
            ? 'CSV downloaded and uploaded successfully.'
            : 'CSV downloaded successfully.',
          'success',
        );
      } catch (error) {
        console.error('Failed to export session data', error);
        showToast(upload ? 'CSV upload failed.' : 'CSV export failed.', 'error');
      } finally {
        setIsExporting(false);
      }
    },
    [calibrationResult, consentAccepted, sessionData, showToast, surveyResponses],
  );

  const handleTrainAgain = () => {
    navigate('/calibration');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
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
            <button
              className="download-button"
              onClick={() => handleExport({ upload: false })}
              disabled={isExporting}
            >
              {isExporting ? 'Preparing…' : 'Download CSV'}
            </button>
            <button
              className="upload-button"
              onClick={() => handleExport({ upload: true })}
              disabled={isExporting}
            >
              {isExporting ? 'Uploading…' : 'Upload to /api/upload-csv'}
            </button>
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