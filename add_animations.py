import re

jsx_path = "/grivyzom/webs/CLM/clm_frontend/src/pages/GsapDemo.jsx"
css_path = "/grivyzom/webs/CLM/clm_frontend/src/pages/GsapDemo.css"

with open(jsx_path, "r") as f:
    jsx = f.read()

with open(css_path, "r") as f:
    css = f.read()

# 1. Add Refs
refs_code = """
  // Senior Product Design Refs
  const blurTextRef = useRef();
  const horizontalScrollRef = useRef();
  const morphContainerRef = useRef();
  const marqueeRef = useRef();
  const spotlightContainerRef = useRef();
  const spotlightRef = useRef();
  const readProgressRef = useRef();
  const stackContainerRef = useRef();
  const underlineRef = useRef();
  const gradientMeshRef = useRef();
"""
jsx = jsx.replace("const tl = useRef();", refs_code + "\n  const tl = useRef();")

# 2. Add Hooks
hooks_code = """
  // 14. Blur Fade
  useGSAP(() => {
    gsap.fromTo(blurTextRef.current,
      { filter: 'blur(12px)', opacity: 0, y: 30 },
      {
        filter: 'blur(0px)', opacity: 1, y: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: blurTextRef.current,
          start: 'top 85%',
        }
      }
    );
  }, { scope: container });

  // 15. Horizontal Scroll
  useGSAP(() => {
    const panels = gsap.utils.toArray('.horiz-panel', horizontalScrollRef.current);
    gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: horizontalScrollRef.current,
        start: "top 90%",
        end: "bottom 10%",
        scrub: 1,
      }
    });
  }, { scope: container });

  // 16. Dynamic Island Morph
  const toggleMorph = contextSafe((e) => {
    const isExpanded = morphContainerRef.current.classList.contains('expanded');
    if (isExpanded) {
      gsap.to(morphContainerRef.current, { width: 120, height: 40, borderRadius: 20, duration: 0.5, ease: 'back.inOut(1.2)' });
      gsap.to('.morph-content', { opacity: 0, scale: 0.9, duration: 0.2 });
      gsap.to('.morph-pill-content', { opacity: 1, duration: 0.2, delay: 0.3 });
      morphContainerRef.current.classList.remove('expanded');
    } else {
      gsap.to(morphContainerRef.current, { width: 280, height: 160, borderRadius: 24, duration: 0.5, ease: 'back.inOut(1.2)' });
      gsap.to('.morph-pill-content', { opacity: 0, duration: 0.2 });
      gsap.to('.morph-content', { opacity: 1, scale: 1, duration: 0.3, delay: 0.3 });
      morphContainerRef.current.classList.add('expanded');
    }
  });

  // 17. Infinite Marquee
  useGSAP(() => {
    gsap.to('.marquee-inner', {
      xPercent: -50,
      ease: 'none',
      duration: 12,
      repeat: -1
    });
  }, { scope: container });

  // 18. Spotlight Glow
  const handleSpotlight = contextSafe((e) => {
    const rect = spotlightContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    gsap.to(spotlightRef.current, {
      x: x - 100,
      y: y - 100,
      duration: 0.6,
      ease: 'power3.out'
    });
  });

  const handleSpotlightLeave = contextSafe(() => {
    gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3 });
  });
  const handleSpotlightEnter = contextSafe(() => {
    gsap.to(spotlightRef.current, { opacity: 1, duration: 0.3 });
  });

  // 19. Smooth Accordion
  const toggleAccordion = contextSafe((e) => {
    const content = e.currentTarget.nextElementSibling;
    const icon = e.currentTarget.querySelector('.acc-icon');
    if (content.style.height === '0px' || !content.style.height) {
      gsap.to(content, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power4.out' });
      gsap.to(icon, { rotation: 180, duration: 0.4, ease: 'power3.out' });
    } else {
      gsap.to(content, { height: 0, opacity: 0, duration: 0.4, ease: 'power3.inOut' });
      gsap.to(icon, { rotation: 0, duration: 0.4, ease: 'power3.inOut' });
    }
  });

  // 20. Reading Progress
  useGSAP(() => {
    const words = gsap.utils.toArray('.read-word', readProgressRef.current);
    gsap.fromTo(words, 
      { opacity: 0.2, color: 'var(--text-muted)' },
      {
        opacity: 1,
        color: 'var(--text-heading)',
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: {
          trigger: readProgressRef.current,
          start: 'top 80%',
          end: 'bottom 40%',
          scrub: 0.5
        }
      }
    );
  }, { scope: container });

  // 21. Card Stacking
  useGSAP(() => {
    const cards = gsap.utils.toArray('.stack-card', stackContainerRef.current);
    cards.forEach((card, i) => {
      if(i === 0) return;
      gsap.fromTo(card,
        { y: 60, opacity: 0, scale: 0.9 },
        {
          y: i * -15,
          opacity: 1,
          scale: 1 - (i * 0.05),
          scrollTrigger: {
            trigger: stackContainerRef.current,
            start: `top ${80 - i*10}%`,
            end: `bottom ${60 - i*10}%`,
            scrub: 1
          }
        }
      );
    });
  }, { scope: container });

  // 22. Magnetic Underline
  const handleLinkHover = contextSafe(() => {
    gsap.to(underlineRef.current, { scaleX: 1, transformOrigin: 'left center', duration: 0.4, ease: 'power3.out' });
  });
  const handleLinkLeave = contextSafe(() => {
    gsap.to(underlineRef.current, { scaleX: 0, transformOrigin: 'right center', duration: 0.4, ease: 'power3.out' });
  });

  // 23. Gradient Mesh
  useGSAP(() => {
    gsap.to(gradientMeshRef.current, {
      backgroundPosition: '200% center',
      ease: 'none',
      duration: 10,
      repeat: -1
    });
  }, { scope: container });
"""
jsx = jsx.replace("  return (", hooks_code + "\n  return (")

