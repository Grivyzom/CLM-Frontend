import { useState, useEffect, useCallback, useRef } from 'react';
import { getRequerimientos } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { fmtDateTime, contratoIdDisplay } from '../../utils/formatters';
import { Icon } from './ui';
import NewRequerimientoModal from './NewRequerimientoModal';

const ESTADO_PILL = { BORRADOR: '', GENERADO: 'ok' };
const ESTADO_LABEL = { BORRADOR: 'Borrador', GENERADO: 'Generado' };

export default function RequerimientosTab({ clienteId, contratos }) {
  const { canWrite } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const requestSeqRef = useRef(0);

  const fetchData = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setError(null);
    getRequerimientos({ cliente: clienteId })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setItems(res || []);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.message || 'Error al cargar los requerimientos');
      });
  }, [clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSuccess = () => fetchData();

  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (items === null) {
    return <div className="ct-table-empty" role="status">Cargando requerimientos…</div>;
  }

  return (
    <div className="ct-tab-resumen">
      <div className="ct-resumen-card">
        <div className="cw-card-head">
          <p className="ct-resumen-card-title">
            <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6']} color="var(--primary)" w={14} />
            Toma de Requerimientos ({items.length})
          </p>
          {canWrite && (
            <button className="ct-btn-primary" onClick={() => setModalOpen(true)}>
              <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
              Nueva toma de requerimientos
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="cw-empty">Aún no hay requerimientos registrados para este cliente</p>
        ) : items.map((r) => (
          <div className="cw-com-item" key={r.id}>
            <div className="cw-com-head">
              <span className="cw-com-asunto">Requerimiento #{r.id} · {r.categoria_producto}</span>
              <span className={`cw-pill ${ESTADO_PILL[r.estado] || ''}`}>{ESTADO_LABEL[r.estado] || r.estado}</span>
              <span className="cw-com-meta">
                {fmtDateTime(r.fecha_creacion)}
                {r.contrato_id ? ` · ${contratoIdDisplay(r.contrato_id)}` : ' · Sin contrato'}
              </span>
            </div>
            {r.documento_generado_id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <a className="ct-btn-secondary" href={`/api/requerimientos/documentos/${r.documento_generado_id}/docx/`}>
                  Descargar Word
                </a>
                <a className="ct-btn-secondary" href={`/api/requerimientos/documentos/${r.documento_generado_id}/pdf/`}>
                  Descargar PDF
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <NewRequerimientoModal
          clienteId={clienteId}
          contratos={contratos}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
