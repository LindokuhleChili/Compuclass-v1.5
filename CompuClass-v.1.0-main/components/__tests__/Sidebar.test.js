import React from 'react';
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
});
