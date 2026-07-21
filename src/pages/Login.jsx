import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth, buildUserFromApi } from '../contexts/AuthContext';
import { apiLogin } from '../api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import SEO from '../components/SEO';
import '../styles/Login.css';

function todayLabel() {
  const s = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date()).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Login() {
  const [username, setUsername] = useState(() => localStorage.getItem('clm_saved_username') || '');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('clm_saved_username'));
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const navigate = useNavigate();
  const { login, user, checking } = useAuth();

  const containerRef = useRef(null);
  const totpRef = useRef(null);

  // Al pasar al paso 2, enfocar el código cuando termina el slide
  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => totpRef.current?.focus(), 420);
    return () => clearTimeout(t);
  }, [step]);

  // Mismo lenguaje de entrada que la landing (Inicio.jsx): fromTo cortos,
  // power3.out, sin scale pop, clearProps al terminar.
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiLogin({ username, password, remember });
      
      if (remember) {
        localStorage.setItem('clm_saved_username', username);
      } else {
        localStorage.removeItem('clm_saved_username');
      }

      // Login exitoso sin 2FA
      login(buildUserFromApi(data));
      navigate('/');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('2FA') || msg.includes('TOTP') || msg.includes('require_2fa')) {
        // Backend pide segundo factor
        setStep(2);
      } else {
        setError(msg || 'Credenciales incorrectas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpToken) {
      setError('Por favor ingresa el código 2FA.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiLogin({ username, password, otp_token: otpToken, remember });
      
      if (remember) {
        localStorage.setItem('clm_saved_username', username);
      } else {
        localStorage.removeItem('clm_saved_username');
      }

      login(buildUserFromApi(data));
      navigate('/');
    } catch (err) {
      setError(err.message || 'Código 2FA inválido.');
    } finally {
      setLoading(false);
    }
  };

  // Mientras se valida una posible sesión existente, no mostrar el form
  // (evita el flash). Si ya hay sesión válida, no tiene sentido loguearse
  // de nuevo — redirige directo a la app.
  if (checking) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-container" ref={containerRef}>
      <SEO title="Iniciar Sesión" description="Accede a tu cuenta de KyoCLM para gestionar tus contratos." />

      <div className="login-body">
        {/* Fondo SVG: mismo lenguaje que el hero de la landing (grid + paths + pulsos) */}
        <svg
          className="login-bg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="lg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeOpacity="0.045" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1440" height="900" fill="url(#lg-grid)" />
          <path className="lg-bg-draw" d="M -40 700 C 240 640, 420 760, 720 680 S 1220 560, 1490 640" fill="none" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="2" strokeDasharray="900" />
          <path className="lg-bg-dash" d="M -40 770 C 300 710, 520 810, 840 740 S 1260 650, 1490 710" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle className="lg-bg-pulse" cx="240" cy="140" r="3.5" fill="var(--primary)" fillOpacity="0.35" />
          <circle className="lg-bg-pulse d2" cx="1180" cy="180" r="3" fill="var(--success)" fillOpacity="0.4" />
          <circle className="lg-bg-pulse d3" cx="1330" cy="420" r="2.5" fill="var(--warning)" fillOpacity="0.35" />
        </svg>
        <div className="login-card">
          <div className="login-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>

          <div className="login-card-badge">
            <span className="login-ctx-dot" />
            Acceso Seguro
          </div>
          <h2>Bienvenido</h2>
          <p className="login-subtitle">
            {step === 1 ? 'Ingresa tus credenciales para acceder al sistema CLM.' : 'Ingresa el código de 6 dígitos de tu aplicación autenticadora.'}
          </p>

          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="form-slider">
            <div className={`slider-content ${step === 2 ? 'slide-left' : ''}`}>

              {/* Step 1 Form */}
              <form className="login-form step-1" onSubmit={handleLogin} inert={step === 2}>
                <div className="input-group">
                  <label htmlFor="username">Usuario</label>
                  <input
                    type="text"
                    id="username"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="password">Contraseña</label>
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                      onBlur={() => setCapsLock(false)}
                      autoComplete="current-password"
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
                  {capsLock && (
                    <div className="login-caps-hint">Bloq Mayús está activado.</div>
                  )}
                </div>

                <div className="login-row">
                  <label className="login-remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Recordarme</span>
                  </label>
                  <Link to="/recuperar" className="login-forgot">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Ingresar'}
                </button>
              </form>

              {/* Step 2 Form (TOTP) */}
              <form className="login-form step-2" onSubmit={handleTotp} inert={step !== 2}>
                <div className="login-user-chip">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {username}
                </div>
                <div className="input-group">
                  <label htmlFor="totp">Código de Autenticador</label>
                  <input
                    ref={totpRef}
                    type="text"
                    id="totp"
                    className="otp-input"
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Verificar Código'}
                </button>
                <button
                  type="button"
                  className="btn-back"
                  onClick={() => { setStep(1); setOtpToken(''); setError(''); }}
                >
                  Volver
                </button>
              </form>

            </div>
          </div>
        </div>

        <p className="login-footer">
          <span className="login-footer-dot" />
          CLM‑Kyo · v1.0.4 · © 2026
        </p>
      </div>
    </div>
  );
}
