"use client";

import React, { useEffect, useState } from 'react';
import {
  animate,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Formatter for the displayed value; defaults to locale integer. */
  format?: (n: number) => string;
  className?: string;
  /** Spring-ish tween duration in seconds. */
  duration?: number;
}

/**
 * Counts up to `value` on mount and whenever `value` changes. Respects
 * prefers-reduced-motion by rendering the final value immediately.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  duration = 0.9,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    if (reduce) {
      setDisplay(format(value));
      return;
    }
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo-ish
      onUpdate: (v) => setDisplay(format(v)),
    });
    return controls.stop;
  }, [value, reduce, duration]);

  return (
    <span className={className} suppressHydrationWarning>
      {display}
    </span>
  );
}
