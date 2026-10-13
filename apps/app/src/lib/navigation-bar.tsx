import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { NativeScrollEvent } from 'react-native';
import { usePathname } from 'expo-router';
import { navigationScroll, type NavigationScrollState } from './navigation-scroll';

type NavigationBarState = {
  collapsed: boolean;
  reveal: () => void;
  onScroll: (event: NativeScrollEvent) => void;
};

const NavigationBarContext = createContext<NavigationBarState | null>(null);

export function NavigationBarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsedPath, setCollapsedPath] = useState<string | null>(null);
  const scroll = useRef<{ pathname: string; state: NavigationScrollState } | null>(null);
  const reveal = useCallback(() => {
    scroll.current = null;
    setCollapsedPath(null);
  }, []);
  const onScroll = useCallback(
    (event: NativeScrollEvent) => {
      // You is always a full size independent control, with no main tab to minimize.
      if (pathname === '/you') return;
      const previous = scroll.current?.pathname === pathname ? scroll.current.state : null;
      const state = navigationScroll(
        previous,
        event.contentOffset.y,
        event.contentSize.height - event.layoutMeasurement.height,
      );
      scroll.current = { pathname, state };
      if (state.collapsed !== (previous?.collapsed ?? false))
        setCollapsedPath(state.collapsed ? pathname : null);
    },
    [pathname],
  );
  const value = useMemo(
    () => ({
      collapsed: collapsedPath === pathname,
      reveal,
      onScroll,
    }),
    [collapsedPath, pathname, reveal, onScroll],
  );
  return <NavigationBarContext value={value}>{children}</NavigationBarContext>;
}

export function useNavigationBar() {
  return useContext(NavigationBarContext);
}
