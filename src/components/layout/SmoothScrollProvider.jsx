import React, { useEffect, useRef } from 'react';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScrollProvider({ children }) {
  const lenisRef = useRef();

  useEffect(() => {
    function update(time) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis root ref={lenisRef} autoRaf={false} options={{ 
      lerp: 0.15,          // Más alto = más rápido/responsivo (antes 0.1)
      wheelMultiplier: 1.2 // Multiplicador de rueda (antes 1)
    }}>
      {children}
    </ReactLenis>
  );
}
