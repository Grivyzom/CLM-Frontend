import { useEffect } from 'react';
import { Icon, StatusBadge } from './ui';

// ─── Modal: versiones de una familia de documento (ej. todas las NDA) ──────
export default function PlantillaVersionsModal({
  familia, onClose, setPreviewTemplate, handleOpenContextMenu, handleEditTemplate,
  onCreateVersion, onToggleActiva, onOpenContratos, escapePaused = false,
}) {
  // Escape cierra este modal, salvo que el sheet de contratos esté abierto
  // encima (escapePaused): en ese caso Escape le pertenece al sheet.
  useEffect(() => {
    if (escapePaused) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, escapePaused]);

  if (!familia) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1090,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Versiones de ${familia.representante.name}`}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {familia.representante.name}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
              Familia <strong>{familia.prefijo}</strong> · {familia.totalVersiones} versión{familia.totalVersiones === 1 ? '' : 'es'} · {familia.totalUsos} usos en total
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              className="catalogo-btn-primary"
              onClick={() => onCreateVersion(familia)}
            >
              <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
              Nueva versión
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 18
              }}
            >×</button>
          </div>
        </div>

        {/* Lista de versiones */}
        <div style={{ overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {familia.versiones.map(v => (
            <div
              key={v.id}
              onClick={() => onOpenContratos?.(v)}
              title="Ver contratos que usan esta versión"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                background: v.status === 'Aprobado' ? 'var(--primary-bg)' : 'var(--bg-faint)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>
                    {v.version}
                  </span>
                  <StatusBadge status={v.status} />
                  {v._raw?.software_nombre && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--surface)', color: 'var(--primary)', fontFamily: "'JetBrains Mono',monospace",
                    }}>
                      {v._raw.software_nombre}
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-faint)' }}>
                  Creada {v.updated} · {v.uses} usos{v.uses > 0 ? ' · clic para ver contratos' : ''}
                </p>
              </div>

              <div className="catalogo-action-group" onClick={e => e.stopPropagation()}>
                <button
                  title="Vista previa"
                  className="catalogo-action-group-btn"
                  onClick={() => setPreviewTemplate(v)}
                >
                  <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} w={14} color="currentColor" />
                </button>
                <button
                  title="Editar"
                  className="catalogo-action-group-btn"
                  onClick={() => handleEditTemplate(v)}
                >
                  <Icon d={['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']} w={14} color="currentColor" />
                </button>
                <button
                  title={v.status === 'Aprobado' ? 'Archivar (desactivar)' : v.status === 'Borrador' ? 'Confirmar y activar esta versión' : 'Activar esta versión'}
                  className="catalogo-action-group-btn"
                  onClick={() => onToggleActiva(v)}
                >
                  <Icon
                    d={v.status === 'Aprobado'
                      ? ['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4']
                      : ['M9 12l2 2 4-4', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z']}
                    w={14}
                    color={v.status === 'Aprobado' ? 'currentColor' : 'var(--success-deep)'}
                  />
                </button>
                <button
                  title="Más opciones"
                  className="catalogo-action-group-btn"
                  onClick={e => handleOpenContextMenu(e, v)}
                >
                  <Icon d={['M12 5v.01', 'M12 12v.01', 'M12 19v.01', 'M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z', 'M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z', 'M12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z']} w={14} color="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
