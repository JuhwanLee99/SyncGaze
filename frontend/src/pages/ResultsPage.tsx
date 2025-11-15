// frontend/src/pages/ResultsPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultsPage.css'; // (기존 CSS)

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const ResultsPage: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // tracker-app/TrackerLayout.tsx의 자동 업로드 로직을 여기에 적용
    const uploadData = async () => {
      // 1. TrainingPage에서 저장한 CSV 데이터 가져오기
      const csvContent = sessionStorage.getItem('gameDataCsv');

      if (!csvContent) {
        setError('업로드할 데이터를 찾을 수 없습니다. (sessionStorage 비어있음)');
        setUploadStatus('error');
        return;
      }

      setUploadStatus('uploading');
      try {
        // 2. 5.1에서 복사한 API 엔드포인트(/api/upload-csv)로 전송
        const response = await fetch('/api/upload-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8;' },
          body: csvContent,
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        setUploadedUrl(result.url);
        setUploadStatus('success');
        
        // 3. 성공 시 sessionStorage 비우기
        sessionStorage.removeItem('gameDataCsv');
        sessionStorage.removeItem('surveyData');
        sessionStorage.removeItem('consentTimestamp');

      } catch (err: any) {
        console.error('Upload Failed:', err);
        setError(err.message);
        setUploadStatus('error');
      }
    };

    if (uploadStatus === 'idle') {
      uploadData();
    }
  }, [uploadStatus]); // uploadStatus가 'idle'일 때 1회 실행

  const renderStatus = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <p>데이터 업로드 중...</p>;
      case 'success':
        return (
          <div>
            <p>데이터가 성공적으로 업로드되었습니다. ✅</p>
            <p>(저장된 URL: {uploadedUrl})</p>
            <button onClick={() => navigate('/')}>메인으로 돌아가기</button>
          </div>
        );
      case 'error':
        return (
          <div>
            <p>데이터 업로드 실패. ❌</p>
            <p>오류: {error}</p>
            <p>
              (필요시 CSV 데이터를 수동으로 다운로드하는 버튼을 여기에 추가할 수 있습니다.)
            </p>
            <button onClick={() => navigate('/')}>메인으로 돌아가기</button>
          </div>
        );
      default: // 'idle'
        return <p>데이터 전송을 준비 중입니다...</p>;
    }
  };

  return (
    <div className="results-page-container"> {/* (CSS 클래스는 예시) */}
      <h2>실험 결과 전송</h2>
      {renderStatus()}
      
      {/* (기존 ResultsPage.tsx에 있던 3D 결과 요약 등은 여기에 유지) */}
    </div>
  );
};

export default ResultsPage;