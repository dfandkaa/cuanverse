'use client';

import { useEffect, useState } from 'react';

export function useCountUp(targetValue: number, duration: number = 1000) {
  const [count, setCount] = useState(targetValue);

  useEffect(() => {
    let start = count;
    const end = targetValue;
    if (start === end) return;

    const totalFrames = Math.max(Math.floor(duration / 16), 1);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const current = Math.floor(start + (end - start) * progress);
      setCount(current);

      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [targetValue, duration]);

  return count;
}