import React from 'react';
import { Icon, ETAPA_CFG } from './shared';
import { fmtMoney, fmtDate, fmtDateTime } from '../../utils/formatters';

// ─── Stepper de etapas del workflow ──────────────────────────────────────────
// TERMINADO no forma parte del camino "feliz": se muestra como estado final
// reemplazando al último paso solo cuando el contrato ya terminó.
const PIPELINE = ['BORRADOR', 'REVISION', 'APROBADO', 'PENDIENTE_FIRMA', 'ACTIVO'];

function EtapaStepper({ etapa }) {
  // ENMENDADO ocupa el mismo lugar que ACTIVO en el pipeline.
  const etapaEfectiva = etapa === 'ENMENDADO' ? 'ACTIVO' : etapa;
  const terminado = etapa === 'TERMINADO';
  const idx = terminado ? PIPELINE.length : PIPELINE.indexOf(etapaEfectiva);
  return (
    <div className="ct-stepper" role="img" aria-label={`Etapa actual: ${(ETAPA_CFG[etapa] || {}).label || etapa}`}>
      {PIPELINE.map((e, i) => {
        const cfg = ETAPA_CFG[e === 'ACTIVO' && etapa === 'ENMENDADO' ? 'ENMENDADO' : e];
        const done = terminado || i < idx;
        const current = !terminado && i === idx;
        return (
          <React.Fragment key={e}>
            {i > 0 && <span className={`ct-stepper-line${done || current ? ' done' : ''}`} />}
            <span className={`ct-stepper-step${done ? ' done' : ''}${current ? ' current' : ''}`}>
              <span className="ct-stepper-dot" style={current ? { background: cfg.dot, borderColor: cfg.dot } : undefined}>
                {done && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-on-accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                )}
              </span>
              <span className="ct-stepper-label" style={current ? { color: cfg.color } : undefined}>
                {e === 'ACTIVO' && etapa === 'ENMENDADO' ? 'Enmendado' : ETAPA_CFG[e].label}
              </span>
            </span>
          </React.Fragment>
        );
      })}
      {terminado && (
        <>
          <span className="ct-stepper-line done" />
          <span className="ct-stepper-step current">
            <span className="ct-stepper-dot" style={{ background: 'var(--text-faint)', borderColor: 'var(--text-faint)' }} />
            <span className="ct-stepper-label">Terminado</span>
          </span>
        </>
      )}
    </div>
  );
}

// ─── Barra de vigencia (inicio → vencimiento) ────────────────────────────────
function VigenciaBar({ inicio, vencimiento, diasRestantes }) {
  if (!inicio || !vencimiento) return null;
  const t0 = new Date(inicio).getTime();
  const t1 = new Date(vencimiento).getTime();
  if (!(t1 > t0)) return null;
  const pct = Math.min(100, Math.max(0, ((Date.now() - t0) / (t1 - t0)) * 100));
  const critico = diasRestantes !== null && diasRestantes < 30;
  return (
    <div className="ct-vigencia">
      <div className="ct-vigencia-bar">
        <div className="ct-vigencia-fill" style={{ width: `${pct}%`, background: critico ? 'var(--rose)' : 'var(--primary)' }} />
      </div>
      <span className="ct-vigencia-hint">
        {diasRestantes === null ? `${Math.round(pct)}% transcurrido`
          : diasRestantes < 0 ? 'Vigencia vencida'
          : `${diasRestantes} días restantes de vigencia`}
      </span>
    </div>
  );
}

