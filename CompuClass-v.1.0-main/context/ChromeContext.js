import { createContext, useContext } from 'react';

// The signed-in shell draws one back button for non-root screens.
// Screens hide their own leave button while that shell button is showing.
const ChromeContext = createContext({ shellBack: false });

export const ChromeProvider = ChromeContext.Provider;

export function useShellBack() {
  return useContext(ChromeContext).shellBack;
}
