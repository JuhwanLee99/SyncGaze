// frontend/src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 1. WebgazerProvider를 import 합니다.
import { WebgazerProvider } from './context/WebgazerContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. <App /> 컴포넌트를 <WebgazerProvider>로 감싸줍니다. */}
    <WebgazerProvider>
      <App />
    </WebgazerProvider>
  </React.StrictMode>,
)