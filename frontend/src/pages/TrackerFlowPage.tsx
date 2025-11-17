import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrackerFlowPage.css';
import { useTrackingSession } from '../state/trackingSessionContext';

const TrackerFlowPage = () => {
  const navigate = useNavigate();
  const {
    surveyResponses,
    consentAccepted,
    calibrationResult,
    activeSession,
    recentSessions,
  } = useTrackingSession();

  const flowSteps = useMemo(() => {
    return [
      {
        id: 'survey',
        title: '스크리닝 설문',
        description: '기본 자격 확인과 연구 대상 선별',
        completed: Boolean(surveyResponses),
        actionLabel: surveyResponses ? '응답 수정' : '설문 작성',
        navigateTo: '/onboarding/survey',
      },
      {
        id: 'consent',
        title: '연구 소개 및 동의',
        description: '연구 절차 안내 후 참여 동의',
        completed: consentAccepted,
        actionLabel: consentAccepted ? '동의 상태 관리' : '동의하기',
        navigateTo: '/onboarding/consent',
      },
      {
        id: 'calibration',
        title: '캘리브레이션',
        description: '웹캠 기반 시선 추적 정렬',
        completed: calibrationResult?.status === 'validated',
        actionLabel: calibrationResult?.status === 'validated' ? '재측정' : '시작하기',
        navigateTo: '/calibration',
        meta:
          calibrationResult?.validationError != null
            ? `${Math.round(calibrationResult.validationError)}px error`
            : undefined,
      },
      {
        id: 'training',
        title: '트레이닝 세션',
        description: '60초 동안 표적 맞추기',
        completed: Boolean(activeSession),
        actionLabel: '트레이닝 실행',
        navigateTo: '/training',
      },
      {
        id: 'results',
        title: '결과 리포트',
        description: '정확도, 반응속도, 시선-마우스 차이 분석',
        completed: Boolean(activeSession),
        actionLabel: '결과 보기',
        navigateTo: '/results',
      },
    ];
  }, [activeSession, calibrationResult, consentAccepted, surveyResponses]);

  return (
    <div className="tracker-flow-page">
      <header className="flow-header">
        <div>
          <p className="eyebrow">Tracker Flow</p>
          <h1>연구 진행 현황</h1>
          <p>
            tracker-app과 동일한 세션 컨텍스트를 공유하여 온보딩, 캘리브레이션, 트레이닝 단계를 하나의 흐름으로 추적합니다.
          </p>
        </div>
        <button className="secondary-button" onClick={() => navigate('/dashboard')}>
          대시보드로 이동
        </button>
      </header>

      <section className="flow-grid">
        {flowSteps.map(step => (
          <article key={step.id} className={`flow-card ${step.completed ? 'completed' : ''}`}>
            <div className="flow-card-header">
              <div>
                <p className="step-label">STEP {flowSteps.indexOf(step) + 1}</p>
                <h2>{step.title}</h2>
              </div>
              <span className={`status-pill ${step.completed ? 'success' : 'pending'}`}>
                {step.completed ? '완료' : '대기'}
              </span>
            </div>
            <p className="flow-description">{step.description}</p>
            {step.meta && <p className="flow-meta">{step.meta}</p>}
            <button className="primary-button" onClick={() => navigate(step.navigateTo)}>
              {step.actionLabel}
            </button>
          </article>
        ))}
      </section>

      <section className="session-panel">
        <div className="panel-header">
          <div>
            <h3>최근 세션</h3>
            <p>컨텍스트에 저장된 마지막 3건의 트레이닝 데이터</p>
          </div>
          <button className="link-button" onClick={() => navigate('/training')}>
            새 세션 시작
          </button>
        </div>

        {recentSessions.length === 0 ? (
          <div className="empty-state">아직 저장된 세션이 없습니다.</div>
        ) : (
          <div className="session-table">
            <div className="session-row session-row--head">
              <span>날짜</span>
              <span>정확도</span>
              <span>평균 반응속도</span>
              <span>타겟 명중</span>
            </div>
            {recentSessions.slice(0, 3).map(session => (
              <div key={session.id} className="session-row">
                <span>{new Date(session.date).toLocaleString()}</span>
                <span>{session.accuracy.toFixed(1)}%</span>
                <span>{session.avgReactionTime.toFixed(0)}ms</span>
                <span>
                  {session.targetsHit}/{session.totalTargets}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TrackerFlowPage;