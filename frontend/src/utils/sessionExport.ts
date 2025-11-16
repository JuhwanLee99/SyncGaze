import {
  CalibrationResult,
  SurveyResponses,
  TrainingDataPoint,
  TrainingSessionSummary,
} from '../state/trackingSessionContext';

export interface SessionExportTaskResult {
  taskId: string | number;
  timeTakenMs: number;
  gazeToTargetDistance?: number | null;
  gazeToClickDistance?: number | null;
}

export interface SessionExportRawDatum {
  timestamp: number;
  taskId?: string | number | null;
  targetX?: number | null;
  targetY?: number | null;
  gazeX?: number | null;
  gazeY?: number | null;
  mouseX?: number | null;
  mouseY?: number | null;
  targetHit?: boolean;
}

export interface SessionExportInput {
  session: TrainingSessionSummary;
  surveyResponses?: SurveyResponses | null;
  consentAccepted?: boolean;
  consentTimestamp?: string | null;
  calibrationResult?: CalibrationResult | null;
  participantLabel?: string;
  screenSize?: { width: number; height: number } | null;
  trackerMeta?: {
    cameraQuality?: string;
    regressionModel?: string;
    kalmanFilterEnabled?: boolean;
    calibrationDwellRadiusPx?: number;
    recalibrationCount?: number;
    calibrationStage3SuccessRate?: number | null;
    avgGazeMouseDivergence?: number | null;
    avgGazeTimeToTarget?: number | null;
    avgClickTimeTaken?: number | null;
    avgGazeToClickError?: number | null;
  };
  taskResults?: SessionExportTaskResult[];
  rawData?: SessionExportRawDatum[];
}

const isBrowser = typeof window !== 'undefined';

const formatBoolean = (value: boolean | undefined | null) =>
  value == null ? 'N/A' : value ? 'YES' : 'NO';

const formatNumber = (value: number | null | undefined, digits = 2) =>
  value == null ? 'N/A' : value.toFixed(digits);

const convertTrainingData = (data: TrainingDataPoint[]): SessionExportRawDatum[] =>
  data.map((point, index) => ({
    timestamp: point.timestamp,
    taskId: point.targetId ?? index + 1,
    gazeX: point.gazeX,
    gazeY: point.gazeY,
    mouseX: point.mouseX,
    mouseY: point.mouseY,
    targetHit: point.targetHit,
  }));

