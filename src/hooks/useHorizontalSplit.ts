import { useEffect, useRef, useState } from 'react';

type Options = {
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function useHorizontalSplit({
  initialRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
}: Options = {}) {
  const [splitRatio, setSplitRatio] = useState(() =>
    clamp(initialRatio, minRatio, maxRatio)
  );
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const nextWidth = event.clientX - rect.left;
      const ratio = clamp(nextWidth / rect.width, minRatio, maxRatio);
      setSplitRatio(ratio);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, maxRatio, minRatio]);

  const startDragging = () => setIsDragging(true);

  return {
    containerRef,
    splitRatio,
    leftWidth: `${splitRatio * 100}%`,
    rightWidth: `${(1 - splitRatio) * 100}%`,
    isDragging,
    startDragging,
  };
}

