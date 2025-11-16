import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingSession, SurveyResponses } from '../../state/trackingSessionContext';
import {
  clearSurveyDraft,
  defaultSurveyResponses,
  getRankExamples,
  loadSurveyFromSession,
  persistSurveyToSession,
  playTimeOptions,
  submitSurveyResponses,
  surveyGameOptions,
  validateSurveyResponses,
} from '../../utils/onboarding';
import './SurveyPage.css';

const SurveyPage = () => {
  const navigate = useNavigate();
  const { surveyResponses, setSurveyResponses } = useTrackingSession();
  const [formData, setFormData] = useState<SurveyResponses>(
    surveyResponses ?? loadSurveyFromSession() ?? defaultSurveyResponses,
  );
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!surveyResponses) {
      return;
    }
    setFormData(surveyResponses);
  }, [surveyResponses]);

  useEffect(() => {
    try {
      persistSurveyToSession(formData);
      setStorageError(null);
    } catch (storageErr) {
      setStorageError(storageErr instanceof Error ? storageErr.message : String(storageErr));
    }
  }, [formData]);

  const isReadyToSubmit = useMemo(() => !validateSurveyResponses(formData), [formData]);

  const handleEligibilityToggle = (field: 'ageCheck' | 'webcamCheck') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setFormData(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleGeneralChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'selfAssessment' ? Number(value) : value,
    }));
  };

  const handleGameToggle = (game: string) => {
    setFormData(prev => {
      if (game === '해당 없음') {
        return {
          ...prev,
          gamesPlayed: prev.gamesPlayed.includes(game) ? [] : [game],
          mainGame: prev.gamesPlayed.includes(game) ? prev.mainGame : '',
        };
      }

      const filteredGames = prev.gamesPlayed.filter(item => item !== '해당 없음');
      const exists = filteredGames.includes(game);
      const nextGames = exists
        ? filteredGames.filter(item => item !== game)
        : [...filteredGames, game];

      const mainGameStillValid = nextGames.includes(prev.mainGame);

      return {
        ...prev,
        gamesPlayed: nextGames,
        mainGame: mainGameStillValid ? prev.mainGame : '',
      };
    });
  };

  const rankExamples = useMemo(() => getRankExamples(formData.mainGame), [formData.mainGame]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStorageError(null);

    const validationMessage = validateSurveyResponses(formData);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      let submissionFailed = false;
      try {
        await submitSurveyResponses(formData);
      } catch (submissionError) {
        submissionFailed = true;
        console.warn('Survey submission failed, proceeding to next step:', submissionError);
      }

      setSurveyResponses(formData);
      clearSurveyDraft();

      if (submissionFailed) {
        alert('백엔드 API 호출에 실패했지만 데모 모드로 다음 단계로 이동합니다.');
      }

      navigate('/tracker-flow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="survey-page">
      <header className="survey-header">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>연구 참여 스크리닝 설문</h1>
          <p>기본 자격을 확인하고 tracker-flow 컨텍스트에 설문 결과를 동기화합니다.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate('/tracker-flow')}>
          진행 현황 보기
        </button>
      </header>

      <main className="survey-shell">
        <section className="survey-card">
          <div className="survey-card__header">
            <div>
              <h2>참여자 정보</h2>
              <p>FPS 게임 경험과 장비 보유 여부를 확인합니다.</p>
            </div>
            <span className={`status-pill ${isReadyToSubmit ? 'success' : 'pending'}`}>
              {isReadyToSubmit ? '제출 준비 완료' : '입력 필요'}
            </span>
          </div>

          <form className="survey-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>기본 자격</legend>
              <label className="checkbox-row">
                <input type="checkbox" checked={formData.ageCheck} onChange={handleEligibilityToggle('ageCheck')} />
                Q1. 만 18세 이상이며 연구 목적을 이해하고 자발적으로 참여합니다.
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={formData.webcamCheck} onChange={handleEligibilityToggle('webcamCheck')} />
                Q2. 연구에 사용할 수 있는 작동하는 PC/노트북 웹캠이 있습니다.
              </label>
            </fieldset>

            <fieldset>
              <legend>게임 경험</legend>
              <p className="question-title">
                Q3. 지난 6개월간 다음 FPS 게임 중 하나 이상을 주 5시간 이상 플레이했습니까? (복수 선택 가능)
              </p>
              <div className="chip-grid">
                {surveyGameOptions.map(game => (
                  <button
                    key={game}
                    type="button"
                    className={`chip ${formData.gamesPlayed.includes(game) ? 'selected' : ''}`}
                    onClick={() => handleGameToggle(game)}
                  >
                    {game}
                    {game === '해당 없음' && <span className="chip-note">선택 시 탈락</span>}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>주력 게임</legend>
              <p className="question-title">Q4. 위 게임 중 귀하의 주력 게임은 무엇입니까?</p>
              <div className="radio-grid">
                {surveyGameOptions
                  .filter(game => game !== '해당 없음')
                  .map(game => (
                    <label key={game} className="radio-chip">
                      <input
                        type="radio"
                        name="mainGame"
                        value={game}
                        checked={formData.mainGame === game}
                        onChange={handleGeneralChange}
                        disabled={!formData.gamesPlayed.includes(game)}
                      />
                      <span>{game}</span>
                    </label>
                  ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>객관적 실력 지표</legend>
              {formData.mainGame ? (
                <label className="form-field">
                  <span>
                    Q5. ({formData.mainGame}) 현재 인게임 랭크는 무엇입니까?{' '}
                    {rankExamples && <span className="hint-text">{rankExamples}</span>}
                  </span>
                  <input
                    type="text"
                    id="inGameRank"
                    name="inGameRank"
                    value={formData.inGameRank}
                    onChange={handleGeneralChange}
                    placeholder="현재 랭크를 정확히 입력하세요"
                  />
                </label>
              ) : (
                <p className="hint-text">Q5. (질문 4에서 주력 게임을 선택하세요)</p>
              )}
            </fieldset>

            <fieldset>
              <legend>경험치와 자기 평가</legend>
              <label className="form-field" htmlFor="playTime">
                <span>Q6. 총 플레이 시간</span>
                <select id="playTime" name="playTime" value={formData.playTime} onChange={handleGeneralChange}>
                  {playTimeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field" htmlFor="selfAssessment">
                <span>Q7. 전반적인 FPS 실력 자가 평가 (1: 매우 낮음 - 7: 매우 높음)</span>
                <div className="slider-row">
                  <span>(1)</span>
                  <input
                    id="selfAssessment"
                    name="selfAssessment"
                    type="range"
                    min={1}
                    max={7}
                    step={1}
                    value={formData.selfAssessment}
                    onChange={handleGeneralChange}
                  />
                  <span>(7)</span>
                  <strong>선택: {formData.selfAssessment}</strong>
                </div>
              </label>
            </fieldset>

            {(error || storageError) && (
              <div className="form-error" role="alert">
                {error ?? storageError}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={() => navigate(-1)}>
                돌아가기
              </button>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? '제출 중...' : '설문 제출 및 다음 단계로'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default SurveyPage;