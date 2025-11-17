import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResearchConsentPage.css';
import { useTrackingSession } from '../../state/trackingSessionContext';

const ResearchConsentPage = () => {
  const navigate = useNavigate();
  const { consentAccepted, setConsentAccepted } = useTrackingSession();
  const [agreements, setAgreements] = useState({
    webcam: consentAccepted,
    video: consentAccepted,
    data: consentAccepted,
    privacy: consentAccepted,
  });
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (field: keyof typeof agreements) => (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setAgreements(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleProceed = () => {
    const allChecked = Object.values(agreements).every(Boolean);
    if (!allChecked) {
      setError('모든 항목에 명시적으로 동의해야 다음 단계로 이동할 수 있습니다.');
      return;
    }

    try {
      sessionStorage.setItem('consentTimestamp', new Date().toISOString());
    } catch (storageError) {
      console.warn('Failed to persist consent timestamp:', storageError);
    }

    setConsentAccepted(true);
    navigate('/calibration');
  };

  return (
    <div className="research-consent-page">
      <div className="research-consent-card">
        <p className="eyebrow">Research Briefing</p>
        <h1>연구 소개 및 참여 동의</h1>
        <p className="lead">
          본 실험은 FPS 게임 플레이 중 시선-마우스 상관관계를 분석하여 실력 향상 모델을 구축하는 것을 목표로 합니다.
        </p>

        <section className="research-overview">
          <h2>연구 절차 요약</h2>
          <ul>
            <li>약 30분 동안 설문 → 캘리브레이션 → 표적 맞추기 과제를 진행합니다.</li>
            <li>캘리브레이션 중 수집되는 데이터는 참가자 기기에서 WebGazer.js로 실시간 처리됩니다.</li>
            <li>수집된 좌표와 입력 이벤트는 participant_id로 익명화되어 연구 목적으로만 사용됩니다.</li>
          </ul>
        </section>

        <section className="privacy-callout">
          <h3>WebGazer 기반 프라이버시 보호</h3>
          <p>
            얼굴 영상은 브라우저 내에서만 분석되며 서버로 전송되지 않습니다. 알고리즘이 추출한 시선 좌표(x, y)만이 저장됩니다.
          </p>
        </section>

        <section className="consent-checklist">
          <h2>동의 항목</h2>
          <label>
            <input type="checkbox" checked={agreements.webcam} onChange={handleToggle('webcam')} />
            웹캠 접근 권한을 허용하며, 얼굴 및 눈의 특징점을 실시간으로 분석하는 것에 동의합니다.
          </label>
          <label>
            <input type="checkbox" checked={agreements.video} onChange={handleToggle('video')} />
            웹캠 원본 영상은 저장되지 않으며, 영상 전송 없이 로컬에서만 처리됨을 확인합니다.
          </label>
          <label>
            <input type="checkbox" checked={agreements.data} onChange={handleToggle('data')} />
            시선 좌표, 마우스/키보드 입력, 인게임 이벤트 로그가 연구 목적으로 저장되는 것에 동의합니다.
          </label>
          <label>
            <input type="checkbox" checked={agreements.privacy} onChange={handleToggle('privacy')} />
            모든 데이터가 익명화되며, 언제든지 참여 중단 및 동의 철회가 가능함을 이해했습니다.
          </label>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <div className="consent-actions">
          <button className="primary-button" type="button" onClick={handleProceed}>
            연구에 동의하고 캘리브레이션으로 이동
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate('/onboarding/survey')}>
            설문 수정하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchConsentPage;