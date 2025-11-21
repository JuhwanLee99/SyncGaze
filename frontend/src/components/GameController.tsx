// frontend/src/components/GameController.tsx
// MODIFIED: Only spawns blue (static) targets

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { Target } from './Target';
import { useMouseLook } from '../hooks/useMouseLook';
import type { Target3D } from '../types';

interface GameControllerProps {
  isLocked: boolean;
  onTargetHit: (targetId: string, mouseData: any) => void;
  onPhaseChange: (phase: 'training' | 'complete') => void;
}

export interface GameControllerRef {
  handleTargetHit: (targetId: string) => void;
  getActiveTargetId: () => string | null;
}

export const GameController = forwardRef<GameControllerRef, GameControllerProps>(({ 
  isLocked, 
  onTargetHit,
  onPhaseChange 
}, ref) => {
  const [targets, setTargets] = useState<Target3D[]>([]);
  const startTimeRef = useRef<number>(0);
  const hasInitialized = useRef<boolean>(false);
  const gameLoopRef = useRef<number | null>(null);

  const { getMouseData, clearMouseData } = useMouseLook(0.002, isLocked);

  const spawnTarget = useCallback((elapsedTime: number): Target3D => {
    // MODIFIED: Always spawn static (blue) targets regardless of elapsed time
    const phaseType = 'static';  // Always static
    const isMoving = false;       // Never moving

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const radius = 3 + Math.random() * 2;

    const position = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta) - 0.5 + 5,
      radius * Math.cos(phi)
    );

    return {
      id: `target-${Date.now()}-${Math.random()}`,
      position,
      radius: 0.3,
      spawnTime: performance.now(),
      type: 'static',  // Always static type
      velocity: undefined  // No velocity for static targets
    };
  }, []);

  // Initialize game once when locked first time
  useEffect(() => {
    if (!isLocked || hasInitialized.current) return;

    hasInitialized.current = true;
    console.log('🚀 Initializing game - 60 second session');
    startTimeRef.current = performance.now();
    setTargets([spawnTarget(0)]);

    gameLoopRef.current = setInterval(() => {
      const elapsedTime = performance.now() - startTimeRef.current;

      if (elapsedTime > 60000) {
        console.log('⏰ 60 seconds completed');
        onPhaseChange('complete');
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
          gameLoopRef.current = null;
        }
      }
    }, 1000);

    console.log('✅ Game loop started');
  }, [isLocked, spawnTarget, onPhaseChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🛑 Cleaning up game');
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, []);

  const handleTargetHit = useCallback((targetId: string) => {
    console.log('💥 Target hit:', targetId);
    
    const elapsedTime = performance.now() - startTimeRef.current;
    
    setTargets(prev => {
      const filtered = prev.filter(t => t.id !== targetId);
      return [...filtered, spawnTarget(elapsedTime)];
    });
    
    onTargetHit(targetId, getMouseData());
  }, [spawnTarget, onTargetHit, getMouseData]);

  // Expose handleTargetHit via ref
  useImperativeHandle(ref, () => ({
    handleTargetHit,
    getActiveTargetId: () => targets.length > 0 ? targets[0].id : null
  }), [handleTargetHit, targets]);

  return (
    <>
      {targets.map(target => (
        <Target key={target.id} target={target} onHit={handleTargetHit} />
      ))}
    </>
  );
});

GameController.displayName = 'GameController';