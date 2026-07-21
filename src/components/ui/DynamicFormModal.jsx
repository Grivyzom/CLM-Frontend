import React, { useState, useEffect } from 'react';
import { getFormularioPlantilla, evaluarFormularioPlantilla } from '../../api';

export default function DynamicFormModal({ plantillaId, onClose, onComplete }) {
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    let active = true;
    getFormularioPlantilla(plantillaId)
      .then((data) => {
        if (active) {
          setPreguntas(data.preguntas || []);
          const initialRespuestas = {};
          (data.preguntas || []).forEach(p => {
            initialRespuestas[p.id] = p.tipo === 'booleano' ? false : '';
          });
          setRespuestas(initialRespuestas);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [plantillaId]);

  const handleChange = (preguntaId, value) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEvaluating(true);
    try {
      const data = await evaluarFormularioPlantilla(plantillaId, respuestas);
      // data.clausulas contiene las cláusulas a incluir
      onComplete(data.clausulas);
    } catch (err) {
      console.error("Error evaluando formulario", err);
      alert("Hubo un error al generar el contrato.");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="ctm-backdrop">
        <div className="ctm-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Cargando cuestionario dinámico...</p>
        </div>
      </div>
    );
  }

  if (preguntas.length === 0) {
    return (
      <div className="ctm-backdrop">
        <div className="ctm-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Esta plantilla no tiene un cuestionario configurado.</p>
          <button onClick={onClose} className="ct-btn-secondary" style={{ marginTop: '10px' }}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ctm-backdrop" onClick={onClose}>
      <div className="ctm-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="ctm-header">
          <h2 className="ctm-title">Cuestionario Dinámico</h2>
          <p className="ctm-subtitle">Responde para generar el contrato a medida</p>
        </div>
        
        <form onSubmit={handleSubmit} className="ctm-body">
          {preguntas.map(p => (
            <div key={p.id} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                {p.texto}
              </label>
              
              {p.tipo === 'booleano' && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label>
                    <input 
                      type="radio" 
                      name={`pregunta_${p.id}`} 
                      checked={respuestas[p.id] === true}
                      onChange={() => handleChange(p.id, true)}
                    /> Sí
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name={`pregunta_${p.id}`} 
                      checked={respuestas[p.id] === false}
                      onChange={() => handleChange(p.id, false)}
                    /> No
                  </label>
                </div>
              )}

              {p.tipo === 'opcion_multiple' && (
                <select 
                  className="ctm-control"
                  value={respuestas[p.id]}
                  onChange={e => handleChange(p.id, e.target.value)}
                  required
                >
                  <option value="">Selecciona una opción...</option>
                  {p.opciones.map(o => (
                    <option key={o.id} value={o.id}>{o.texto}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <div className="ctm-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="ct-btn-secondary" onClick={onClose} disabled={evaluating}>
              Cancelar
            </button>
            <button type="submit" className="ct-btn-primary" disabled={evaluating}>
              {evaluating ? 'Generando...' : 'Generar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
