import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrackerFlowPage from '../TrackerFlowPage';
import { TrackingSessionContext } from '../../state/trackingSessionContext';
import {
  buildCalibrationResult,
  buildSurveyResponses,
  buildTrainingSession,
  createTrackingSessionValue,
} from '../../tests/mocks/trackingSession';

describe('TrackerFlowPage', () => {
  it('marks flow steps complete when tracking context has data', () => {
    const activeSession = buildTrainingSession();
    const mockContext = createTrackingSessionValue({
      surveyResponses: buildSurveyResponses(),
      consentAccepted: true,
      calibrationResult: buildCalibrationResult({ validationError: 3 }),
      recentSessions: [activeSession],
      lastSession: activeSession,
      activeSessionId: activeSession.id,
      activeSession,
    });

    render(
      <TrackingSessionContext.Provider value={mockContext}>
        <MemoryRouter>
          <TrackerFlowPage />
        </MemoryRouter>
      </TrackingSessionContext.Provider>,
    );

    expect(screen.getAllByText('완료')).toHaveLength(5);
    expect(screen.getByText(/최근 세션/)).toBeInTheDocument();
    expect(
      screen.getByText(`${activeSession.targetsHit}/${activeSession.totalTargets}`),
    ).toBeInTheDocument();
  });
});
