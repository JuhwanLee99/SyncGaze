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
  playTimeOptions,
  validateSurveyResponses,
} from '../features/onboarding/survey';

const gameOptions = ['Valorant', 'CS:GO / CS2', 'Apex 레전드', '기타'];

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

  const handleEligibilityToggle = (field: 'ageCheck' | 'webcamCheck', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleGameToggle = (game: string) => {
    setFormData(prev => {
      const exists = prev.gamesPlayed.includes(game);
      const nextGames = exists
        ? prev.gamesPlayed.filter(item => item !== game)
        : [...prev.gamesPlayed, game];
      return { ...prev, gamesPlayed: nextGames };
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
                ageCheck: '만 18세 이상이며 참여 의사를 확인했습니다.',
                webcamCheck: '연구에 사용할 수 있는 웹캠이 있습니다.',
              }}
            />

            <div className="form-field">
              <span>주로 플레이하는 FPS 게임</span>
              <GamePreferenceSelector
                options={gameOptions}
                selectedGames={formData.gamesPlayed}
                onToggle={handleGameToggle}
              />
            </div>

            <div className="form-field">
              <label htmlFor="mainGame">주력 게임</label>
              <input
                id="mainGame"
                value={formData.mainGame}
                onChange={event => setFormData(prev => ({ ...prev, mainGame: event.target.value }))}
                placeholder="예: Valorant"
              />
            </div>

            <div className="form-field">
              <label htmlFor="inGameRank">현재 랭크</label>
              <input
                id="inGameRank"
                value={formData.inGameRank}
                onChange={event => setFormData(prev => ({ ...prev, inGameRank: event.target.value }))}
                placeholder="예: Immortal 2"
              />
            </div>

            <div className="form-field">
              <label htmlFor="playTime">누적 플레이 타임</label>
              <select
                id="playTime"
                value={formData.playTime}
                onChange={event => setFormData(prev => ({ ...prev, playTime: event.target.value }))}
              >
                {playTimeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="selfAssessment">실력 자가 평가 (1-10)</label>
              <input
                id="selfAssessment"
                type="number"
                min={1}
                max={10}
                value={formData.selfAssessment}
                onChange={event => setFormData(prev => ({ ...prev, selfAssessment: Number(event.target.value) }))}
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
