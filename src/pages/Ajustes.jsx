import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiLogout } from '../api';
import TopbarActions from '../components/layout/TopbarActions';
import './Ajustes.css';
import InfoTooltip from '../components/ui/InfoTooltip';
import SEO from '../components/SEO';

const Icon = ({ d, color = 'currentColor', w = 16 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'] },
  { id: 'seguridad', label: 'Seguridad', icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'] },
  { id: 'preferencias', label: 'Preferencias', icon: ['M4 6h16M7 12h10M10 18h4'] },
  { id: 'notificaciones', label: 'Notificaciones', icon: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'] },
];

export default function Ajustes() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState('perfil');

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  // Nuevas funcionalidades de notificaciones
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [marketingNotif, setMarketingNotif] = useState(true);

  const [sidebarCollapsedDefault, setSidebarCollapsedDefault] = useState(() => {
    const saved = localStorage.getItem('clm_sidebar_preference');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSaved(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('Completa todos los campos.');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Las contraseñas no coinciden.');
      return;
    }

    setPwdSaved(true);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setTimeout(() => setPwdSaved(false), 2500);
  };

  const handleToggleSidebarDefault = () => {
    const next = !sidebarCollapsedDefault;
    setSidebarCollapsedDefault(next);
    localStorage.setItem('clm_sidebar_preference', JSON.stringify(next));
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (_) {
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="ajustes-container fade-in">
      <SEO title="Ajustes | KyoCLM" description="Configuraciones generales y perfil de usuario." />
      <div className="ajustes-header glass-panel">
        <div className="ajustes-header-left">
          <div className="ajustes-header-icon-wrap">
            <Icon d="M4 6h16M7 12h10M10 18h4" color="var(--primary)" w={24} />
          </div>
          <div>
            <p className="ajustes-header-label">Centro de Control</p>
            <h1 className="ajustes-header-title">Ajustes Generales</h1>
          </div>
        </div>
        <div className="topbar-right-group">
          <span className="ajustes-header-date">{new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <TopbarActions />
        </div>
      </div>

      <div className="ajustes-layout">
        <div className="ajustes-sidebar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`ajustes-tab ${tab === t.id ? 'active' : ''}`}
            >
              <div className="ajustes-tab-icon">
                <Icon d={t.icon} color={tab === t.id ? 'var(--primary)' : 'var(--text-muted)'} w={18} />
              </div>
              <span>{t.label}</span>
              {tab === t.id && <div className="ajustes-tab-indicator" />}
            </button>
          ))}
        </div>

        <div className="ajustes-content">
          {tab === 'perfil' && (
            <div className="ajustes-panel fade-in">
              <div className="ajustes-profile-head glass-panel">
                <div className="ajustes-avatar-wrap">
                  <div className="ajustes-avatar">{user?.initials || 'US'}</div>
                  <button className="ajustes-avatar-edit" title="Cambiar imagen">
                    <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" w={14} color="#fff" />
                  </button>
                </div>
                <div className="ajustes-profile-info">
                  <p className="ajustes-profile-name">{user?.name || 'Usuario'}</p>
                  <p className="ajustes-profile-role">{user?.role || 'Sin rol asignado'}</p>
                  <div className="ajustes-profile-badges">
                    <span className="ajustes-badge">Cuenta Activa</span>
                  </div>
                </div>
              </div>

              <form className="ajustes-form glass-panel" onSubmit={handleSaveProfile}>
                <div className="ajustes-card-header">
                  <h3>Información Personal</h3>
                  <p className="ajustes-card-desc">Actualiza tu nombre y correo electrónico.</p>
                </div>
                {profileSaved && <div className="ajustes-success fade-in">Cambios guardados correctamente.</div>}
                <div className="ajustes-form-grid">
                  <div className="ajustes-field">
                    <label htmlFor="name">Nombre completo</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="ajustes-field">
                    <label htmlFor="email">Correo electrónico</label>
                    <input id="email" type="email" placeholder="usuario@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="ajustes-field">
                    <label htmlFor="role">Rol en el sistema</label>
                    <input id="role" type="text" value={user?.role || ''} disabled />
                  </div>
                </div>
                <div className="ajustes-form-actions">
                  <button type="submit" className="ajustes-btn-primary">Guardar cambios</button>
                </div>
              </form>
            </div>
          )}

          {tab === 'seguridad' && (
            <div className="ajustes-panel fade-in">
              <div className="ajustes-card glass-panel">
                <div className="ajustes-card-header flex-row">
                  <div>
                    <h3>Autenticación de dos factores (2FA)
                      <InfoTooltip 
                        variant="info" 
                        position="right" 
                        content="La autenticación de dos factores (2FA) añade una capa adicional de seguridad al requerir un código dinámico."
                      />
                    </h3>
                    <p className="ajustes-card-desc">
                      Protege tu cuenta exigiendo un código temporal al iniciar sesión.
                    </p>
                  </div>
                  <span className="ajustes-badge-off">Desactivado</span>
                </div>
                <button className="ajustes-btn-secondary mt-10">Configurar 2FA</button>
              </div>

              <form className="ajustes-card glass-panel" onSubmit={handleChangePassword}>
                <div className="ajustes-card-header">
                  <h3>Cambiar contraseña</h3>
                  <p className="ajustes-card-desc">Asegúrate de usar una contraseña larga y compleja.</p>
                </div>
                {pwdError && <div className="ajustes-error fade-in">{pwdError}</div>}
                {pwdSaved && <div className="ajustes-success fade-in">Contraseña actualizada correctamente.</div>}
                <div className="ajustes-field">
                  <label htmlFor="current-pwd">Contraseña actual</label>
                  <input id="current-pwd" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
                </div>
                <div className="ajustes-form-grid">
                  <div className="ajustes-field">
                    <label htmlFor="new-pwd">Nueva contraseña</label>
                    <input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                  </div>
                  <div className="ajustes-field">
                    <label htmlFor="confirm-pwd">Confirmar contraseña</label>
                    <input id="confirm-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                  </div>
                </div>
                <div className="ajustes-form-actions">
                  <button type="submit" className="ajustes-btn-primary">Actualizar contraseña</button>
                </div>
              </form>

              <div className="ajustes-card glass-panel border-danger">
                <div className="ajustes-card-header">
                  <h3 className="text-danger">Sesión activa</h3>
                  <p className="ajustes-card-desc">
                    Cierra tu sesión en este dispositivo. Tendrás que volver a ingresar tus credenciales.
                  </p>
                </div>
                <button className="ajustes-btn-danger mt-10" onClick={handleLogout}>Cerrar sesión segura</button>
              </div>
            </div>
          )}

          {tab === 'preferencias' && (
            <div className="ajustes-panel fade-in">
              <div className="ajustes-card glass-panel">
                <div className="ajustes-card-header">
                  <h3>Apariencia</h3>
                  <p className="ajustes-card-desc">Personaliza la interfaz de la plataforma.</p>
                </div>
                <div className="ajustes-toggle-row">
                  <div className="ajustes-toggle-info">
                    <div className="ajustes-toggle-icon">
                      <Icon d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" color="var(--primary)" />
                    </div>
                    <div>
                      <p className="ajustes-toggle-title">Modo oscuro</p>
                      <p className="ajustes-toggle-desc">Reduce el brillo para entornos con poca luz.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ajustes-switch ${isDark ? 'on' : ''}`}
                    onClick={toggleTheme}
                    aria-pressed={isDark}
                  >
                    <span className="ajustes-switch-knob" />
                  </button>
                </div>
                
                <div className="ajustes-divider"></div>

                <div className="ajustes-toggle-row">
                  <div className="ajustes-toggle-info">
                    <div className="ajustes-toggle-icon">
                      <Icon d="M4 6h16M4 12h16M4 18h7" color="var(--primary)" />
                    </div>
                    <div>
                      <p className="ajustes-toggle-title">Colapsar sidebar por defecto
                        <InfoTooltip 
                          variant="help" 
                          position="top" 
                          content="Oculta automáticamente el menú de navegación lateral izquierdo para ofrecer una vista más despejada."
                        />
                      </p>
                      <p className="ajustes-toggle-desc">Aprovecha mejor el espacio en pantallas pequeñas.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ajustes-switch ${sidebarCollapsedDefault ? 'on' : ''}`}
                    onClick={handleToggleSidebarDefault}
                    aria-pressed={sidebarCollapsedDefault}
                  >
                    <span className="ajustes-switch-knob" />
                  </button>
                </div>
              </div>

              <div className="ajustes-card glass-panel">
                <div className="ajustes-card-header">
                  <h3>Región e Idioma</h3>
                </div>
                <div className="ajustes-field">
                  <label>Idioma preferido</label>
                  <select className="ajustes-select" disabled>
                    <option>Español (Chile)</option>
                  </select>
                  <p className="ajustes-card-desc mt-5">Único idioma disponible por el momento.</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'notificaciones' && (
            <div className="ajustes-panel fade-in">
              <div className="ajustes-card glass-panel">
                <div className="ajustes-card-header">
                  <h3>Canales de Notificación</h3>
                  <p className="ajustes-card-desc">Elige cómo y cuándo quieres recibir actualizaciones.</p>
                </div>
                
                <div className="ajustes-toggle-row">
                  <div className="ajustes-toggle-info">
                    <div className="ajustes-toggle-icon">
                      <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" color="var(--primary)" />
                    </div>
                    <div>
                      <p className="ajustes-toggle-title">Notificaciones por Correo</p>
                      <p className="ajustes-toggle-desc">Recibe resúmenes y alertas importantes en tu inbox.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ajustes-switch ${emailNotif ? 'on' : ''}`}
                    onClick={() => setEmailNotif(!emailNotif)}
                  >
                    <span className="ajustes-switch-knob" />
                  </button>
                </div>

                <div className="ajustes-divider"></div>

                <div className="ajustes-toggle-row">
                  <div className="ajustes-toggle-info">
                    <div className="ajustes-toggle-icon">
                      <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" color="var(--primary)" />
                    </div>
                    <div>
                      <p className="ajustes-toggle-title">Notificaciones Push</p>
                      <p className="ajustes-toggle-desc">Alertas en tiempo real en tu navegador.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ajustes-switch ${pushNotif ? 'on' : ''}`}
                    onClick={() => setPushNotif(!pushNotif)}
                  >
                    <span className="ajustes-switch-knob" />
                  </button>
                </div>
                
                <div className="ajustes-divider"></div>

                <div className="ajustes-toggle-row">
                  <div className="ajustes-toggle-info">
                    <div className="ajustes-toggle-icon">
                      <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="var(--primary)" />
                    </div>
                    <div>
                      <p className="ajustes-toggle-title">Novedades y Marketing</p>
                      <p className="ajustes-toggle-desc">Actualizaciones de productos, ofertas y noticias.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ajustes-switch ${marketingNotif ? 'on' : ''}`}
                    onClick={() => setMarketingNotif(!marketingNotif)}
                  >
                    <span className="ajustes-switch-knob" />
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
