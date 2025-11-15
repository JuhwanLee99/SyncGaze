// frontend/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import './index.css'

// 1. WebgazerProvider를 import 합니다.
import { WebgazerProvider } from './context/WebgazerContext.tsx'

// 2. react-router-dom에서 BrowserRouter를 import 합니다.
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 3. BrowserRouter를 최상위로 이동시켜 앱 전체를 감쌉니다. */}
    <BrowserRouter>
      {/* 4. <App /> 컴포넌트를 <WebgazerProvider>로 감싸줍니다. */}
      <WebgazerProvider>
        <App />
      </WebgazerProvider>
    </BrowserRouter>
  </React.StrictMode>,
)