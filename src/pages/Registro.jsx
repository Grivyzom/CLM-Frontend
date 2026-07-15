import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRegisterCliente } from '../api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../styles/Login.css'; // Reusing Login styles for consistency

export default function Registro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checking } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    // Extract email from query params
    const query = new URLSearchParams(location.search);
    const emailParam = query.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiRegisterCliente({ email, password });
      setSuccess(data.success || 'Cuenta registrada exitosamente. Serás redirigido al inicio de sesión.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-container" ref={containerRef}>
      <div className="login-header">
        <div>
          <p className="login-header-label">Enfoque Platform</p>
          <h1 className="login-header-title">Activación</h1>
        </div>
      </div>

      <div className="login-body">
        <div className="login-card">
          <div className="login-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>

          <div className="login-card-badge">
            <span className="login-ctx-dot" style={{ background: '#4c7df5', boxShadow: '0 0 8px #4c7df5' }} />
            Crear Usuario
          </div>
          <h2>Activa tu cuenta</h2>
          <p className="login-subtitle">
            Crea una contraseña segura para acceder a KYO-CLM.
          </p>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-error" style={{ background: 'rgba(40,167,69,0.1)', color: '#28a745', border: '1px solid rgba(40,167,69,0.2)' }}>{success}</div>}

          <div className="form-slider">
            <div className="slider-content">
              <form className="login-form step-1" onSubmit={handleRegister}>
                <div className="input-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="tucorreo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!new URLSearchParams(location.search).get('email')}
                    style={new URLSearchParams(location.search).get('email') ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="password">Nueva Contraseña</label>
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" disabled={loading || success}>
                  {loading ? <span className="spinner"></span> : 'Activar mi cuenta'}
                </button>
                
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button type="button" className="login-forgot" onClick={() => navigate('/login')}>
                    Volver a iniciar sesión
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
