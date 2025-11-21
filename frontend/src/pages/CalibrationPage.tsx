// src/pages/CalibrationPage.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CalibrationPage.css';
import { useTrackingSession } from '../state/trackingSessionContext';
import Calibration from '../features/tracker/calibration/components/Calibration';
import Validation from '../features/tracker/calibration/components/Validation';
import WebcamCheck from '../features/tracker/calibration/components/WebcamCheck';
import { useWebgazer } from '../hooks/tracking/useWebgazer';
import { RECALIBRATION_THRESHOLD } from '../features/tracker/calibration/constants';

const CalibrationPage = () => {
  const navigate = useNavigate();
  const { saveCalibrationResult } = useTrackingSession();
  const {
    isReady,
    gameState,
    liveGaze,
    validationError,
    gazeStability,
    isValidationSuccessful,
    validationSequence,
    startSession,
    handleCalibrationComplete,
    quality,
    setQuality,
    isFaceDetected,
    handleWebcamCheckComplete,
    startValidation,
    handleRecalibrate,
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
    }
  }, [
    isValidationSuccessful,
    validationSequence,
    validationError,
    saveCalibrationResult,
  ]);

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
              <p className="eyebrow">Calibration Prep</p>
              <h1>시선 추적 환경 안내</h1>
              <div className="instructions-content">
                <div className="instruction-item">
                  <span className="instruction-icon">📷</span>
                  <div>
                    <h3>카메라 권한</h3>
                    <p>웹캠 접근을 허용해야 얼굴 특징점을 실시간으로 추적할 수 있습니다.</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <span className="instruction-icon">👁️</span>
                  <div>
                    <h3>표시되는 점 주시</h3>
                    <p>화면 전역에 나타나는 포인트를 눈으로 따라가며 클릭하면 정렬 정확도가 향상됩니다.</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <span className="instruction-icon">💡</span>
                  <div>
                    <h3>밝은 조명</h3>
                    <p>얼굴 전체가 골고루 비춰지도록 전면 조명을 유지하고 역광은 피해주세요.</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <span className="instruction-icon">🎯</span>
                  <div>
                    <h3>안정적인 자세</h3>
                    <p>머리를 고정하고 모니터와 50~70cm 거리를 유지하면 측정 품질이 높아집니다.</p>
                  </div>
                </div>
              </div>
              <div className="environment-callout">
                <h3>측정 시작 전 체크리스트</h3>
                <ul>
                  <li>배경 소음을 줄이고, 화면 밝기를 70% 이상으로 맞춥니다.</li>
                  <li>웹캠 프리뷰에서 얼굴이 중앙에 위치하도록 노트북 각도를 조정합니다.</li>
                  <li>안경에 반사가 생기면 조명을 약간 측면으로 이동시켜 주세요.</li>
                </ul>
              </div>
              <div className="button-group">
                <button className="primary-button" onClick={startSession} disabled={!isReady}>
                  측정 시작
                </button>
              </div>
            </div>
          </div>
        );
      case 'webcamCheck':
        return (
          <div className="calibration-screen">
            <WebcamCheck
              quality={quality}
              onQualityChange={setQuality}
              isFaceDetected={isFaceDetected}
              onConfirm={handleWebcamCheckComplete}
            />
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
          <div className="calibration-screen validation-active">
            <Validation
              validationError={validationError}
              gazeStability={gazeStability}
              onRecalibrate={handleRecalibrate}
            />
          </div>
        );
      case 'validationResult':
        return (
          <div className="calibration-screen validation-active">
            <Validation
              validationError={validationError}
              gazeStability={gazeStability}
              onRecalibrate={handleRecalibrate}
              canProceed={isValidationSuccessful}
              onProceed={() => navigate('/training')}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="calibration-page">{renderContent()}</div>;
};

export default CalibrationPage;
