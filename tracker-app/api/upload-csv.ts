// /tracker-app/api/upload-csv.ts

import { put } from '@vercel/blob';
import type { NextApiRequest, NextApiResponse } from 'next';

// Vercel 배포 환경에서는 'next' 타입이 없으므로, 
// 간단하게 Request, Response 타입을 사용하거나 
// Vercel이 제공하는 기본 핸들러 타입을 사용합니다.
// Create React App (react-scripts) 기반이므로 'next'가 없습니다.
// Vercel은 CRA 프로젝트의 'api' 폴더도 서버리스 함수로 인식합니다.
// 'next'에 의존하지 않는 기본 핸들러를 사용해야 합니다.

// 이 핸들러는 Vercel이 Node.js 환경에서 실행합니다.
// @ts-ignore (Next.js 타입이 없으므로 임시 무시)
export default async function handler(request: Request, response: Response) {
  // 1. POST 요청인지 확인
  if (request.method !== 'POST') {
    // @ts-ignore
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 2. 요청 본문(CSV 텍스트)을 읽음
    const csvData = await request.text();
    
    // 3. 고유한 파일 이름 생성 (예: 'results-1678886400000.csv')
    const filename = `gaze-results-${Date.now()}.csv`;

    // 4. Vercel Blob에 업로드
    // process.env.BLOB_READ_WRITE_TOKEN는 Vercel 환경 변수에서 자동으로 주입됩니다.
    const blob = await put(filename, csvData, {
      access: 'public', // 또는 'private'
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 5. 성공 응답 반환
    // @ts-ignore
    return response.status(200).json({ 
      message: 'Upload successful', 
      url: blob.url 
    });

  } catch (error: any) {
    console.error(error);
    // @ts-ignore
    return response.status(500).json({ 
      message: 'Error uploading file', 
      error: error.message 
    });
  }
}