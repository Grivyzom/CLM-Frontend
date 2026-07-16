import React, { useState } from 'react';
import { manageSignature } from '../../api';
import './SignatureSimulator.css';

export default function SignatureSimulator({ contrato, proveedor, onClose, onSignComplete }) {
  const [signed, setSigned] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Generate a mock audit code
  const [auditCode] = useState(() => {
    return Math.random().toString(16).substring(2, 10).toUpperCase() + '-' +
           Math.random().toString(16).substring(2, 6).toUpperCase() + '-4' +
           Math.random().toString(16).substring(2, 5).toUpperCase() + '-A3F2-D5E3C7B2F6E9';
  });

  const clientName = contrato?.cliente?.nombre || 'Representante Legal Cliente';

  async function handleFinishSigning() {
    if (!signed) return;
    setBusy(true);
    setError(null);
    try {
      await manageSignature(contrato.id, { action: 'sign' });
      setBusy(false);
      if (onSignComplete) onSignComplete();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al registrar la firma digital.');
      setBusy(false);
    }
  }

  function handleAdoptAndSign() {
    setSigned(true);
    setShowAdoptModal(false);
  }

  const isDocusign = proveedor === 'DOCUSIGN';

  return (
    <div className="sig-sim-overlay">
      <div className={`sig-sim-window ${isDocusign ? 'docusign' : 'adobe'}`}>
        
        {/* Header Bar */}
        <div className="sig-sim-header">
          <div className="sig-sim-brand">
            {isDocusign ? (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
                <span>DocuSign eSignature</span>
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span>Adobe Acrobat Sign</span>
              </>
            )}
          </div>
          
          <div className="sig-sim-header-actions">
            {error && (
              <span style={{ fontSize: 11, color: '#ff4d4d', marginRight: 12 }}>{error}</span>
            )}
            <button 
              className="sig-sim-secondary-btn" 
              onClick={onClose}
              disabled={busy}
            >
              Cancelar y Salir
            </button>
            <button 
              className="sig-sim-primary-btn" 
              disabled={!signed || busy}
              onClick={handleFinishSigning}
            >
              {busy ? 'Procesando...' : signed ? 'Finalizar Firma' : 'Pendiente de Firma'}
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="sig-sim-workspace">
          
          {/* Central PDF Panel */}
          <div className="sig-sim-doc-panel">
            <div className="sig-sim-doc-page">
              <h1 className="sig-sim-doc-title">
                {contrato.nombre || 'Contrato de Servicios'}
              </h1>
              
              <div className="sig-sim-doc-body">
                {contrato.texto_adicional_clausulas || `CONTRATO DE LICENCIA DE SOFTWARE Y SERVICIOS

Por el presente instrumento, las partes celebran el contrato de prestación de servicios y provisión de licencias para el producto "${contrato.software?.nombre || 'Software Scoped'}".

1. OBJETO DEL CONTRATO
El Proveedor otorga una licencia temporal y se compromete a cumplir las métricas de servicio detalladas en la biblioteca legal del CLM.

2. MONTO Y FORMA DE PAGO
El valor fijado para los servicios contratados asciende a la suma de ${contrato.monto} pagaderos de forma ${contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : 'Mensual'}.

3. CONFIDENCIALIDAD
Las partes acuerdan mantener estricta reserva de toda la información confidencial a la que tengan acceso.

En señal de conformidad con los términos descritos, las partes proceden a firmar digitalmente en el panel inferior.`}
              </div>

              {/* Signature area placeholder */}
              <div style={{ marginTop: 48, borderTop: '1px solid #eee', paddingTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Firmado por Proveedor:</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, margin: '8px 0 0', color: '#666' }}>[Representante CLM - Firmado OTP]</p>
                </div>
                
                <div style={{ position: 'relative', width: 240, height: 80 }}>
                  <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>Firma del Cliente ({clientName}):</p>
                  
                  {!signed ? (
                    <div 
                      className="sig-sim-sticky-indicator"
                      onClick={() => setShowAdoptModal(true)}
                    >
                      <span className="sig-sim-sticky-tag">
                        {isDocusign ? 'FIRMAR AQUÍ' : 'CLIC PARA FIRMAR'}
                      </span>
                      <span className="sig-sim-sticky-label">
                        🖊️ Clic para firmar
                      </span>
                    </div>
                  ) : (
                    <div className="sig-sim-applied-signature">
                      <p className="sig-sim-cursive-text">{clientName}</p>
                      <span className="sig-sim-audit-code">
                        Cód. Auditoría: {auditCode.slice(0, 18)}
                      </span>
                      <span style={{ fontSize: 7, color: '#999', fontFamily: 'monospace' }}>
                        Fecha: {new Date().toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info Pane */}
          <div className="sig-sim-sidebar">
            <span className="sig-sim-sidebar-title">Guía de Firma</span>
            
            <div className="sig-sim-step-list">
              <div className={`sig-sim-step-item ${!signed ? 'active' : ''}`}>
                <div className="sig-sim-step-num">1</div>
                <div>
                  <strong>Revisar</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>Lee los términos del acuerdo comercial presentados a la izquierda.</p>
                </div>
              </div>

              <div className={`sig-sim-step-item ${!signed ? 'active' : ''}`}>
                <div className="sig-sim-step-num">2</div>
                <div>
                  <strong>Firmar</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>Haz clic en el recuadro amarillo/azul de firma para adoptar tu rúbrica digital.</p>
                </div>
              </div>

              <div className={`sig-sim-step-item ${signed ? 'active' : ''}`}>
                <div className="sig-sim-step-num">3</div>
                <div>
                  <strong>Finalizar</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>Presiona el botón "Finalizar Firma" arriba a la derecha para archivar en el CLM.</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', background: '#fafafa', border: '1px solid #eee', borderRadius: 4, padding: 10, fontSize: 10, color: '#888', lineHeight: 1.4 }}>
              🛡️ <strong>Validez Legal:</strong> Este acuerdo se cierra en conformidad con la Ley Nº 19.799 sobre Documentos Electrónicos y Firma Electrónica, certificando la inmutabilidad y autenticidad del acuerdo.
            </div>
          </div>
        </div>

        {/* Adopt Signature Modal Dialog */}
        {showAdoptModal && (
          <div className="sig-adopt-dialog-overlay">
            <div className="sig-adopt-dialog">
              <div className="sig-adopt-header">
                Adoptar y aplicar firma electrónica
              </div>
              <div className="sig-adopt-body">
                <p style={{ margin: 0, fontSize: 12.5, color: '#5f6368' }}>
                  Confirma cómo se representará tu rúbrica electrónica en el acuerdo oficial:
                </p>
                
                <div className="sig-adopt-preview">
                  <span className="sig-adopt-preview-text">{clientName}</span>
                </div>
                
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>
                  Al presionar <strong>Adoptar y aplicar</strong>, aceptas que la representación manuscrita electrónica de tu nombre es legalmente vinculante para la firma de este acuerdo.
                </div>
              </div>
              <div className="sig-adopt-footer">
                <button 
                  className="sig-adopt-btn-secondary"
                  onClick={() => setShowAdoptModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="sig-adopt-btn-primary"
                  onClick={handleAdoptAndSign}
                >
                  Adoptar y aplicar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
