import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { EdgeSwipeCatcher, PhoneMenuButton } from '../PhoneDrawer';
import { EDGE_SWIPE_WIDTH } from '../../utils/drawerGesture';

describe('PhoneMenuButton', () => {
  it('is a 44px control that opens the menu', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<PhoneMenuButton open={false} onPress={onPress} />);
    const button = getByTestId('open-menu');
    expect(button.props.accessibilityLabel).toBe('Open menu');
    expect(button.props.accessibilityState).toMatchObject({ expanded: false });
    const raw = typeof button.props.style === 'function' ? button.props.style({ pressed: false }) : button.props.style;
    const style = StyleSheet.flatten(raw);
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels the same control as close while the menu is open', () => {
    const { getByTestId } = render(<PhoneMenuButton open onPress={jest.fn()} />);
    const button = getByTestId('open-menu');
    expect(button.props.accessibilityLabel).toBe('Close menu');
    expect(button.props.accessibilityState).toMatchObject({ expanded: true });
  });
});

describe('EdgeSwipeCatcher', () => {
  it('renders the left-edge zone only when the gesture is enabled', () => {
    const hidden = render(<EdgeSwipeCatcher enabled={false} onMove={jest.fn()} onEnd={jest.fn()} />);
    expect(hidden.queryByTestId('edge-swipe-zone')).toBeNull();

    const shown = render(<EdgeSwipeCatcher enabled onMove={jest.fn()} onEnd={jest.fn()} />);
    const zone = shown.getByTestId('edge-swipe-zone', { includeHiddenElements: true });
    const style = StyleSheet.flatten(zone.props.style);
    expect(style.width).toBe(EDGE_SWIPE_WIDTH);
    expect(style.left).toBe(0);
    expect(zone.props.accessibilityElementsHidden).toBe(true);
  });
});
