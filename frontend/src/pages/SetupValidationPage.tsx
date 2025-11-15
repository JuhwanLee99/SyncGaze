// frontend/src/pages/SetupValidationPage.tsx

import React, { useEffect } from 'react';
import Validation from '../components/GazeTracker/Validation'; // 1. UI 컴포넌트 import
import { useWebgazer } from '../context/WebgazerContext'; // 2. 수정된 Context import
import './SetupPage.css'; // 3. 공통 페이지 스타일 import

// 이 페이지 컴포넌트가 '컨테이너' 역할을 합니다.
const SetupValidationPage: React.FC = () => {
  // 4. Context에서 상태/핸들러를 가져옵니다.
  const {
    webgazerInstance,
    validationGazePoints, // 3초간 시선 데이터를 담을 Ref
    setValidationError,   // 측정된 오차를 Context에 저장할 Setter
    setGazeStability,   // 측정된 안정성을 Context에 저장할 Setter
    handleRecalibrate,  // 감지 실패 시 재보정 핸들러
    validationError     // 이미 측정이 완료되었는지 확인
  } = useWebgazer();

  // 5. "추가 작업": tracker-app/TrackerLayout.tsx 의 Validation 로직을 여기에 구현
  useEffect(() => {
    // webgazer 인스턴스가 없거나, 이미 검증을 완료했다면(validationError !== null) 실행하지 않습니다.
    if (!webgazerInstance || validationError !== null) {
      return;
    }

    // 측정을 시작하기 전에 값 초기화
    validationGazePoints.current = [];
    setValidationError(null);
    setGazeStability(null);

    // 3초간 시선 데이터를 수집하는 리스너
    const validationListener = (data: any) => {
      if (data) validationGazePoints.current.push({ x: data.x, y: data.y });
    };
    webgazerInstance.setGazeListener(validationListener);

    // 3초 타이머 설정
    const timer = setTimeout(() => {
      if (!webgazerInstance) return; // (안전 장치)
      
      webgazerInstance.clearGazeListener(); // 리스너 정리

      // 3초간 감지된 시선 데이터가 없으면 재보정
      if (validationGazePoints.current.length === 0) {
        alert("시선이 감지되지 않았습니다. 재보정을 진행합니다.");
        handleRecalibrate();
        return;
      }

      // 1. 평균 시선 위치 계산
      const avgGaze = validationGazePoints.current.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
      );
      avgGaze.x /= validationGazePoints.current.length;
      avgGaze.y /= validationGazePoints.current.length;

      // 2. 오차 계산 (목표: 화면 중앙)
      const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const error = Math.sqrt(Math.pow(target.x - avgGaze.x, 2) + Math.pow(target.y - avgGaze.y, 2));
      
      // 3. 안정성(Jitter) 계산 (평균 편차)
      const sumSqDiffX = validationGazePoints.current.reduce((acc, p) => acc + Math.pow(p.x - avgGaze.x, 2), 0);
      const sumSqDiffY = validationGazePoints.current.reduce((acc, p) => acc + Math.pow(p.y - avgGaze.y, 2), 0);
      const stdDevX = Math.sqrt(sumSqDiffX / validationGazePoints.current.length);
      const stdDevY = Math.sqrt(sumSqDiffY / validationGazePoints.current.length);
      const stability = (stdDevX + stdDevY) / 2;

      // 4. 계산된 값을 Context의 전역 상태에 업데이트
      setValidationError(error);
      setGazeStability(stability);

    }, 3000); // 3초 대기

    // 페이지를 벗어나면 타이머와 리스너를 모두 정리
    return () => {
      clearTimeout(timer);
      if (webgazerInstance) {
        webgazerInstance.clearGazeListener();
      }
    };
    
  }, [
    webgazerInstance, 
    validationError, 
    validationGazePoints, 
    setValidationError, 
    setGazeStability, 
    handleRecalibrate
  ]);

  // 6. UI 렌더링
  return (
    <div className="setup-page-container">
      <div className="setup-content-wrapper">
        {/*
          <Validation /> 컴포넌트는 Context의 'validationError' 상태가
          null일 때는 "측정 중..." 메시지를,
          숫자 값으로 변경되면 결과(오차, 안정성, 버튼)를 보여줍니다.
        */}
        <Validation />
      </div>
    </div>
  );
};

export default SetupValidationPage;