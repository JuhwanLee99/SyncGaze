// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter';
import './index.css';
import { TrackingSessionProvider } from './state/trackingSessionContext';
import { WebgazerProvider } from './hooks/tracking/useWebgazer';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TrackingSessionProvider>
      <WebgazerProvider>
        <AppRouter />
      </WebgazerProvider>
    </TrackingSessionProvider>
  </React.StrictMode>,
);