export const serializeSessionToCsv = ({
  session,
  surveyResponses,
  consentAccepted,
  consentTimestamp,
  calibrationResult,
  participantLabel,
  screenSize,
  trackerMeta,
  taskResults,
  rawData,
}: SessionExportInput): string => {
  const participantMeta = [
    '# --- Participant Metadata ---',
    `# Participant Label: ${participantLabel ?? 'N/A'}`,
    `# Session ID: ${session.id}`,
    `# Session Date: ${new Date(session.date).toISOString()}`,
    `# Consent Accepted: ${formatBoolean(consentAccepted ?? null)}`,
    `# Consent Timestamp: ${consentTimestamp ?? 'N/A'}`,
  ];

  if (surveyResponses) {
    participantMeta.push(
      `# Survey Age Check: ${formatBoolean(surveyResponses.ageCheck)}`,
      `# Survey Webcam Check: ${formatBoolean(surveyResponses.webcamCheck)}`,
      `# Survey Games Played: ${surveyResponses.gamesPlayed.join('; ') || 'N/A'}`,
      `# Survey Main Game: ${surveyResponses.mainGame || 'N/A'}`,
      `# Survey Rank: ${surveyResponses.inGameRank || 'N/A'}`,
      `# Survey Play Time: ${surveyResponses.playTime || 'N/A'}`,
      `# Survey Self-Assessment: ${surveyResponses.selfAssessment ?? 'N/A'}`,
    );
  } else {
    participantMeta.push('# Survey Responses: NOT_PROVIDED');
  }

  const systemMeta = [
    '# --- System & Calibration ---',
    `# Calibration Status: ${calibrationResult?.status ?? 'not-started'}`,
    `# Validation Error (px): ${formatNumber(calibrationResult?.validationError ?? null)}`,
    `# Calibration Completed At: ${calibrationResult?.completedAt ?? 'N/A'}`,
    `# Screen Size: ${screenSize ? `${screenSize.width}x${screenSize.height}` : 'N/A'}`,
  ];

  if (trackerMeta) {
    systemMeta.push(
      `# Camera Quality: ${trackerMeta.cameraQuality ?? 'N/A'}`,
      `# Regression Model: ${trackerMeta.regressionModel ?? 'N/A'}`,
      `# Kalman Filter Enabled: ${formatBoolean(trackerMeta.kalmanFilterEnabled ?? null)}`,
      `# Calibration Dwell Radius (px): ${trackerMeta.calibrationDwellRadiusPx ?? 'N/A'}`,
      `# Recalibration Count: ${trackerMeta.recalibrationCount ?? 'N/A'}`,
      `# Stage 3 Success Rate: ${trackerMeta.calibrationStage3SuccessRate != null ?
        `${(trackerMeta.calibrationStage3SuccessRate * 100).toFixed(1)}%` : 'N/A'}`,
    );
  }

  const measurementMeta = [
    '# --- Training Summary ---',
    `# Duration (s): ${session.duration}`,
    `# Score: ${session.score}`,
    `# Accuracy (%): ${session.accuracy.toFixed(2)}`,
    `# Targets Hit: ${session.targetsHit}/${session.totalTargets}`,
    `# Avg Reaction Time (ms): ${session.avgReactionTime.toFixed(2)}`,
    `# Gaze Accuracy (%): ${session.gazeAccuracy.toFixed(2)}`,
    `# Mouse Accuracy (%): ${session.mouseAccuracy.toFixed(2)}`,
  ];

  if (trackerMeta) {
    measurementMeta.push(
      `# Avg Click Time Taken (ms): ${formatNumber(trackerMeta.avgClickTimeTaken ?? null)}`,
      `# Avg Gaze-to-Click Error (px): ${formatNumber(trackerMeta.avgGazeToClickError ?? null)}`,
      `# Avg Gaze-Mouse Divergence (px): ${formatNumber(trackerMeta.avgGazeMouseDivergence ?? null)}`,
      `# Avg Gaze Time-to-Target (ms): ${formatNumber(trackerMeta.avgGazeTimeToTarget ?? null)}`,
    );
  }

  const taskRows = (taskResults ?? []).map(result =>
    [
      result.taskId,
      result.timeTakenMs.toFixed(2),
      result.gazeToTargetDistance != null ? result.gazeToTargetDistance.toFixed(2) : 'N/A',
      result.gazeToClickDistance != null ? result.gazeToClickDistance.toFixed(2) : 'N/A',
    ].join(','),
  );

  const taskResultsSection = taskRows.length
    ? ['# --- Individual Task Results ---', 'taskId,timeTaken(ms),gazeToTargetDistance(px),gazeToClickDistance(px)', ...taskRows].join('\n')
    : '# --- Individual Task Results ---\n# No structured task results were recorded for this session.';

  const rawRows = (rawData ?? convertTrainingData(session.rawData ?? [])).map(row =>
    [
      row.timestamp,
      row.taskId ?? '',
      row.targetX ?? '',
      row.targetY ?? '',
      row.gazeX ?? '',
      row.gazeY ?? '',
      row.mouseX ?? '',
      row.mouseY ?? '',
      row.targetHit ?? '',
    ].join(','),
  );

  const rawDataSection = rawRows.length
    ? ['# --- Raw Gaze & Mouse Data ---', 'timestamp,taskId,targetX,targetY,gazeX,gazeY,mouseX,mouseY,targetHit', ...rawRows].join('\n')
    : '# --- Raw Gaze & Mouse Data ---\n# No raw data was collected.';

  return [
    participantMeta.join('\n'),
    systemMeta.join('\n'),
    measurementMeta.join('\n'),
    taskResultsSection,
    rawDataSection,
  ].join('\n\n');
};

export const triggerCsvDownload = (csvContent: string, filename: string): string | null => {
  if (!isBrowser) {
    return null;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return url;
};

export interface CsvUploadOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
}

export interface CsvUploadResult {
  url?: string;
  message?: string;
  [key: string]: unknown;
}

export const uploadCsvToEndpoint = async (
  csvContent: string,
  { endpoint = '/api/upload-csv', fetchImpl = fetch, headers }: CsvUploadOptions = {},
): Promise<CsvUploadResult> => {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8;',
      ...headers,
    },
    body: csvContent,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : 'Failed to upload CSV data.';
    throw new Error(message);
  }

  return typeof payload === 'string' ? { message: payload } : payload;
};

export interface ExportSessionOptions {
  filename?: string;
  download?: boolean;
  upload?: boolean;
  uploadOptions?: CsvUploadOptions;
}

export interface ExportSessionResult {
  csv: string;
  downloadUrl?: string | null;
  uploadResult?: CsvUploadResult | null;
}

export const exportSessionData = async (
  input: SessionExportInput,
  {
    filename = `session-${input.session.id}.csv`,
    download = true,
    upload = false,
    uploadOptions,
  }: ExportSessionOptions = {},
): Promise<ExportSessionResult> => {
  const csv = serializeSessionToCsv(input);
  let downloadUrl: string | null | undefined;
  if (download) {
    downloadUrl = triggerCsvDownload(csv, filename);
  }

  let uploadResult: CsvUploadResult | null | undefined = null;
  if (upload) {
    uploadResult = await uploadCsvToEndpoint(csv, uploadOptions);
  }

  return { csv, downloadUrl, uploadResult };
};