// frontend/src/hooks/useTrackingData.ts
// UPDATED: Added getData() method to retrieve collected data

import { useRef, useEffect, useCallback } from 'react';
import { useWebgazer } from './tracking/useWebgazer';

// Data structure for collected tracking data
export interface TrackingDataRecord {
  timestamp: number;
  phase: 'training' | 'calibration' | 'validation';
  targetId: string | null;
  targetPosition: { x: number; y: number; z: number } | null;
  gazeX: number | null;
  gazeY: number | null;
  mouseX: number | null;
  mouseY: number | null;
  cameraRotation: { x: number; y: number; z: number } | null;
  playerPosition: { x: number; y: number; z: number } | null;
  hitRegistered: boolean;
}

interface UseTrackingDataProps {
  isActive: boolean;
  phase: 'idle' | 'calibration' | 'confirmValidation' | 'validation' | 'training' | 'complete';
}

export const useTrackingData = ({ isActive, phase }: UseTrackingDataProps) => {
  const { isReady, liveGaze, validationError } = useWebgazer();
  const collectedData = useRef<TrackingDataRecord[]>([]);

  // Data collection during training
  useEffect(() => {
    if (phase !== 'training' || !isActive || !window.webgazer || !isReady) return;

    // Gaze data listener
    const gazeListener = (data: any) => {
      if (data) {
        collectedData.current.push({
          timestamp: performance.now(),
          phase: 'training',
          targetId: null,
          targetPosition: null,
          gazeX: data.x,
          gazeY: data.y,
          mouseX: null,
          mouseY: null,
          cameraRotation: null,
          playerPosition: null,
          hitRegistered: false,
        });
      }
    };

    // Mouse movement listener
    const mouseMoveListener = (event: MouseEvent) => {
      collectedData.current.push({
        timestamp: performance.now(),
        phase: 'training',
        targetId: null,
        targetPosition: null,
        gazeX: null,
        gazeY: null,
        mouseX: event.clientX,
        mouseY: event.clientY,
        cameraRotation: null,
        playerPosition: null,
        hitRegistered: false,
      });
    };

    try {
      window.webgazer.setGazeListener(gazeListener);
      document.addEventListener('mousemove', mouseMoveListener);
    } catch (error) {
      console.error('Failed to set up data collection:', error);
    }

    return () => {
      if (window.webgazer) {
        try {
          window.webgazer.clearGazeListener();
        } catch (error) {
          console.error('Failed to clear gaze listener:', error);
        }
      }
      document.removeEventListener('mousemove', mouseMoveListener);
    };
  }, [phase, isActive, isReady]);

  // Record target hit
  const recordTargetHit = useCallback((
    targetId: string,
    targetPosition: { x: number; y: number; z: number },
    cameraRotation: { x: number; y: number; z: number },
    playerPosition: { x: number; y: number; z: number }
  ) => {
    collectedData.current.push({
      timestamp: performance.now(),
      phase: 'training',
      targetId,
      targetPosition,
      gazeX: null,
      gazeY: null,
      mouseX: null,
      mouseY: null,
      cameraRotation,
      playerPosition,
      hitRegistered: true,
    });
  }, []);

  // NEW: Get collected data
  const getData = useCallback((): TrackingDataRecord[] => {
    return [...collectedData.current]; // Return a copy
  }, []);

  // Export data as CSV
  const exportData = useCallback(() => {
    const metaData = `# Validation Error (pixels): ${validationError !== null ? validationError.toFixed(2) : 'N/A'}\n`;
    const header = 'timestamp,phase,targetId,targetX,targetY,targetZ,gazeX,gazeY,mouseX,mouseY,cameraRotX,cameraRotY,cameraRotZ,playerX,playerY,playerZ,hitRegistered';
    
    const rows = collectedData.current.map(d => {
      const targetPos = d.targetPosition;
      const camRot = d.cameraRotation;
      const playerPos = d.playerPosition;
      
      return [
        d.timestamp,
        d.phase,
        d.targetId ?? '',
        targetPos?.x ?? '',
        targetPos?.y ?? '',
        targetPos?.z ?? '',
        d.gazeX ?? '',
        d.gazeY ?? '',
        d.mouseX ?? '',
        d.mouseY ?? '',
        camRot?.x ?? '',
        camRot?.y ?? '',
        camRot?.z ?? '',
        playerPos?.x ?? '',
        playerPos?.y ?? '',
        playerPos?.z ?? '',
        d.hitRegistered
      ].join(',');
    }).join('\n');

    const csvContent = `${metaData}${header}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fps_training_data_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [validationError]);

  // Clear data for new session
  const clearData = useCallback(() => {
    collectedData.current = [];
  }, []);

  return {
    recordTargetHit,
    getData, // NEW: Added this
    exportData,
    clearData,
    dataCount: collectedData.current.length,
  };
};