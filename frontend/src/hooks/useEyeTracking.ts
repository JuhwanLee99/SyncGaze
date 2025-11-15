// frontend/src/hooks/useEyeTracking.ts

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
// 1. WebgazerContext를 사용하기 위해 import 합니다.
import { useWebgazer } from '../context/WebgazerContext';

// 2. 훅의 시그니처는 (isActive)로 동일하게 유지합니다.
export const useEyeTracking3D = (isActive: boolean) => {
  const { camera, size } = useThree();
  const eyeDataRef = useRef<any[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());

  // 3. WebgazerContext에서 필요한 상태를 가져옵니다.
  const { isInitialized, isCalibrated, liveGaze } = useWebgazer();

  // 4. useEffect의 의존성을 liveGaze로 변경합니다.
  //    webgazer를 직접 제어(begin, end)하는 로직을 모두 제거합니다.
  useEffect(() => {
    // 5. 훅이 활성화(isActive)되고, webgazer가 초기화 및 캘리브레이션 되었는지 확인합니다.
    if (!isActive || !isInitialized || !isCalibrated) {
      return;
    }

    // 6. Context가 제공하는 liveGaze 데이터({x, y})를 사용합니다.
    if (liveGaze && liveGaze.x !== null && liveGaze.y !== null) {
      
      // 7. 기존 3D Raycasting 로직은 그대로 사용합니다.
      const x = (liveGaze.x / size.width) * 2 - 1;
      const y = -(liveGaze.y / size.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        new THREE.Vector2(x, y),
        camera
      );

      // 8. 데이터를 eyeDataRef에 누적합니다. (기존 로직 동일)
      eyeDataRef.current.push({
        timestamp: performance.now(),
        screenX: liveGaze.x,
        screenY: liveGaze.y,
        worldRay: {
          origin: raycasterRef.current.ray.origin.clone(),
          direction: raycasterRef.current.ray.direction.clone()
        }
      });
    }

    // 9. webgazer.begin() 및 return문의 webgazer.end()를 제거했습니다.
    //    WebgazerContext가 생명주기를 관리하므로 훅이 관여하지 않습니다.

  }, [
    isActive, 
    isInitialized, 
    isCalibrated, 
    liveGaze, // Context의 liveGaze가 변경될 때마다 이펙트 실행
    camera, 
    size
  ]);

  // 10. 반환 함수는 동일하게 유지합니다.
  const getEyeData = () => eyeDataRef.current;
  const clearEyeData = () => { eyeDataRef.current = []; };

  return { getEyeData, clearEyeData };
};