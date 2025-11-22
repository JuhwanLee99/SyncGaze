import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import './ResearchConsentPage.css';

const ThankYouPage = () => {
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleGoHome = () => {
    navigate('/');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
      setPhoneNumber(value);
    }
  };

  const handleSubmitContact = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('올바른 전화번호를 입력해주세요.');
      return;
    }
    if (!isAgreed) {
      alert('개인정보 수집 및 이용에 동의해야 합니다.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('로그인 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // [수정됨] 기존 'participants' 컬렉션 대신 'users' 컬렉션 사용
      // 참고: trackingSessionContext.tsx의 saveSurveyAndConsent는 
      // 'users/{uid}/consent/latest' 경로를 사용합니다.
      // 이를 따라 기프티콘 정보도 'users/{uid}/gifticon/entry' 경로에 저장합니다.
      
      const gifticonDocRef = doc(db, 'users', user.uid, 'gifticon', 'entry');

      await setDoc(gifticonDocRef, {
        phoneNumber: phoneNumber,
        agreedToCollection: true,
        submittedAt: serverTimestamp(),
      }, { merge: true });

      setIsSubmitted(true);
      alert('응모가 완료되었습니다! 감사합니다.');
    } catch (error) {
      console.error('Failed to submit contact info:', error);
      alert('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="research-consent-page">
      {/* 기존 UI 코드 유지 */}
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
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '20px' }}>
            연구에 참여해 주신 분들 중<br />
            <b>10명을 추첨하여 소정의 기프티콘 (스타벅스 아이스 카페 아메리카노T) </b>을 보내드립니다.
          </p>

          {!isSubmitted ? (
            <div className="contact-form" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
              padding: '20px', 
              borderRadius: '12px',
              textAlign: 'left',
              marginTop: '20px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <label 
                  htmlFor="phone" 
                  style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}
                >
                  휴대전화번호 (숫자만 입력)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="01012345678"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    color: '#333',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <label className="checkbox-label" style={{ alignItems: 'flex-start', marginBottom: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={isAgreed} 
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#ccc' }}>
                  <b>[개인정보 수집 동의]</b> 이벤트 경품 발송을 위해 휴대전화번호를 수집하며, 
                  목적 달성(경품 발송) 후 즉시 폐기됩니다. 동의하지 않을 경우 경품 추첨에서 제외될 수 있습니다.
                </span>
              </label>

              <button 
                className="primary-button"
                type="button"
                onClick={handleSubmitContact}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              >
                {isSubmitting ? '저장 중...' : '동의하고 응모하기'}
              </button>
            </div>
          ) : (
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid rgba(34, 197, 94, 0.3)', 
              borderRadius: '12px',
              marginTop: '20px'
            }}>
              <h3 style={{ color: '#4ade80', marginBottom: '5px' }}>✅ 응모 완료</h3>
              <p style={{ fontSize: '0.9rem', color: '#eee' }}>
                전화번호가 안전하게 저장되었습니다.<br/>
                당첨 시 문자로 안내드리겠습니다.
              </p>
            </div>
          )}
        </section>

        <div className="consent-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
          <button 
            className="secondary-button" 
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