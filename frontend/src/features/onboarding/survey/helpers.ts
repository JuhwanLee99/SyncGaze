import { SurveyResponses } from '../../../state/trackingSessionContext';
import { NONE_GAME_VALUE, OTHER_GAME_VALUE, SurveyGameOption, surveyGameOptions } from './constants';

export const validateSurveyResponses = (data: SurveyResponses): string | null => {
  if (!data.ageCheck || !data.webcamCheck) {
    return '만 18세 이상이며 웹캠이 있어야 참여 가능합니다.';
  }
  if (data.gamesPlayed.length === 0 || data.gamesPlayed.includes(NONE_GAME_VALUE)) {
    return '연구 대상(FPS 게임 경험자)이 아닙니다. 참여하실 수 없습니다.';
  }
  if (!data.mainGame) {
    return '주력 게임을 선택해주세요.';
  }
  if (data.mainGame !== OTHER_GAME_VALUE && !data.gamesPlayed.includes(data.mainGame)) {
    return '선택한 주력 게임이 게임 경험 목록에 없습니다.';
  }
  if (data.mainGame === OTHER_GAME_VALUE && !data.mainGameOther.trim()) {
    return '주력 게임을 직접 입력해주세요.';
  }
  if (!data.aimTrainerUsage) {
    return 'Aim Trainer 사용 여부를 선택해주세요.';
  }
  if (!data.inGameRank.trim()) {
    return '현재 인게임 랭크를 입력해주세요.';
  }
  return null;
};

const rankHints: Partial<Record<string, string>> = {
  valorant: '(예: 아이언, 브론즈, ..., 래디언트)',
  cs2: '(예: 실버, 골드 노바, ..., 글로벌 엘리트)',
  'apex-legends': '(예: 브론즈, 실버, ..., 프레데터)',
  'rainbow-six-siege': '(예: 코퍼, 브론즈, ..., 챔피언)',
  pubg: '(예: 실버, 골드, ..., 다이아몬드)',
  warzone: '(예: 브론즈, 실버, ..., 어센던트)',
  'escape-from-tarkov': '(예: PMC 레벨 기반 티어)',
  'hunt-showdown': '(예: 스타 등급 기반 MMR)',
  overwatch: '(예: 브론즈, 실버, ..., 그랜드마스터)',
  'overwatch-2': '(예: 브론즈, 실버, ..., 그랜드마스터)',
};

export const findGameOption = (value: string): SurveyGameOption | undefined =>
  surveyGameOptions.find(option => option.value === value);

export const getRankExamples = (mainGame: string): string | null => {
  if (!mainGame) {
    return null;
  }
  return rankHints[mainGame] ?? '(예: 가능한 한 정확한 티어/랭크 표기를 입력)';
};
