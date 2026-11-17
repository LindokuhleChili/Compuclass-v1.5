import { Platform } from 'react-native';

let pending = null;

export function frontCameraSupported() {
  return Platform.OS === 'web'
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
}

export function requestFrontCamera() {
  if (!frontCameraSupported()) return Promise.resolve(null);
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'user' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }).catch(() => null);
}

// Call this inside the tap that opens AR so the browser treats it as a user gesture.
export function beginFrontCamera() {
  pending = requestFrontCamera();
  return pending;
}

export function consumeFrontCamera() {
  const request = pending;
  pending = null;
  return request || requestFrontCamera();
}

export function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}
