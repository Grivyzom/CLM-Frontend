import { useState, useEffect } from 'react';

// ─── Preview Modal ──────────────────────────────────────────────────────────
export default function PreviewModal({ plantilla, onClose, onUse }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState('');
  // Modo enfoque: el modal pasa a pantalla completa y oculta header/footer;
  // solo queda el PDF con una píldora flotante para salir.
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      // Esc sale primero del enfoque; un segundo Esc cierra el modal.
      setFocusMode(f => {
        if (f) return false;
        onClose();
        return f;
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Carga el PDF real de la plantilla (variables sin resolver). Se pide como
  // blob para poder distinguir errores (422 cláusulas, 500 conversión) del
  // contenido, cosa que un iframe directo no permite.
  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    setPdfLoading(true);
    setPdfError('');
    setPdfUrl(null);

    fetch(`/api/plantillas/plantillas/${plantilla.id}/preview-pdf/`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const err = await res.json(); msg = err.error || err.detail || msg; } catch (_) {}
          throw new Error(msg);
        }
        return res.blob();
      })
      .then(blob => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch(err => { if (!revoked) setPdfError(err.message); })
      .finally(() => { if (!revoked) setPdfLoading(false); });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [plantilla.id]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: focusMode ? 0 : 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: focusMode ? 0 : 10,
          boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: focusMode ? 'none' : 960,
          height: focusMode ? '100%' : '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        {!focusMode && (
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6, background: plantilla.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: plantilla.color, fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.abbr}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{plantilla.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.cat} · {plantilla.version}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, background: 'var(--bg-inset)', color: 'var(--text-muted)',
              borderRadius: 4, padding: '3px 8px', fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>Vista previa</span>
            <button
              onClick={() => setFocusMode(true)}
              disabled={!pdfUrl}
              style={{
                width: 28, height: 28, border: 'none', background: 'none',
                cursor: pdfUrl ? 'pointer' : 'default', opacity: pdfUrl ? 1 : 0.4,
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'background 0.15s'
              }}
              onMouseEnter={e => { if (pdfUrl) e.currentTarget.style.background = 'var(--neutral-200)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Modo enfoque (pantalla completa)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 18, transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Cerrar"
            >×</button>
          </div>
        </div>
        )}

        {/* Píldora flotante para salir del modo enfoque */}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 5,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-primary)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)', opacity: 0.92
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.92}
            title="Salir del modo enfoque (Esc)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Vista previa · Esc
          </button>
        )}

        {/* Document body — PDF real de la plantilla */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-page)' }}>
          {pdfLoading ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 12
            }}>
              Generando vista previa del documento…
            </div>
          ) : pdfError ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 10, padding: '0 40px', textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                No se pudo previsualizar la plantilla
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.6 }}>
                {pdfError}
              </p>
            </div>
          ) : (
            <iframe
              title={`Vista previa de la plantilla ${plantilla.name}`}
              src={`${pdfUrl}#view=FitH`}
              style={{ flex: 1, width: '100%', border: 'none' }}
            />
          )}
        </div>

        {/* Footer */}
        {!focusMode && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-faint)', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
          >Cerrar</button>
          <button
            onClick={() => onUse?.()}
            style={{
              padding: '7px 14px', borderRadius: 5, border: 'none',
              background: 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
          >Usar esta plantilla →</button>
        </div>
        )}
      </div>
    </div>
  );
}
