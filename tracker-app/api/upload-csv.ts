// /tracker-app/api/upload-csv.ts

// 1. (변경) 'import' 대신 'require'를 사용합니다.
const { put } = require('@vercel/blob');

// 'import type'은 TypeScript 타입 전용이므로 런타임에 영향을 주지 않아 그대로 둬도 됩니다.
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 2. (변경) 'export default' 대신 'module.exports'를 사용합니다.
module.exports = async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // 3. (변경 없음) POST 요청인지 확인
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 4. (변경 없음) 요청 본문(CSV 텍스트)을 읽음
    const csvData = req.body;

    if (!csvData || typeof csvData !== 'string' || csvData.length === 0) {
      return res.status(400).json({ message: 'No CSV data received.' });
    }

    // 5. (변경 없음) 고유한 파일 이름 생성
    const filename = `gaze-results-${Date.now()}.csv`;

    // 6. (변경 없음) Vercel Blob에 업로드
    const blob = await put(filename, csvData, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 7. (변경 없음) 성공 응답 반환
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
};