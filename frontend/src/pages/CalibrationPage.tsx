// src/pages/CalibrationPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CalibrationPage.css';
import { useTrackingSession } from '../state/trackingSessionContext';
import Calibration from '../features/tracking/components/Calibration';
import Validation from '../features/tracking/components/Validation';
import Task from '../features/tracking/components/Task';
import { useWebgazer } from '../hooks/tracking/useWebgazer';
import { RECALIBRATION_THRESHOLD } from '../features/tracking/constants';

const CalibrationPage = () => {
  const navigate = useNavigate();
  const { saveCalibrationResult } = useTrackingSession();
  const {
    isReady,
    gameState,
    liveGaze,
    validationError,
    gazeStability,
    currentDot,
    taskCount,
    isValidationSuccessful,
    validationSequence,
    startSession,
    handleCalibrationComplete,
    startValidation,
    startTaskPhase,
    handleRecalibrate,
    handleTaskDotClick,
    handleCalStage3Complete,
  } = useWebgazer();
  const lastSequenceRef = useRef(validationSequence);

  useEffect(() => {
    if (
      isValidationSuccessful &&
      validationSequence > lastSequenceRef.current &&
      validationError !== null &&
      validationError <= RECALIBRATION_THRESHOLD
    ) {
      lastSequenceRef.current = validationSequence;
      saveCalibrationResult({
        status: 'validated',
        validationError,
        completedAt: new Date().toISOString(),
      });
      navigate('/training');
    }
  }, [
    isValidationSuccessful,
    validationSequence,
    validationError,
    saveCalibrationResult,
    navigate,
  ]);

  const handleSkipCalibration = () => {
    saveCalibrationResult({
      status: 'skipped',
      validationError: null,
      completedAt: new Date().toISOString(),
    });
    navigate('/training');
  };

  const renderContent = () => {
    if (!isReady) {
      return (
        <div className="calibration-screen">
          <div className="loading-container">
            <div className="spinner" />
            <h2>Loading Eye Tracking...</h2>
            <p>Please wait while we initialize the calibration system</p>
          </div>
        </div>
      );
    }

    switch (gameState) {
      case 'idle':
        return (
          <div className="calibration-screen">
            <div className="instructions-container">
              <h1>Eye Tracking Calibration</h1>
              <div className="instructions-content">
                <div className="instruction-item">
                  <span className="instruction-icon">📷</span>
                  <div>
                    <h3>Camera Permission</h3>
                    <p>You'll need to allow camera access for eye tracking</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <span className="instruction-icon">👁️</span>
                  <div>
                    <h3>Look at the Dots</h3>
                    <p>Follow and click on the calibration points as they appear</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <span className="instruction-icon">💡</span>
                  <div>
                    <h3>Good Lighting</h3>
                    <p>Ensure your face is well-lit and clearly visible to the camera</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <span className="instruction-icon">🎯</span>
                  <div>
                    <h3>Stay Still</h3>
                    <p>Keep your head steady during calibration for best results</p>
                  </div>
                </div>
              </div>
              <div className="button-group">
                <button className="primary-button" onClick={startSession} disabled={!isReady}>
                  Start Calibration
                </button>
                <button className="secondary-button" onClick={handleSkipCalibration}>
                  Skip (Testing Only)
                </button>
              </div>
            </div>
          </div>
        );
      case 'calibrating':
        return (
          <div className="calibration-screen">
            <div className="calibrating-container">
              <h2>Calibration in Progress</h2>
              <Calibration
                onComplete={handleCalibrationComplete}
                liveGaze={liveGaze}
                onCalStage3Complete={handleCalStage3Complete}
              />
            </div>
          </div>
        );
      case 'confirmValidation':
        return (
          <div className="calibration-screen">
            <div className="confirmation-box">
              <h2>캘리브레이션 완료</h2>
              <p>이제 정확도 측정 단계로 진행합니다.</p>
              <button className="primary-button" onClick={startValidation}>
                정확도 측정 시작
              </button>
            </div>
          </div>
        );
      case 'validating':
        return (
          <div className="calibration-screen">
            <Validation
              validationError={validationError}
              gazeStability={gazeStability}
              onRecalibrate={handleRecalibrate}
              onStartTask={startTaskPhase}
            />
          </div>
        );
      case 'task':
        return (
          <div className="calibration-screen">
            <Task taskCount={taskCount} currentDot={currentDot} onDotClick={handleTaskDotClick} />
          </div>
        );
      case 'finished':
        return (
          <div className="calibration-screen">
            <div className="results-container">
              <h2>Calibration Measurement Complete</h2>
              <p className="accuracy-message">
                Great work! We've recorded the final accuracy metrics. You can proceed to training or recalibrate for better results.
              </p>
              <div className="button-group">
                <button className="primary-button" onClick={() => navigate('/training')}>
                  Go to Training
                </button>
                <button className="secondary-button" onClick={handleRecalibrate}>
                  Recalibrate
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="calibration-page">{renderContent()}</div>;
};

export default CalibrationPage;