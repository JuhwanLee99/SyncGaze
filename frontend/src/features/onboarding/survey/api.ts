import { SurveyResponses } from '../../../state/trackingSessionContext';

interface SubmitSurveyOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export const submitSurveyResponses = async (
  data: SurveyResponses,
  { endpoint = '/api/submit-survey', fetchImpl = fetch }: SubmitSurveyOptions = {},
) => {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit survey (${response.status})`);
  }

  return response;
};
