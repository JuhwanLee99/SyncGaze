import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyPage from '../onboarding/SurveyPage';
import { TrackingSessionProvider } from '../../state/trackingSessionContext';

describe('SurveyPage', () => {
  const originalFetch = globalThis.fetch;
  const originalAlert = window.alert;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.alert = originalAlert;
    globalThis.fetch = originalFetch;
  });

  it('submits valid survey responses and navigates to tracker flow', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response),
    ) as unknown as typeof fetch;
    globalThis.fetch = mockFetch;

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/onboarding/survey']}>
        <TrackingSessionProvider>
          <Routes>
            <Route path="/onboarding/survey" element={<SurveyPage />} />
            <Route path="/tracker-flow" element={<div>Tracker Flow Destination</div>} />
          </Routes>
        </TrackingSessionProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText(/만 18세 이상/));
    await user.click(screen.getByLabelText(/웹캠/));
    await user.click(screen.getByRole('button', { name: 'Valorant' }));
    await user.click(screen.getByLabelText('Valorant'));
    await user.type(screen.getByPlaceholderText('현재 랭크를 정확히 입력하세요'), 'Immortal 2');
    await user.selectOptions(screen.getByLabelText('Q6. 총 플레이 시간'), '500-1000시간');
    fireEvent.change(screen.getByLabelText(/FPS 실력 자가 평가/), { target: { value: '6' } });

    await user.click(screen.getByRole('button', { name: /설문 제출/ }));

    await waitFor(() => {
      expect(screen.getByText('Tracker Flow Destination')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/submit-survey',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
