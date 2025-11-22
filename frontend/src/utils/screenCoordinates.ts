// src/utils/screenCoordinates.ts
import * as THREE from 'three';

/**
 * Convert a 3D world position to 2D screen coordinates
 * @param worldPosition - The 3D position in world space
 * @param camera - The Three.js camera
 * @param canvas - The canvas element (for dimensions)
 * @returns Screen coordinates {x, y} in pixels, or null if behind camera
 */
export function worldToScreen(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement | null
): { x: number; y: number } | null {
  if (!canvas) return null;

  // Clone the position to avoid modifying the original
  const vector = worldPosition.clone();

  // Project to normalized device coordinates (-1 to +1)
  vector.project(camera);

  // Check if behind camera
  if (vector.z > 1) return null;

  // Convert to screen coordinates (0 to width/height)
  const x = (vector.x + 1) * canvas.width / 2;
  const y = (-vector.y + 1) * canvas.height / 2;

  return { x, y };
}

/**
 * Convert screen coordinates to 3D world position on a plane at given distance
 * @param screenX - Screen X coordinate (pixels)
 * @param screenY - Screen Y coordinate (pixels)
 * @param camera - The Three.js camera
 * @param canvas - The canvas element
 * @param distance - Distance from camera (default 10 units)
 * @returns World position on the plane
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  distance: number = 10
): THREE.Vector3 {
  // Convert screen coordinates to normalized device coordinates (-1 to +1)
  const x = (screenX / canvas.width) * 2 - 1;
  const y = -(screenY / canvas.height) * 2 + 1;

  // Create a vector in NDC space
  const vector = new THREE.Vector3(x, y, 0.5);

  // Unproject to world space
  vector.unproject(camera);

  // Get direction from camera to unprojected point
  const direction = vector.sub(camera.position).normalize();

  // Scale to desired distance
  return camera.position.clone().add(direction.multiplyScalar(distance));
}