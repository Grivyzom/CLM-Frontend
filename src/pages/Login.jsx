import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiLogin } from '../api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../styles/Login.css';

export default function Login() {
  const [username, setUsername] = useState(() => localStorage.getItem('clm_saved_username') || '');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('clm_saved_username'));
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from('.login-header > div > *', {
      y: -20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
    })
    .from('.login-header-date', {
      x: 20,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
    }, '<0.2')
    .from('.login-card', {
      y: 40,
      opacity: 0,
      scale: 0.95,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.4')
    .from('.login-card-icon, .login-card-badge, .login-card h2, .login-subtitle, .login-form > *', {
      y: 15,
      opacity: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power2.out',
      clearProps: 'all'
    }, '-=0.4');
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
      login({
        name: data.username || username,
        role: 'Administrador',
        initials: (data.username || username).substring(0, 2).toUpperCase(),
      });
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

      login({
        name: data.username || username,
        role: 'Administrador',
        initials: (data.username || username).substring(0, 2).toUpperCase(),
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Código 2FA inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" ref={containerRef}>
      <div className="login-header">
        <div>
          <p className="login-header-label">Enfoque Platform</p>
          <h1 className="login-header-title">Acceso</h1>
        </div>
        <span className="login-header-date">Vie 4 jul 2026</span>
      </div>

      <div className="login-body">
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

          {error && <div className="login-error">{error}</div>}

          <div className="form-slider">
            <div className={`slider-content ${step === 2 ? 'slide-left' : ''}`}>

              {/* Step 1 Form */}
              <form className="login-form step-1" onSubmit={handleLogin}>
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
                  <button
                    type="button"
                    className="login-forgot"
                    onClick={() => setShowForgotInfo((v) => !v)}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {showForgotInfo && (
                  <div className="login-forgot-info">
                    Contacta al administrador del sistema para restablecer tu contraseña.
                  </div>
                )}

                <button type="submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Ingresar'}
                </button>
              </form>

              {/* Step 2 Form (TOTP) */}
              <form className="login-form step-2" onSubmit={handleTotp}>
                <div className="input-group">
                  <label htmlFor="totp">Código de Autenticador</label>
                  <input
                    type="text"
                    id="totp"
                    placeholder="123456"
                    maxLength={6}
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
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
      </div>
    </div>
  );
}
