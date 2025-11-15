// src/pages/ResultsPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultsPage.css';

interface SessionData {
  sessionId: string;
  date: string;
  duration: number;
  score: number;
  csvData: string;
  rawData: TrainingData[];
}

interface TrainingData {
  timestamp: number;
  gazeX: number | null;
  gazeY: number | null;
  mouseX: number | null;
  mouseY: number | null;
  targetHit: boolean;
  targetId: string | null;
}

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
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    // Load session data from localStorage
    const data = localStorage.getItem('lastTrainingSession');
    if (!data) {
      navigate('/dashboard');
      return;
    }

    const parsedData: SessionData = JSON.parse(data);
    setSessionData(parsedData);

    // Calculate analytics
    const analyticsData = calculateAnalytics(parsedData.rawData);
    setAnalytics(analyticsData);
  }, [navigate]);

  const calculateAnalytics = (data: TrainingData[]): Analytics => {
    const hits = data.filter(d => d.targetHit);
    const totalTargets = hits.length;
    const targetsHit = hits.length;
    
    // Calculate average reaction time (time between target appearance and hit)
    const reactionTimes = hits.map(d => d.timestamp);
    const avgReactionTime = reactionTimes.length > 0 
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
      : 0;

    // Calculate gaze and mouse accuracy
    const dataWithGaze = data.filter(d => d.gazeX !== null && d.gazeY !== null);
    const dataWithMouse = data.filter(d => d.mouseX !== null && d.mouseY !== null);
    
    const gazeAccuracy = (dataWithGaze.length / data.length) * 100;
    const mouseAccuracy = (dataWithMouse.length / data.length) * 100;
    const accuracy = (targetsHit / (totalTargets || 1)) * 100;

    return {
      totalTargets,
      targetsHit,
      accuracy,
      avgReactionTime,
      gazeAccuracy,
      mouseAccuracy
    };
  };

  const downloadCSV = () => {
    if (!sessionData) return;

    const blob = new Blob([sessionData.csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-session-${sessionData.sessionId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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
                  Visualization of where your gaze focused during training
                </p>
              </div>
            </div>

            {/* Reaction Time Distribution */}
            <div className="viz-card">
              <h3>Reaction Time Distribution</h3>
              <div className="viz-placeholder">
                <div className="placeholder-histogram">
                  <div className="hist-bar" style={{ height: '40%' }}></div>
                  <div className="hist-bar" style={{ height: '70%' }}></div>
                  <div className="hist-bar" style={{ height: '100%' }}></div>
                  <div className="hist-bar" style={{ height: '60%' }}></div>
                  <div className="hist-bar" style={{ height: '30%' }}></div>
                </div>
                <p className="viz-description">
                  Distribution of your reaction times across all targets
                </p>
              </div>
            </div>

            {/* Target Hit Pattern */}
            <div className="viz-card">
              <h3>Hit Pattern Analysis</h3>
              <div className="viz-placeholder">
                <div className="pattern-grid">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="pattern-cell"
                      style={{ opacity: Math.random() > 0.3 ? 1 : 0.2 }}
                    ></div>
                  ))}
                </div>
                <p className="viz-description">
                  Spatial distribution of successful target hits
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section className="export-section">
          <h2>Export Data</h2>
          <div className="export-card">
            <div className="export-info">
              <div className="export-icon">📄</div>
              <div>
                <h3>Training Data CSV</h3>
                <p>
                  Download your complete training session data including timestamps, 
                  gaze coordinates, mouse positions, and target hit information.
                </p>
                <p className="data-count">
                  {sessionData.rawData.length} data points collected
                </p>
              </div>
            </div>
            <button className="download-button" onClick={downloadCSV}>
              Download CSV
            </button>
          </div>
        </section>

        {/* Actions */}
        <section className="actions-section">
          <button className="action-button primary" onClick={handleTrainAgain}>
            Train Again
          </button>
          <button className="action-button secondary" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
        </section>
      </main>
    </div>
  );
};

export default ResultsPage;