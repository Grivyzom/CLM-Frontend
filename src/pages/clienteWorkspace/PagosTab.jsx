import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getClienteTimelinePagos } from '../../api';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { fmtMoney, fmtDate, contratoIdDisplay } from '../../utils/formatters';
import { Icon } from './ui';

const TIPO_LABEL = {
  INICIO_CONTRATO: 'Inicio de contrato',
  VENCIMIENTO_CUOTA: 'Vencimiento de cuota',
  VENCIMIENTO_CONTRATO: 'Fin de vigencia',
  CAMBIO_ETAPA: 'Cambio de etapa',
  ESTADO_COBRANZA: 'Estado de cobranza',
  PERDONAZO: 'Perdonazo',
};

export default function PagosTab({ clienteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeqRef = useRef(0);

  const fetchData = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    getClienteTimelinePagos(clienteId)
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.message || 'Error al cargar el timeline');
        setLoading(false);
      });
  }, [clienteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (loading) {
    return <div className="ct-table-empty" role="status">Cargando vencimientos…</div>;
  }

  const { eventos, resumen } = data;

  return (
    <div className="ct-tab-resumen">
      <div className="ct-resumen-grid">
        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--primary)" w={14} />
            Contratos
          </p>
          <p className="ct-resumen-value-num">{resumen.total_contratos}</p>
        </div>
        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} color="var(--danger)" w={14} />
            En Cobranza
          </p>
          <p className="ct-resumen-value-num" style={resumen.en_mora > 0 ? { color: 'var(--danger)' } : undefined}>
            {resumen.en_mora}
          </p>
        </div>
        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" color="var(--warning-bright)" w={14} />
            Próximo Vencimiento
          </p>
          <p className="ct-resumen-value-num">{fmtDate(resumen.proximo_vencimiento)}</p>
        </div>
      </div>

      <div className="ct-resumen-card">
        <p className="ct-resumen-card-title">
          <Icon d={['M2 7h20v14H2z', 'M2 11h20', 'M6 15h4']} color="var(--success-alt)" w={14} />
          Vencimientos e Hitos de Facturación
        </p>
        <p className="ct-history-hint">
          Línea de tiempo derivada de los contratos y perdonazos — no representa pagos confirmados.
        </p>
        {eventos.length === 0 ? (
          <p className="cw-empty">Sin eventos de facturación</p>
        ) : (
          <div className="cw-timeline">
            {eventos.map((e, i) => (
              <div className={`cw-evento tipo-${e.tipo}`} key={i}>
                <div className="cw-evento-head">
                  <span className="cw-evento-fecha">{fmtDate(e.fecha)}</span>
                  <span className="cw-evento-detalle">{TIPO_LABEL[e.tipo] || e.tipo}</span>
                  {e.monto && <span className="cw-evento-monto">{fmtMoney(e.monto)}</span>}
                </div>
                <div className="cw-evento-contrato">
                  <Link to={`/contratos/${e.contrato_id}`}>{contratoIdDisplay(e.contrato_id)}</Link>
                  {' · '}{e.contrato_nombre} — {e.detalle}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
