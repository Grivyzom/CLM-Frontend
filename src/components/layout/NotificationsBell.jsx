import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';
import {
  getNotificaciones,
  getNotificacionesUnreadCount,
  marcarNotificacionLeida,
  marcarNotificacionesLeidas,
} from '../../api';
import { fmtDateTime } from '../../utils/formatters';

const POLL_MS = 30000;

// Campana con notificaciones reales para el usuario-cliente (rol CLIENTE).
// Mismo patrón de polling que el badge de incidencias del Sidebar.
export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(null);
  const wrapRef = useRef(null);
  const isInitialLoad = useRef(true);

  const fetchCount = useCallback(() => {
    getNotificacionesUnreadCount()
      .then((res) => {
        const newCount = res.count || 0;
        setCount((prevCount) => {
          if (!isInitialLoad.current && newCount > prevCount) {
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              osc.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
              osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.2);
              gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.2);
              gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.25);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
              osc.start(audioCtx.currentTime);
              osc.stop(audioCtx.currentTime + 0.6);
            } catch (e) {
              console.error("AudioPlay error", e);
            }
          }
          isInitialLoad.current = false;
          return newCount;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(t);
  }, [fetchCount]);

  const fetchItems = useCallback(() => {
    getNotificaciones({ limit: 10 })
      .then((res) => setItems(res.results || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchItems();
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, fetchItems]);

  const handleMarcarLeida = async (id) => {
    try {
      await marcarNotificacionLeida(id);
      setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      setCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const handleMarcarTodas = async () => {
    try {
      await marcarNotificacionesLeidas();
      setItems((prev) => prev?.map((n) => ({ ...n, leida: true })));
      setCount(0);
    } catch (_) {}
  };

  return (
    <div className="tb-notif-wrap" ref={wrapRef}>
      <button
        className={`tb-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Notificaciones"
        aria-label={count > 0 ? `Notificaciones: ${count} sin leer` : 'Notificaciones'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell size={13} strokeWidth={2} />
        {count > 0 && <span className="tb-notif-badge">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div className="tb-notif-popover" role="dialog" aria-label="Notificaciones">
          <div className="tb-notif-header">
            Notificaciones
            {count > 0 && (
              <button className="tb-notif-readall" onClick={handleMarcarTodas}>
                Marcar todas leídas
              </button>
            )}
          </div>
          {items === null ? (
            <div className="tb-notif-empty"><p>Cargando…</p></div>
          ) : items.length === 0 ? (
            <div className="tb-notif-empty">
              <Bell size={16} strokeWidth={1.6} />
              <p>No tienes notificaciones nuevas.</p>
            </div>
          ) : (
            <div className="tb-notif-list">
              {items.map((n) => (
                <div className={`tb-notif-item ${n.leida ? 'read' : ''} tipo-${n.tipo}`} key={n.id}>
                  <div className="tb-notif-item-main">
                    <span className="tb-notif-item-title">{n.titulo}</span>
                    <span className="tb-notif-item-body">{n.cuerpo}</span>
                    <span className="tb-notif-item-meta">{fmtDateTime(n.fecha_creacion)}</span>
                  </div>
                  {!n.leida && (
                    <button
                      className="tb-notif-item-read"
                      onClick={() => handleMarcarLeida(n.id)}
                      title="Marcar como leída"
                      aria-label={`Marcar "${n.titulo}" como leída`}
                    >
                      <Check size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
