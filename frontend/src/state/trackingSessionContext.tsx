import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export interface SurveyResponses {
  ageCheck: boolean;
  webcamCheck: boolean;
  gamesPlayed: string[];
  mainGame: string;
  inGameRank: string;
  playTime: string;
  selfAssessment: number;
}

export type CalibrationStatus = 'not-started' | 'in-progress' | 'validated' | 'skipped';

export interface CalibrationResult {
  status: CalibrationStatus;
  validationError: number | null;
  completedAt?: string;
}

export interface TrainingDataPoint {
  timestamp: number;
  gazeX: number | null;
  gazeY: number | null;
  mouseX: number | null;
  mouseY: number | null;
  targetHit: boolean;
  targetId: string | null;
}

export interface TrainingSessionSummary {
  id: string;
  date: string;
  duration: number;
  score: number;
  accuracy: number;
  targetsHit: number;
  totalTargets: number;
  avgReactionTime: number;
  gazeAccuracy: number;
  mouseAccuracy: number;
  csvData: string;
  rawData: TrainingDataPoint[];
}

interface TrackingSessionState {
  surveyResponses: SurveyResponses | null;
  consentAccepted: boolean;
  calibrationResult: CalibrationResult | null;
  recentSessions: TrainingSessionSummary[];
  lastSession: TrainingSessionSummary | null;
  activeSessionId: string | null;
}

interface TrackingSessionContextValue extends TrackingSessionState {
  setSurveyResponses: (responses: SurveyResponses | null) => void;
  setConsentAccepted: (accepted: boolean) => void;
  saveCalibrationResult: (result: CalibrationResult | null) => void;
  addSession: (session: TrainingSessionSummary) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  clearRecentSessions: () => void;
  activeSession: TrainingSessionSummary | null;
}

const STORAGE_KEY = 'trackingSessionState';

const defaultSessions: TrainingSessionSummary[] = [
  {
    id: 'mock-1',
    date: '2025-11-14T00:00:00.000Z',
    duration: 60,
    score: 42,
    accuracy: 85.5,
    targetsHit: 42,
    totalTargets: 49,
    avgReactionTime: 245,
    gazeAccuracy: 78,
    mouseAccuracy: 92,
    csvData: '',
    rawData: [],
  },
  {
    id: 'mock-2',
    date: '2025-11-13T00:00:00.000Z',
    duration: 60,
    score: 38,
    accuracy: 78.2,
    targetsHit: 38,
    totalTargets: 48,
    avgReactionTime: 268,
    gazeAccuracy: 74,
    mouseAccuracy: 89,
    csvData: '',
    rawData: [],
  },
  {
    id: 'mock-3',
    date: '2025-11-12T00:00:00.000Z',
    duration: 60,
    score: 40,
    accuracy: 82.1,
    targetsHit: 40,
    totalTargets: 47,
    avgReactionTime: 252,
    gazeAccuracy: 81,
    mouseAccuracy: 90,
    csvData: '',
    rawData: [],
  },
];

const defaultState: TrackingSessionState = {
  surveyResponses: null,
  consentAccepted: false,
  calibrationResult: null,
  recentSessions: defaultSessions,
  lastSession: defaultSessions[0] ?? null,
  activeSessionId: defaultSessions[0]?.id ?? null,
};

const TrackingSessionContext = createContext<TrackingSessionContextValue | undefined>(undefined);

export const TrackingSessionProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<TrackingSessionState>(() => {
    if (typeof window === 'undefined') {
      return defaultState;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TrackingSessionState;
        return {
          ...defaultState,
          ...parsed,
        };
      }
      return defaultState;
    } catch (error) {
      console.warn('Failed to parse tracking session state:', error);
      return defaultState;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setSurveyResponses = (responses: SurveyResponses | null) => {
    setState(prev => ({
      ...prev,
      surveyResponses: responses,
    }));
  };

  const setConsentAccepted = (accepted: boolean) => {
    setState(prev => ({
      ...prev,
      consentAccepted: accepted,
    }));
  };

  const saveCalibrationResult = (result: CalibrationResult | null) => {
    setState(prev => ({
      ...prev,
      calibrationResult: result,
    }));
  };

  const addSession = (session: TrainingSessionSummary) => {
    setState(prev => {
      const nextSessions = [session, ...prev.recentSessions].slice(0, 10);
      return {
        ...prev,
        recentSessions: nextSessions,
        lastSession: session,
        activeSessionId: session.id,
      };
    });
  };

  const setActiveSessionId = (sessionId: string | null) => {
    setState(prev => ({
      ...prev,
      activeSessionId: sessionId,
    }));
  };

  const clearRecentSessions = () => {
    setState(prev => ({
      ...prev,
      recentSessions: [],
      lastSession: null,
      activeSessionId: null,
    }));
  };

  const activeSession = useMemo(() => {
    if (!state.activeSessionId) {
      return state.lastSession;
    }
    return state.recentSessions.find(session => session.id === state.activeSessionId) ?? state.lastSession;
  }, [state.activeSessionId, state.lastSession, state.recentSessions]);

  const value = useMemo<TrackingSessionContextValue>(() => ({
    ...state,
    setSurveyResponses,
    setConsentAccepted,
    saveCalibrationResult,
    addSession,
    setActiveSessionId,
    clearRecentSessions,
    activeSession,
  }), [state, activeSession]);

  return (
    <TrackingSessionContext.Provider value={value}>
      {children}
    </TrackingSessionContext.Provider>
  );
};

export const useTrackingSession = () => {
  const context = useContext(TrackingSessionContext);
  if (!context) {
    throw new Error('useTrackingSession must be used within a TrackingSessionProvider');
  }
  return context;
};