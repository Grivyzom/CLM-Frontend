import React, { useState } from 'react';
import { updateContrato } from '../api';

export default function EditContractModal({ contrato, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nombre: contrato.nombre || '',
    monto: contrato.monto || '',
    fecha_inicio: contrato.fecha_inicio || '',
    fecha_vencimiento: contrato.fecha_vencimiento || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData };
      if (payload.monto === '') payload.monto = null;
      if (payload.fecha_inicio === '') payload.fecha_inicio = null;
      if (payload.fecha_vencimiento === '') payload.fecha_vencimiento = null;
      await updateContrato(contrato.id, payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al actualizar el contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ctm-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="ctm-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="ctm-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h2 className="ctm-title">Actualizar Contrato</h2>
          <button className="ctm-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div style={{ color: 'var(--danger)', fontSize: '12px' }}>{error}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Nombre del Contrato</label>
            <input 
              type="text" 
              value={formData.nombre} 
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Monto</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.monto} 
              onChange={e => setFormData({ ...formData, monto: e.target.value })}
              style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Fecha Inicio</label>
            <input 
              type="date" 
              value={formData.fecha_inicio} 
              onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
              style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Fecha Vencimiento</label>
            <input 
              type="date" 
              value={formData.fecha_vencimiento} 
              onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid var(--border)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '8px 16px', border: 'none', background: 'var(--primary)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
