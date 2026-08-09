import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Tabs, type TabsProps } from '@mui/material';

const FADE_PX = 28;

function maskForEdges(left: boolean, right: boolean): string | undefined {
  if (left && right) {
    return `linear-gradient(to right, transparent, #000 ${FADE_PX}px, #000 calc(100% - ${FADE_PX}px), transparent)`;
  }
  if (left) {
    return `linear-gradient(to right, transparent, #000 ${FADE_PX}px, #000)`;
  }
  if (right) {
    return `linear-gradient(to right, #000, #000 calc(100% - ${FADE_PX}px), transparent)`;
  }
  return undefined;
}

/** Scrollable MUI Tabs without chevrons; edge fade when more tabs exist off-screen. */
export function ScrollableFadeTabs({ children, sx, ...props }: TabsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scroller = root.querySelector('.MuiTabs-scroller') as HTMLElement | null;
    if (!scroller) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      setFadeLeft(scrollLeft > 1);
      setFadeRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    update();
    scroller.addEventListener('scroll', update, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(scroller);
    const list = scroller.querySelector('.MuiTabs-flexContainer');
    if (list) ro.observe(list);

    return () => {
      scroller.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [children]);

  const maskImage = maskForEdges(fadeLeft, fadeRight);

  return (
    <Tabs
      ref={rootRef}
      variant="scrollable"
      scrollButtons={false}
      {...props}
      sx={{
        maxWidth: '100%',
        minWidth: 0,
        width: '100%',
        '& .MuiTabs-scroller': {
          maskImage,
          WebkitMaskImage: maskImage,
        },
        ...sx,
      }}
    >
      {children as ReactElement[]}
    </Tabs>
  );
}
