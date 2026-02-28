import { useEffect, useRef } from 'react';

/**
 * Observes an element and adds the `is-visible` class when it enters the
 * viewport. Pair with the `.reveal-up` CSS class for scroll-reveal animations.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          ob.disconnect();
        }
      },
      { threshold: 0.07, rootMargin: '0px 0px -48px 0px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return ref;
}