export default function TabResumen({
  contrato, esRecurrente, busy,
  selectedFirmaMethod, setSelectedFirmaMethod,
  handleSendSignature, handleCancelSignature, handleDeclineSignature, setSignatureProvider,
  handleOpenAssignTemplate,
  handleLinkExternal, handleUnlinkExternal, handleForceUnlockExternal, setShowPluginSimulator,
}) {
  return (
    <div className="ct-tab-resumen">
      <EtapaStepper etapa={contrato.etapa} />
      <div className="ct-resumen-grid">
        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" color="var(--primary)" w={14} />
            Producto Licenciado
          </p>
          <p className="ct-resumen-software">{contrato.software.nombre}</p>
          <p className="ct-resumen-detail">SLA: <strong>{contrato.sla.nombre}</strong></p>
          <p className="ct-resumen-detail">Responsable: <strong>{contrato.responsable || '—'}</strong></p>
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="var(--success-alt)" w={14} />
            Valor del Contrato
          </p>
          <div className="ct-resumen-value-row">
            <div>
              <p className="ct-resumen-value-label">{esRecurrente ? 'MRR' : 'Monto'}</p>
              <p className="ct-resumen-value-num">{fmtMoney(esRecurrente ? contrato.mrr : contrato.monto)}</p>
            </div>
            {esRecurrente && (
              <div>
                <p className="ct-resumen-value-label">ARR</p>
                <p className="ct-resumen-value-num">{fmtMoney(contrato.arr)}</p>
              </div>
            )}
          </div>
          <div className="ct-resumen-billing-badge">
            <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" color="var(--text-muted)" w={12} />
            {contrato.tipo_contrato_display}{contrato.frecuencia_facturacion ? ` · ${contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : 'Mensual'}` : ''}
          </div>
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" color="var(--warning-bright)" w={14} />
            Fechas Críticas
          </p>
          <div className="ct-resumen-dates">
            <div className="ct-date-row">
              <span className="ct-date-label">Inicio del contrato</span>
              <span className="ct-date-value">{fmtDate(contrato.fecha_inicio)}</span>
            </div>
            <div className="ct-date-row">
              <span className="ct-date-label">Próxima renovación</span>
              <span className="ct-date-value" style={{ color: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? 'var(--rose)' : 'var(--text-primary)', fontWeight: contrato.dias_restantes !== null && contrato.dias_restantes < 30 ? 700 : 600 }}>
                {fmtDate(contrato.fecha_vencimiento)}
              </span>
            </div>
            <div className="ct-date-row">
              <span className="ct-date-label">Creado</span>
              <span className="ct-date-value">{fmtDate(contrato.fecha_creacion)}</span>
            </div>
          </div>
          <VigenciaBar inicio={contrato.fecha_inicio} vencimiento={contrato.fecha_vencimiento} diasRestantes={contrato.dias_restantes} />
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="var(--violet-bright)" w={14} />
            Legal / Administrativa
          </p>
          <div className="ct-resumen-dates">
            <div className="ct-date-row">
              <span className="ct-date-label">Período de Gracia</span>
              <span className="ct-date-value">{contrato.dias_gracia_autorizados > 0 ? `${contrato.dias_gracia_autorizados} días` : 'No autorizado'}</span>
            </div>
            {contrato.fin_periodo_gracia && (
              <div className="ct-date-row">
                <span className="ct-date-label">Fin de Gracia</span>
                <span className="ct-date-value">{fmtDate(contrato.fin_periodo_gracia)}</span>
              </div>
            )}
            <div className="ct-date-row">
              <span className="ct-date-label">Obligaciones SLA</span>
              <span className="ct-date-value">{contrato.obligaciones_sla ? contrato.obligaciones_sla.length : 0} registradas</span>
            </div>
            <div className="ct-date-row">
              <span className="ct-date-label">Versión</span>
              <span className="ct-date-value">v{contrato.version || '1.0'}</span>
            </div>
            <div className="ct-date-row">
              <span className="ct-date-label">Plantilla Activa</span>
              {contrato.plantilla_activa ? (
                <span className="ct-date-value ct-plantilla-value">
                  {contrato.plantilla_activa.nombre} (v{contrato.plantilla_activa.version_codigo})
                  <button className="ct-inline-icon-btn" onClick={handleOpenAssignTemplate} title="Cambiar plantilla activa">
                    <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} w={14} color="var(--primary)" />
                  </button>
                </span>
              ) : (
                <button className="ct-assign-template-btn" onClick={handleOpenAssignTemplate} title="Asignar plantilla en modal">
                  Aún no se establece
                  <Icon d="M12 5v14M5 12h14" color="currentColor" w={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" color="var(--indigo-bright)" w={14} />
            Contraparte (RRHH)
          </p>
          <p className="ct-resumen-software ct-resumen-contraparte">{contrato.cliente.nombre}</p>
          {contrato.cliente.email && (
            <p className="ct-resumen-detail">Email: <strong>{contrato.cliente.email}</strong></p>
          )}
          <p className="ct-resumen-detail">ID Cliente: <strong>{contrato.cliente.id}</strong></p>
        </div>

        <div className="ct-resumen-card ct-resumen-card-wide">
          <p className="ct-resumen-card-title">
            <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8']} color="var(--primary)" w={14} />
            Integración con Procesadores de Texto (Word / Docs)
          </p>

          {contrato.external_editor ? (
            <div className="ct-ext-panel">
              <div className="ct-ext-row">
                <div className="ct-ext-id">
                  <span className={`ct-ext-brand ${contrato.external_editor === 'WORD' ? 'word' : 'gdocs'}`}>
                    {contrato.external_editor === 'WORD' ? 'W' : 'D'}
                  </span>
                  <div>
                    <p className="ct-ext-name">
                      Vinculado a {contrato.external_editor === 'WORD' ? 'Microsoft Word' : 'Google Docs'}
                    </p>
                    <p className="ct-ext-meta">ID Documento: {contrato.external_doc_id || 'Autogenerado'}</p>
                  </div>
                </div>
                <div className="ct-ext-status">
                  {contrato.external_sync_status === 'EDITING' ? (
                    <span className="ct-ext-status-chip editing">⚠️ Editándose Externamente</span>
                  ) : (
                    <span className="ct-ext-status-chip synced">✓ Sincronizado</span>
                  )}
                  {contrato.external_last_sync && (
                    <span className="ct-ext-meta">Sinc: {fmtDateTime(contrato.external_last_sync)}</span>
                  )}
                </div>
              </div>

              {contrato.external_locked_by && (
                <p className="ct-ext-lock">
                  🔒 Editándose y bloqueado por el usuario: <strong>{contrato.external_locked_by}</strong>.
                </p>
              )}

              <div className="ct-ext-actions">
                <button className="ct-btn-primary ct-ext-open-btn" onClick={() => setShowPluginSimulator(true)}>
                  <Icon d={['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7']} color="var(--text-on-accent)" w={12} />
                  Abrir Simulador de Plugin
                </button>
                {contrato.external_sync_status === 'EDITING' && (
                  <button className="ct-btn-secondary" onClick={handleForceUnlockExternal}>
                    Liberar Bloqueo
                  </button>
                )}
                <button className="ct-btn-danger" onClick={handleUnlinkExternal}>
                  Desvincular
                </button>
              </div>
            </div>
          ) : (
            <div className="ct-ext-panel">
              <p className="ct-panel-note">
                Edita este contrato directamente en tu procesador de texto habitual (Microsoft Word o Google Docs) mientras se sincronizan los cambios de forma automática en el CLM.
              </p>
              <div className="ct-ext-actions">
                <button className="ct-btn-secondary ct-ext-link-btn" onClick={() => handleLinkExternal('WORD')}>
                  <span className="ct-ext-brand-letter word">W</span>
                  Vincular MS Word
                </button>
                <button className="ct-btn-secondary ct-ext-link-btn" onClick={() => handleLinkExternal('GDOCS')}>
                  <span className="ct-ext-brand-letter gdocs">D</span>
                  Vincular Google Docs
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="ct-resumen-card ct-resumen-card-wide">
          <p className="ct-resumen-card-title">
            <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M12 8v4', 'M12 16h.01']} color="var(--sky)" w={14} />
            Firma Electrónica del Acuerdo
          </p>

          {contrato.firma_status === 'NONE' || contrato.firma_status === 'DECLINED' || !contrato.firma_status ? (
            <div className="ct-firma-panel">
              {contrato.firma_status === 'DECLINED' && (
                <div className="ct-alert-error ct-firma-declined" role="alert">
                  ❌ El envío anterior de firma fue rechazado por el destinatario en {contrato.firma_proveedor}.
                </div>
              )}
              <p className="ct-panel-note">
                Una vez que el contrato esté aprobado internamente, puedes iniciar el proceso de firma digital. Selecciona el proveedor de firma legal:
              </p>

              <div className="ct-firma-options" role="radiogroup" aria-label="Proveedor de firma">
                {[
                  { id: 'OTP', nombre: 'Firma OTP Nativa', desc: 'SMS/Email de un solo uso' },
                  { id: 'DOCUSIGN', nombre: 'DocuSign', desc: 'Simulador de sobre' },
                  { id: 'ADOBE', nombre: 'Adobe Sign', desc: 'Simulador de acuerdo' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedFirmaMethod === opt.id}
                    className={`ct-firma-option${selectedFirmaMethod === opt.id ? ' active' : ''}`}
                    onClick={() => setSelectedFirmaMethod(opt.id)}
                  >
                    <span className="ct-firma-option-name">{opt.nombre}</span>
                    <span className="ct-firma-option-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>

              <button
                className="ct-btn-primary ct-firma-send-btn"
                onClick={() => handleSendSignature(selectedFirmaMethod)}
                disabled={busy}
              >
                🚀 Enviar a Firmar vía {selectedFirmaMethod === 'OTP' ? 'OTP Nativa' : selectedFirmaMethod === 'DOCUSIGN' ? 'DocuSign' : 'Adobe Sign'}
              </button>
            </div>
          ) : contrato.firma_status === 'PENDING' ? (
            <div className="ct-firma-panel">
              <div className="ct-ext-row">
                <div>
                  <p className="ct-firma-pending-title">
                    ⏳ Enviado y Pendiente de Firma ({contrato.firma_proveedor === 'OTP' ? 'OTP Nativa' : contrato.firma_proveedor === 'DOCUSIGN' ? 'DocuSign' : 'Adobe Sign'})
                  </p>
                  <p className="ct-ext-meta">Envelope ID: {contrato.firma_envelope_id}</p>
                </div>
                {contrato.firma_fecha_envio && (
                  <span className="ct-ext-meta">Enviado: {fmtDateTime(contrato.firma_fecha_envio)}</span>
                )}
              </div>

              {contrato.firma_proveedor === 'OTP' ? (
                <>
                  <div className="ct-firma-note">
                    Se envió un enlace seguro de firma al correo del cliente (<strong>{contrato.cliente.email}</strong>). Esperando que lo confirme — el
                    contrato pasará a Activo y quedará el Certificado de Firma anexado al documento automáticamente cuando lo haga.
                  </div>
                  <div className="ct-ext-actions">
                    <button className="ct-btn-danger" onClick={handleCancelSignature}>
                      Cancelar Envío
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ct-firma-note">
                    El representante del cliente ha recibido el enlace de firma en su correo electrónico (<strong>{contrato.cliente.email}</strong>).
                  </div>
                  <div className="ct-ext-actions">
                    <button className="ct-btn-primary ct-ext-open-btn" onClick={() => setSignatureProvider(contrato.firma_proveedor)}>
                      ✍️ Abrir Portal de Firma (Simulador)
                    </button>
                    <button className="ct-btn-secondary" onClick={handleDeclineSignature}>
                      Simular Rechazo
                    </button>
                    <button className="ct-btn-danger" onClick={handleCancelSignature}>
                      Cancelar Envío
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            // SIGNED
            <div className="ct-firma-panel">
              <div className="ct-ext-id">
                <span className="ct-firma-signed-check">✓</span>
                <div>
                  <p className="ct-firma-signed-title">✓ Contrato Firmado Digitalmente</p>
                  <p className="ct-ext-meta">
                    Cerrado vía: {contrato.firma_proveedor === 'OTP' ? 'OTP Nativa' : contrato.firma_proveedor === 'DOCUSIGN' ? 'DocuSign' : 'Adobe Sign'} | Envelope ID: {contrato.firma_envelope_id}
                  </p>
                </div>
              </div>

              <div className="ct-firma-dates">
                <div className="ct-date-row">
                  <span className="ct-date-label">Fecha de envío:</span>
                  <span className="ct-date-value">{fmtDateTime(contrato.firma_fecha_envio)}</span>
                </div>
                <div className="ct-date-row">
                  <span className="ct-date-label">Fecha de firma:</span>
                  <span className="ct-date-value">{fmtDateTime(contrato.firma_fecha_firma)}</span>
                </div>
              </div>

              {contrato.firma_documento_firmado_url && (
                <a className="ct-btn-primary ct-firma-download" href={contrato.firma_documento_firmado_url} target="_blank" rel="noreferrer">
                  <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="var(--text-on-accent)" w={12} />
                  Descargar Contrato Certificado (PDF)
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
