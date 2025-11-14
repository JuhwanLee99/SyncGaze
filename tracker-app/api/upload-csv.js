// /tracker-app/api/upload-csv.js

// 1. 'import' 대신 'require' 사용
const { put } = require('@vercel/blob');

// 2. 'import type' 및 'export default' 제거
// 3. 'module.exports' 사용 및 TypeScript 타입 어노테이션 제거
module.exports = async function handler(req, res) {
  
  // 4. POST 요청 확인
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 5. 요청 본문(CSV 텍스트) 읽기
    const csvData = req.body;

    if (!csvData || typeof csvData !== 'string' || csvData.length === 0) {
      return res.status(400).json({ message: 'No CSV data received.' });
    }

    // 6. 고유한 파일 이름 생성
    const filename = `gaze-results-${Date.now()}.csv`;

    // 7. Vercel Blob에 업로드
    const blob = await put(filename, csvData, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 8. 성공 응답 반환
    return res.status(200).json({
      message: 'Upload successful',
      url: blob.url,
    });

  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return res.status(500).json({
      message: 'Error uploading file',
      error: error.message, // 'error: any' 대신 'error.message'
    });
  }
};