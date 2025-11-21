// frontend/src/pages/ResultsPage.tsx
// UPDATED: Stops WebGazer when mounting results page

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResultsPage.css';
import {
  TrainingSessionSummary,
  TrainingDataPoint,
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

type AccuracyPoint = {
  time: number;
  accuracy: number;
  hits: number;
  total: number;
};

type AccuracySeriesConfig = {
  key: string;
  label: string;
  color: string;
  gradientId: string;
  points: AccuracyPoint[];
  tooltipLabel: string;
};

type HeatmapPoint = { x: number; y: number };

const generateCumulativeSeries = (
  data: TrainingDataPoint[],
  duration: number,
  isHit: (point: TrainingDataPoint) => boolean,
  shouldCount: (point: TrainingDataPoint) => boolean = () => true,
): AccuracyPoint[] => {
  if (!data.length) {
    return [];
  }

  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sorted[0].timestamp;
  const buckets = new Map<number, { hits: number; total: number }>();

  sorted.forEach(point => {
    const elapsedSeconds = Math.max(0, Math.floor((point.timestamp - startTime) / 1000));
    const bucket = buckets.get(elapsedSeconds) ?? { hits: 0, total: 0 };
    if (shouldCount(point)) {
      bucket.total += 1;
    }
    if (isHit(point)) {
      bucket.hits += 1;
    }
    buckets.set(elapsedSeconds, bucket);
  });

  const bucketSeconds = Array.from(buckets.keys());
  const lastBucket = bucketSeconds.length ? Math.max(...bucketSeconds) : 0;
  const maxSeconds = Math.max(duration ?? 0, lastBucket);

  let runningHits = 0;
  let runningTotal = 0;
  const series: AccuracyPoint[] = [];

  for (let second = 0; second <= maxSeconds; second += 1) {
    const bucket = buckets.get(second);
    if (bucket) {
      runningHits += bucket.hits;
      runningTotal += bucket.total;
    }

    const currentAccuracy = runningTotal
      ? (runningHits / runningTotal) * 100
      : series.at(-1)?.accuracy ?? 0;

    series.push({
      time: second,
      accuracy: currentAccuracy,
      hits: runningHits,
      total: runningTotal,
    });
  }

  return series;
};

const AccuracyLineChart = ({ series, duration }: { series: AccuracySeriesConfig[]; duration: number }) => {
  const activeSeries = series.filter(s => s.points.length);

  if (!activeSeries.length) {
    return <div className="chart-empty">No accuracy data collected for this session.</div>;
  }

  const width = 720;
  const height = 360;
  const padding = 56;
  const xMax = Math.max(
    duration,
    ...activeSeries.map(s => s.points.at(-1)?.time ?? 0),
    1,
  );
  const yMax = 100;

  const xScale = (time: number) => padding + (time / xMax) * (width - padding * 2);
  const yScale = (value: number) => height - padding - (value / yMax) * (height - padding * 2);

  const xTicks = 6;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => Math.round((xMax / (xTicks - 1)) * i));
  const yTickValues = [0, 25, 50, 75, 100];

  const formatTime = (seconds: number) => `${seconds}s`;

  return (
    <div className="chart-container">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Accuracy over time">
        <defs>
          {activeSeries.map(({ gradientId, color }) => (
            <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={color} stopOpacity="0.25" />
            </linearGradient>
          ))}
        </defs>

        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />

        {/* Gridlines */}
        {xTickValues.map(tick => (
          <line
            key={`x-${tick}`}
            x1={xScale(tick)}
            x2={xScale(tick)}
            y1={padding}
            y2={height - padding}
            className="chart-grid"
          />
        ))}
        {yTickValues.map(tick => (
          <line
            key={`y-${tick}`}
            x1={padding}
            x2={width - padding}
            y1={yScale(tick)}
            y2={yScale(tick)}
            className="chart-grid"
          />
        ))}

        {/* Axis labels */}
        {xTickValues.map(tick => (
          <text key={`xlabel-${tick}`} x={xScale(tick)} y={height - padding + 24} className="chart-label" textAnchor="middle">
            {formatTime(tick)}
          </text>
        ))}
        {yTickValues.map(tick => (
          <text
            key={`ylabel-${tick}`}
            x={padding - 12}
            y={yScale(tick) + 4}
            className="chart-label"
            textAnchor="end"
          >
            {tick}%
          </text>
        ))}

        {/* Axis titles */}
        <text x={(width + padding) / 2} y={height - 12} className="chart-axis-title" textAnchor="middle">
          Time (seconds)
        </text>
        <text
          x={16}
          y={height / 2}
          className="chart-axis-title"
          textAnchor="middle"
          transform={`rotate(-90 16 ${height / 2})`}
        >
          Accuracy (%)
        </text>

        {/* Data lines & points */}
        {activeSeries.map(({ key, points, gradientId, color, tooltipLabel }) => {
          const pathD = points
            .map((point, index) => {
              const prefix = index === 0 ? 'M' : 'L';
              return `${prefix}${xScale(point.time)},${yScale(point.accuracy)}`;
            })
            .join(' ');

          return (
            <g key={key}>
              <path d={pathD} className="chart-line" stroke={`url(#${gradientId})`} />

              {points.map(point => (
                <g key={`${key}-point-${point.time}`}>
                  <circle
                    cx={xScale(point.time)}
                    cy={yScale(point.accuracy)}
                    r={4}
                    className="chart-point"
                    style={{ fill: color }}
                  />
                  <title>
                    {`${tooltipLabel}: ${point.accuracy.toFixed(1)}% at ${formatTime(point.time)} (${point.hits}/${point.total || '0'})`}
                  </title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="chart-legend" aria-label="Accuracy legend">
        {activeSeries.map(({ key, label, color }) => (
          <div key={key} className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: color }} aria-hidden />
            <span className="legend-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="chart-caption">
        Accuracy shown as cumulative percentages over time for targets hit, gaze tracking presence, and mouse tracking.
      </div>
    </div>
  );
};

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
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapContainerRef = useRef<HTMLDivElement | null>(null);
  const participantLabel = user?.email ?? user?.displayName ?? user?.uid;
  const locationState = (location.state as { fromTrainingComplete?: boolean; sessionId?: string } | null) ?? null;

  const accuracySeries = useMemo(
    () => (
      sessionData
        ? generateCumulativeSeries(
            sessionData.rawData,
            sessionData.duration,
            point => point.targetHit,
            point => point.targetId !== null,
          )
        : []
    ),
    [sessionData],
  );

  const gazeAccuracySeries = useMemo(
    () => (
      sessionData
        ? generateCumulativeSeries(
            sessionData.rawData,
            sessionData.duration,
            point => point.gazeX !== null && point.gazeY !== null,
          )
        : []
    ),
    [sessionData],
  );

  const mouseAccuracySeries = useMemo(
    () => (
      sessionData
        ? generateCumulativeSeries(
            sessionData.rawData,
            sessionData.duration,
            point => point.mouseX !== null && point.mouseY !== null,
          )
        : []
    ),
    [sessionData],
  );

  const combinedAccuracySeries = useMemo<AccuracySeriesConfig[]>(
    () => [
      {
        key: 'target-accuracy',
        label: 'Target Accuracy',
        color: '#7a5ff5',
        gradientId: 'line-accuracy',
        points: accuracySeries,
        tooltipLabel: 'Target Accuracy',
      },
      {
        key: 'gaze-accuracy',
        label: 'Gaze Accuracy',
        color: '#4ecdc4',
        gradientId: 'line-gaze',
        points: gazeAccuracySeries,
        tooltipLabel: 'Gaze Accuracy',
      },
      {
        key: 'mouse-accuracy',
        label: 'Mouse Accuracy',
        color: '#ffb86c',
        gradientId: 'line-mouse',
        points: mouseAccuracySeries,
        tooltipLabel: 'Mouse Accuracy',
      },
    ],
    [accuracySeries, gazeAccuracySeries, mouseAccuracySeries],
  );

  const { heatmapPoints, baseScreenWidth, baseScreenHeight } = useMemo(() => {
    if (!sessionData) {
      return { heatmapPoints: [] as HeatmapPoint[], baseScreenWidth: 1920, baseScreenHeight: 1080 };
    }

    const validGazePoints = sessionData.rawData.filter(
      point => point.gazeX !== null && point.gazeY !== null,
    );

    const maxGazeX = validGazePoints.reduce((max, point) => Math.max(max, point.gazeX ?? 0), 0);
    const maxGazeY = validGazePoints.reduce((max, point) => Math.max(max, point.gazeY ?? 0), 0);

    const baseScreenWidth = sessionData.screenSize?.width || (maxGazeX || 1920);
    const baseScreenHeight = sessionData.screenSize?.height || (maxGazeY || 1080);

    const heatmapPoints = validGazePoints
      .map(point => ({
        x: (point.gazeX ?? 0) / baseScreenWidth,
        y: (point.gazeY ?? 0) / baseScreenHeight,
      }))
      // Keep only points that fall inside the normalized viewport so the
      // heatmap doesn't blur everything into the background.
      .filter(point => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);

    return { heatmapPoints, baseScreenWidth, baseScreenHeight };
  }, [sessionData]);

  const drawHeatmap = useCallback(() => {
    const canvas = heatmapCanvasRef.current;
    const container = heatmapContainerRef.current;

    if (!canvas || !container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const displayWidth = Math.max(1, Math.round(rect.width));
    const displayHeight = Math.max(1, Math.round(rect.height));

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!heatmapPoints.length) {
      return;
    }

    // Build a simple density grid so hotter areas pop visually.
    const gridSize = 64;
    const grid = new Float32Array(gridSize * gridSize);
    let maxCount = 0;

    heatmapPoints.forEach(point => {
      const gx = Math.min(gridSize - 1, Math.max(0, Math.floor(point.x * gridSize)));
      const gy = Math.min(gridSize - 1, Math.max(0, Math.floor(point.y * gridSize)));
      const idx = gy * gridSize + gx;
      grid[idx] += 1;
      if (grid[idx] > maxCount) {
        maxCount = grid[idx];
      }
    });

    if (!maxCount) {
      return;
    }

    const cellWidth = displayWidth / gridSize;
    const cellHeight = displayHeight / gridSize;

    // UPDATED: 가시성을 높인 색상 함수 (파랑 -> 초록 -> 빨강 스펙트럼)
    const colorForIntensity = (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      
      // 1. Hue(색상) 계산: 
      // 밀도가 낮을수록 240(파랑), 높을수록 0(빨강)에 가깝게 매핑
      // (파랑 -> 하늘 -> 초록 -> 노랑 -> 주황 -> 빨강)
      const hue = (1 - clamped) * 240;
      
      // 2. Lightness(밝기) 및 Saturation(채도):
      // 선명한 색을 위해 채도는 100%, 밝기는 50% 유지
      
      // 3. Alpha(불투명도):
      // 최소 0.5로 설정하여 희미한 점도 잘 보이게 하고, 밀도가 높으면 0.9까지 증가
      const alpha = 0.5 + (clamped * 0.4);
      
      return `hsla(${hue}, 100%, 50%, ${alpha})`;
    };

    ctx.save();
    
    // UPDATED: 블렌딩 모드 변경
    // 'lighter'는 색이 겹치면 흰색으로 변해 가시성이 떨어질 수 있으므로 
    // 'source-over'를 사용하여 색상을 있는 그대로 진하게 표현합니다.
    ctx.globalCompositeOperation = 'source-over';
    
    // UPDATED: 블러 효과 조정
    // 너무 흐릿하지 않도록 블러 값을 약간 줄여(12px -> 8px) 분포 영역을 명확히 합니다.
    ctx.filter = 'blur(6px)'; 
    
    ctx.imageSmoothingEnabled = true;

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const count = grid[y * gridSize + x];
        if (count === 0) continue;
        
        // 로그 스케일 등을 적용하지 않고 선형 비율을 사용하여
        // 데이터가 많은 곳(빨강)이 확실히 드러나도록 합니다.
        const intensity = count / maxCount;
        
        ctx.fillStyle = colorForIntensity(intensity);
        // 블러 효과로 인한 빈틈을 줄이기 위해 cell 크기를 약간 키워(Overlap) 그립니다.
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }

    ctx.restore();
  }, [heatmapPoints]);

  useEffect(() => {
    const handleResize = () => drawHeatmap();
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [drawHeatmap, baseScreenWidth, baseScreenHeight]);

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
              <AccuracyLineChart series={combinedAccuracySeries} duration={sessionData.duration} />
            </div>

            {/* Gaze Heatmap */}
            <div className="viz-card">
              <h3>Gaze Heatmap</h3>
              <div className="heatmap-wrapper">
                {heatmapPoints.length ? (
                  <div
                    className="heatmap-container"
                    ref={heatmapContainerRef}
                    style={{ aspectRatio: `${baseScreenWidth} / ${baseScreenHeight}` }}
                  >
                    <canvas ref={heatmapCanvasRef} className="heatmap-canvas" aria-label="Gaze heatmap" />
                    <div className="heatmap-overlay" aria-hidden="true">
                      <div className="heatmap-grid"></div>
                    </div>
                  </div>
                ) : (
                  <div className="chart-empty">No gaze samples collected for this session.</div>
                )}
                <div className="heatmap-footer">
                  <p className="viz-description">
                    Visualize where your gaze was focused during the session
                  </p>
                  {heatmapPoints.length > 0 && (
                    <div className="heatmap-meta">
                      <span>{heatmapPoints.length} gaze samples</span>
                      <span>
                        Rendered at {Math.round(baseScreenWidth)} × {Math.round(baseScreenHeight)}
                      </span>
                    </div>
                  )}
                </div>
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