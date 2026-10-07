"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useFormat } from '@/lib/useFormat';
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
  format: customFormat,
  className,
  duration = 0.9,
}: AnimatedNumberProps) {
  const { number } = useFormat();
  const format = useCallback((value: number) => customFormat ? customFormat(value) : number(Math.round(value)), [customFormat, number]);
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
  }, [value, reduce, duration, format, mv]);

  return (
    <span className={className}>
      {display}
    </span>
  );
}
