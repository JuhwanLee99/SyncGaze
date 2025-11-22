import { TrainingDataPoint } from '../state/trackingSessionContext';

export interface PerformanceAnalytics {
  totalTargets: number;
  targetsHit: number;
  avgReactionTime: number;     
  avgGazeReactionTime: number; 
  gazeErrorAtHit: number;      
  mouseErrorAtHit: number;     
  synchronization: number;     
  gazeAimLatency: number;      
}

const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x1 - x2, y1 - y2);
};

export const calculatePerformanceAnalytics = (data: TrainingDataPoint[]): PerformanceAnalytics => {
  if (data.length === 0) {
    return {
      totalTargets: 0,
      targetsHit: 0,
      avgReactionTime: 0,
      avgGazeReactionTime: 0,
      gazeErrorAtHit: 0,
      mouseErrorAtHit: 0,
      synchronization: 0,
      gazeAimLatency: 0,
    };
  }

  const hits = data.filter(d => d.targetHit);
  const targetIds = new Set<string>();
  const firstSeenByTarget = new Map<string, number>();
  const firstGazeOnTarget = new Map<string, number>();
  
  const GAZE_HIT_THRESHOLD = 100; 

  let totalSyncDist = 0;
  let validSyncFrames = 0;

  // 1. 기본 데이터 순회 (Sync, 반응속도 기초 데이터 수집)
  data.forEach(point => {
    if (point.gazeX !== null && point.gazeY !== null && point.mouseX !== null && point.mouseY !== null) {
      totalSyncDist += getDistance(point.gazeX, point.gazeY, point.mouseX, point.mouseY);
      validSyncFrames++;
    }

    if (!point.targetId) return;
    
    targetIds.add(point.targetId);

    const existingFirstSeen = firstSeenByTarget.get(point.targetId);
    if (existingFirstSeen === undefined || point.timestamp < existingFirstSeen) {
      firstSeenByTarget.set(point.targetId, point.timestamp);
    }

    if (point.targetX !== null && point.targetY !== null && point.gazeX !== null && point.gazeY !== null) {
      const dist = getDistance(point.gazeX, point.gazeY, point.targetX, point.targetY);
      if (dist <= GAZE_HIT_THRESHOLD) {
        const existingGaze = firstGazeOnTarget.get(point.targetId);
        if (existingGaze === undefined || point.timestamp < existingGaze) {
          firstGazeOnTarget.set(point.targetId, point.timestamp);
        }
      }
    }
  });

  // --- Metrics Calculation ---

  const reactionTimes = hits
    .map(hit => {
      if (!hit.targetId) return null;
      const firstSeen = firstSeenByTarget.get(hit.targetId);
      if (firstSeen === undefined) return null;
      return hit.timestamp - firstSeen;
    })
    .filter((v): v is number => v !== null && v >= 0);

  const gazeReactionTimes: number[] = [];
  targetIds.forEach(tid => {
    const start = firstSeenByTarget.get(tid);
    const gaze = firstGazeOnTarget.get(tid);
    if (start !== undefined && gaze !== undefined && gaze >= start) {
      gazeReactionTimes.push(gaze - start);
    }
  });

  const latencies: number[] = [];
  hits.forEach(hit => {
    if (!hit.targetId) return;
    const gazeArrival = firstGazeOnTarget.get(hit.targetId);
    if (gazeArrival !== undefined && hit.timestamp >= gazeArrival) {
      latencies.push(hit.timestamp - gazeArrival);
    }
  });

  // 4. Errors at Hit Moment (UPDATED: Lookback logic)
  let totalGazeError = 0;
  let gazeErrorCount = 0;
  let totalMouseError = 0;
  let mouseErrorCount = 0;

  // 전체 데이터를 순회하며 targetHit 지점을 찾습니다.
  for (let i = 0; i < data.length; i++) {
    if (data[i].targetHit) {
      const hitPoint = data[i];
      
      // A. 타겟 좌표 찾기 (현재 프레임에 없으면 이전 데이터 탐색)
      let targetX = hitPoint.targetX;
      let targetY = hitPoint.targetY;

      if (targetX === null || targetY === null) {
        for (let k = i - 1; k >= 0; k--) {
           // 같은 타겟 ID를 가진 유효한 좌표를 찾음
           if (data[k].targetId === hitPoint.targetId && data[k].targetX !== null && data[k].targetY !== null) {
             targetX = data[k].targetX;
             targetY = data[k].targetY;
             break;
           }
           // 너무 멀리 떨어진 데이터는 사용하지 않음 (예: 1초 이상)
           if (hitPoint.timestamp - data[k].timestamp > 1000) break;
        }
      }

      // 타겟 좌표를 끝내 찾지 못했으면 건너뜀
      if (targetX === null || targetY === null) continue;

      // B. 시선 좌표 찾기 (명중 직전의 유효 데이터 탐색)
      for (let j = i - 1; j >= 0; j--) {
        if (data[j].gazeX !== null && data[j].gazeY !== null) {
          totalGazeError += getDistance(data[j].gazeX!, data[j].gazeY!, targetX, targetY);
          gazeErrorCount++;
          break; // 가장 최근의 유효 데이터 하나만 사용하고 종료
        }
        if (hitPoint.timestamp - data[j].timestamp > 500) break; // 0.5초 이상 차이나면 무효
      }

      // C. 마우스 좌표 찾기 (명중 직전의 유효 데이터 탐색)
      for (let j = i - 1; j >= 0; j--) {
        if (data[j].mouseX !== null && data[j].mouseY !== null) {
          totalMouseError += getDistance(data[j].mouseX!, data[j].mouseY!, targetX, targetY);
          mouseErrorCount++;
          break;
        }
        if (hitPoint.timestamp - data[j].timestamp > 500) break;
      }
    }
  }

  return {
    totalTargets: targetIds.size || hits.length,
    targetsHit: hits.length,
    avgReactionTime: reactionTimes.length ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0,
    avgGazeReactionTime: gazeReactionTimes.length ? gazeReactionTimes.reduce((a, b) => a + b, 0) / gazeReactionTimes.length : 0,
    gazeErrorAtHit: gazeErrorCount ? totalGazeError / gazeErrorCount : 0,
    mouseErrorAtHit: mouseErrorCount ? totalMouseError / mouseErrorCount : 0,
    synchronization: validSyncFrames ? totalSyncDist / validSyncFrames : 0,
    gazeAimLatency: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
  };
};

