import {
  EDGE_BLOCKED_ROUTES,
  EDGE_SWIPE_WIDTH,
  claimDrawerClose,
  claimEdgeSwipe,
  drawerGesturesEnabled,
  drawerTransitionMs,
  edgeOffset,
  isDrawerDismissKey,
  isPhoneDrawerWidth,
  shouldCloseFromDrawer,
  shouldOpenFromEdge,
} from '../drawerGesture';

describe('phone drawer width', () => {
  it('is on below 600px and off from tablet upward', () => {
    expect(isPhoneDrawerWidth(390)).toBe(true);
    expect(isPhoneDrawerWidth(599)).toBe(true);
    expect(isPhoneDrawerWidth(600)).toBe(false);
    expect(isPhoneDrawerWidth(1024)).toBe(false);
    expect(isPhoneDrawerWidth(undefined)).toBe(false);
  });
});

describe('edge swipe', () => {
  it('claims a rightward move that starts inside the 24px edge', () => {
    expect(claimEdgeSwipe({ dx: 12, dy: 2, x0: 8 })).toBe(true);
    expect(EDGE_SWIPE_WIDTH).toBe(24);
  });

  it('ignores vertical moves, left moves, and drags that start past the edge', () => {
    expect(claimEdgeSwipe({ dx: 4, dy: 0, x0: 4 })).toBe(false);
    expect(claimEdgeSwipe({ dx: -30, dy: 0, x0: 4 })).toBe(false);
    expect(claimEdgeSwipe({ dx: 20, dy: 28, x0: 4 })).toBe(false);
    expect(claimEdgeSwipe({ dx: 40, dy: 2, x0: 48 })).toBe(false);
  });

  it('lets a horizontal scroll that starts outside the edge through', () => {
    expect(claimEdgeSwipe({ dx: 80, dy: 4, x0: EDGE_SWIPE_WIDTH + 1 })).toBe(false);
  });

  it('opens after a long pull or a rightward flick', () => {
    expect(shouldOpenFromEdge({ dx: 70, vx: 0 })).toBe(true);
    expect(shouldOpenFromEdge({ dx: 16, vx: 0.6 })).toBe(true);
    expect(shouldOpenFromEdge({ dx: 20, vx: 0.1 })).toBe(false);
  });

  it('tracks the finger without pulling the drawer past closed or open', () => {
    expect(edgeOffset(40, -300)).toBe(-260);
    expect(edgeOffset(-10, -300)).toBe(-300);
    expect(edgeOffset(400, -300)).toBe(0);
  });
});

describe('drawer close swipe', () => {
  it('claims a horizontal swipe left and ignores vertical scrolling', () => {
    expect(claimDrawerClose({ dx: -20, dy: 4 })).toBe(true);
    expect(claimDrawerClose({ dx: -20, dy: 30 })).toBe(false);
    expect(claimDrawerClose({ dx: 20, dy: 0 })).toBe(false);
  });

  it('closes after a long pull or a leftward flick', () => {
    expect(shouldCloseFromDrawer({ dx: -70, vx: 0 })).toBe(true);
    expect(shouldCloseFromDrawer({ dx: -16, vx: -0.6 })).toBe(true);
    expect(shouldCloseFromDrawer({ dx: -20, vx: -0.1 })).toBe(false);
  });
});

describe('where the edge gesture is allowed', () => {
  it('stays off on games and the Windows simulator', () => {
    expect(drawerGesturesEnabled(390, 'Dashboard')).toBe(true);
    ['Game', 'GameRunnerLobby', 'CircuitMaze', 'CircuitMazeLobby', 'CircuitMazeTopic', 'Windows 11'].forEach((route) => {
      expect(EDGE_BLOCKED_ROUTES.has(route)).toBe(true);
      expect(drawerGesturesEnabled(390, route)).toBe(false);
    });
    expect(drawerGesturesEnabled(390, 'PC Assembly')).toBe(true);
    expect(drawerGesturesEnabled(1100, 'Dashboard')).toBe(false);
  });
});

describe('drawer motion', () => {
  it('skips the transition when reduced motion is on', () => {
    expect(drawerTransitionMs(false)).toBe(280);
    expect(drawerTransitionMs(true)).toBe(0);
  });

  it('treats Escape as the keyboard dismiss', () => {
    expect(isDrawerDismissKey({ key: 'Escape' })).toBe(true);
    expect(isDrawerDismissKey({ key: 'Esc' })).toBe(true);
    expect(isDrawerDismissKey({ key: 'Enter' })).toBe(false);
    expect(isDrawerDismissKey(null)).toBe(false);
  });
});
