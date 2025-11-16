import { SurveyResponses } from '../state/trackingSessionContext';

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

export const validateSurveyResponses = (data: SurveyResponses): string | null => {
  if (!data.ageCheck || !data.webcamCheck) {
    return '만 18세 이상이며 웹캠이 있어야 참여 가능합니다.';
  }
  if (data.gamesPlayed.length === 0 || data.gamesPlayed.includes('해당 없음')) {
    return '연구 대상(FPS 게임 경험자)이 아닙니다. 참여하실 수 없습니다.';
  }
  if (!data.mainGame) {
    return '주력 게임을 선택해주세요.';
  }
  if (!data.inGameRank.trim()) {
    return '현재 인게임 랭크를 입력해주세요.';
  }
  return null;
};

const isBrowser = typeof window !== 'undefined';

export const loadSurveyFromSession = (): SurveyResponses | null => {
  if (!isBrowser) {
    return null;
  }
  try {
    const stored = window.sessionStorage.getItem(SURVEY_SESSION_KEY);
    return stored ? (JSON.parse(stored) as SurveyResponses) : null;
  } catch (error) {
    console.warn('Failed to load survey draft from sessionStorage', error);
    return null;
  }
};

export const persistSurveyToSession = (data: SurveyResponses) => {
  if (!isBrowser) {
    return;
  }
  try {
    window.sessionStorage.setItem(SURVEY_SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist survey draft to sessionStorage', error);
    throw new Error('브라우저 저장소에 설문 데이터를 저장하는 데 실패했습니다. (브라우저 설정 확인)');
  }
};

export const clearSurveyDraft = () => {
  if (!isBrowser) {
    return;
  }
  try {
    window.sessionStorage.removeItem(SURVEY_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear survey draft from sessionStorage', error);
  }
};

interface SubmitSurveyOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export const submitSurveyResponses = async (
  data: SurveyResponses,
  { endpoint = '/api/submit-survey', fetchImpl = fetch }: SubmitSurveyOptions = {},
) => {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit survey (${response.status})`);
  }

  return response;
};

export const getRankExamples = (mainGame: string): string | null => {
  if (!mainGame) {
    return null;
  }
  if (mainGame === 'Valorant') {
    return '(예: 아이언, 브론즈, ..., 래디언트)';
  }
  if (mainGame === 'CS:GO / CS2') {
    return '(예: 실버, 골드 노바, ..., 글로벌 엘리트)';
  }
  if (mainGame === 'Apex 레전드') {
    return '(예: 브론즈, 실버, ..., 프레데터)';
  }
  return null;
};