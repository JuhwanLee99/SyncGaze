// src/components/GazeTracker/Results.tsx

import React from 'react';
import { TaskResult } from './types';

interface ResultsProps {
  taskResults: TaskResult[];
  onDownload: () => void;
  screenSize: { width: number; height: number } | null;
  // --- 변경/추가 ---
  // 3. 파생 데이터 props 추가
  avgGazeMouseDivergence: number | null;
  avgGazeTimeToTarget: number | null;
  // --- 변경/추가 끝 ---
}

const Results: React.FC<ResultsProps> = ({ 
  taskResults, 
  onDownload, 
  screenSize, 
  // --- 변경/추가 ---
  avgGazeMouseDivergence,
  avgGazeTimeToTarget 
  // --- 변경/추가 끝 ---
}) => {
  // 간단한 통계 계산
  const avgTimeTaken = taskResults.reduce((acc, r) => acc + r.timeTaken, 0) / taskResults.length;
  const avgGazeToClick = taskResults
    .filter(r => r.gazeToClickDistance !== null)
    .reduce((acc, r) => acc + r.gazeToClickDistance!, 0) / taskResults.filter(r => r.gazeToClickDistance !== null).length;

  return (
    <div className="results-container">
      <h2>과제 완료!</h2>
      <p>측정이 완료되었습니다. 데이터를 다운로드하여 분석하세요.</p>
      
      <h3>요약 통계</h3>
      <div className="summary-stats">
        <p>평균 클릭 반응 시간: <strong>{avgTimeTaken.toFixed(2)} ms</strong></p>
        <p>평균 시선-클릭 지점 오차: <strong>{avgGazeToClick.toFixed(2)} 픽셀</strong></p>
        
        {/* --- 변경/추가 --- */}
        {/* 3. 파생 데이터 결과 표시 */}
        {avgGazeTimeToTarget !== null && (
          <p>평균 시선 반응 속도 (목표점 도달): <strong>{avgGazeTimeToTarget.toFixed(2)} ms</strong></p>
        )}
        {avgGazeMouseDivergence !== null && (
          <p>평균 시선-마우스 이격도: <strong>{avgGazeMouseDivergence.toFixed(2)} 픽셀</strong></p>
        )}
        {/* --- 변경/추가 끝 --- */}

      </div>

      <button onClick={onDownload}>CSV 데이터 다운로드</button>

      <h3>개별 과제 결과 (참고용)</h3>
      <div className="results-table-container">
        <table>
          <thead>
            <tr>
              <th>과제 ID</th>
              <th>소요 시간 (ms)</th>
              <th>시선-목표점 오차 (px)</th>
              <th>시선-클릭 지점 오차 (px)</th>
            </tr>
          </thead>
          <tbody>
            {taskResults.map(result => (
              <tr key={result.taskId}>
                <td>{result.taskId}</td>
                <td>{result.timeTaken.toFixed(2)}</td>
                <td>{result.gazeToTargetDistance !== null ? result.gazeToTargetDistance.toFixed(2) : 'N/A'}</td>
                <td>{result.gazeToClickDistance !== null ? result.gazeToClickDistance.toFixed(2) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Results;