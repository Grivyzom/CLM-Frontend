import React from 'react';
import { Icon } from './shared';
import { fmtDateTime } from '../../utils/formatters';

export default function TabSla({
  contrato,
  handleOpenObligacionModal, handleEnmendar, handleEliminarObligacion,
  toggleHistory, expandedHistoryId, obligationHistory, historyLoading,
}) {
  return (
    <div className="ct-tab-sla">
      <div className="ct-sla-toolbar">
        <p className="ct-section-label">Obligaciones contractuales — SLA: {contrato.sla.nombre}</p>
        {contrato.etapa === 'BORRADOR' ? (
          <button className="ct-btn-primary" onClick={() => handleOpenObligacionModal()}>
            <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
            Añadir SLA
          </button>
        ) : (
          <button className="ct-btn-secondary" onClick={() => handleEnmendar()}>
            <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-muted)" w={13} />
            Enmendar SLA / Crear Anexo
          </button>
        )}
      </div>
      {contrato.obligaciones_sla.length === 0 ? (
        <div className="ct-sla-empty">
          <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="var(--border)" w={36} />
          <p>Sin obligaciones contractuales asociadas</p>
        </div>
      ) : (
        <div className="ct-sla-cards">
          {contrato.obligaciones_sla.map((s, i) => (
            <div key={s.id || i} className="ct-sla-card">
              <div className="ct-sla-card-head">
                <div className="ct-sla-card-title">
                  <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="var(--primary)" w={18} />
                  <h4>{s.tipo_obligacion}</h4>
                </div>
                {contrato.etapa === 'BORRADOR' && s.id && (
                  <div className="ct-sla-card-actions">
                    <button className="ct-icon-btn" title="Editar obligación" onClick={() => handleOpenObligacionModal(s)}>
                      <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" color="var(--primary)" w={14} />
                    </button>
                    <button className="ct-icon-btn" title="Eliminar obligación" onClick={() => handleEliminarObligacion(s.id)}>
                      <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="var(--danger)" w={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="ct-sla-card-body">
                <p className="ct-sla-card-desc">
                  <strong>Descripción / Métrica:</strong> {s.descripcion}
                </p>
                <p className="ct-sla-card-penalty">
                  <strong>Penalización / Consecuencia:</strong> {s.penalizacion}
                </p>
              </div>

              {s.id && (
                <div className="ct-sla-card-footer">
                  <button className="ct-btn-ghost-sm" onClick={() => toggleHistory(s.id)}>
                    {expandedHistoryId === s.id ? 'Ocultar historial' : 'Ver historial'}
                  </button>

                  {expandedHistoryId === s.id && (
                    <div className="ct-obligation-history">
                      <h5>Historial de Cambios</h5>
                      {historyLoading ? (
                        <p className="ct-history-hint">Cargando historial…</p>
                      ) : !obligationHistory[s.id] || obligationHistory[s.id].length === 0 ? (
                        <p className="ct-history-hint">Sin registros de cambios.</p>
                      ) : (
                        <div className="ct-history-list">
                          {obligationHistory[s.id].map((log) => (
                            <div key={log.id} className="ct-history-entry">
                              <div className="ct-history-entry-head">
                                {fmtDateTime(log.fecha)} · {log.usuario} · <span style={{ color: log.accion === 'CREAR' ? 'var(--success-deep)' : log.accion === 'EDITAR' ? 'var(--primary)' : 'var(--danger)' }}>{log.accion}</span>
                              </div>
                              {log.valor_anterior && (
                                <div className="ct-history-prev">Antes: {log.valor_anterior}</div>
                              )}
                              <div className="ct-history-new">Nuevo: {log.valor_nuevo || '(Eliminado)'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
