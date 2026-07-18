import React from 'react';
import DOMPurify from 'dompurify';
import { Icon } from './shared';
import { fmtDateTime } from '../../utils/formatters';

export default function TabAsistenteIA({ contrato, analisisIA, analisisIALoading, analisisIAWorking, handleRunAnalisisIA }) {
  return (
    <div className="ct-tab-asistente-ia">
      <div className="ct-ai-header">
        <div className="ct-ai-desc-col">
          <h3>
            <Icon d={['M9.81 17.25l-2.06-2.06', 'M14.5 4.5l-10 10', 'M19 8l-2.5 2.5', 'M15.5 2.5l2 2', 'M10 2.5h1']} color="var(--violet-bright)" w={18} />
            Asistente IA de Negociación y Playbook
          </h3>
          <p>
            Analiza el cumplimiento de contratos frente a la Matriz Legal requerida para <strong>{contrato.software?.categoria || 'Software'}</strong>, y detecta desviaciones o riesgos en la redacción de las cláusulas respecto al Playbook corporativo estándar.
          </p>
        </div>
        <div className="ct-ai-action-col">
          {analisisIA?.fecha_analisis && (
            <span className="ct-ai-badge-latest">
              Último análisis: {fmtDateTime(analisisIA.fecha_analisis)}
            </span>
          )}
          <button
            className="ct-btn-primary"
            onClick={handleRunAnalisisIA}
            disabled={analisisIAWorking}
            style={{ background: 'var(--violet-bright)', borderColor: 'var(--violet-border)' }}
          >
            {analisisIAWorking ? (
              <>
                <span className="ct-ai-loading-spinner ct-ai-btn-spinner" />
                Analizando Contrato...
              </>
            ) : (
              <>
                <Icon d={['M12 2v4', 'M12 18v4', 'M4.93 4.93l2.83 2.83', 'M16.24 16.24l2.83 2.83', 'M2 12h4', 'M18 12h4']} color="var(--text-on-accent)" w={14} />
                {analisisIA?.id ? 'Re-analizar Contrato' : 'Iniciar Análisis de IA'}
              </>
            )}
          </button>
        </div>
      </div>

      {analisisIALoading && !analisisIAWorking ? (
        <div className="ct-ai-loading-container">
          <div className="ct-ai-loading-spinner" />
          <p>Cargando reporte de análisis...</p>
        </div>
      ) : !analisisIA?.id ? (
        <div className="ct-ai-deviations-empty ct-ai-empty-solid">
          <Icon d={['M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14H11v-2h2zm0-4H11V7h2z']} color="var(--text-faint)" w={48} />
          <h3>No se ha ejecutado el análisis de IA todavía</h3>
          <p className="ct-ai-empty-sub">
            Haz clic en el botón de arriba para iniciar la auditoría automatizada. La IA revisará el checklist de la matriz legal y contrastará las cláusulas del borrador.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Tarjeta de Compliance Matriz Legal */}
          <div className="ct-ai-compliance-card">
            <div className="ct-ai-score-col">
              <div className={`ct-ai-score-ring ${analisisIA.checklist_cumplido ? 'success' : 'warning'}`}>
                <span className={`ct-ai-score-num ${analisisIA.checklist_cumplido ? 'success' : 'warning'}`}>
                  {analisisIA.resultado_checklist_json?.items?.filter(i => i.cumple).length || 0} / {analisisIA.resultado_checklist_json?.items?.length || 0}
                </span>
                <span className="ct-ai-score-text">Checklist</span>
              </div>
              <span className="ct-ai-score-label">Matriz de Contratos</span>
              <span className={`ct-ai-score-status ${analisisIA.checklist_cumplido ? 'ok' : 'pending'}`}>
                {analisisIA.checklist_cumplido ? 'Cumplimiento Completo' : 'Acciones Pendientes'}
              </span>
            </div>

            <div className="ct-ai-checklist-col">
              <h4 className="ct-ai-checklist-title">Checklist Requerido por la Matriz (Categoría: {contrato.software?.categoria || 'Software'})</h4>
              <div className="ct-ai-checklist">
                {analisisIA.resultado_checklist_json?.items?.map((item, idx) => (
                  <div key={idx} className={`ct-ai-checklist-item ${item.cumple ? 'ok' : 'missing'}`}>
                    <span className={item.cumple ? 'ct-ai-icon-check' : 'ct-ai-icon-cross'}>
                      {item.cumple ? '✓' : '✗'}
                    </span>
                    <div className="ct-ai-checklist-text">
                      {item.label}
                      <span className="ct-ai-checklist-evidence">{item.evidencia}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Listado de Desviaciones */}
          <h4 className="ct-ai-deviations-title">
            <Icon d={['M12 9v2', 'M12 15h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--primary)" w={16} />
            Desviaciones y Riesgos en las Cláusulas
          </h4>

          {analisisIA.riesgos_detectados_json?.length === 0 ? (
            <div className="ct-ai-deviations-empty">
              <Icon d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" color="var(--success-deep)" w={36} />
              <h3>¡Perfecto! Sin desviaciones respecto al Playbook</h3>
              <p className="ct-ai-empty-sub">
                Todas las cláusulas redactadas coinciden 100% con los términos estándar autorizados por el equipo legal.
              </p>
            </div>
          ) : (
            <div className="ct-ai-clause-list">
              {analisisIA.riesgos_detectados_json.map((c, idx) => (
                <div key={idx} className="ct-ai-clause-card">
                  <div className="ct-ai-clause-header">
                    <div className="ct-ai-clause-title-col">
                      <span className="ct-ai-clause-cat">{c.categoria}</span>
                      <h4 className="ct-ai-clause-title">{c.clausula_nombre}</h4>
                    </div>
                    <div className="ct-ai-clause-meta">
                      <span className={`ct-ai-risk-badge ${c.riesgo}`}>
                        Riesgo {c.riesgo}
                      </span>
                      {c.similitud > 0 ? (
                        <span className="ct-ai-similarity-badge">
                          {c.similitud}% similitud con el estándar
                        </span>
                      ) : (
                        <span className="ct-ai-similarity-badge omitida">
                          Omitida
                        </span>
                      )}
                    </div>
                  </div>

                  {c.similitud > 0 && (
                    <div className="ct-ai-diff-grid">
                      <div className="ct-ai-diff-box standard">
                        <p className="ct-ai-diff-label">Texto Estándar de la Biblioteca Legal</p>
                        <p className="ct-ai-diff-text">{c.estandar_esperado}</p>
                      </div>
                      <div className="ct-ai-diff-box">
                        <p className="ct-ai-diff-label">Diferencias en el Borrador Actual (Diff)</p>
                        <p className="ct-ai-diff-text diff" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.diff_html) }} />
                      </div>
                    </div>
                  )}

                  <div className="ct-ai-clause-body">
                    <div className="ct-ai-risk-box">
                      <h5>
                        <Icon d={['M12 9v2', 'M12 15h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--rose)" w={12} />
                        Diagnóstico de Riesgo
                      </h5>
                      <p>{c.explicacion}</p>
                    </div>
                    <div className="ct-ai-suggestion-box">
                      <h5>
                        <Icon d={['M9.663 17h4.673', 'M12 3v1', 'M18.364 5.636l-.707.707', 'M21 12h-1', 'M4 12H3', 'M6.343 6.343l-.707-.707', 'M12 8a4 4 0 1 1 0 8v1a2 2 0 1 1-4 0v-.531']} color="var(--success-deep)" w={12} />
                        Contramedida Sugerida (Playbook)
                      </h5>
                      <p>{c.sugerencia}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
