// src/components/Onboarding/ConsentForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ConsentForm() {
  const navigate = useNavigate();
  const [consentWebcam, setConsentWebcam] = useState(false);
  const [consentNoStorage, setConsentNoStorage] = useState(false);
  const [consentDataCollection, setConsentDataCollection] = useState(false);
  const [consentAnonymity, setConsentAnonymity] = useState(false);
  const [error, setError] = useState('');

  const handleProceed = () => {
    if (!consentWebcam || !consentNoStorage || !consentDataCollection || !consentAnonymity) {
      setError('모든 항목에 명시적으로 동의(체크)해야 연구를 진행할 수 있습니다.');
      return;
    }
    
    // (선택 사항) 동의 사실을 백엔드에 기록
    // fetch('/api/submit-consent', { ... });

    // 모든 항목에 동의했으면 GazeTracker 씬으로 이동
    navigate('/tracker');
  };

  const containerStyle: React.CSSProperties = {
    padding: '20px', 
    maxWidth: '800px', 
    margin: 'auto', 
    textAlign: 'left',
    lineHeight: 1.6
  };

  const consentBoxStyle: React.CSSProperties = {
    border: '1px solid #ccc', 
    padding: '15px', 
    background: '#f9f9f9',
    borderRadius: '8px'
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: 'block',
    margin: '15px 0',
    fontSize: '1.05em'
  };

  return (
    <div style={containerStyle}>
      <h2>1단계: 연구 소개 및 동의</h2>
      
      <h4>연구 목적 및 절차</h4>
      <p>
        본 연구의 목적은 FPS 게임 실력 향상 모델을 개발하는 것입니다.
        참여자는 약 30분 동안 시선 보정(Calibration) 및 게임 플레이(Task) 절차를 거치게 됩니다.
      </p>

      <h4>윤리적 데이터 수집 고지 및 동의</h4>
      <p>연구 참여를 위해 다음 항목들을 명확히 인지하고 <b>명시적으로 동의(체크박스)</b>해야 합니다.</p>
      
      <div style={consentBoxStyle}>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={consentWebcam} onChange={(e) => setConsentWebcam(e.target.checked)} />
          <b>[웹캠 접근]</b> 귀하의 웹캠에 접근하여, 연구가 진행되는 동안 실시간으로 얼굴과 눈의 특징점을 분석합니다.
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={consentNoStorage} onChange={(e) => setConsentNoStorage(e.target.checked)} />
          <b>[영상 비저장]</b> 웹캠 영상 자체가 서버로 전송되거나 저장되지는 않습니다.
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={consentDataCollection} onChange={(e) => setConsentDataCollection(e.target.checked)} />
          <b>[데이터 수집]</b> 분석된 시선 좌표(x, y), 모든 마우스 움직임, 키보드 입력, 그리고 인게임 이벤트(예: 표적 명중, 사격)가 타임스탬프와 함께 수집 및 저장됩니다.
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={consentAnonymity} onChange={(e) => setConsentAnonymity(e.target.checked)} />
          <b>[익명화 및 동의 철회]</b> 수집된 모든 데이터는 participant_id로 익명화되어 연구 목적으로만 사용되며, 언제든 동의를 철회하고 참여를 중단할 수 있습니다.
        </label>
      </div>

      <h4 style={{ marginTop: '30px' }}>데이터 익명화 및 프라이버시 (WebGaze.js)</h4>
      <p>
        본 연구는 WebGaze.js 라이브러리를 사용합니다. 이 기술의 가장 큰 장점 중 하나는 모든 민감한 영상 처리가 참가자의 컴퓨터(클라이언트 브라우저)에서 로컬로 수행된다는 점입니다.
      </p>
      <p style={{ fontWeight: 'bold' }}>
        귀하의 웹캠 영상은 저희 서버로 절대 전송되지 않습니다.
      </p>
      <p>
        WebGaze.js 라이브러리가 귀하의 브라우저 내에서만 영상을 분석하여, 익명화된 시선 좌표(x, y) 데이터로 변환합니다. 
        서버에 저장되는 것은 오직 participant_id와 연관된 시계열 데이터(시선/마우스/게임 좌표 및 이벤트)뿐입니다.
      </p>

      {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}

      <button onClick={handleProceed} style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '18px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
        위의 모든 항목을 이해하고 동의하며 연구 참여 (시선 추적 시작)
      </button>
    </div>
  );
}

export default ConsentForm;