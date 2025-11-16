import { SurveyResponses } from '../../../state/trackingSessionContext';

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
