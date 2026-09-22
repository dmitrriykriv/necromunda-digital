import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    function sync() {
      setOn(window.scrollY > 240);
      const footer = document.querySelector('footer');
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      let overlap = 0;
      if (footer && mobile) {
        overlap = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
      }
      document.documentElement.style.setProperty('--footer-overlap', `${overlap}px`);
    }
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty('--footer-overlap');
    };
  }, []);

  function goTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <button
      type="button"
      className={cn('to-top print:hidden', on && 'is-on')}
      aria-label="Наверх"
      aria-hidden={on ? undefined : true}
      tabIndex={on ? 0 : -1}
      onClick={goTop}
    >
      <svg className="to-top-arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 11l6-6 6 6"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 19l6-6 6 6"
        />
      </svg>
      <span className="to-top-label">Наверх</span>
    </button>
  );
}
