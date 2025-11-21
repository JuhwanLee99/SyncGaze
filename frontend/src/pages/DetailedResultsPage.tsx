import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './DetailedResultsPage.css';
import {
  CalibrationResult,
  TrainingDataPoint,
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { loadStoredCalibration, loadStoredSession, persistLatestSession } from '../utils/resultsStorage';

type FocusMetric = 'accuracy' | 'targets' | 'reaction' | 'gaze' | 'mouse';

interface ErrorStats {
  avg: number;
  median: number;
  p95: number;
  max: number;
  samples: number;
}

interface HitIntervals {
  avg: number;
  min: number;
  max: number;
  samples: number;
}

const percentile = (values: number[], percentileRank: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((percentileRank / 100) * sorted.length));
  return sorted[idx];
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const calculateAnalytics = (data: TrainingDataPoint[]) => {
  if (!data.length) {
    return null;
  }
  const hits = data.filter(d => d.targetHit);
  const totalTargets = data.filter(d => d.targetId !== null).length || hits.length;
  const reactionTimes = hits.map(d => d.timestamp);
  const avgReactionTime = reactionTimes.length > 0
    ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
    : 0;

  const dataWithGaze = data.filter(d => d.gazeX !== null && d.gazeY !== null);
  const dataWithMouse = data.filter(d => d.mouseX !== null && d.mouseY !== null);

  return {
    accuracy: totalTargets > 0 ? (hits.length / totalTargets) * 100 : 0,
    targetsHit: hits.length,
    totalTargets,
    avgReactionTime,
    gazeAccuracy: (dataWithGaze.length / data.length) * 100,
    mouseAccuracy: (dataWithMouse.length / data.length) * 100,
  };
};

const calculateErrorStats = (data: TrainingDataPoint[], mode: 'gaze' | 'mouse'): ErrorStats => {
  const errors: number[] = [];

  data.forEach(point => {
    const targetX = point.targetX;
    const targetY = point.targetY;
    const sourceX = mode === 'gaze' ? point.gazeX : point.mouseX;
    const sourceY = mode === 'gaze' ? point.gazeY : point.mouseY;

    if (targetX === null || targetY === null || sourceX === null || sourceY === null) return;

    errors.push(Math.hypot(sourceX - targetX, sourceY - targetY));
  });

  if (!errors.length) {
    return { avg: 0, median: 0, p95: 0, max: 0, samples: 0 };
  }

  return {
    avg: errors.reduce((a, b) => a + b, 0) / errors.length,
    median: median(errors),
    p95: percentile(errors, 95),
    max: Math.max(...errors),
    samples: errors.length,
  };
};

const calculateHitIntervals = (data: TrainingDataPoint[]): HitIntervals => {
  const hitTimes = data
    .filter(d => d.targetHit)
    .map(d => d.timestamp)
    .sort((a, b) => a - b);

  if (hitTimes.length < 2) {
    return { avg: 0, min: 0, max: 0, samples: hitTimes.length };
  }

  const deltas = hitTimes.slice(1).map((time, idx) => time - hitTimes[idx]);
  return {
    avg: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    min: Math.min(...deltas),
    max: Math.max(...deltas),
    samples: deltas.length,
  };
};

const DetailedResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const focusMetric = (location.state as { focusMetric?: FocusMetric } | null)?.focusMetric;
  const { activeSession, calibrationResult } = useTrackingSession();

  const [sessionData, setSessionData] = useState<TrainingSessionSummary | null>(activeSession);
  const [calibration, setCalibration] = useState<CalibrationResult | null>(calibrationResult);

  useEffect(() => {
    if (activeSession) {
      setSessionData(activeSession);
      persistLatestSession(activeSession, calibrationResult ?? calibration);
      return;
    }
    const stored = loadStoredSession();
    if (stored) {
      setSessionData(stored);
    }
  }, [activeSession, calibrationResult, calibration]);

  useEffect(() => {
    if (calibrationResult) {
      setCalibration(calibrationResult);
    } else {
      const storedCalibration = loadStoredCalibration();
      if (storedCalibration) {
        setCalibration(storedCalibration);
      }
    }
  }, [calibrationResult]);

  const analytics = useMemo(() => sessionData ? calculateAnalytics(sessionData.rawData) : null, [sessionData]);
  const gazeError = useMemo(() => sessionData ? calculateErrorStats(sessionData.rawData, 'gaze') : null, [sessionData]);
  const mouseError = useMemo(() => sessionData ? calculateErrorStats(sessionData.rawData, 'mouse') : null, [sessionData]);
  const hitIntervals = useMemo(() => sessionData ? calculateHitIntervals(sessionData.rawData) : null, [sessionData]);

  const dataQuality = useMemo(() => {
    if (!sessionData) return null;
    const total = sessionData.rawData.length || 1;
    const withTargets = sessionData.rawData.filter(d => d.targetX !== null && d.targetY !== null).length;
    const gazeSamples = sessionData.rawData.filter(d => d.gazeX !== null && d.gazeY !== null).length;
    const mouseSamples = sessionData.rawData.filter(d => d.mouseX !== null && d.mouseY !== null).length;
    const hits = sessionData.rawData.filter(d => d.targetHit).length;

    return {
      withTargetsPct: (withTargets / total) * 100,
      gazeCoverage: (gazeSamples / total) * 100,
      mouseCoverage: (mouseSamples / total) * 100,
      hitRate: analytics ? (hits / (analytics.totalTargets || 1)) * 100 : 0,
    };
  }, [analytics, sessionData]);

  const recentSamples = useMemo(() => {
    if (!sessionData) return [];
    const sliced = sessionData.rawData.slice(-8).reverse();
    return sliced.map(sample => {
      const gazeErr = sample.targetX !== null && sample.targetY !== null && sample.gazeX !== null && sample.gazeY !== null
        ? Math.hypot(sample.gazeX - sample.targetX, sample.gazeY - sample.targetY)
        : null;
      const mouseErr = sample.targetX !== null && sample.targetY !== null && sample.mouseX !== null && sample.mouseY !== null
        ? Math.hypot(sample.mouseX - sample.targetX, sample.mouseY - sample.targetY)
        : null;
      return {
        ...sample,
        gazeErr,
        mouseErr,
      };
    });
  }, [sessionData]);

  const handleBack = () => navigate('/results');

  if (!sessionData || !analytics) {
    return (
      <div className="detailed-results-page">
        <div className="detail-empty">
          <p>최근 세션 정보를 찾을 수 없어요.</p>
          <button type="button" className="detail-button" onClick={handleBack}>
            결과 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detailed-results-page">
      <header className="detailed-header">
        <div>
          <p className="breadcrumb">Results / Detailed</p>
          <h1>Performance Breakdown</h1>
          <p className="subhead">
            Session ID #{sessionData.id} · {new Date(sessionData.date).toLocaleString()}
          </p>
        </div>
        <div className="header-actions">
          {calibration?.validationError !== null && (
            <div className="pill">
              Calibration error: {calibration.validationError?.toFixed(1)} px
            </div>
          )}
          <button type="button" className="detail-button ghost" onClick={handleBack}>
            Back to results
          </button>
        </div>
      </header>

      <section className="detail-section">
        <div className="detail-grid">
          <div className={`detail-card ${focusMetric === 'accuracy' ? 'focused' : ''}`}>
            <p className="card-label">Accuracy</p>
            <p className="card-value">{analytics.accuracy.toFixed(1)}%</p>
            <p className="card-meta">
              {analytics.targetsHit} / {analytics.totalTargets} targets hit
            </p>
          </div>
          <div className={`detail-card ${focusMetric === 'reaction' ? 'focused' : ''}`}>
            <p className="card-label">Avg Reaction Time</p>
            <p className="card-value">{analytics.avgReactionTime.toFixed(0)} ms</p>
            <p className="card-meta">
              {hitIntervals?.samples ?? 0} intervals tracked
            </p>
          </div>
          <div className={`detail-card ${focusMetric === 'gaze' ? 'focused' : ''}`}>
            <p className="card-label">Gaze Samples</p>
            <p className="card-value">{analytics.gazeAccuracy.toFixed(1)}%</p>
            <p className="card-meta">Coverage vs total frames</p>
          </div>
          <div className={`detail-card ${focusMetric === 'mouse' ? 'focused' : ''}`}>
            <p className="card-label">Mouse Samples</p>
            <p className="card-value">{analytics.mouseAccuracy.toFixed(1)}%</p>
            <p className="card-meta">Coverage vs total frames</p>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h2>Error Breakdown</h2>
          <p className="muted">오차는 타겟 중심으로부터의 평균 픽셀 거리입니다.</p>
        </div>
        <div className="detail-grid two-col">
          <div className={`detail-card bordered ${focusMetric === 'gaze' ? 'focused' : ''}`}>
            <div className="card-heading">
              <span className="pill pill-blue">Gaze</span>
              <span className="chip">{gazeError?.samples ?? 0} samples</span>
            </div>
            <div className="stat-row">
              <span>Avg error</span>
              <strong>{gazeError ? gazeError.avg.toFixed(1) : '0.0'} px</strong>
            </div>
            <div className="stat-row">
              <span>Median / P95</span>
              <strong>
                {gazeError ? gazeError.median.toFixed(1) : '0.0'} px · {gazeError ? gazeError.p95.toFixed(1) : '0.0'} px
              </strong>
            </div>
            <div className="stat-row">
              <span>Max deviation</span>
              <strong>{gazeError ? gazeError.max.toFixed(1) : '0.0'} px</strong>
            </div>
          </div>

          <div className={`detail-card bordered ${focusMetric === 'mouse' ? 'focused' : ''}`}>
            <div className="card-heading">
              <span className="pill pill-green">Mouse</span>
              <span className="chip">{mouseError?.samples ?? 0} samples</span>
            </div>
            <div className="stat-row">
              <span>Avg error</span>
              <strong>{mouseError ? mouseError.avg.toFixed(1) : '0.0'} px</strong>
            </div>
            <div className="stat-row">
              <span>Median / P95</span>
              <strong>
                {mouseError ? mouseError.median.toFixed(1) : '0.0'} px · {mouseError ? mouseError.p95.toFixed(1) : '0.0'} px
              </strong>
            </div>
            <div className="stat-row">
              <span>Max deviation</span>
              <strong>{mouseError ? mouseError.max.toFixed(1) : '0.0'} px</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h2>Data Quality & Timing</h2>
          <p className="muted">세션 동안 수집된 입력과 타겟 정보를 확인하세요.</p>
        </div>
        <div className="detail-grid three-col">
          <div className="detail-card bordered">
            <p className="card-label">Frames with Target Data</p>
            <p className="card-value">{dataQuality ? dataQuality.withTargetsPct.toFixed(1) : '0.0'}%</p>
            <p className="card-meta">타겟 좌표가 함께 기록된 프레임</p>
          </div>
          <div className="detail-card bordered">
            <p className="card-label">Gaze Coverage</p>
            <p className="card-value">{dataQuality ? dataQuality.gazeCoverage.toFixed(1) : '0.0'}%</p>
            <p className="card-meta">가용한 전체 프레임 기준</p>
          </div>
          <div className="detail-card bordered">
            <p className="card-label">Mouse Coverage</p>
            <p className="card-value">{dataQuality ? dataQuality.mouseCoverage.toFixed(1) : '0.0'}%</p>
            <p className="card-meta">가용한 전체 프레임 기준</p>
          </div>
          <div className="detail-card bordered">
            <p className="card-label">Hit Rate</p>
            <p className="card-value">{dataQuality ? dataQuality.hitRate.toFixed(1) : '0.0'}%</p>
            <p className="card-meta">타겟당 명중률</p>
          </div>
          <div className="detail-card bordered">
            <p className="card-label">Hit Interval (avg)</p>
            <p className="card-value">{hitIntervals ? hitIntervals.avg.toFixed(0) : '0'} ms</p>
            <p className="card-meta">
              {hitIntervals && hitIntervals.samples > 0
                ? `min ${hitIntervals.min.toFixed(0)} / max ${hitIntervals.max.toFixed(0)}`
                : '충분한 데이터가 없습니다'}
            </p>
          </div>
          <div className="detail-card bordered">
            <p className="card-label">Raw Points</p>
            <p className="card-value">{sessionData.rawData.length}</p>
            <p className="card-meta">세션에 저장된 총 샘플</p>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h2>Recent Samples</h2>
          <p className="muted">최근 8개의 수집 포인트를 기준으로 오차를 보여줍니다.</p>
        </div>
        <div className="samples-table">
          <div className="table-head">
            <span>Target</span>
            <span>Gaze error</span>
            <span>Mouse error</span>
            <span>Hit</span>
          </div>
          {recentSamples.map((sample, idx) => (
            <div key={`${sample.timestamp}-${idx}`} className="table-row">
              <span>{sample.targetId ?? '—'}</span>
              <span>{sample.gazeErr !== null ? `${sample.gazeErr.toFixed(1)} px` : 'N/A'}</span>
              <span>{sample.mouseErr !== null ? `${sample.mouseErr.toFixed(1)} px` : 'N/A'}</span>
              <span className={sample.targetHit ? 'pill pill-green' : 'pill'}>
                {sample.targetHit ? 'Hit' : 'Miss'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DetailedResultsPage;
