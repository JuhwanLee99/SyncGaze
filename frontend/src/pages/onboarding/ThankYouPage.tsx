import { useNavigate } from 'react-router-dom';
import './ResearchConsentPage.css'; // 기존 CSS 재사용

const ThankYouPage = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    // 필요시 로그아웃 처리 등을 추가할 수 있습니다.
    navigate('/');
  };

  return (
    <div className="research-consent-page">
      <div className="research-consent-card" style={{ textAlign: 'center' }}>
        <p className="eyebrow">Research Complete</p>
        <h1>참여해 주셔서 감사합니다</h1>
        <p className="lead">
          귀하의 데이터 수집이 성공적으로 완료되었습니다.<br />
          FPS 에이밍 분석 연구에 큰 도움을 주셔서 진심으로 감사드립니다.
        </p>

        <section className="research-overview" style={{ margin: '40px 0', padding: '30px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎁</div>
          <h2>기프티콘 추첨 안내</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            연구에 참여해 주신 분들 중<br />
            <b>5명을 추첨하여 소정의 기프티콘</b>을 보내드립니다.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '15px' }}>
            * 당첨자는 수집된 연락처 또는 이메일을 통해 개별 안내될 예정입니다.
          </p>
        </section>

        <div className="consent-actions" style={{ justifyContent: 'center' }}>
          <button 
            className="primary-button" 
            type="button" 
            onClick={handleGoHome}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;