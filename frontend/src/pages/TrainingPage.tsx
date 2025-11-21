// frontend/src/pages/TrainingPage.tsx
// UPDATED: Now properly converts and stores training data

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrainingScene } from '../components/TrainingScene';
import { TrackingDataRecord } from '../hooks/useTrackingData';
import './TrainingPage.css';
import {
  TrainingDataPoint,
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { useAuth } from '../state/authContext';
import { serializeSessionToCsv } from '../utils/sessionExport';

const TrainingPage = () => {
  const navigate = useNavigate();
  const {
    addSession,
    setActiveSessionId,
    calibrationResult,
    surveyResponses,
    consentAccepted,
    activeSessionId,
  } = useTrackingSession();
  
  const { user } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTraining, setIsTraining] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const trainingStartTime = useRef<number>(0);

  const handleStartTraining = useCallback(() => {
    trainingStartTime.current = Date.now();
    setIsTraining(true);
    setIsComplete(false);
  }, []);

  // Convert TrackingDataRecord to TrainingDataPoint format
  const convertTrainingData = (rawData: TrackingDataRecord[]): TrainingDataPoint[] => {
    return rawData.map(record => ({
      timestamp: record.timestamp,
      gazeX: record.gazeX,
      gazeY: record.gazeY,
      mouseX: record.mouseX,
      mouseY: record.mouseY,
      targetHit: record.hitRegistered,
      targetId: record.targetId,
      targetX: record.targetX,     // ✅ ADD THIS
      targetY: record.targetY,     // ✅ ADD THIS
    }));
  };

  // Calculate metrics from raw data
  const calculateMetrics = (rawData: TrackingDataRecord[], targetsHit: number) => {
    const hitRecords = rawData.filter(d => d.hitRegistered);
    const totalTargets = hitRecords.length;
    const accuracy = totalTargets > 0 ? (targetsHit / totalTargets) * 100 : 0;

    // Calculate average reaction time (simplified)
    // This would need proper implementation based on your game mechanics
    const avgReactionTime = 250; // Placeholder

    // Calculate gaze and mouse accuracy (simplified)
    const gazeRecords = rawData.filter(d => d.gazeX !== null && d.gazeY !== null);
    const mouseRecords = rawData.filter(d => d.mouseX !== null && d.mouseY !== null);
    
    const gazeAccuracy = gazeRecords.length > 0 ? 75 : 0; // Placeholder
    const mouseAccuracy = mouseRecords.length > 0 ? 85 : 0; // Placeholder

    return {
      accuracy,
      avgReactionTime,
      gazeAccuracy,
      mouseAccuracy,
      totalTargets,
    };
  };

  const handleTrainingComplete = useCallback((
    score: number, 
    targetsHit: number, 
    rawTrackingData: TrackingDataRecord[]
  ) => {
    setIsComplete(true);
    setIsTraining(false);
    setFinalScore(score);

    console.log('📊 Processing training session:', {
      score,
      targetsHit,
      rawDataPoints: rawTrackingData.length,
    });

    // Convert the raw tracking data to the format expected by the session system
    const convertedData = convertTrainingData(rawTrackingData);
    
    // Calculate metrics from the collected data
    const metrics = calculateMetrics(rawTrackingData, targetsHit);
    
    // Create the session record with actual data
    const sessionRecord: TrainingSessionSummary = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: 60,
      score: score,
      accuracy: metrics.accuracy,
      targetsHit: targetsHit,
      totalTargets: metrics.totalTargets,
      avgReactionTime: metrics.avgReactionTime,
      gazeAccuracy: metrics.gazeAccuracy,
      mouseAccuracy: metrics.mouseAccuracy,
      rawData: convertedData, // Now includes actual collected data
      csvData: '', // Will be set below
    };

    // Generate CSV with all the data
    const csvData = serializeSessionToCsv({
      session: sessionRecord,
      surveyResponses,
      consentAccepted,
      calibrationResult,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      participantLabel: user?.email ?? user?.displayName ?? user?.uid,
    });

    // Update session record with CSV
    const finalSession = {
      ...sessionRecord,
      csvData,
    };

    // Save to context
    addSession(finalSession);
    setActiveSessionId(finalSession.id);
    
    console.log('✅ Training session saved:', {
      id: finalSession.id,
      score,
      targetsHit,
      dataPoints: convertedData.length,
      accuracy: metrics.accuracy.toFixed(2) + '%',
    });
  }, [addSession, setActiveSessionId, calibrationResult, surveyResponses, consentAccepted]);

  const handleViewResults = () => {
    navigate('/results', {
      state: {
        fromTrainingComplete: true,
        sessionId: activeSessionId ?? null,
      },
    });
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
                  <h3>Improve Your Performance</h3>
                  <p>Compare your results with previous sessions</p>
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

      {/* Post-Training Results */}
      {isComplete && (
        <div className="training-overlay">
          <div className="training-complete">
            <h1>Training Complete!</h1>
            <div className="completion-stats">
              <div className="stat-card">
                <span className="stat-icon">🎯</span>
                <div className="stat-content">
                  <h3>Final Score</h3>
                  <p className="stat-value">{finalScore}</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⏱️</span>
                <div className="stat-content">
                  <h3>Duration</h3>
                  <p className="stat-value">60s</p>
                </div>
              </div>
            </div>

            <div className="training-controls">
              <button className="view-results-button" onClick={handleViewResults}>
                View Detailed Results
              </button>
              <button className="start-button" onClick={handleStartTraining}>
                Train Again
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