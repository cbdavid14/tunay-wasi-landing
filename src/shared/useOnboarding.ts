import { useState } from 'react';

export type OnboardingFase = 'modal' | 'tour' | 'done';

export function useOnboarding(rol: string, uid: string) {
  const key = `tw_tour_${rol}_${uid}`;
  const [fase, setFase] = useState<OnboardingFase>(() =>
    localStorage.getItem(key) ? 'done' : 'modal'
  );

  function iniciarTour() {
    setFase('tour');
  }

  function completar() {
    localStorage.setItem(key, '1');
    setFase('done');
  }

  return { fase, iniciarTour, completar };
}
