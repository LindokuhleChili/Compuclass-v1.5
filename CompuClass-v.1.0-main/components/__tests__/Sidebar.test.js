import React from 'react';
import { BackHandler } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import Sidebar from '../Sidebar';

describe('Sidebar', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(<Sidebar visible={false} onClose={jest.fn()} onNavigate={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders every menu item when visible', () => {
    const { getByText } = render(<Sidebar visible onClose={jest.fn()} onNavigate={jest.fn()} />);

    ['Learning materials', 'PC Lab', 'Windows 11', 'Quizzes', 'Troubleshooting', 'CompuBot', 'Settings'].forEach(
      (label) => expect(getByText(label)).toBeTruthy()
    );
  });

  it('navigates to the matching screen and closes when a menu item is pressed', () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(<Sidebar visible onClose={onClose} onNavigate={onNavigate} />);

    fireEvent.press(getByText('PC Lab'));

    expect(onNavigate).toHaveBeenCalledWith('PC Lab');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks the sidebar item for the screen that is open, including lecturer pages', () => {
    const { getByRole, rerender } = render(
      <Sidebar docked visible currentScreen="PC Lab" onClose={jest.fn()} onNavigate={jest.fn()} onHomePress={jest.fn()} />
    );
    expect(getByRole('button', { name: 'PC Lab' }).props.accessibilityState).toMatchObject({ selected: true });

    rerender(<Sidebar docked visible currentScreen="FolderContent" onClose={jest.fn()} onNavigate={jest.fn()} onHomePress={jest.fn()} />);
    expect(getByRole('button', { name: 'Home' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('highlights the open screen in the phone drawer and closes from the backdrop', () => {
    const onClose = jest.fn();
    const { getByRole, getByLabelText } = render(
      <Sidebar visible currentScreen="Settings" onClose={onClose} onNavigate={jest.fn()} onHomePress={jest.fn()} />
    );
    expect(getByRole('button', { name: 'Settings' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(getByRole('button', { name: 'Quizzes' }).props.accessibilityState).toMatchObject({ selected: false });

    fireEvent.press(getByLabelText('Close menu'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = jest.fn();
    const previous = global.window;
    const listeners = {};
    global.window = {
      addEventListener: (type, handler) => { listeners[type] = handler; },
      removeEventListener: jest.fn(),
    };
    const view = render(<Sidebar visible onClose={onClose} onNavigate={jest.fn()} />);
    const preventDefault = jest.fn();
    listeners.keydown({ key: 'Escape', preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    global.window = previous;
  });

  it('closes on the hardware back button and does not trap back when docked', () => {
    const onClose = jest.fn();
    const handlers = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'hardwareBackPress') handlers.push(handler);
      return { remove: jest.fn() };
    });

    const phone = render(<Sidebar visible onClose={onClose} onNavigate={jest.fn()} />);
    expect(handlers[0]()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    phone.unmount();

    handlers.length = 0;
    render(<Sidebar docked visible currentScreen="Home" onClose={jest.fn()} onNavigate={jest.fn()} onHomePress={jest.fn()} />);
    expect(handlers).toHaveLength(0);
    spy.mockRestore();
  });
});
