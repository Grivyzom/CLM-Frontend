import { useState, useEffect } from 'react';
import { getClausulas, createPlantilla, updatePlantilla, getAvailableHtmlTemplates } from '../../api';
import { Icon } from './ui';
import { TEMPLATE_VACIO } from './helpers';

// ─── New Template Modal ─────────────────────────────────────────────────────
export default function NewTemplateModal({ onClose, onSuccess, createForm, setCreateForm, softwareList, editingTemplate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!editingTemplate;

  const [searchSoft, setSearchSoft] = useState('');
  const [showSoft, setShowSoft] = useState(false);
  const filteredSoft = (softwareList || []).filter(s => (s.name || s.nombre || '').toLowerCase().includes(searchSoft.toLowerCase()));

  const [clausulasOpciones, setClausulasOpciones] = useState([]);
  const [htmlTemplatesOpciones, setHtmlTemplatesOpciones] = useState([]);
  useEffect(() => {
    getClausulas().then(setClausulasOpciones).catch(() => {});
  }, []);

  // Plantillas HTML filtradas por el tipo de contrato elegido (nomenclatura
  // TIPO__Nombre.dc.html en docs_template/); las globales aparecen siempre.
  useEffect(() => {
    getAvailableHtmlTemplates(createForm.tipo_contrato)
      .then(opciones => {
        setHtmlTemplatesOpciones(opciones);
        // Si la ruta elegida ya no es válida para el nuevo tipo, se descarta.
        if (createForm.ruta_plantilla_html && !opciones.some(o => o.ruta === createForm.ruta_plantilla_html)) {
          setCreateForm(prev => ({ ...prev, ruta_plantilla_html: '' }));
        }
      })
      .catch(() => setHtmlTemplatesOpciones([]));
  }, [createForm.tipo_contrato]);

  const setField = (field, value) => setCreateForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.nombre || !createForm.tipo_contrato || !createForm.version_codigo || !createForm.software_id) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (!isEdit && createForm.modo_origen === 'archivo' && !createForm.archivo_docx) {
      setError('Debes subir un archivo .docx para el modo "Documento propio".');
      return;
    }
    if (createForm.modo_origen === 'html' && !createForm.ruta_plantilla_html?.trim()) {
      setError('Debes seleccionar una plantilla HTML del listado.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('nombre', createForm.nombre);
      fd.append('tipo_contrato', createForm.tipo_contrato);
      fd.append('version_codigo', createForm.version_codigo);
      fd.append('software', createForm.software_id);
      fd.append('modo_origen', createForm.modo_origen);
      fd.append('requiere_sla_facturacion', createForm.requiere_sla_facturacion !== false ? 'true' : 'false');
      if (createForm.archivo_docx) fd.append('archivo_docx', createForm.archivo_docx);
      if (createForm.modo_origen === 'clausulas') {
        fd.append('clausulas_seleccionadas', JSON.stringify(createForm.clausulas_seleccionadas || []));
      }
      if (createForm.modo_origen === 'html') {
        fd.append('ruta_plantilla_html', createForm.ruta_plantilla_html || '');
        fd.append('codigo_prefijo', createForm.codigo_prefijo || '');
      }

      if (isEdit) {
        await updatePlantilla(editingTemplate.id, fd);
      } else {
        await createPlantilla(fd);
      }
      setCreateForm(TEMPLATE_VACIO);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
    outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--surface)',
  };
  const labelStyle = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };
  const modeBtn = (active) => ({
    flex: 1, padding: '8px 12px', borderRadius: 5,
    border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
    background: active ? 'var(--primary-bg)' : 'var(--bg-faint)',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s',
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{isEdit ? 'Editar Plantilla de Contrato' : 'Nueva Plantilla de Contrato'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>El software seleccionado determina qué plantilla se usa al crear contratos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre de Plantilla *</label>
            <input
              style={inputStyle}
              value={createForm.nombre}
              onChange={e => setField('nombre', e.target.value)}
              placeholder="Ej: Contrato de Prestación de Servicios CPS"
              required
            />
          </div>

          {/* Software + Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Software / Producto *</label>
              <div
                onClick={() => setShowSoft(!showSoft)}
                style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {createForm.software_id ? ((softwareList || []).find(s => s.id == createForm.software_id)?.name || (softwareList || []).find(s => s.id == createForm.software_id)?.nombre) : 'Buscar producto...'}
                </span>
                <Icon d="M6 9l6 6 6-6" w={12} color="var(--text-muted)"/>
              </div>
              {showSoft && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <input
                    autoFocus
                    placeholder="Buscar..."
                    value={searchSoft}
                    onChange={e => setSearchSoft(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--neutral-200)', boxSizing: 'border-box', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: 'var(--text-primary)' }}
                  />
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {filteredSoft.length > 0 ? filteredSoft.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { setField('software_id', s.id); setShowSoft(false); setSearchSoft(''); }}
                        style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {s.name || s.nombre}
                      </div>
                    )) : <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>No hay resultados</div>}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Tipo de Contrato *</label>
              <select
                style={inputStyle}
                value={createForm.tipo_contrato}
                onChange={e => setField('tipo_contrato', e.target.value)}
                required
              >
                <option value="RECURRENTE">Recurrente</option>
                <option value="PERPETUO">Perpetuo</option>
                <option value="PRO_BONO">Pro Bono</option>
                <option value="INTERNO">Interno / Propio</option>
              </select>
            </div>
          </div>

          {/* Version */}
          <div>
            <label style={labelStyle}>Versión / Código *</label>
            <input
              style={inputStyle}
              value={createForm.version_codigo}
              onChange={e => setField('version_codigo', e.target.value)}
              placeholder="Ej: v1.0"
              required
            />
          </div>

          {/* Documento administrativo (sin SLA/facturación) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'var(--bg-faint)', border: '1px solid var(--border)', borderRadius: 6 }}>
            <input
              type="checkbox"
              id="requiere_sla_facturacion"
              checked={createForm.requiere_sla_facturacion !== false}
              onChange={e => setField('requiere_sla_facturacion', e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <label htmlFor="requiere_sla_facturacion" style={{ fontSize: 11.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Requiere SLA y facturación</strong>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Desmárcalo para documentos administrativos (NDA, memorándums, fichas de requerimientos) —
                el wizard "Nuevo Contrato" no pedirá SLA, monto ni días de gracia para esta plantilla.
              </div>
            </label>
          </div>

          {/* Modo origen */}
          <div>
            <label style={labelStyle}>Modo de generación del documento *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={modeBtn(createForm.modo_origen === 'archivo')}
                onClick={() => setField('modo_origen', 'archivo')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" w={14} color={createForm.modo_origen === 'archivo' ? 'var(--primary)' : 'var(--text-muted)'} />
                  Subir documento (.docx)
                </span>
              </button>
              <button
                type="button"
                style={modeBtn(createForm.modo_origen === 'clausulas')}
                onClick={() => setField('modo_origen', 'clausulas')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" w={14} color={createForm.modo_origen === 'clausulas' ? 'var(--primary)' : 'var(--text-muted)'} />
                  Generar con cláusulas
                </span>
              </button>
              <button
                type="button"
                style={modeBtn(createForm.modo_origen === 'html')}
                onClick={() => setField('modo_origen', 'html')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" w={14} color={createForm.modo_origen === 'html' ? 'var(--primary)' : 'var(--text-muted)'} />
                  Código HTML
                </span>
              </button>
            </div>
          </div>

          {/* Archivo — solo si modo = archivo */}
          {createForm.modo_origen === 'archivo' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px', border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--bg-faint)'
            }}>
              <label style={{ ...labelStyle, textAlign: 'center', marginBottom: 12 }}>Archivo Word (.docx) *</label>
              <label style={{
                cursor: 'pointer', padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit',
                transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 6
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" w={14} color="var(--text-muted)" />
                Seleccionar archivo
                <input
                  type="file"
                  accept=".docx"
                  onChange={e => setField('archivo_docx', e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
              {createForm.archivo_docx && (
                <p style={{ margin: '12px 0 0 0', fontSize: 11, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon d="M20 6L9 17l-5-5" w={12} color="var(--success)" /> {createForm.archivo_docx.name} ({Math.round(createForm.archivo_docx.size / 1024)} KB)
                </p>
              )}
            </div>
          )}

          {createForm.modo_origen === 'clausulas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '10px 12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01" w={14} color="var(--success-deep)" />
                <p style={{ margin: 0, fontSize: 11, color: 'var(--success-deep)', fontWeight: 600 }}>
                  El documento se generará automáticamente con las cláusulas seleccionadas.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Seleccionar Cláusulas</label>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 5, padding: 8, background: 'var(--surface)' }}>
                  {clausulasOpciones.map(c => {
                    const isSelected = (createForm.clausulas_seleccionadas || []).includes(c.id);
                    return (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelection = e.target.checked
                              ? [...(createForm.clausulas_seleccionadas || []), c.id]
                              : (createForm.clausulas_seleccionadas || []).filter(id => id !== c.id);
                            setField('clausulas_seleccionadas', newSelection);
                          }}
                        />
                        {c.name} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({c.cat})</span>
                      </label>
                    );
                  })}
                  {clausulasOpciones.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cargando cláusulas...</div>}
                </div>
              </div>
            </div>
          )}

          {createForm.modo_origen === 'html' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Plantilla HTML en backend *</label>
              <select
                style={inputStyle}
                value={createForm.ruta_plantilla_html || ''}
                onChange={e => setField('ruta_plantilla_html', e.target.value)}
                required
              >
                <option value="">-- Seleccionar archivo HTML --</option>
                {htmlTemplatesOpciones.map(t => (
                  <option key={t.ruta} value={t.ruta}>
                    {t.nombre}{t.tipo ? ` — ${t.tipo}` : ' — Global'}
                  </option>
                ))}
              </select>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>
                Solo se listan plantillas del tipo seleccionado y las globales.
                Nomenclatura de archivo: <code>TIPO__Nombre.dc.html</code> (ej: <code>INTERNO__Memorandum.dc.html</code>).
              </p>

              <label style={{ ...labelStyle, marginTop: 4 }}>Prefijo de Referencia</label>
              <input
                style={inputStyle}
                value={createForm.codigo_prefijo || ''}
                onChange={e => setField('codigo_prefijo', e.target.value.toUpperCase().slice(0, 20))}
                placeholder="Ej: NDA, MSA, TOS, REQ"
              />
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>
                El sistema arma el código de "Referencia" del documento como <code>PREFIJO-AÑO-NNN</code> (ej: <code>NDA-2026-004</code>)
                y lo asigna solo al generar el documento — nunca se pide al usuario. Plantillas con el mismo prefijo comparten
                el mismo correlativo. Déjalo vacío para usar <code>DOC</code>.
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12 }}>
              <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-faint)', flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancelar</button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '7px 16px', borderRadius: 5, border: 'none',
              background: saving ? 'var(--primary-soft)' : 'var(--primary)',
              color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}
          >{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios ✓' : 'Crear plantilla ✓')}</button>
        </div>
      </form>
    </div>
  );
}
