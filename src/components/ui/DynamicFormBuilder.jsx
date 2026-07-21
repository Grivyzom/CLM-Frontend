import React, { useState, useEffect } from 'react';
import { getFormularioBuilder, saveFormularioBuilder, getClausulas } from '../../api';

// Íconos SVG simples
function Svg({ d, size = 16, color = 'currentColor', viewBox="0 0 24 24" }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none"
         stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'block' }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

export default function DynamicFormBuilder({ plantillaId, onClose }) {
  const [preguntas, setPreguntas] = useState([]);
  const [clausulas, setClausulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getFormularioBuilder(plantillaId),
      getClausulas()
    ]).then(([formData, clausulasData]) => {
      if (active) {
        setPreguntas(formData.preguntas || []);
        // Asumiendo que getClausulas() devuelve {results: [...]} o un array de cláusulas
        const cls = Array.isArray(clausulasData) ? clausulasData : (clausulasData.results || []);
        setClausulas(cls);
        setLoading(false);
      }
    }).catch(e => {
      console.error(e);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [plantillaId]);

  const handleAddPregunta = () => {
    setPreguntas([
      ...preguntas, 
      {
        id: `temp_${Date.now()}`,
        texto: '',
        tipo: 'booleano',
        opciones: [],
        reglas: []
      }
    ]);
  };

  const updatePregunta = (index, field, value) => {
    const newPreguntas = [...preguntas];
    newPreguntas[index] = { ...newPreguntas[index], [field]: value };
    // Si cambia el tipo, limpiamos opciones y reglas incompatibles
    if (field === 'tipo') {
      newPreguntas[index].opciones = [];
      newPreguntas[index].reglas = [];
    }
    setPreguntas(newPreguntas);
  };

  const removePregunta = (index) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

  const addOpcion = (pIndex) => {
    const newPreguntas = [...preguntas];
    newPreguntas[pIndex].opciones.push({ id: `temp_opt_${Date.now()}`, texto: '' });
    setPreguntas(newPreguntas);
  };

  const updateOpcion = (pIndex, oIndex, texto) => {
    const newPreguntas = [...preguntas];
    newPreguntas[pIndex].opciones[oIndex].texto = texto;
    setPreguntas(newPreguntas);
  };

  const removeOpcion = (pIndex, oIndex) => {
    const newPreguntas = [...preguntas];
    const optId = newPreguntas[pIndex].opciones[oIndex].id;
    newPreguntas[pIndex].opciones.splice(oIndex, 1);
    // Eliminar reglas asociadas a esta opción
    newPreguntas[pIndex].reglas = newPreguntas[pIndex].reglas.filter(r => r.opcion_respuesta_id !== optId);
    setPreguntas(newPreguntas);
  };

  const addRegla = (pIndex) => {
    const newPreguntas = [...preguntas];
    const p = newPreguntas[pIndex];
    newPreguntas[pIndex].reglas.push({
      id: `temp_regla_${Date.now()}`,
      opcion_respuesta_id: p.tipo === 'opcion_multiple' && p.opciones.length > 0 ? p.opciones[0].id : null,
      respuesta_booleana: p.tipo === 'booleano' ? true : null,
      clausula_version_id: ''
    });
    setPreguntas(newPreguntas);
  };

  const updateRegla = (pIndex, rIndex, field, value) => {
    const newPreguntas = [...preguntas];
    if (field === 'respuesta_booleana') value = value === 'true';
    newPreguntas[pIndex].reglas[rIndex][field] = value;
    setPreguntas(newPreguntas);
  };

  const removeRegla = (pIndex, rIndex) => {
    const newPreguntas = [...preguntas];
    newPreguntas[pIndex].reglas.splice(rIndex, 1);
    setPreguntas(newPreguntas);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFormularioBuilder(plantillaId, preguntas);
      alert('Formulario guardado con éxito.');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al guardar el formulario.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ctm-backdrop">
        <div className="ctm-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Cargando constructor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ctm-backdrop" style={{ padding: '20px', overflowY: 'auto' }}>
      <div className="ctm-panel" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', maxHeight: 'none' }}>
        <div className="ctm-header">
          <h2 className="ctm-title">Constructor de Formulario Dinámico</h2>
          <button className="ctm-close" onClick={onClose}><Svg d="M18 6L6 18M6 6l12 12" /></button>
        </div>
        
        <div className="ctm-body" style={{ padding: '20px', backgroundColor: '#fafafa' }}>
          {preguntas.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
              No hay preguntas configuradas. Comienza agregando una.
            </p>
          )}

          {preguntas.map((p, pIndex) => (
            <div key={p.id} style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Pregunta {pIndex + 1}</h3>
                <button onClick={() => removePregunta(pIndex)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="ctm-label">Texto de la pregunta</label>
                  <input className="ctm-control" value={p.texto} onChange={e => updatePregunta(pIndex, 'texto', e.target.value)} placeholder="Ej: ¿El contrato es internacional?" />
                </div>
                <div style={{ width: '200px' }}>
                  <label className="ctm-label">Tipo</label>
                  <select className="ctm-control" value={p.tipo} onChange={e => updatePregunta(pIndex, 'tipo', e.target.value)}>
                    <option value="booleano">Sí / No (Booleano)</option>
                    <option value="opcion_multiple">Opción Múltiple</option>
                  </select>
                </div>
              </div>

              {p.tipo === 'opcion_multiple' && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Opciones de Respuesta</h4>
                  {p.opciones.map((o, oIndex) => (
                    <div key={o.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input className="ctm-control" style={{ flex: 1 }} value={o.texto} onChange={e => updateOpcion(pIndex, oIndex, e.target.value)} placeholder="Texto de la opción..." />
                      <button onClick={() => removeOpcion(pIndex, oIndex)} className="ct-btn-secondary" style={{ padding: '0 10px' }}><Svg d="M18 6L6 18M6 6l12 12" size={14}/></button>
                    </div>
                  ))}
                  <button onClick={() => addOpcion(pIndex)} className="ct-btn-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>+ Agregar Opción</button>
                </div>
              )}

              <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                  Reglas de Inclusión
                  <button onClick={() => addRegla(pIndex)} className="ct-btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>+ Agregar Regla</button>
                </h4>
                
                {p.reglas.length === 0 && <p style={{ fontSize: '13px', color: '#888' }}>No hay reglas para esta pregunta.</p>}
                
                {p.reglas.map((r, rIndex) => (
                  <div key={r.id || rIndex} style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f0f4f8', padding: '10px', borderRadius: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>SI la respuesta es:</span>
                    
                    {p.tipo === 'booleano' ? (
                      <select className="ctm-control" style={{ width: '120px' }} value={String(r.respuesta_booleana)} onChange={e => updateRegla(pIndex, rIndex, 'respuesta_booleana', e.target.value)}>
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <select className="ctm-control" style={{ width: '200px' }} value={r.opcion_respuesta_id || ''} onChange={e => updateRegla(pIndex, rIndex, 'opcion_respuesta_id', e.target.value)}>
                        <option value="">Seleccione opción...</option>
                        {p.opciones.map(o => <option key={o.id} value={o.id}>{o.texto}</option>)}
                      </select>
                    )}
                    
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>ENTONCES incluir:</span>
                    
                    <select className="ctm-control" style={{ flex: 1 }} value={r.clausula_version_id || ''} onChange={e => updateRegla(pIndex, rIndex, 'clausula_version_id', e.target.value)}>
                      <option value="">Seleccione una versión de cláusula...</option>
                      {clausulas.map(c => (
                        <optgroup key={c.id} label={c.nombre}>
                          {(c.versiones || []).map(v => (
                            <option key={v.id} value={v.id}>{v.etiqueta} (Versión)</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <button onClick={() => removeRegla(pIndex, rIndex)} className="ct-btn-secondary" style={{ padding: '0 8px' }}><Svg d="M18 6L6 18M6 6l12 12" size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={handleAddPregunta} className="ct-btn-secondary" style={{ width: '100%', padding: '12px', borderStyle: 'dashed' }}>
            + Añadir Nueva Pregunta
          </button>
        </div>

        <div className="ctm-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} className="ct-btn-secondary" disabled={saving}>Cancelar</button>
          <button onClick={handleSave} className="ct-btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Formulario'}
          </button>
        </div>
      </div>
    </div>
  );
}
