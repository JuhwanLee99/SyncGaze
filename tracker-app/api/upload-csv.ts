// /tracker-app/api/upload-csv.ts

import { put } from '@vercel/blob';
// NextApiRequest 대신 VercelRequest/VercelResponse를 import합니다.
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 핸들러 시그니처를 Vercel 타입으로 변경합니다.
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // 1. POST 요청인지 확인
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 2. 요청 본문(CSV 텍스트)을 읽음
    // GazeTracker.tsx에서 'text/plain'으로 보낸 데이터는
    // Vercel이 req.body에 원시 텍스트 문자열로 담아줍니다.
    const csvData = req.body;

    // 본문 데이터가 비어있는지 확인
    if (!csvData || typeof csvData !== 'string' || csvData.length === 0) {
      return res.status(400).json({ message: 'No CSV data received.' });
    }

    // 3. 고유한 파일 이름 생성
    const filename = `gaze-results-${Date.now()}.csv`;

    // 4. Vercel Blob에 업로드
    // 환경 변수는 Vercel 서버에서 자동으로 주입됩니다.
    const blob = await put(filename, csvData, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 5. 성공 응답 반환
    return res.status(200).json({
      message: 'Upload successful',
      url: blob.url,
    });

  } catch (error: any) {
    console.error('Error uploading to Vercel Blob:', error);
    return res.status(500).json({
      message: 'Error uploading file',
      error: error.message,
    });
  }
}