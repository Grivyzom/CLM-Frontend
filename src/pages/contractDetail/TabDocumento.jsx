import React from 'react';
import { Icon } from './shared';
import { fmtDate, fmtDateTime } from '../../utils/formatters';
import CampoClausulaHtml from '../../components/ui/CampoClausulaHtml';
import ClausulaBloqueRichText from '../../components/ui/ClausulaBloqueRichText';
import Pagination from '../../components/ui/Pagination';

export default function TabDocumento({
  contrato, focusMode, busy, camposLoading,
  previewDocId, setPreviewDocId,
  showPreview, setShowPreview, setFocusExpandido,
  esBorradorPreview, modoPlantilla, borradorUrl, borradorLoading, borradorError,
  setBorradorError, setBorradorNonce,
  documentoDesactualizado, clausulasEditables, mostrarSeccionClausulas, bloquesContrato,
  bibliotecaClausulas, idsUsadosEnDocumento,
  camposPlantilla, camposValores, setCamposValores, camposSelects,
  camposPage, setCamposPage, insertarClausulaEnCampo,
  abrirEditorClausulas, handleGenerarDocumento,
}) {
  return (
    <div className="ct-tab-documento">
      {documentoDesactualizado && (
        <div className="ct-doc-stale-banner">
          <Icon d={['M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z', 'M12 9v4m0 4v.01']} color="var(--warning)" w={18} />
          <span>Las cláusulas cambiaron después de generar este documento — regenéralo para reflejar los últimos cambios.</span>
          {clausulasEditables && (
            <button
              className="ct-btn-secondary"
              disabled={busy}
              onClick={() => handleGenerarDocumento(false)}
            >
              Regenerar ahora
            </button>
          )}
        </div>
      )}
      <div className="ct-doc-viewer">
        {contrato.documentos.length > 0 ? (() => {
          const docs = contrato.documentos; // ordenados por -fecha_generacion
          const previewDoc = docs.find(d => d.id === previewDocId) || docs[0];
          const esUltima = previewDoc.id === docs[0].id;
          return (
            <>
              {!focusMode && (
              <div className="ct-doc-header">
                <div className="ct-doc-info">
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--primary)" w={20} />
                  <div>
                    <p className="ct-doc-name">
                      Documento generado · v{previewDoc.plantilla_version}
                      {!esUltima && <span className="ct-doc-old-tag"> versión anterior</span>}
                    </p>
                    <p className="ct-doc-meta">{fmtDateTime(previewDoc.fecha_generacion)} · hash {previewDoc.hash_sha256.slice(0, 12)}…</p>
                  </div>
                </div>
                <div className="ct-doc-actions">
                  {docs.length > 1 && (
                    <select
                      className="ct-select"
                      value={previewDoc.id}
                      onChange={e => setPreviewDocId(Number(e.target.value))}
                      title="Versión del documento a previsualizar"
                    >
                      {docs.map((d, i) => (
                        <option key={d.id} value={d.id}>
                          {i === 0 ? 'Última' : `v${d.plantilla_version}`} · {fmtDateTime(d.fecha_generacion)}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className={`ct-btn-secondary${showPreview ? ' active' : ''}`}
                    onClick={() => setShowPreview(v => !v)}
                    title={showPreview ? 'Ocultar la vista previa' : 'Previsualizar el PDF sin descargarlo'}
                  >
                    <Icon
                      d={showPreview
                        ? ['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94', 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19', 'M14.12 14.12a3 3 0 1 1-4.24-4.24', 'M1 1l22 22']
                        : ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z']}
                      color="var(--text-muted)" w={13}
                    />
                    {showPreview ? 'Ocultar vista previa' : 'Previsualizar'}
                  </button>
                  {showPreview && (
                    <button
                      className="ct-btn-secondary"
                      onClick={() => setFocusExpandido(true)}
                      title="Ver el PDF a pantalla completa (Esc para salir)"
                    >
                      <Icon d={['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7']} color="var(--text-muted)" w={13} />
                      Expandir
                    </button>
                  )}
                  <a className="ct-btn-secondary" href={`/api/plantillas/documentos/${previewDoc.id}/pdf/`} target="_blank" rel="noreferrer">
                    <Icon d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} color="var(--text-muted)" w={13} />
                    Descargar PDF
                  </a>
                </div>
              </div>
              )}
              {showPreview ? (
                <iframe
                  key={previewDoc.id}
                  className="ct-doc-frame"
                  title={`Previsualización del documento v${previewDoc.plantilla_version}`}
                  src={`/api/plantillas/documentos/${previewDoc.id}/pdf/?inline=1#view=FitH`}
                />
              ) : (
                <div className="ct-doc-preview-placeholder">
                  <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z']} color="var(--border)" w={32} />
                  <p>Vista previa oculta — usa <strong>Previsualizar</strong> para mostrarla.</p>
                </div>
              )}
            </>
          );
        })() : esBorradorPreview ? (
          <>
            <div className="ct-doc-header">
              <div className="ct-doc-info">
                <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--primary)" w={20} />
                <div>
                  <p className="ct-doc-name">
                    Vista previa del borrador
                    {borradorLoading && <span className="ct-doc-borrador-tag">Actualizando…</span>}
                  </p>
                  <p className="ct-doc-meta">Se actualiza al completar los campos · aún no es el documento oficial</p>
                </div>
              </div>
              <div className="ct-doc-actions">
                {modoPlantilla === 'clausulas' && (
                  <button className="ct-btn-secondary" disabled={busy} onClick={abrirEditorClausulas}>
                    Editar Cláusulas
                  </button>
                )}
                <button className="ct-btn-primary" disabled={busy || camposLoading} onClick={() => handleGenerarDocumento(false)}>
                  <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                  Generar Documento
                </button>
              </div>
            </div>
            {borradorError ? (
              <div className="ct-doc-empty">
                <Icon d={['M12 9v4', 'M12 17h.01', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z']} color="var(--warning)" w={32} />
                <p>No se pudo cargar la vista previa</p>
                <p className="ct-doc-empty-sub">{borradorError}</p>
                <button className="ct-btn-secondary" onClick={() => { setBorradorError(null); setBorradorNonce(n => n + 1); }}>
                  Reintentar
                </button>
              </div>
            ) : borradorUrl ? (
              <iframe
                className="ct-doc-frame"
                title="Vista previa del borrador del documento"
                src={`${borradorUrl}#view=FitH`}
              />
            ) : (
              <div className="ct-doc-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p>Generando vista previa…</p>
              </div>
            )}
          </>
        ) : (
          <div className="ct-doc-empty">
            <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 12v6', 'M9 15l3 3 3-3']} color="var(--border)" w={40} />
            <p>El documento aún no ha sido generado</p>
            <p className="ct-doc-empty-sub">Genera el documento base desde la plantilla activa para este tipo de contrato y software.</p>
            {contrato.plantilla_activa?.modo_origen === 'clausulas' && (
              <button className="ct-btn-secondary" disabled={busy} style={{ marginLeft: 8 }} onClick={abrirEditorClausulas}>
                Editar Cláusulas
              </button>
            )}
            <button className="ct-btn-primary" disabled={busy || camposLoading} style={{ marginLeft: 8 }} onClick={() => handleGenerarDocumento(false)}>
              <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
              Generar Documento
            </button>
          </div>
        )}
      </div>

      {!focusMode && (
      <div className="ct-side-col">

      {/* ── Panel de cláusulas del contrato ── */}
      {mostrarSeccionClausulas && (
        <aside className="ct-cl-panel" aria-label="Cláusulas del contrato">
          <div className="ct-cl-head">
            <div>
              <p className="ct-cl-title">Cláusulas del documento</p>
              <p className="ct-cl-sub">
                {bloquesContrato.length > 0
                  ? `${bloquesContrato.length} cláusula${bloquesContrato.length === 1 ? '' : 's'} · se aplican al generar`
                  : 'El documento se genera con estas cláusulas'}
              </p>
            </div>
            {clausulasEditables && (
              <button className="ct-btn-secondary" disabled={busy} onClick={abrirEditorClausulas}>
                <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} color="var(--text-muted)" w={13} />
                {bloquesContrato.length > 0 ? 'Editar' : 'Añadir'}
              </button>
            )}
          </div>

          {bloquesContrato.length === 0 ? (
            <div className="ct-cl-empty">
              {contrato.texto_adicional_clausulas ? (
                <>
                  Este contrato tiene texto de cláusulas sin estructurar
                  (editado antes del editor de bloques o sincronizado desde Word/Docs).
                  {clausulasEditables && ' Ábrelo con "Editar" para convertirlo en bloques.'}
                </>
              ) : clausulasEditables ? (
                <>Aún no hay cláusulas. Usa <strong>Añadir</strong> para insertar cláusulas
                de la biblioteca o redactar texto propio antes de generar el documento.</>
              ) : (
                'Este contrato no registró cláusulas estructuradas.'
              )}
            </div>
          ) : (
            <div className="ct-cl-list">
              {bloquesContrato.map((b, i) => {
                const lib = b.clausula_id ? bibliotecaClausulas.find(x => x.id === b.clausula_id) : null;
                return (
                  <div key={i} className="ct-cl-item">
                    <div className="ct-cl-item-head">
                      <span className="ct-cl-num">{i + 1}</span>
                      <span className="ct-cl-name" title={b.titulo || 'Bloque de texto'}>
                        {b.titulo || 'Bloque de texto'}
                      </span>
                    </div>
                    <p className="ct-cl-snippet">{b.texto}</p>
                    <div className="ct-cl-badges">
                      <span className="ct-cl-badge">{b.origen === 'biblioteca' ? 'Biblioteca' : 'Personalizada'}</span>
                      {lib?.risk && <span className={`ct-cl-badge ct-cl-riesgo-${lib.risk.toLowerCase()}`}>Riesgo {lib.risk}</span>}
                      {b.modificada && <span className="ct-cl-badge ct-cl-editada" title="El texto difiere de la versión de la biblioteca">Editada</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!clausulasEditables && bloquesContrato.length > 0 && (
            <p className="ct-cl-lock">
              Solo lectura: las cláusulas se editan en etapa Borrador o En Revisión.
            </p>
          )}
        </aside>
      )}

      {/* ── Panel inline de Contenido del Documento (campos HTML) ── */}
      {contrato.plantilla_activa?.modo_origen === 'html' && camposPlantilla.length > 0 && clausulasEditables && (
        <aside className="ct-cl-panel" aria-label="Contenido del documento" style={{ marginTop: 0, flex: 'none', overflow: 'visible' }}>
          <div className="ct-cl-head">
            <div>
              <p className="ct-cl-title">Contenido del Documento</p>
              <p className="ct-cl-sub">
                Campos propios de la plantilla. Complétalos antes de generar el documento.
              </p>
            </div>
          </div>
          <div className="ct-campos-panel-body">
            <div className="ct-campos-panel-list">
              {camposPlantilla.slice((camposPage - 1) * 4, camposPage * 4).map(c => (
                <CampoClausulaHtml
                  key={c.nombre}
                  campo={c}
                  biblioteca={bibliotecaClausulas}
                  seleccionId={camposSelects[c.nombre]}
                  idsUsados={idsUsadosEnDocumento}
                  onInsert={(clausula) => insertarClausulaEnCampo(c.nombre, clausula)}
                >
                  {c.multilinea ? (
                    <div className="ct-campo-richtext">
                      <ClausulaBloqueRichText
                        texto={camposValores[c.nombre] ?? ''}
                        onUpdate={({ texto }) => setCamposValores(prev => ({ ...prev, [c.nombre]: texto }))}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="ct-campo-input"
                      value={camposValores[c.nombre] ?? ''}
                      onChange={e => setCamposValores(prev => ({ ...prev, [c.nombre]: e.target.value }))}
                      placeholder={c.default}
                    />
                  )}
                </CampoClausulaHtml>
              ))}
            </div>
            <p className="ct-campos-panel-hint">
              Si dejas una cláusula en blanco, se eliminará por completo del documento generado.
            </p>

            {camposPlantilla.length > 4 && (
              <div className="ct-campos-panel-pager">
                <Pagination
                  page={camposPage}
                  totalPages={Math.ceil(camposPlantilla.length / 4)}
                  totalCount={camposPlantilla.length}
                  pageSize={4}
                  setPage={setCamposPage}
                  itemName="campos"
                  compact={true}
                />
              </div>
            )}
          </div>
        </aside>
      )}

      <div className="ct-anexos-panel">
        <div className="ct-anexos-header">
          <p className="ct-section-label">Anexos y Adendas</p>
        </div>
        {contrato.anexos.length === 0 ? (
          <p className="ct-anexos-empty">Sin anexos. Los anexos aparecerán aquí cuando se adjunten archivos al contrato.</p>
        ) : (
          <div className="ct-anexos-list">
            {contrato.anexos.map(a => (
              <div key={a.id} className="ct-anexo-item">
                <div className="ct-anexo-info">
                  <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--text-muted)" w={14} />
                  <div>
                    <p className="ct-anexo-name">{a.nombre}</p>
                    <p className="ct-anexo-date">{fmtDate(a.fecha_subida)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>
      )}
    </div>
  );
}
