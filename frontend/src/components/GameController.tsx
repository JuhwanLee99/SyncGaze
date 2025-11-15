// frontend/src/components/GameController.tsx

import React, { 
  useState, 
  useEffect, 
  useRef, 
  forwardRef, // 1. forwardRef import
  useImperativeHandle // 2. useImperativeHandle import
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- (원본 GameController.tsx의 인터페이스) ---
interface Target {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  createdAt: number;
}

interface TargetRef {
  mesh: THREE.Mesh;
  target: Target;
}

interface GameControllerProps {
  isLocked: boolean;
  onTargetHit: (targetId: string) => void;
  onPhaseChange: (newPhase: 'training' | 'complete') => void;
}

// 3. Scene.tsx가 ref를 통해 호출할 함수 타입을 정의합니다.
// (Scene.tsx와 일치)
export interface GameControllerRef {
  handleTargetHit: (targetId: string) => void;
}

// 4. 컴포넌트를 forwardRef로 감쌉니다.
const GameController = forwardRef<GameControllerRef, GameControllerProps>(
  ({ isLocked, onTargetHit, onPhaseChange }, ref) => {
    
    // --- (이하 원본 GameController.tsx의 모든 로직과 상태) ---
    const { scene } = useThree();
    const [targets, setTargets] = useState<Target[]>([]);
    const targetsRef = useRef<Record<string, TargetRef>>({});
    const spawnTimer = useRef<number | null>(null);
    const gameTimer = useRef<number | null>(null);
    const gamePhase = useRef<'training' | 'complete'>('training');

    const spawnTarget = () => {
      const targetId = `target-${Math.random().toString(36).substr(2, 9)}`;
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 5 + 1,
        -15 - Math.random() * 10
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        0
      );
      setTargets((prevTargets) => [
        ...prevTargets,
        { id: targetId, position, velocity, createdAt: Date.now() },
      ]);
    };

    const handleTargetHit = (targetId: string) => {
      onTargetHit(targetId); // Scene.tsx로 이벤트 전달
      setTargets((prevTargets) =>
        prevTargets.filter((target) => target.id !== targetId)
      );
      delete targetsRef.current[targetId];
    };

    // 5. useImperativeHandle을 사용해 'handleTargetHit' 함수를 ref로 노출시킵니다.
    useImperativeHandle(ref, () => ({
      handleTargetHit: (targetId: string) => {
        handleTargetHit(targetId);
      }
    }));

    useEffect(() => {
      if (isLocked) {
        if (gamePhase.current === 'training') {
          spawnTarget();
          spawnTimer.current = setInterval(spawnTarget, 2000); // 2초마다 타겟 생성
          gameTimer.current = setTimeout(() => {
            if (gamePhase.current === 'training') {
              gamePhase.current = 'complete';
              onPhaseChange('complete');
              if (spawnTimer.current) clearInterval(spawnTimer.current);
            }
          }, 30000); // 30초 후 게임 종료
        }
      } else {
        if (spawnTimer.current) clearInterval(spawnTimer.current);
        if (gameTimer.current) clearTimeout(gameTimer.current);
      }
      return () => {
        if (spawnTimer.current) clearInterval(spawnTimer.current);
        if (gameTimer.current) clearTimeout(gameTimer.current);
      };
    }, [isLocked, onPhaseChange]);

    useEffect(() => {
      return () => {
        targets.forEach(target => {
          if (targetsRef.current[target.id]?.mesh) {
            scene.remove(targetsRef.current[target.id].mesh);
          }
        });
        setTargets([]);
        targetsRef.current = {};
      };
    }, [scene]);

    useFrame((_, delta) => {
      if (!isLocked || gamePhase.current !== 'training') return;

      const now = Date.now();
      setTargets(prevTargets => {
        const newTargets = prevTargets.map(target => {
          if (now - target.createdAt > 10000) { // 10초 수명
            return null;
          }
          const newPos = target.position.clone().add(target.velocity.clone().multiplyScalar(delta * 60));
          if (newPos.x > 15 || newPos.x < -15) target.velocity.x *= -1;
          if (newPos.y > 6 || newPos.y < 0) target.velocity.y *= -1;
          
          if (targetsRef.current[target.id]?.mesh) {
            targetsRef.current[target.id].mesh.position.copy(newPos);
          }
          return { ...target, position: newPos };
        }).filter((t): t is Target => t !== null);
        
        // Remove meshes that are no longer in targets
        Object.keys(targetsRef.current).forEach(targetId => {
          if (!newTargets.find(t => t.id === targetId)) {
            if (targetsRef.current[targetId]?.mesh) {
              scene.remove(targetsRef.current[targetId].mesh);
            }
            delete targetsRef.current[targetId];
          }
        });

        return newTargets;
      });
    });

    return (
      <group>
        {targets.map((target) => (
          <TargetMesh
            key={target.id}
            target={target}
            onRef={(mesh) => {
              if (mesh && !targetsRef.current[target.id]) {
                targetsRef.current[target.id] = { mesh, target };
              }
            }}
          />
        ))}
      </group>
    );
  }
); // 6. forwardRef 닫기

// (원본 TargetMesh 컴포넌트)
const TargetMesh: React.FC<{
  target: Target;
  onRef: (mesh: THREE.Mesh | null) => void;
}> = ({ target, onRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (meshRef.current) {
      onRef(meshRef.current);
    }
    return () => onRef(null);
  }, [onRef]);

  return (
    <mesh ref={meshRef} position={target.position} userData={{ id: target.id, isTarget: true }}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

// 7. export default 부분 수정 (React.memo는 래핑된 컴포넌트에서 작동)
export default React.memo(GameController);