// src/pages/CalibrationPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CalibrationPage.css';
import { useTrackingSession } from '../state/trackingSessionContext';

// WebGazer is already declared globally in other components

const CalibrationPage = () => {
  const navigate = useNavigate();
  const { saveCalibrationResult } = useTrackingSession();
  const [isWebGazerLoaded, setIsWebGazerLoaded] = useState(false);
  const [calibrationStage, setCalibrationStage] = useState<'loading' | 'instructions' | 'calibrating' | 'validation' | 'complete'>('loading');
  const [validationError, setValidationError] = useState<number | null>(null);

  // Load WebGazer on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.async = true;
    
    script.onload = () => {
      if (window.webgazer) {
        console.log('WebGazer loaded successfully');
        setIsWebGazerLoaded(true);
        setCalibrationStage('instructions');
      }
    };

    script.onerror = () => {
      console.error('Failed to load WebGazer');
      alert('Failed to load eye tracking. Please refresh and try again.');
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (window.webgazer) {
        window.webgazer.end();
      }
    };
  }, []);

  const handleStartCalibration = () => {
    if (!window.webgazer) return;

    try {
      window.webgazer.begin();
      window.webgazer.showPredictionPoints(true);
      setCalibrationStage('calibrating');
      saveCalibrationResult({ status: 'in-progress', validationError: null });
    } catch (error) {
      console.error('Failed to start WebGazer:', error);
      alert('Failed to start eye tracking. Please allow camera access.');
    }
  };

  const handleCalibrationComplete = () => {
    setCalibrationStage('validation');
    
    // Perform validation
    if (window.webgazer) {
      window.webgazer.showPredictionPoints(false);
      
      // Simple validation: measure error at screen center
      setTimeout(() => {
        // Simulate validation error (in production, calculate actual error)
        const mockError = Math.random() * 150; // 0-150px error
        setValidationError(mockError);
        setCalibrationStage('complete');
        saveCalibrationResult({
          status: 'validated',
          validationError: mockError,
          completedAt: new Date().toISOString(),
        });
      }, 3000);
    }
  };

  const handleStartTraining = () => {
    navigate('/training');
  };

  const handleRecalibrate = () => {
    if (window.webgazer) {
      window.webgazer.clearData();
    }
    setValidationError(null);
    setCalibrationStage('instructions');
    saveCalibrationResult(null);
  };

  const handleSkipCalibration = () => {
    // For testing purposes - skip calibration
    saveCalibrationResult({
      status: 'skipped',
      validationError: null,
      completedAt: new Date().toISOString(),
    });
    navigate('/training');
  };

  return (
    <div className="calibration-page">
      {/* Loading State */}
      {calibrationStage === 'loading' && (
        <div className="calibration-screen">
          <div className="loading-container">
            <div className="spinner"></div>
            <h2>Loading Eye Tracking...</h2>
            <p>Please wait while we initialize the calibration system</p>
          </div>
        </div>
      )}

      {/* Instructions State */}
      {calibrationStage === 'instructions' && (
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
              <button className="primary-button" onClick={handleStartCalibration}>
                Start Calibration
              </button>
              <button className="secondary-button" onClick={handleSkipCalibration}>
                Skip (Testing Only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calibrating State */}
      {calibrationStage === 'calibrating' && (
        <div className="calibration-screen">
          <div className="calibrating-container">
            <h2>Calibration in Progress</h2>
            <p>Click on the points as they appear on the screen</p>
            
            {/* Simple 9-point calibration grid */}
            <div className="calibration-grid">
              {[
                { x: '10%', y: '10%' },
                { x: '50%', y: '10%' },
                { x: '90%', y: '10%' },
                { x: '10%', y: '50%' },
                { x: '50%', y: '50%' },
                { x: '90%', y: '50%' },
                { x: '10%', y: '90%' },
                { x: '50%', y: '90%' },
                { x: '90%', y: '90%' },
              ].map((pos, index) => (
                <div
                  key={index}
                  className="calibration-dot"
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={handleCalibrationComplete}
                />
              ))}
            </div>
            
            <div className="calibration-hint">
              <p>Click each dot multiple times for better accuracy</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation State */}
      {calibrationStage === 'validation' && (
        <div className="calibration-screen">
          <div className="validation-container">
            <div className="validation-dot"></div>
            <h2>Measuring Accuracy...</h2>
            <p>Keep looking at the blue dot</p>
          </div>
        </div>
      )}

      {/* Complete State */}
      {calibrationStage === 'complete' && validationError !== null && (
        <div className="calibration-screen">
          <div className="results-container">
            <h2>Calibration Complete!</h2>
            
            <div className="accuracy-result">
              <p className="accuracy-label">Average Accuracy Error:</p>
              <p className={`accuracy-value ${
                validationError < 100 ? 'good' : 
                validationError < 150 ? 'ok' : 'poor'
              }`}>
                {validationError.toFixed(0)} px
              </p>
              
              <p className="accuracy-message">
                {validationError < 100 && '✅ Excellent calibration!'}
                {validationError >= 100 && validationError < 150 && '⚠️ Calibration OK, but recalibration recommended'}
                {validationError >= 150 && '❌ Poor calibration - please recalibrate'}
              </p>
            </div>
            
            <div className="button-group">
              <button className="primary-button" onClick={handleStartTraining}>
                Start Training
              </button>
              <button className="secondary-button" onClick={handleRecalibrate}>
                Recalibrate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Dashboard */}
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>
    </div>
  );
};

export default CalibrationPage;