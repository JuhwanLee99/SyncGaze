import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrackerAppPage.css';
import {
  SurveyResponses,
  useTrackingSession,
} from '../state/trackingSessionContext';
import {
  EligibilityChecklist,
  GamePreferenceSelector,
  defaultSurveyResponses,
  NONE_GAME_VALUE,
  OTHER_GAME_VALUE,
  playTimeOptions,
  surveyGameOptions,
  validateSurveyResponses,
} from '../features/onboarding/survey';

const TrackerAppPage = () => {
  const navigate = useNavigate();
  const {
    surveyResponses,
    setSurveyResponses,
    consentAccepted,
    setConsentAccepted,
  } = useTrackingSession();

  const [formData, setFormData] = useState<SurveyResponses>(
    surveyResponses ?? { ...defaultSurveyResponses },
  );

  useEffect(() => {
    if (surveyResponses) {
      setFormData(surveyResponses);
    }
  }, [surveyResponses]);

  const isSurveyComplete = useMemo(() => !validateSurveyResponses(formData), [formData]);
  const selectedGameOptions = useMemo(
    () => surveyGameOptions.filter(option => formData.gamesPlayed.includes(option.value)),
    [formData.gamesPlayed],
  );
  const isNoneSelected = formData.gamesPlayed.includes(NONE_GAME_VALUE);

  const handleEligibilityToggle = (field: 'ageCheck' | 'webcamCheck', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleGeneralChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData(prev => {
      const nextValue = name === 'selfAssessment' ? Number(value) : value;
      const updated = {
        ...prev,
        [name]: nextValue,
      };

      if (name === 'mainGame' && value !== OTHER_GAME_VALUE) {
        return { ...updated, mainGameOther: '' };
      }

      return updated;
    });
  };

  const handleGameToggle = (game: string) => {
    setFormData(prev => {
      if (game === NONE_GAME_VALUE) {
        const alreadySelected = prev.gamesPlayed.includes(game);
        return {
          ...prev,
          gamesPlayed: alreadySelected ? [] : [game],
          mainGame: '',
          mainGameOther: '',
        };
      }

      const filteredGames = prev.gamesPlayed.filter(item => item !== NONE_GAME_VALUE);
      const exists = filteredGames.includes(game);
      const nextGames = exists
        ? filteredGames.filter(item => item !== game)
        : [...filteredGames, game];

      const mainGameStillValid =
        nextGames.includes(prev.mainGame) || prev.mainGame === OTHER_GAME_VALUE;
      const shouldClearOtherField = !nextGames.includes(OTHER_GAME_VALUE);

      return {
        ...prev,
        gamesPlayed: nextGames,
        mainGame: mainGameStillValid ? prev.mainGame : '',
        mainGameOther:
          mainGameStillValid && !shouldClearOtherField ? prev.mainGameOther : '',
      };
    });
  };

  const handleSurveySubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isSurveyComplete) {
      alert('모든 필수 항목을 입력해 주세요.');
      return;
    }
    setSurveyResponses(formData);
    alert('설문 응답이 저장되었습니다.');
  };

  const handleConsentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConsentAccepted(event.target.checked);
  };

  return (
    <div className="tracker-app-page">
      <div className="tracker-app-header">
        <div>
          <p className="eyebrow">Tracker App</p>
          <h1>리서치 플로우 설정</h1>
          <p className="subtitle">
            설문과 동의서 정보를 저장해 tracker-flow의 세션 컨텍스트와 동기화합니다.
          </p>
        </div>
        <button className="link-button" onClick={() => navigate('/tracker-flow')}>
          Go to tracker flow →
        </button>
      </div>

      <div className="tracker-app-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>스크리닝 설문</h2>
              <p>참여자 자격 확인을 위해 간단한 질문에 답변하세요.</p>
            </div>
            <span className={`status-pill ${isSurveyComplete ? 'success' : 'pending'}`}>
              {isSurveyComplete ? '완료' : '대기'}
            </span>
          </div>

          <form className="survey-form" onSubmit={handleSurveySubmit}>
            <EligibilityChecklist
              values={{ ageCheck: formData.ageCheck, webcamCheck: formData.webcamCheck }}
              onToggle={handleEligibilityToggle}
              labelOverrides={{
                ageCheck:
                  'Q1. 귀하는 만 18세 이상이며, 본 연구의 목적을 이해하고 자발적으로 참여하는 데 동의하십니까?',
                webcamCheck: 'Q2. 본 연구에 참여하기 위한 PC/노트북에 작동하는 웹캠이 설치되어 있습니까?',
              }}
            />

            <div className="form-field">
              <span>Q3. 지난 6개월간 주 5시간 이상 정기적으로 플레이한 FPS 게임</span>
              <GamePreferenceSelector
                options={surveyGameOptions}
                selectedGames={formData.gamesPlayed}
                onToggle={handleGameToggle}
              />
              <p className="subtitle">주요 장르별 분류이며, "해당 없음" 선택 시 탈락합니다.</p>
            </div>

            <div className="form-field">
              <label htmlFor="mainGame">Q4. 선택한 게임 중 주력 게임</label>
              <select
                id="mainGame"
                name="mainGame"
                value={formData.mainGame}
                onChange={handleGeneralChange}
                disabled={isNoneSelected || selectedGameOptions.length === 0}
              >
                <option value="">주력 게임을 선택하세요</option>
                {selectedGameOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.mainGame === OTHER_GAME_VALUE && (
              <div className="form-field">
                <label htmlFor="mainGameOther">위 목록에 없는 주력 FPS</label>
                <input
                  id="mainGameOther"
                  name="mainGameOther"
                  value={formData.mainGameOther}
                  onChange={handleGeneralChange}
                  placeholder="예: Escape from Tarkov Arena"
                />
              </div>
            )}

            <div className="form-field">
              <span>Q5. 지난 6개월간 Aim Trainer를 정기적으로 사용했습니까?</span>
              <div className="chip-grid">
                <label className="checkbox-row">
                  <input
                    type="radio"
                    name="aimTrainerUsage"
                    value="yes"
                    checked={formData.aimTrainerUsage === 'yes'}
                    onChange={handleGeneralChange}
                  />
                  예 (예: KovaaK's, Aim Lab)
                </label>
                <label className="checkbox-row">
                  <input
                    type="radio"
                    name="aimTrainerUsage"
                    value="no"
                    checked={formData.aimTrainerUsage === 'no'}
                    onChange={handleGeneralChange}
                  />
                  아니오
                </label>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="inGameRank">Q6. 현재 인게임 랭크</label>
              <input
                id="inGameRank"
                value={formData.inGameRank}
                onChange={handleGeneralChange}
                placeholder="예: Immortal 2"
              />
            </div>

            <div className="form-field">
              <label htmlFor="playTime">Q7. 총 플레이 타임</label>
              <select
                id="playTime"
                value={formData.playTime}
                onChange={handleGeneralChange}
              >
                {playTimeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="selfAssessment">Q8. 전반적인 FPS 실력 자가 평가 (1-7)</label>
              <input
                id="selfAssessment"
                type="number"
                min={1}
                max={7}
                value={formData.selfAssessment}
                onChange={handleGeneralChange}
              />
            </div>

            <button type="submit" className="primary-button">
              설문 응답 저장
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>연구 동의서</h2>
              <p>참여 동의 상태를 토글하여 세션 컨텍스트에 반영합니다.</p>
            </div>
            <span className={`status-pill ${consentAccepted ? 'success' : 'pending'}`}>
              {consentAccepted ? '동의 완료' : '대기'}
            </span>
          </div>

          <div className="consent-panel">
            <label className="checkbox-row">
              <input type="checkbox" checked={consentAccepted} onChange={handleConsentChange} />
              연구 목적 및 개인정보 처리에 동의합니다.
            </label>
            <p>
              tracker-flow에서 동일한 세션 컨텍스트를 사용하므로, 이 페이지에서 설정한 동의 상태가 실시간으로 반영됩니다.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate('/calibration')}
            >
              캘리브레이션 단계로 이동
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrackerAppPage;