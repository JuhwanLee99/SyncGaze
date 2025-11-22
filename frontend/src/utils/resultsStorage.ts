import { CalibrationResult, TrainingSessionSummary } from '../state/trackingSessionContext';

export const LATEST_SESSION_STORAGE_KEY = 'latestResultsSession';
export const LATEST_CALIBRATION_STORAGE_KEY = 'latestCalibrationResult';

export const persistLatestSession = (
  session: TrainingSessionSummary | null,
  calibrationResult: CalibrationResult | null,
) => {
  if (!session && !calibrationResult) return;
  try {
    if (session) {
      window.sessionStorage.setItem(LATEST_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    if (calibrationResult) {
      window.sessionStorage.setItem(LATEST_CALIBRATION_STORAGE_KEY, JSON.stringify(calibrationResult));
    }
  } catch (error) {
    console.warn('Failed to persist session to sessionStorage', error);
  }
};

export const loadStoredSession = (): TrainingSessionSummary | null => {
  try {
    const stored = window.sessionStorage.getItem(LATEST_SESSION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as TrainingSessionSummary;
  } catch (error) {
    console.warn('Failed to read stored session', error);
    return null;
  }
};

export const loadStoredCalibration = (): CalibrationResult | null => {
  try {
    const stored = window.sessionStorage.getItem(LATEST_CALIBRATION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as CalibrationResult;
  } catch (error) {
    console.warn('Failed to read stored calibration data', error);
    return null;
  }
};
