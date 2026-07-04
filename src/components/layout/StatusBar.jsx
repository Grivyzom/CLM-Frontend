import React, { useState, useEffect } from 'react';
import './StatusBar.css';

export default function StatusBar({ scrollContainerRef }) {
  const [time, setTime] = useState('');
  const [latency, setLatency] = useState(42);
  const [showTopBtn, setShowTopBtn] = useState(false);

  // Reloj en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}`);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Latencia simulada
  useEffect(() => {
    const updateLatency = () => {
      let lat = Math.max(12, 38 + Math.round((Math.random() - 0.5) * 40));
      if (Math.random() < 0.08) { 
        lat = 180 + Math.round(Math.random() * 120); 
      }
      setLatency(lat);
    };

    updateLatency();
    const timer = setInterval(updateLatency, 2200);
    return () => clearInterval(timer);
  }, []);

  // Scroll listener for top button
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const handleScroll = () => {
      setShowTopBtn(container.scrollTop > 120);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  const scrollToTop = () => {
    scrollContainerRef?.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getLatencyClass = (lat) => {
    if (lat > 200) return 'lat-bad';
    if (lat > 100) return 'lat-warn';
    return 'lat-good';
  };

  return (
    <>
      <div className="status-bar">
        {/* Izquierda: telemetría DB */}
        <div className="status-section">
          <div className="status-item">
            <div className="led led-green"></div>
            <span className="status-label">DB</span>
            <span className="status-val">Operativo</span>
          </div>
          <div className="status-item">
            <span className="status-label">Latencia</span>
            <span className={`status-val ${getLatencyClass(latency)}`}>{latency} ms</span>
          </div>
          <div className="status-item">
            <span className="status-label">Pool</span>
            <span className="status-val">8/20 (40%)</span>
          </div>
        </div>

        {/* Centro: contexto operativo */}
        <div className="status-section" style={{ borderLeft: '1px solid #d8d4cc' }}>
          <div className="status-item">
            <span className="status-label">TZ</span>
            <span className="status-val">UTC-4</span>
          </div>
          <div className="status-item">
            <span className="status-label">IP Sesión</span>
            <span className="status-val">192.168.1.47</span>
          </div>
          <div className="status-item" style={{ borderRight: 'none' }}>
            <span className="status-label">Hora</span>
            <span className="status-val">{time}</span>
          </div>
        </div>

        {/* Derecha: versión y entorno */}
        <div className="status-section status-section-right" style={{ borderLeft: '1px solid #d8d4cc' }}>
          <div className="status-item">
            <span className="status-label">Build</span>
            <span className="status-val">v1.0.4-prod</span>
          </div>
          <div className="status-item" style={{ borderRight: 'none' }}>
            <span className="env-chip env-prod">prod</span>
          </div>
        </div>
      </div>

      {/* Botón flotante volver arriba */}
      <button 
        className="top-btn" 
        onClick={scrollToTop}
        style={{ 
          opacity: showTopBtn ? 1 : 0, 
          pointerEvents: showTopBtn ? 'all' : 'none' 
        }} 
        title="Volver al inicio"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6"></path>
        </svg>
      </button>
    </>
  );
}
