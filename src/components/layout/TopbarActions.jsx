import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Bell, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import NotificationsBell from './NotificationsBell';
import './TopbarActions.css';

// Acciones comunes del topbar: notificaciones + cambio de tema.
export default function TopbarActions() {
  const { isDark, toggleTheme } = useTheme();
  const { isClienteExterno } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [notifOpen]);

  return (
    <div className="tb-actions">
      {isClienteExterno ? (
        <NotificationsBell />
      ) : (
      <div className="tb-notif-wrap" ref={notifRef}>
        <button
          className={`tb-icon-btn ${notifOpen ? 'active' : ''}`}
          onClick={() => setNotifOpen((o) => !o)}
          title="Notificaciones"
          aria-label="Notificaciones"
          aria-haspopup="true"
          aria-expanded={notifOpen}
        >
          <Bell size={13} strokeWidth={2} />
          {notifCount > 0 && <span className="tb-notif-badge">{notifCount}</span>}
        </button>
        {notifOpen && (
          <div className="tb-notif-popover" role="dialog" aria-label="Notificaciones">
            <div className="tb-notif-header">Notificaciones</div>
            <div className="tb-notif-empty">
              <Bell size={16} strokeWidth={1.6} />
              <p>No tienes notificaciones nuevas.</p>
            </div>
          </div>
        )}
      </div>
      )}
      <button
        className="tb-icon-btn"
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDark ? <Sun size={13} strokeWidth={2} /> : <Moon size={13} strokeWidth={2} />}
      </button>
      {/* Solo visible en móvil (≤900px): abre el drawer de navegación */}
      <button
        className="tb-icon-btn tb-menu-btn"
        onClick={() => window.dispatchEvent(new CustomEvent('clm:toggle-sidebar'))}
        title="Abrir menú"
        aria-label="Abrir menú de navegación"
      >
        <Menu size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
