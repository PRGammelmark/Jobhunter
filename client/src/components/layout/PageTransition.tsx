import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from 'react';
import { useLocation, type Location } from 'react-router-dom';

export const PAGE_FADE_MS = 180;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sameLocation(a: Location, b: Location) {
  return a.pathname === b.pathname && a.search === b.search;
}

type PageTransitionContextValue = {
  displayLocation: Location;
  visible: boolean;
  fadeMs: number;
  style: CSSProperties;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function usePageTransition() {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) throw new Error('usePageTransition must be used within PageTransitionProvider');
  return ctx;
}

/** Optional: returns null outside provider (e.g. login). */
export function usePageTransitionStyle(): CSSProperties | undefined {
  const ctx = useContext(PageTransitionContext);
  return ctx?.style;
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [visible, setVisible] = useState(true);
  const locationRef = useRef(location);
  const exitingRef = useRef(false);
  const enterFrameRef = useRef(0);
  locationRef.current = location;

  const reveal = useCallback(() => {
    cancelAnimationFrame(enterFrameRef.current);
    enterFrameRef.current = requestAnimationFrame(() => {
      enterFrameRef.current = requestAnimationFrame(() => {
        setVisible(true);
      });
    });
  }, []);

  const finishExit = useCallback(() => {
    if (!exitingRef.current) return;
    exitingRef.current = false;
    setDisplayLocation(locationRef.current);
    reveal();
  }, [reveal]);

  useEffect(() => {
    if (sameLocation(location, displayLocation)) return;

    if (prefersReducedMotion()) {
      exitingRef.current = false;
      setDisplayLocation(location);
      setVisible(true);
      return;
    }

    if (exitingRef.current) return;

    if (!visible) {
      setDisplayLocation(location);
      reveal();
      return;
    }

    exitingRef.current = true;
    setVisible(false);
  }, [location, displayLocation, visible, reveal]);

  useEffect(() => {
    if (visible || !exitingRef.current) return;
    const timer = window.setTimeout(finishExit, PAGE_FADE_MS + 50);
    return () => window.clearTimeout(timer);
  }, [visible, displayLocation, finishExit]);

  useEffect(() => () => cancelAnimationFrame(enterFrameRef.current), []);

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;
      finishExit();
    },
    [finishExit]
  );

  const style = useMemo<CSSProperties>(
    () => ({
      opacity: visible ? 1 : 0,
      transition: `opacity ${PAGE_FADE_MS}ms ease`,
      willChange: 'opacity',
    }),
    [visible]
  );

  const value = useMemo(
    () => ({
      displayLocation,
      visible,
      fadeMs: PAGE_FADE_MS,
      style,
      onTransitionEnd,
    }),
    [displayLocation, visible, style, onTransitionEnd]
  );

  return (
    <PageTransitionContext.Provider value={value}>{children}</PageTransitionContext.Provider>
  );
}

interface ContentProps {
  children: (location: Location) => ReactNode;
}

export default function PageTransition({ children }: ContentProps) {
  const { displayLocation, style, onTransitionEnd } = usePageTransition();

  return (
    <div
      onTransitionEnd={onTransitionEnd}
      className="motion-reduce:transition-none"
      style={style}
    >
      {children(displayLocation)}
    </div>
  );
}
