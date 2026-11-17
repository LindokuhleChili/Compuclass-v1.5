# Third-party notices

CompuClass AR assembly uses these permissively licensed projects. The app calls them or adapts a small, attributed piece. It does not copy sample applications wholesale.

## MediaPipe Tasks Vision

- Package: `@mediapipe/tasks-vision` 0.10.21
- Project: https://github.com/google-ai-edge/mediapipe
- Web guide and sample: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js and https://github.com/google-ai-edge/mediapipe-samples
- Licence: Apache License 2.0
- Used for: `HandLandmarker.detectForVideo` (skip a frame when `video.currentTime` has not changed, pass `performance.now()`), `FilesetResolver.forVisionTasks`, `DrawingUtils` plus `HandLandmarker.HAND_CONNECTIONS` for the skeleton, and the published model at `storage.googleapis.com/mediapipe-models/hand_landmarker`.

## three.js

- Package: `three` 0.145.0
- Project: https://github.com/mrdoob/three.js
- Licence: MIT
- Used for: the WebGL scene, `GLTFLoader`, and the drag-plane method from `examples/jsm/controls/DragControls.js` (camera-facing plane, ray hit, offset so the grab point stays under the pointer). CompuClass does not ship a copy of DragControls. Snapping to a slot is original.

## 1€ filter

- Source: https://github.com/casiez/OneEuroFilter (`javascript/OneEuroFilter.js`) and https://gery.casiez.net/1euro/
- Authors: Géry Casiez, Nicolas Roussel, Daniel Vogel. Copyright 2019 Inria.
- Licence: BSD 3-Clause. The full notice is in `components/assembly/oneEuroFilter.js`.
- Used for: smoothing the fingertip and the wrist so a resting hand does not flicker a pinch or a rotate. Casiez, Roussel and Vogel, "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems", CHI 2012.

## Gesture ideas that were not copied

Pinch as the distance from landmark 4 to landmark 8, with a separate release distance, is the usual MediaPipe hand heuristic. Open-palm, fist, point and pinch mappings are also described by MIT demos such as https://github.com/deaneeth/Cosmic-Hand-Control and https://github.com/collidingScopes/threejs-handtracking-101. Those repositories were read for the interaction shape only. None of their source is included here.

The PC case, the snap rules, and the lesson text are original to CompuClass. Part meshes are the project's existing glTF models, with the graphics card and the empty case drawn as simple meshes because the shipped scans are too heavy or already assembled.