# 3. Add Cards
cards_code = """
          {/* Card 14: Blur Fade */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">filter: blur()</span>
              <h3>14. Apple-style Blur Reveal</h3>
              <p>El texto aparece gradualmente desenfocándose a medida que haces scroll.</p>
            </div>
            <div className="gsap-playground-area flex-center">
              <h2 ref={blurTextRef} className="blur-text-demo">Premium Experience</h2>
            </div>
          </div>

          {/* Card 15: Horizontal Scroll */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">xPercent + scrub</span>
              <h3>15. Mini Scroll Horizontal</h3>
              <p>El contenido se desliza lateralmente en respuesta a tu scroll vertical.</p>
            </div>
            <div className="gsap-playground-area" style={{ padding: 0, overflow: 'hidden' }}>
              <div ref={horizontalScrollRef} className="horiz-container">
                <div className="horiz-panel" style={{background: 'var(--primary-bg)'}}>Panel 1</div>
                <div className="horiz-panel" style={{background: 'var(--rose-bg)'}}>Panel 2</div>
                <div className="horiz-panel" style={{background: 'var(--success-bg)'}}>Panel 3</div>
              </div>
            </div>
          </div>

          {/* Card 16: Dynamic Island Morph */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">Layout Animado</span>
              <h3>16. Dynamic Island (Morph)</h3>
              <p>Transformación de forma fluida (width, height, radius) al hacer clic.</p>
            </div>
            <div className="gsap-playground-area flex-center">
              <div ref={morphContainerRef} className="morph-island" onClick={toggleMorph}>
                <span className="morph-pill-content">Notificación</span>
                <div className="morph-content">
                  <div className="morph-avatar"></div>
                  <div className="morph-text">
                    <strong>Nuevo mensaje</strong>
                    <span>GSAP es increíble</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 17: Infinite Marquee */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">repeat: -1 + xPercent</span>
              <h3>17. Ticker Infinito (Marquee)</h3>
              <p>Desplazamiento de texto continuo perfecto (seamless loop).</p>
            </div>
            <div className="gsap-playground-area flex-center" style={{ overflow: 'hidden' }}>
              <div className="marquee-container">
                <div className="marquee-inner">
                  <span>MODERNO • FLUIDO • PREMIUM • MODERNO • FLUIDO • PREMIUM • </span>
                  <span>MODERNO • FLUIDO • PREMIUM • MODERNO • FLUIDO • PREMIUM • </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 18: Spotlight Glassmorphism */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">Mouse Tracking</span>
              <h3>18. Glassmorphism Spotlight</h3>
              <p>Una luz suave persigue el cursor por detrás de un cristal translúcido.</p>
            </div>
            <div 
              ref={spotlightContainerRef} 
              className="gsap-playground-area flex-center spotlight-area"
              onMouseMove={handleSpotlight}
              onMouseEnter={handleSpotlightEnter}
              onMouseLeave={handleSpotlightLeave}
            >
              <div ref={spotlightRef} className="spotlight-glow"></div>
              <div className="spotlight-glass">Pasa el cursor</div>
            </div>
          </div>

          {/* Card 19: Smooth Accordion */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">height: auto</span>
              <h3>19. Acordeón Natural</h3>
              <p>GSAP puede animar hacia `height: auto` perfectamente, algo imposible en CSS puro.</p>
            </div>
            <div className="gsap-playground-area">
              <div className="acc-container">
                <div className="acc-header" onClick={toggleAccordion}>
                  <span>Ver detalles avanzados</span>
                  <span className="acc-icon">▼</span>
                </div>
                <div className="acc-content" style={{ height: 0, opacity: 0 }}>
                  <div className="acc-inner">
                    La animación hacia height "auto" permite que el contenido sea dinámico y responsivo sin romper la transición.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 20: Reading Progress */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">Stagger Scrub</span>
              <h3>20. Progreso de Lectura</h3>
              <p>Las palabras se iluminan gradualmente sincronizadas con tu posición de scroll.</p>
            </div>
            <div className="gsap-playground-area flex-center">
              <p ref={readProgressRef} className="read-paragraph">
                {("El diseño fluido mejora la experiencia del usuario y aporta valor real a los productos digitales modernos.").split(" ").map((word, i) => (
                  <span key={i} className="read-word">{word} </span>
                ))}
              </p>
            </div>
          </div>

          {/* Card 21: Deck Stacking */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">Parallax Stacking</span>
              <h3>21. Apilamiento de Tarjetas</h3>
              <p>Las tarjetas se amontonan unas sobre otras creando un efecto de profundidad tridimensional.</p>
            </div>
            <div className="gsap-playground-area flex-center">
              <div ref={stackContainerRef} className="stack-container">
                <div className="stack-card card-a">Diseño</div>
                <div className="stack-card card-b">Interacción</div>
                <div className="stack-card card-c">Magia</div>
              </div>
            </div>
          </div>

          {/* Card 22: Magnetic Underline */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">Transform Origin</span>
              <h3>22. Underline Direccional</h3>
              <p>La línea aparece de izquierda a derecha y desaparece de izquierda a derecha (efecto Apple).</p>
            </div>
            <div className="gsap-playground-area flex-center">
              <span 
                className="magic-link"
                onMouseEnter={handleLinkHover}
                onMouseLeave={handleLinkLeave}
              >
                Hover Me
                <div ref={underlineRef} className="magic-underline"></div>
              </span>
            </div>
          </div>

          {/* Card 23: Gradient Mesh */}
          <div className="glass-panel gsap-card">
            <div className="gsap-card-header">
              <span className="gsap-card-tag">Background Position</span>
              <h3>23. Malla Degradada Fluida</h3>
              <p>Un fondo de gradiente en constante movimiento que aplica un clip al texto para texturizarlo.</p>
            </div>
            <div className="gsap-playground-area flex-center">
              <h2 ref={gradientMeshRef} className="gradient-mesh-text">
                VANGUARDIA
              </h2>
            </div>
          </div>
"""
jsx = jsx.replace("        </div>\n      </div>\n    </div>\n  );\n}", cards_code + "\n        </div>\n      </div>\n    </div>\n  );\n}")

