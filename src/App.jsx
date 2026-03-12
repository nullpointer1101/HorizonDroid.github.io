import React, { useEffect } from 'react';
import Home from './components/pages/Home.jsx';

/* Scroll-reveal: writes classes inside rAF to avoid INP warnings */
function useReveal() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const io = new IntersectionObserver(
        (entries) => {
          requestAnimationFrame(() => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('visible');
                io.unobserve(e.target);
              }
            });
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );
      document.querySelectorAll('.reveal:not(.visible)').forEach((el) => io.observe(el));
      return () => io.disconnect();
    });
    return () => cancelAnimationFrame(id);
  });
}

export default function App() {
  useReveal();
  return <Home />;
}
