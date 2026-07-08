import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ContractEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  
  useEffect(() => {
    if (location.state?.clauseText) {
      setContent(location.state.clauseText);
    }
  }, [location.state]);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Nuevo Contrato (Editor Libre)</h1>
          <p className="page-description">Redacta tu contrato con contenido propio.</p>
        </div>
        <button className="catalogo-btn-secondary" onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-topbar)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="catalogo-btn-primary">
              Guardar Contrato
            </button>
        </div>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            flex: 1,
            width: '100%',
            padding: '24px',
            border: 'none',
            resize: 'none',
            outline: 'none',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            background: 'transparent'
          }}
          placeholder="Comienza a escribir el contenido de tu contrato aquí..."
        />
      </div>
    </div>
  );
}
