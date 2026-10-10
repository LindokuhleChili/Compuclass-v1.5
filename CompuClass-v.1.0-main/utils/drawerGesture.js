// Phone drawer gestures. The catcher is only the left 24px, so horizontal
// scrolling that starts further in stays with the content.

export const PHONE_DRAWER_MAX_WIDTH = 600;
export const EDGE_SWIPE_WIDTH = 24;
export const EDGE_CLAIM_DISTANCE = 8;
export const OPEN_DRAG_DISTANCE = 64;
export const CLOSE_DRAG_DISTANCE = 56;
export const CLOSE_CLAIM_DISTANCE = 12;
// React Native reports gesture velocity in px per ms.
export const FLICK_VELOCITY = 0.45;
export const DRAWER_TRANSITION_MS = 280;
// Space the edge catcher keeps clear of the phone tab bar (pill + padding).
export const TAB_BAR_CLEARANCE = 100;

// Full-screen play surfaces. The drawer must not sit on top of these.
export const FULLSCREEN_ROUTES = new Set(['CircuitMaze', 'Game', 'Windows 11']);

// Screens whose own horizontal drags start at the left edge.
export const EDGE_BLOCKED_ROUTES = new Set([
  'CircuitMaze',
  'CircuitMazeLobby',
  'CircuitMazeTopic',
  'Game',
  'GameRunnerLobby',
  'Windows 11',
]);

export function isPhoneDrawerWidth(width) {
  return typeof width === 'number' && width < PHONE_DRAWER_MAX_WIDTH;
}

export function drawerGesturesEnabled(width, routeName) {
  return isPhoneDrawerWidth(width) && !EDGE_BLOCKED_ROUTES.has(routeName);
}

export function drawerTransitionMs(reducedMotion) {
  return reducedMotion ? 0 : DRAWER_TRANSITION_MS;
}

export function claimEdgeSwipe({ dx, dy, x0, edge = EDGE_SWIPE_WIDTH }) {
  if (typeof x0 === 'number' && x0 > edge) return false;
  if (dx <= EDGE_CLAIM_DISTANCE) return false;
  return Math.abs(dx) > Math.abs(dy);
}

export function edgeOffset(dx, hiddenX) {
  const next = hiddenX + Math.max(0, dx);
  return next > 0 ? 0 : next;
}

export function shouldOpenFromEdge({ dx, vx = 0 }) {
  return dx > OPEN_DRAG_DISTANCE || vx > FLICK_VELOCITY;
}

export function claimDrawerClose({ dx, dy }) {
  return dx < -CLOSE_CLAIM_DISTANCE && Math.abs(dx) > Math.abs(dy);
}

export function shouldCloseFromDrawer({ dx, vx = 0 }) {
  return dx < -CLOSE_DRAG_DISTANCE || vx < -FLICK_VELOCITY;
}

export function isDrawerDismissKey(event) {
  return event?.key === 'Escape' || event?.key === 'Esc';
}
