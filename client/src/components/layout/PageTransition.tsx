import { useEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react';
import { useLocation, type Location } from 'react-router-dom';
import { Box } from '@mui/material';

const FADE_MS = 180;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sameLocation(a: Location, b: Location) {
  return a.pathname === b.pathname && a.search === b.search;
}

interface Props {
  children: (location: Location) => ReactNode;
}

export default function PageTransition({ children }: Props) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [visible, setVisible] = useState(true);
  const locationRef = useRef(location);
  const exitingRef = useRef(false);
  const enterFrameRef = useRef(0);
  locationRef.current = location;

  const reveal = () => {
    cancelAnimationFrame(enterFrameRef.current);
    enterFrameRef.current = requestAnimationFrame(() => {
      enterFrameRef.current = requestAnimationFrame(() => {
        setVisible(true);
      });
    });
  };

  const finishExit = () => {
    if (!exitingRef.current) return;
    exitingRef.current = false;
    setDisplayLocation(locationRef.current);
    reveal();
  };

  useEffect(() => {
    if (sameLocation(location, displayLocation)) return;

    if (prefersReducedMotion()) {
      exitingRef.current = false;
      setDisplayLocation(location);
      setVisible(true);
      return;
    }

    // Already fading out — keep old page mounted; finishExit reads locationRef.
    if (exitingRef.current) return;

    // Hidden between swap and fade-in — retarget without flashing.
    if (!visible) {
      setDisplayLocation(location);
      reveal();
      return;
    }

    exitingRef.current = true;
    setVisible(false);
  }, [location, displayLocation, visible]);

  useEffect(() => {
    if (visible || !exitingRef.current) return;
    const timer = window.setTimeout(finishExit, FADE_MS + 50);
    return () => window.clearTimeout(timer);
  }, [visible, displayLocation]);

  useEffect(() => () => cancelAnimationFrame(enterFrameRef.current), []);

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;
    finishExit();
  };

  return (
    <Box
      onTransitionEnd={onTransitionEnd}
      sx={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        willChange: 'opacity',
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      {children(displayLocation)}
    </Box>
  );
}
