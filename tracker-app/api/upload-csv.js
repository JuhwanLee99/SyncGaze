// /tracker-app/api/upload-csv.js

const { put } = require('@vercel/blob');

// (신규) Node.js 요청 스트림을 읽어 문자열로 변환하는 헬퍼 함수
async function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // (변경) req.body 대신, 수동으로 스트림을 읽습니다.
    // 'req' 객체 자체가 바로 스트림입니다.
    const csvData = await streamToString(req);

    if (!csvData || csvData.length === 0) {
      return res.status(400).json({ message: 'No CSV data received.' });
    }

    // (이하 동일)
    const filename = `gaze-results-${Date.now()}.csv`;

    const blob = await put(filename, csvData, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json({
      message: 'Upload successful',
      url: blob.url,
    });

  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return res.status(500).json({
      message: 'Error uploading file',
      error: error.message,
    });
  }
};