import { RegressionModel, QualitySetting } from '../types';
import '../styles/webcamCheck.css';

type WebcamCheckProps = {
  quality: QualitySetting;
  onQualityChange: (quality: QualitySetting) => void;
  regressionModel: RegressionModel;
  onRegressionChange: (model: RegressionModel) => void;
  isFaceDetected: boolean;
  onConfirm: () => void;
};

const WebcamCheck = ({
  quality,
  onQualityChange,
  regressionModel,
  onRegressionChange,
  isFaceDetected,
  onConfirm,
}: WebcamCheckProps) => {
  return (
    <div className="webcam-check-panel">
      <div className="webcam-check-header">
        <p className="eyebrow">Pre-calibration checklist</p>
        <h2>웹캠 상태 및 추적 품질 설정</h2>
        <p>
          화면 좌측 상단에 표시되는 카메라 영상을 확인하고, 얼굴 특징점이 안정적으로 감지될 때까지 조명을 조정해 주세요.
        </p>
      </div>

      <section className="webcam-guidelines">
        <h3>환경 설정 가이드</h3>
        <ul>
          <li>정면을 바라보고, 모니터와 눈의 거리를 50~70cm 정도로 유지합니다.</li>
          <li>얼굴 전체가 보이도록 주변 조명을 밝히고, 역광이나 강한 그림자를 피합니다.</li>
          <li>웹캠 프리뷰에 초록색 박스와 얼굴 특징점이 표시되면 인식이 완료된 것입니다.</li>
        </ul>
      </section>

      <section className="quality-selector">
        <h3>시선 추적 품질</h3>
        <div className="quality-options">
          <button
            type="button"
            className={quality === 'low' ? 'active' : ''}
            onClick={() => onQualityChange('low')}
          >
            낮음
            <span>저사양 PC, 640×480</span>
          </button>
          <button
            type="button"
            className={quality === 'medium' ? 'active' : ''}
            onClick={() => onQualityChange('medium')}
          >
            중간
            <span>권장 설정, 1280×720</span>
          </button>
          <button
            type="button"
            className={quality === 'high' ? 'active' : ''}
            onClick={() => onQualityChange('high')}
          >
            높음
            <span>고사양 PC, 1920×1080</span>
          </button>
        </div>
      </section>

      <section className="regression-selector">
        <h3>회귀 모델 선택</h3>
        <div className="regression-options">
          <label>
            <input
              type="radio"
              name="regression"
              value="ridge"
              checked={regressionModel === 'ridge'}
              onChange={() => onRegressionChange('ridge')}
            />
            Ridge — 기본 정확도
          </label>
          <label>
            <input
              type="radio"
              name="regression"
              value="threadedRidge"
              checked={regressionModel === 'threadedRidge'}
              onChange={() => onRegressionChange('threadedRidge')}
            />
            Threaded Ridge — UI 지연 최소화
          </label>
          <label>
            <input
              type="radio"
              name="regression"
              value="weightedRidge"
              checked={regressionModel === 'weightedRidge'}
              onChange={() => onRegressionChange('weightedRidge')}
            />
            Weighted Ridge — 빠른 적응
          </label>
        </div>
      </section>

      <div className={`detection-status ${isFaceDetected ? 'success' : 'pending'}`}>
        {isFaceDetected
          ? '얼굴이 안정적으로 인식되었습니다. 캘리브레이션을 진행하세요.'
          : '얼굴을 인식하는 중입니다... 조명과 자세를 조정해 주세요.'}
      </div>

      <div className="confirm-row">
        <button className="primary-button" type="button" onClick={onConfirm} disabled={!isFaceDetected}>
          인식 완료, 캘리브레이션 시작
        </button>
      </div>
    </div>
  );
};

export default WebcamCheck;