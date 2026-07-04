import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiLogout } from '../api';
import './Ajustes.css';

const Icon = ({ d, color = '#7c7670', w = 14 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' },
  { id: 'seguridad', label: 'Seguridad', icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'] },
  { id: 'preferencias', label: 'Preferencias', icon: ['M4 6h16M7 12h10M10 18h4'] },
];

export default function Ajustes() {
  const { user, logout } = useAuth();
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
      // Si el backend no responde, igual cerramos sesión en el cliente
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="ajustes-container">
      <div className="ajustes-header">
        <div>
          <p className="ajustes-header-label">Enfoque Platform</p>
          <h1 className="ajustes-header-title">Ajustes</h1>
        </div>
        <span className="ajustes-header-date">Vie 4 jul 2026</span>
      </div>

      <div className="ajustes-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`ajustes-tab ${tab === t.id ? 'active' : ''}`}
          >
            <Icon d={t.icon} color={tab === t.id ? '#2563eb' : '#b0aaa3'} w={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="ajustes-content">
        {tab === 'perfil' && (
          <div className="ajustes-panel">
            <div className="ajustes-profile-head">
              <div className="ajustes-avatar">{user?.initials || 'US'}</div>
              <div>
                <p className="ajustes-profile-name">{user?.name || 'Usuario'}</p>
                <p className="ajustes-profile-role">{user?.role || 'Sin rol asignado'}</p>
              </div>
            </div>

            <form className="ajustes-form" onSubmit={handleSaveProfile}>
              {profileSaved && <div className="ajustes-success">Cambios guardados correctamente.</div>}
              <div className="ajustes-field">
                <label htmlFor="name">Nombre completo</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="ajustes-field">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" placeholder="usuario@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="ajustes-field">
                <label htmlFor="role">Rol</label>
                <input id="role" type="text" value={user?.role || ''} disabled />
              </div>
              <button type="submit" className="ajustes-btn-primary">Guardar cambios</button>
            </form>
          </div>
        )}

        {tab === 'seguridad' && (
          <div className="ajustes-panel">
            <div className="ajustes-card">
              <div className="ajustes-card-header">
                <h3>Autenticación de dos factores</h3>
                <span className="ajustes-badge-off">No configurado</span>
              </div>
              <p className="ajustes-card-desc">
                Protege tu cuenta exigiendo un código temporal de tu aplicación autenticadora al iniciar sesión.
              </p>
              <button className="ajustes-btn-secondary" disabled>Configurar 2FA</button>
            </div>

            <form className="ajustes-card" onSubmit={handleChangePassword}>
              <div className="ajustes-card-header">
                <h3>Cambiar contraseña</h3>
              </div>
              {pwdError && <div className="ajustes-error">{pwdError}</div>}
              {pwdSaved && <div className="ajustes-success">Contraseña actualizada correctamente.</div>}
              <div className="ajustes-field">
                <label htmlFor="current-pwd">Contraseña actual</label>
                <input id="current-pwd" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              </div>
              <div className="ajustes-field">
                <label htmlFor="new-pwd">Nueva contraseña</label>
                <input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <div className="ajustes-field">
                <label htmlFor="confirm-pwd">Confirmar nueva contraseña</label>
                <input id="confirm-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              </div>
              <button type="submit" className="ajustes-btn-primary">Actualizar contraseña</button>
            </form>

            <div className="ajustes-card">
              <div className="ajustes-card-header">
                <h3>Sesión activa</h3>
              </div>
              <p className="ajustes-card-desc">
                Cierra tu sesión en este dispositivo. Tendrás que volver a ingresar tus credenciales.
              </p>
              <button className="ajustes-btn-danger" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
        )}

        {tab === 'preferencias' && (
          <div className="ajustes-panel">
            <div className="ajustes-card">
              <div className="ajustes-toggle-row">
                <div>
                  <p className="ajustes-toggle-title">Colapsar sidebar por defecto</p>
                  <p className="ajustes-toggle-desc">Aplica la próxima vez que cargues la plataforma.</p>
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

            <div className="ajustes-card">
              <div className="ajustes-card-header">
                <h3>Idioma</h3>
              </div>
              <p className="ajustes-card-desc">Español (Chile) — único idioma disponible por el momento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
