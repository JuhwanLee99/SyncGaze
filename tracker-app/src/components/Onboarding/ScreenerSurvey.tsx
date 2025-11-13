// src/components/Onboarding/ScreenerSurvey.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 폼 데이터 타입을 정의합니다
interface SurveyData {
  ageCheck: boolean;
  webcamCheck: boolean;
  gamesPlayed: string[];
  mainGame: string;
  inGameRank: string;
  playTime: string;
  selfAssessment: number;
}

function ScreenerSurvey() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SurveyData>({
    ageCheck: false,
    webcamCheck: false,
    gamesPlayed: [],
    mainGame: '',
    inGameRank: '',
    playTime: '< 100시간',
    selfAssessment: 4,
  });
  const [error, setError] = useState('');

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    if (name === 'gamesPlayed') {
      if (value === '해당 없음') {
        setFormData((prev) => ({
          ...prev,
          gamesPlayed: checked ? ['해당 없음'] : [],
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          gamesPlayed: checked
            ? [...prev.gamesPlayed.filter((g) => g !== '해당 없음'), value]
            : prev.gamesPlayed.filter((g) => g !== value),
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'selfAssessment' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. 기본 자격 검증
    if (!formData.ageCheck || !formData.webcamCheck) {
      setError('만 18세 이상이며 웹캠이 있어야 참여 가능합니다.');
      return;
    }

    // 2. 게임 경험 검증
    if (formData.gamesPlayed.length === 0 || formData.gamesPlayed.includes('해당 없음')) {
      setError('연구 대상(FPS 게임 경험자)이 아닙니다. 참여하실 수 없습니다.');
      return;
    }

    // 3. 주력 게임 선택 검증
    if (!formData.mainGame) {
      setError('주력 게임을 선택해주세요.');
      return;
    }
    
    // 4. 랭크 입력 검증
    if (!formData.inGameRank.trim()) {
        setError('현재 인게임 랭크를 입력해주세요.');
        return;
    }

    // 5. (중요) 백엔드로 데이터 전송
    // 프론트엔드(React)는 CSV 파일을 직접 "저장"할 수 없습니다.
    // 수집된 formData를 백엔드 API로 전송(POST)해야 합니다.
    try {
      // 이 URL(/api/submit-survey)은 실제 데이터를 받아 CSV로 저장할 
      // 백엔드(서버)의 API 엔드포인트입니다. (현재는 존재하지 않으므로 구현 필요)
      const response = await fetch('/api/submit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // 백엔드가 없으면 여기서 에러가 발생합니다.
        // 지금은 데모를 위해 백엔드 호출이 실패해도 다음 단계로 넘어가도록 처리합니다.
        console.warn('백엔드 API 호출 실패. (데모 모드: 다음 단계로 진행)');
        // throw new Error('서버 전송에 실패했습니다.'); 
      }

      // 실제로는 백엔드에서 participant_id 등을 발급받아 저장할 수 있습니다.
      // const result = await response.json(); 
      // localStorage.setItem('participantId', result.participantId);

      // (임시) 백엔드 없이 바로 동의서 페이지로 이동
      navigate('/consent');

    } catch (err: any) {
      // (임시) 백엔드 없이 바로 동의서 페이지로 이동
      console.warn(`백엔드 API 호출 오류: ${err.message} (데모 모드: 다음 단계로 진행)`);
      navigate('/consent');
      // setError(`제출 중 오류 발생: ${err.message}`);
    }
  };

  // 주력 게임 랭크 질문을 동적으로 표시
  const renderRankQuestion = () => {
    if (!formData.mainGame) {
      return <p>Q5. (질문 4에서 주력 게임을 선택하세요)</p>;
    }
    let rankExamples = '';
    if (formData.mainGame === 'Valorant') rankExamples = '(예: 아이언, 브론즈, ..., 래디언트)';
    if (formData.mainGame === 'CS:GO / CS2') rankExamples = '(예: 실버, 골드 노바, ..., 글로벌 엘리트)';
    if (formData.mainGame === 'Apex Legends') rankExamples = '(예: 브론즈, 실버, ..., 프레데터)';

    return (
      <>
        <label htmlFor="inGameRank" style={{ fontWeight: 'bold' }}>
          Q5. (<b>{formData.mainGame}</b>) 귀하의 현재 인게임 랭크는 무엇입니까? {rankExamples}
        </label>
        <input
          type="text"
          id="inGameRank"
          name="inGameRank"
          value={formData.inGameRank}
          onChange={handleChange}
          required
          placeholder="현재 랭크를 정확히 입력하세요"
          style={{ width: '90%', padding: '8px', marginTop: '5px' }}
        />
      </>
    );
  };

  const formStyle: React.CSSProperties = {
    padding: '20px', 
    maxWidth: '800px', 
    margin: 'auto', 
    textAlign: 'left',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  };

  const itemStyle: React.CSSProperties = {
    marginBottom: '20px',
    padding: '10px',
    borderBottom: '1px solid #eee'
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>연구 참여 스크리닝 설문조사</h2>
      <form onSubmit={handleSubmit} style={formStyle}>
        
        <div style={itemStyle}>
          <h4>기본 자격</h4>
          <label>
            <input type="checkbox" name="ageCheck" checked={formData.ageCheck} onChange={handleCheckboxChange} />
            Q1. 귀하는 만 18세 이상이며, 본 연구의 목적을 이해하고 자발적으로 참여하는 데 동의하십니까?
          </label>
          <br /><br />
          <label>
            <input type="checkbox" name="webcamCheck" checked={formData.webcamCheck} onChange={handleCheckboxChange} />
            Q2. 본 연구에 참여하기 위한 PC/노트북에 작동하는 웹캠이 설치되어 있습니까?
          </label>
        </div>

        <div style={itemStyle}>
          <h4>게임 경험</h4>
          <p style={{ fontWeight: 'bold' }}>Q3. 지난 6개월간 다음 FPS 게임 중 하나 이상을 주 5시간 이상 정기적으로 플레이했습니까? (중복 선택 가능)</p>
          {['Valorant', 'CS:GO / CS2', 'Apex 레전드', '해당 없음'].map((game) => (
            <label key={game} style={{ display: 'block', marginLeft: '10px' }}>
              <input type="checkbox" name="gamesPlayed" value={game} checked={formData.gamesPlayed.includes(game)} onChange={handleCheckboxChange} />
              {game} {game === '해당 없음' && ' (선택 시 탈락)'}
            </label>
          ))}
        </div>

        <div style={itemStyle}>
          <p style={{ fontWeight: 'bold' }}>Q4. 위 게임 중 귀하의 "주력 게임"은 무엇입니까?</p>
          {['Valorant', 'CS:GO / CS2', 'Apex 레전드'].map((game) => (
            <label key={game} style={{ display: 'block', marginLeft: '10px' }}>
              <input type="radio" name="mainGame" value={game} checked={formData.mainGame === game} onChange={handleChange} disabled={!formData.gamesPlayed.includes(game)} />
              {game}
            </label>
          ))}
        </div>

        <div style={itemStyle}>
          <h4>객관적 실력 지표 (Ground Truth)</h4>
          {renderRankQuestion()}
        </div>

        <div style={itemStyle}>
          <label htmlFor="playTime" style={{ fontWeight: 'bold' }}>
            Q6. 귀하의 총 플레이 시간은 대략 어느 정도입니까?
          </label>
          <select id="playTime" name="playTime" value={formData.playTime} onChange={handleChange} style={{ padding: '8px', marginLeft: '10px' }}>
            <option value="< 100시간">&lt; 100시간</option>
            <option value="100-500시간">100-500시간</option>
            <option value="500-1000시간">500-1000시간</option>
            <option value="1000-2000시간">1000-2000시간</option>
            <option value="2000+ 시간">2000+ 시간</option>
          </select>
        </div>

        <div style={itemStyle}>
          <label htmlFor="selfAssessment" style={{ fontWeight: 'bold' }}>
            Q7. 귀하 스스로의 전반적인 FPS 게임 실력을 어떻게 평가하십니까? (1: 매우 낮음 - 7: 매우 높음)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <span>(1)</span>
            <input type="range" id="selfAssessment" name="selfAssessment" min="1" max="7" step="1" value={formData.selfAssessment} onChange={handleChange} style={{ margin: '0 10px', flexGrow: 1 }} />
            <span>(7)</span>
            <b style={{ marginLeft: '10px' }}> (선택: {formData.selfAssessment})</b>
          </div>
        </div>

        {error && <p style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}
        
        <button type="submit" style={{ width: '100%', padding: '12px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          설문 제출 및 다음 단계로
        </button>
      </form>
    </div>
  );
}

export default ScreenerSurvey;