import { TrainingDataPoint } from '../state/trackingSessionContext';

export interface PerformanceAnalytics {
  totalTargets: number;
  targetsHit: number;
  accuracy: number;
  avgReactionTime: number;
  gazeAccuracy: number;
  mouseAccuracy: number;
}

export const calculatePerformanceAnalytics = (data: TrainingDataPoint[]): PerformanceAnalytics => {
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
  const targetIds = new Set<string>();
  const firstSeenByTarget = new Map<string, number>();

  data.forEach(point => {
    if (!point.targetId) return;

    targetIds.add(point.targetId);
    const existing = firstSeenByTarget.get(point.targetId);
    if (existing === undefined || point.timestamp < existing) {
      firstSeenByTarget.set(point.targetId, point.timestamp);
    }
  });

  const reactionTimes = hits
    .map(hit => {
      if (!hit.targetId) return null;
      const firstSeen = firstSeenByTarget.get(hit.targetId);
      if (firstSeen === undefined) return null;

      return hit.timestamp - firstSeen;
    })
    .filter((value): value is number => value !== null && isFinite(value) && value >= 0);

  const avgReactionTime = reactionTimes.length > 0
    ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
    : 0;

  const dataWithGaze = data.filter(d => d.gazeX !== null && d.gazeY !== null);
  const dataWithMouse = data.filter(d => d.mouseX !== null && d.mouseY !== null);

  const totalTargets = targetIds.size || hits.length;
  const targetsHit = hits.length;

  const accuracy = totalTargets > 0 ? (targetsHit / totalTargets) * 100 : 0;
  const gazeAccuracy = (dataWithGaze.length / data.length) * 100;
  const mouseAccuracy = (dataWithMouse.length / data.length) * 100;

  return {
    totalTargets,
    targetsHit,
    accuracy,
    avgReactionTime,
    gazeAccuracy,
    mouseAccuracy,
  };
};