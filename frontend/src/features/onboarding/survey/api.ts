import { SurveyResponses } from '../../../state/trackingSessionContext';

interface SubmitSurveyOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

const apiBase =
  typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || null
    : null;

const normalizeEndpoint = (base: string | null, path: string) => {
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path}`;
};

export const submitSurveyResponses = async (
  data: SurveyResponses,
  { endpoint = normalizeEndpoint(apiBase, '/api/submit-survey'), fetchImpl = fetch }: SubmitSurveyOptions = {},
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