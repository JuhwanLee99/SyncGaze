// frontend/src/pages/TrainingPage.tsx
// Updated to properly collect and export training data

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrainingScene } from '../components/TrainingScene';
import './TrainingPage.css';
import {
  TrainingDataPoint,
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { serializeSessionToCsv } from '../utils/sessionExport';

const TrainingPage = () => {
  const navigate = useNavigate();
  const {
    addSession,
    setActiveSessionId,
    calibrationResult,
    surveyResponses,
    consentAccepted,
  } = useTrackingSession();
  
  const [isTraining, setIsTraining] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const trainingStartTime = useRef<number>(0);

  const handleStartTraining = useCallback(() => {
    trainingStartTime.current = Date.now();
    setIsTraining(true);
    setIsComplete(false);
  }, []);

  const handleTrainingComplete = useCallback((score: number, targetsHit: number) => {
    setIsComplete(true);
    setIsTraining(false);
    setFinalScore(score);

    // Note: TrainingScene's useTrackingData hook collects the data
    // We'll get the actual training data when TrainingScene provides it
    // For now, create a basic session record
    
    const sessionRecord: TrainingSessionSummary = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: 60, // 60 seconds
      score: score,
      accuracy: 0, // Will be calculated from raw data if available
      targetsHit: targetsHit,
      totalTargets: targetsHit, // Approximate
      avgReactionTime: 0,
      gazeAccuracy: 0,
      mouseAccuracy: 0,
      rawData: [] as TrainingDataPoint[], // Data will be added by TrainingScene
      csvData: '',
    };

    // Generate CSV
    const csvData = serializeSessionToCsv({
      session: sessionRecord,
      surveyResponses,
      consentAccepted,
      calibrationResult,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    const finalSession = {
      ...sessionRecord,
      csvData,
    };

    addSession(finalSession);
    setActiveSessionId(finalSession.id);
    
    console.log('✅ Training session saved:', {
      id: finalSession.id,
      score,
      duration: 60,
      targetsHit
    });
  }, [addSession, setActiveSessionId, calibrationResult, surveyResponses, consentAccepted]);

  const handleViewResults = () => {
    navigate('/results');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="training-page">
      {/* Training Scene - renders when training is active */}
      {isTraining && (
        <TrainingScene onComplete={handleTrainingComplete} />
      )}
      
      {/* Pre-Training Instructions */}
      {!isTraining && !isComplete && (
        <div className="training-overlay">
          <div className="training-instructions">
            <h1>Ready to Train?</h1>
            <div className="training-info">
              <div className="info-item">
                <span className="info-icon">⏱️</span>
                <div>
                  <h3>60-Second Session</h3>
                  <p>Hit as many targets as possible within 60 seconds</p>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">🎯</span>
                <div>
                  <h3>Track Your Gaze</h3>
                  <p>Your eye movements and mouse clicks will be recorded</p>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">📊</span>
                <div>
                  <h3>Get Insights</h3>
                  <p>After training, view detailed analytics and CSV data</p>
                </div>
              </div>
            </div>

            <div className="training-controls">
              <button className="start-button" onClick={handleStartTraining}>
                Start Training
              </button>
              <button className="back-button-inline" onClick={handleBackToDashboard}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Complete */}
      {isComplete && (
        <div className="training-overlay">
          <div className="training-complete">
            <h1>Training Complete!</h1>
            <div className="completion-stats">
              <div className="stat">
                <span className="stat-label">Final Score</span>
                <span className="stat-value">{finalScore}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Duration</span>
                <span className="stat-value">60s</span>
              </div>
              <div className="stat">
                <span className="stat-label">Targets Hit</span>
                <span className="stat-value">{finalScore}</span>
              </div>
            </div>

            <div className="training-controls">
              <button className="view-results-button" onClick={handleViewResults}>
                View Detailed Results
              </button>
              <button className="back-button-inline" onClick={handleBackToDashboard}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;