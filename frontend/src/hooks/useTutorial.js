import { useState, useCallback } from 'react';

export const useTutorial = (steps) => {
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const start = useCallback(() => {
    setCurrentIndex(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < steps.length - 1 ? i + 1 : i));
  }, [steps.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    setCurrentIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    active,
    currentStep: steps[currentIndex],
    currentIndex,
    total: steps.length,
    isFirst: currentIndex === 0,
    isLast: currentIndex === steps.length - 1,
    progress: ((currentIndex + 1) / steps.length) * 100,
    start,
    next,
    prev,
    finish,
  };
};
