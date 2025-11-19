// src/pages/TrainingPage.tsx - UPDATED
// Key change: Pass isTraining prop to Scene component

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scene } from '../components/Scene';
import './TrainingPage.css';
import {
  TrainingDataPoint,
  TrainingSessionSummary,
  useTrackingSession,
} from '../state/trackingSessionContext';
import { serializeSessionToCsv } from '../utils/sessionExport';
import { useWebgazer } from '../hooks/tracking/useWebgazer';

const TrainingPage = () => {
  const navigate = useNavigate();
  const {
    addSession,
    setActiveSessionId,
    calibrationResult,
    surveyResponses,
    consentAccepted,
  } = useTrackingSession();
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTraining, setIsTraining] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const trainingDataRef = useRef<TrainingDataPoint[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!calibrationResult) {
      navigate('/calibration');
      return;
    }
    if (
      calibrationResult.status !== 'validated' &&
      calibrationResult.status !== 'skipped'
    ) {
      navigate('/calibration');
    }
  }, [calibrationResult, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!isTraining || isComplete) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTrainingComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTraining, isComplete]);

  const { isValidationSuccessful, validationSequence } = useWebgazer();
  const validationTriggerRef = useRef(validationSequence);

  const handleStartTraining = useCallback(() => {
    setIsTraining(true);
    setIsComplete(false);
    startTimeRef.current = Date.now();
    trainingDataRef.current = [];
    setScore(0);
    setTimeRemaining(60);
  }, []);

  const summarizeTrainingData = useMemo(() => {
    return (data: TrainingDataPoint[]) => {
      if (data.length === 0) {
        return {
          targetsHit: 0,
          totalTargets: 0,
          accuracy: 0,
          avgReactionTime: 0,
          gazeAccuracy: 0,
          mouseAccuracy: 0,
        };
      }

      const hits = data.filter(point => point.targetHit);
      const totalTargets = data.filter(point => point.targetId !== null).length || hits.length;
      const targetsHit = hits.length;
      const accuracy = totalTargets > 0 ? (targetsHit / totalTargets) * 100 : 0;
      const avgReactionTime = hits.length > 0
        ? hits.reduce((sum, hit) => sum + hit.timestamp, 0) / hits.length
        : 0;
      const gazeAccuracy = (data.filter(d => d.gazeX !== null && d.gazeY !== null).length / data.length) * 100;
      const mouseAccuracy = (data.filter(d => d.mouseX !== null && d.mouseY !== null).length / data.length) * 100;

      return {
        targetsHit,
        totalTargets,
        accuracy,
        avgReactionTime,
        gazeAccuracy,
        mouseAccuracy,
      };
    };
  }, []);

  const handleTrainingComplete = () => {
    setIsComplete(true);
    setIsTraining(false);

    const analytics = summarizeTrainingData(trainingDataRef.current);

    const baseSessionRecord: TrainingSessionSummary = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: 60,
      score: score,
      accuracy: analytics.accuracy,
      targetsHit: analytics.targetsHit,
      totalTargets: analytics.totalTargets,
      avgReactionTime: analytics.avgReactionTime,
      gazeAccuracy: analytics.gazeAccuracy,
      mouseAccuracy: analytics.mouseAccuracy,
      rawData: trainingDataRef.current,
      csvData: '',
    };

    const csvData = serializeSessionToCsv({
      session: baseSessionRecord,
      surveyResponses,
      consentAccepted,
      calibrationResult,
    });

    const sessionRecord: TrainingSessionSummary = {
      ...baseSessionRecord,
      csvData,
    };

    addSession(sessionRecord);
    setActiveSessionId(sessionRecord.id);
  };

  const handleViewResults = () => {
    navigate('/results');
  };

  const handleBackToDashboard = useCallback(() => {
    setIsTraining(false);
    setIsComplete(false);
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const recordTrainingData = (data: Partial<TrainingDataPoint>) => {
    trainingDataRef.current.push({
      timestamp: Date.now() - startTimeRef.current,
      gazeX: data.gazeX ?? null,
      gazeY: data.gazeY ?? null,
      mouseX: data.mouseX ?? null,
      mouseY: data.mouseY ?? null,
      targetHit: data.targetHit ?? false,
      targetId: data.targetId ?? null,
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (
      isValidationSuccessful &&
      validationSequence > validationTriggerRef.current &&
      !isTraining
    ) {
      validationTriggerRef.current = validationSequence;
      handleStartTraining();
    }
  }, [
    isValidationSuccessful,
    validationSequence,
    handleStartTraining,
    isTraining,
  ]);

  return (
    <div className="training-page">
      {/* UPDATED: Pass isTraining prop to Scene */}
      <Scene 
        skipCalibration={true} 
        isTrainingProp={isTraining}
      />
      
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
                <span className="stat-value">{score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Duration</span>
                <span className="stat-value">60s</span>
              </div>
              <div className="stat">
                <span className="stat-label">Time Remaining</span>
                <span className="stat-value">{formatTime(timeRemaining)}</span>
              </div>
            </div>

            <div className="action-buttons">
              <button className="view-results-button" onClick={handleViewResults}>
                View Detailed Results
              </button>
              <button className="back-button" onClick={handleBackToDashboard}>
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