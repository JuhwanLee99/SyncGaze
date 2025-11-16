import { SurveyResponses } from '../../../state/trackingSessionContext';
import { SURVEY_SESSION_KEY } from './constants';

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
