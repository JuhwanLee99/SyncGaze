import { vi } from 'vitest';
import {
  CalibrationResult,
  SurveyResponses,
  TrackingSessionContextValue,
  TrainingSessionSummary,
} from '../../state/trackingSessionContext';

interface CreateTrackingSessionValueOptions extends Partial<TrackingSessionContextValue> {}

export const createTrackingSessionValue = (
  overrides: CreateTrackingSessionValueOptions = {},
): TrackingSessionContextValue => ({
  surveyResponses: null,
  consentAccepted: false,
  calibrationResult: null,
  recentSessions: [],
  lastSession: null,
  activeSessionId: null,
  setSurveyResponses: vi.fn(),
  setConsentAccepted: vi.fn(),
  saveCalibrationResult: vi.fn(),
  addSession: vi.fn(),
  setActiveSessionId: vi.fn(),
  clearRecentSessions: vi.fn(),
  activeSession: null,
  ...overrides,
});

export const buildSurveyResponses = (overrides: Partial<SurveyResponses> = {}): SurveyResponses => ({
  ageCheck: true,
  webcamCheck: true,
  gamesPlayed: ['Valorant'],
  mainGame: 'Valorant',
  inGameRank: 'Immortal',
  playTime: '< 100시간',
  selfAssessment: 5,
  ...overrides,
});

export const buildCalibrationResult = (
  overrides: Partial<CalibrationResult> = {},
): CalibrationResult => ({
  status: 'validated',
  validationError: 2,
  completedAt: new Date().toISOString(),
  ...overrides,
});

export const buildTrainingSession = (
  overrides: Partial<TrainingSessionSummary> = {},
): TrainingSessionSummary => ({
  id: 'test-session',
  date: new Date().toISOString(),
  duration: 60,
  score: 40,
  accuracy: 82,
  targetsHit: 40,
  totalTargets: 50,
  avgReactionTime: 250,
  gazeAccuracy: 75,
  mouseAccuracy: 90,
  csvData: 'timestamp,gazeX',
  rawData: [],
  ...overrides,
});