with open(jsx_path, "w") as f:
    f.write(jsx)

# 4. Add CSS
new_css = """
/* Senior Product Design Styles */

/* 14. Blur */
.blur-text-demo {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-heading);
}

/* 15. Horiz Scroll */
.horiz-container {
  display: flex;
  width: 300%;
  height: 100%;
}
.horiz-panel {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-on-accent);
}

/* 16. Morph */
.morph-island {
  width: 120px;
  height: 40px;
  background: var(--text-heading);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
.morph-pill-content {
  color: var(--surface);
  font-size: 0.75rem;
  font-weight: 600;
}
.morph-content {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  opacity: 0;
  transform: scale(0.9);
  pointer-events: none;
}
.morph-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--violet-bright));
}
.morph-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--surface);
}
.morph-text strong { font-size: 1rem; }
.morph-text span { font-size: 0.75rem; opacity: 0.8; }

/* 17. Marquee */
.marquee-container {
  width: 100%;
  white-space: nowrap;
}
.marquee-inner {
  display: inline-block;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  color: var(--border-strong);
}

/* 18. Spotlight */
.spotlight-area {
  position: relative;
  overflow: hidden;
  background: var(--bg-page);
}
.spotlight-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--primary-soft) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}
.spotlight-glass {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 1rem 2rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255,255,255,0.4);
  font-weight: 600;
  color: var(--text-heading);
}

/* 19. Accordion */
.acc-container {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.acc-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  font-weight: 600;
  background: var(--bg-inset);
}
.acc-content {
  overflow: hidden;
}
.acc-inner {
  padding: 1rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

/* 20. Read Progress */
.read-paragraph {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
}
.read-word {
  display: inline-block;
}

/* 21. Stack */
.stack-container {
  position: relative;
  width: 180px;
  height: 100px;
}
.stack-card {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
}
.card-a { background: var(--primary); z-index: 1; }
.card-b { background: var(--violet-bright); z-index: 2; }
.card-c { background: var(--rose); z-index: 3; }

/* 22. Magnetic Underline */
.magic-link {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading);
  position: relative;
  cursor: pointer;
  display: inline-block;
  padding-bottom: 4px;
}
.magic-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--primary);
  transform: scaleX(0);
}

/* 23. Gradient Mesh */
.gradient-mesh-text {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  background: linear-gradient(to right, var(--primary), var(--rose), var(--warning-bright), var(--primary));
  background-size: 200% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
}
"""
with open(css_path, "a") as f:
    f.write(new_css)

print("Done")
