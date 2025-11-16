import { SurveyResponses } from '../../../state/trackingSessionContext';

export const SURVEY_SESSION_KEY = 'tracker.onboarding.surveyDraft';

export const defaultSurveyResponses: SurveyResponses = {
  ageCheck: false,
  webcamCheck: false,
  gamesPlayed: [],
  mainGame: '',
  inGameRank: '',
  playTime: '< 100시간',
  selfAssessment: 4,
};

export const surveyGameOptions = ['Valorant', 'CS:GO / CS2', 'Apex 레전드', '해당 없음'];

export const playTimeOptions = ['< 100시간', '100-500시간', '500-1000시간', '1000-2000시간', '2000+ 시간'];
