import React, { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiPasswordReset, apiPasswordResetConfirm } from '../api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../styles/Login.css';

function todayLabel() {
  const s = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date()).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Recuperar() {
  // Con uid+token en la URL (enlace del correo) la vista pasa a modo "confirmar"
  const { uid, token } = useParams();
  const confirmMode = Boolean(uid && token);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.login-header > div > *',
      { y: -10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, clearProps: 'transform,opacity' })
      .fromTo('.login-header-date',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, clearProps: 'opacity' }, '<0.1')
      .fromTo('.login-card',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, clearProps: 'transform,opacity' }, '-=0.25')
      .fromTo('.login-card-icon, .login-card-badge, .login-card h2, .login-subtitle, .login-form > *',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.045, clearProps: 'all' }, '-=0.35')
      .fromTo('.login-footer',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, clearProps: 'opacity' }, '-=0.2');
  }, { scope: containerRef });

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiPasswordReset({ identifier });
      setDone(data.success);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPasswordResetConfirm({ uid, token, password });
      setDone(data.success);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" ref={containerRef}>


      <div className="login-body">
        {/* Fondo SVG: mismo lenguaje que el hero de la landing (grid + paths + pulsos) */}
        <svg
          className="login-bg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="rc-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeOpacity="0.045" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1440" height="900" fill="url(#rc-grid)" />
          <path className="lg-bg-draw" d="M -40 700 C 240 640, 420 760, 720 680 S 1220 560, 1490 640" fill="none" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="2" strokeDasharray="900" />
          <path className="lg-bg-dash" d="M -40 770 C 300 710, 520 810, 840 740 S 1260 650, 1490 710" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle className="lg-bg-pulse" cx="240" cy="140" r="3.5" fill="var(--primary)" fillOpacity="0.35" />
          <circle className="lg-bg-pulse d2" cx="1180" cy="180" r="3" fill="var(--success)" fillOpacity="0.4" />
          <circle className="lg-bg-pulse d3" cx="1330" cy="420" r="2.5" fill="var(--warning)" fillOpacity="0.35" />
        </svg>

        <div className="login-card">
          <div className="login-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>

          <div className="login-card-badge">
            <span className="login-ctx-dot" />
            Recuperar Acceso
          </div>

          {done ? (
            <>
              <h2>Listo</h2>
              <p className="login-subtitle">{done}</p>
              <Link to="/login" className="login-back-link">← Volver a iniciar sesión</Link>
            </>
          ) : confirmMode ? (
            <>
              <h2>Nueva contraseña</h2>
              <p className="login-subtitle">
                Define la nueva contraseña para tu cuenta.
              </p>

              {error && <div className="login-error" role="alert">{error}</div>}

              <form className="login-form" onSubmit={handleConfirm}>
                <div className="input-group">
                  <label htmlFor="new-password">Nueva contraseña</label>
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.6 19.6 0 0 1 4.22-5.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a19.6 19.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="new-password-2">Repetir contraseña</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="new-password-2"
                    placeholder="••••••••"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Guardar contraseña'}
                </button>
              </form>

              <Link to="/login" className="login-back-link">← Volver a iniciar sesión</Link>
            </>
          ) : (
            <>
              <h2>¿Olvidaste tu contraseña?</h2>
              <p className="login-subtitle">
                Ingresa tu usuario o correo y te enviaremos un enlace de restablecimiento al correo asociado a tu cuenta.
              </p>

              {error && <div className="login-error" role="alert">{error}</div>}

              <form className="login-form" onSubmit={handleRequest}>
                <div className="input-group">
                  <label htmlFor="reset-identifier">Usuario o correo</label>
                  <input
                    type="text"
                    id="reset-identifier"
                    placeholder="admin o tu@correo.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Enviar enlace'}
                </button>
              </form>

              <Link to="/login" className="login-back-link">← Volver a iniciar sesión</Link>
            </>
          )}
        </div>

        <p className="login-footer">
          <span className="login-footer-dot" />
          CLM‑Kyo · v1.0.4 · © 2026
        </p>
      </div>
    </div>
  );
}
