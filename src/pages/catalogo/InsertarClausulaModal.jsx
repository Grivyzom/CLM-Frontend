import { useState, useEffect } from 'react';
import { getPlantillas, updatePlantilla } from '../../api';
import { Icon } from './ui';
import { useConfirm } from '../../contexts/ConfirmContext';

// ─── Insert Clause Modal ──────────────────────────────────────────────────────
export default function InsertarClausulaModal({ clauseText, clauseName, clauseId, onClose }) {
  const { alert: alertModal } = useConfirm();
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    // Filtramos las plantillas por modo_origen='clausulas'
    getPlantillas({ modo_origen: 'clausulas' })
      .then(res => setPlantillas(Array.isArray(res) ? res : (res?.results || [])))
      .catch(() => setPlantillas([]))
      .finally(() => setLoading(false));
  }, []);

  const selectPlantilla = (p) => {
    setSelectedPlantilla(p);
    setPdfLoading(true);
    setPdfError('');
    setPdfUrl(null);
    fetch(`/api/plantillas/plantillas/${p.id}/preview-pdf/`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const err = await res.json(); msg = err.error || err.detail || msg; } catch (_) {}
          throw new Error(msg);
        }
        return res.blob();
      })
      .then(blob => setPdfUrl(URL.createObjectURL(blob)))
      .catch(err => {
        setPdfUrl(null);
        setPdfError(err.message || 'Error desconocido');
      })
      .finally(() => setPdfLoading(false));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 860, height: '85vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Insertar en contrato</h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
             <Icon d={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-muted)" w={16} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', padding: 20 }}>
          {!selectedPlantilla ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Selecciona una plantilla base (tipo cláusulas) para insertar la cláusula <strong>{clauseName}</strong>.</p>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando plantillas...</div>
              ) : plantillas.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay plantillas de tipo cláusulas disponibles.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, overflowY: 'auto', padding: 2 }}>
                  {plantillas.map(p => (
                    <div
                      key={p.id}
                      style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'var(--surface)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                      onClick={() => selectPlantilla(p)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{p.nombre || p.name}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{p.tipo_contrato_display || p.tipo_contrato}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Previsualización de Inserción</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Documento base: {selectedPlantilla.nombre}</p>
                </div>
                <button className="catalogo-btn-secondary" onClick={() => setSelectedPlantilla(null)}>Cambiar plantilla</button>
              </div>

              <div style={{ flex: 1, background: 'var(--bg-panel)', padding: '24px 16px', overflowY: 'auto', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)' }}>
                {/* Visual Document Mockup */}
                <div style={{ width: '100%', maxWidth: 640, background: '#fff', minHeight: 600, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                  {pdfLoading ? (
                    <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-faint)' }}>Generando documento base...</div>
                  ) : pdfUrl ? (
                    <iframe src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} style={{ width: '100%', height: 500, border: 'none' }} title="Base PDF" />
                  ) : (
                    <div style={{ height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)', padding: 20, textAlign: 'center' }}>
                      <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" w={32} color="var(--danger)" />
                      <div style={{ marginTop: 12, fontWeight: 600 }}>Error al cargar documento base.</div>
                      <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>{pdfError}</div>
                    </div>
                  )}
                  {/* Append Clause UI */}
                  <div style={{ padding: '40px', borderTop: '2px dashed var(--primary-tint)' }}>
                     <div style={{ display: 'inline-block', background: 'var(--primary-bg)', color: 'var(--primary)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' }}>Cláusula Incrustada</div>
                     <h4 style={{ marginBottom: 12, fontSize: 16, color: '#1a1a1a' }}>{clauseName}</h4>
                     <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>{clauseText}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
                <button className="catalogo-btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="catalogo-btn-primary" onClick={async () => {
                  try {
                    const currentClausulas = selectedPlantilla.clausulas_seleccionadas || [];
                    if (!currentClausulas.includes(clauseId)) {
                       const formData = new FormData();
                       formData.append('clausulas_seleccionadas', JSON.stringify([...currentClausulas, clauseId]));
                       await updatePlantilla(selectedPlantilla.id, formData);
                       alertModal({ title: 'Cláusula incrustada', message: `«${clauseName}» quedó incrustada en la plantilla ${selectedPlantilla.nombre}.` });
                    } else {
                       alertModal({ title: 'Sin cambios', message: 'Esta cláusula ya está incrustada en la plantilla.' });
                    }
                  } catch(e) {
                     alertModal({ title: 'Error', message: e.message || String(e), isDangerous: true });
                  }
                  onClose();
                }}>Confirmar Incrustación</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