export interface TimeSeriesPoint {
  time: number;
  gazeError: number | null;
  mouseError: number | null;
  synchronization: number | null;
}

export const generateErrorTimeSeries = (data: TrainingDataPoint[], duration: number): TimeSeriesPoint[] => {
  if (!data.length) return [];

  // 타임스탬프 기준으로 정렬
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sorted[0].timestamp;
  const series: TimeSeriesPoint[] = [];

  // 초 단위 버킷 생성
  const buckets = new Map<number, TrainingDataPoint[]>();
  for (let i = 0; i <= duration; i++) {
    buckets.set(i, []);
  }

  // 데이터를 초 단위로 분류
  sorted.forEach(point => {
    const elapsed = Math.floor((point.timestamp - startTime) / 1000);
    if (elapsed >= 0 && elapsed <= duration) {
      buckets.get(elapsed)?.push(point);
    }
  });

  // 각 초마다 평균 오차 계산
  for (let i = 0; i <= duration; i++) {
    const points = buckets.get(i) || [];
    
    let gazeErrSum = 0, gazeErrCount = 0;
    let mouseErrSum = 0, mouseErrCount = 0;
    let syncSum = 0, syncCount = 0;

    points.forEach(p => {
      // Gaze Error (Target vs Gaze)
      if (p.targetX !== null && p.targetY !== null && p.gazeX !== null && p.gazeY !== null) {
        gazeErrSum += Math.hypot(p.gazeX - p.targetX, p.gazeY - p.targetY);
        gazeErrCount++;
      }
      // Mouse Error (Target vs Mouse)
      if (p.targetX !== null && p.targetY !== null && p.mouseX !== null && p.mouseY !== null) {
        mouseErrSum += Math.hypot(p.mouseX - p.targetX, p.mouseY - p.targetY);
        mouseErrCount++;
      }
      // Synchronization (Gaze vs Mouse)
      if (p.gazeX !== null && p.gazeY !== null && p.mouseX !== null && p.mouseY !== null) {
        syncSum += Math.hypot(p.gazeX - p.mouseX, p.gazeY - p.mouseY);
        syncCount++;
      }
    });

    series.push({
      time: i,
      gazeError: gazeErrCount ? gazeErrSum / gazeErrCount : null,
      mouseError: mouseErrCount ? mouseErrSum / mouseErrCount : null,
      synchronization: syncCount ? syncSum / syncCount : null,
    });
  }

  return series;
};