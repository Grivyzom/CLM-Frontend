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
  return (
    <div className="tb-actions">
      {isClienteExterno ? (
        <NotificationsBell />
      ) : (
        <NotificationsBell forStaff={true} />
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
