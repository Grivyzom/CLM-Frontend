import React, { useState, useEffect } from 'react';
import { getClientes, getSLAs, createContrato, generarDocumentoContrato, getCamposPlantilla } from '../../api';
import { Icon } from './ui';
import { useConfirm } from '../../contexts/ConfirmContext';

// ─── Use Template Modal (wizard: cliente → configuración → creado) ──────────
export default function UseTemplateModal({ plantilla, onClose }) {
  const { alert: alertModal } = useConfirm();
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [contractName, setContractName] = useState(plantilla.name || '');
  const [isCreating, setIsCreating] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [slas, setSlas] = useState([]);

  // Campos manuales de la plantilla (ej. PARA/DE/ASUNTO de un memorándum):
  // se recolectan en un paso propio del wizard antes de crear el contrato,
  // porque el contrato todavía no existe en este punto del flujo.
  const [camposPlantilla, setCamposPlantilla] = useState([]);
  const [camposValores, setCamposValores] = useState({});
  const hasCampos = camposPlantilla.length > 0;

  useEffect(() => {
    getClientes({ page_size: 200 })
      .then((data) => setClientes(Array.isArray(data) ? data : data.results || []))
      .catch(() => setClientes([]));
    getSLAs()
      .then((data) => setSlas(Array.isArray(data) ? data : []))
      .catch(() => setSlas([]));
    if (plantilla.modo_origen === 'html') {
      getCamposPlantilla({ plantillaId: plantilla.id })
        .then(({ campos }) => {
          setCamposPlantilla(campos || []);
          setCamposValores(Object.fromEntries((campos || []).map(c => [c.nombre, ''])));
        })
        .catch(() => setCamposPlantilla([]));
    }
  }, [plantilla.id, plantilla.modo_origen]);

  // Escape no cierra mientras se está creando el contrato (evita abandonar
  // el wizard a mitad de una creación en curso).
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !isCreating) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isCreating]);

  const filteredClients = clientes.filter(c => {
    const name = c.razon_social || c.nombre_comercial || '';
    const rut = c.id_fiscal || '';
    return name.toLowerCase().includes(clientSearch.toLowerCase()) || rut.includes(clientSearch);
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const validTipos = ['RECURRENTE', 'PERPETUO', 'PRO_BONO', 'INTERNO'];
      let finalTipoContrato = plantilla.tipo_contrato;
      if (!validTipos.includes(finalTipoContrato)) {
        finalTipoContrato = 'RECURRENTE';
      }

      const nuevoContrato = await createContrato({
        cliente_id: selectedClient.id,
        software_id: plantilla.software_id || 1, // Fallback si la plantilla no tiene software asociado
        sla_id: slas.length > 0 ? slas[0].id : 1, // Fallback si no hay SLAs cargados
        tipo_contrato: finalTipoContrato,
        monto: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
        frecuencia_facturacion: finalTipoContrato === 'RECURRENTE' ? 'MENSUAL' : undefined,
      });
      // Generar el documento con ESTA plantilla explícita (plantilla_id):
      // no hace falta activarla globalmente — y activar aquí archivaría en
      // silencio la versión activa de la misma familia como efecto colateral.
      await generarDocumentoContrato({
        contrato_id: nuevoContrato.id,
        plantilla_id: plantilla.id,
        campos: camposValores,
      });

      setStep(3);
    } catch (e) {
      alertModal({ title: 'Error creando contrato', message: e.message || String(e), isDangerous: true });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-topbar)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, background: plantilla.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: plantilla.color, fontFamily: "'JetBrains Mono',monospace" }}>{plantilla.abbr}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {step === 3 ? 'Contrato creado' : 'Crear contrato desde plantilla'}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)' }}>{plantilla.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 18, transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-200)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >×</button>
        </div>

        {/* Steps indicator */}
        {step < 3 && (() => {
          const stepsList = [{n:1,label:'Cliente'},{n:2,label:'Configuración del contrato'}];
          if (hasCampos) stepsList.push({n:2.5,label:'Personalizar contenido'});
          return (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bg-topbar)', display: 'flex', gap: 0 }}>
              {stepsList.map((s, i) => (
                <React.Fragment key={s.n}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      background: step >= s.n ? 'var(--primary)' : 'var(--neutral-200)',
                      color: step >= s.n ? 'var(--text-on-accent)' : 'var(--text-faint)'
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: step >= s.n ? 'var(--primary)' : 'var(--text-faint)' }}>{s.label}</span>
                  </div>
                  {i < stepsList.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--neutral-200)', margin: '0 10px', alignSelf: 'center' }} />}
                </React.Fragment>
              ))}
            </div>
          );
        })()}

        {/* Body */}
        <div style={{ padding: '16px 20px', minHeight: 220 }}>
          {step === 1 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Selecciona el cliente para el nuevo contrato</p>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '7px 10px 7px 30px', border: '1px solid var(--border)',
                    borderRadius: 5, fontSize: 12, fontFamily: 'inherit',
                    outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {filteredClients.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No se encontraron clientes.</p>}
                {filteredClients.map(c => {
                  const cName = c.razon_social || c.nombre_comercial || 'Sin nombre';
                  const cRut = c.id_fiscal || 'Sin RUT';
                  const cType = c.tipo === 'juridica' ? 'Empresa' : 'Persona Natural';

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', border: '1px solid',
                        borderColor: selectedClient?.id === c.id ? 'var(--primary)' : 'var(--neutral-200)',
                        background: selectedClient?.id === c.id ? 'rgba(37,99,235,0.05)' : 'var(--bg-faint)',
                        borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{cName}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono',monospace" }}>{cRut}</p>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                        background: cType === 'Empresa' ? 'rgba(37,99,235,0.08)' : 'var(--success-bg)',
                        color: cType === 'Empresa' ? 'var(--primary)' : 'var(--success-deep)'
                      }}>{cType}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Nombre del contrato</p>
              <input
                type="text"
                value={contractName}
                onChange={e => setContractName(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', border: '1px solid var(--border)',
                  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', color: 'var(--text-primary)', marginBottom: 14
                }}
                autoFocus
              />
              <div style={{ background: 'var(--bg-page)', borderRadius: 6, padding: '10px 14px', border: '1px solid var(--neutral-200)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Resumen</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Plantilla:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{plantilla.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cliente:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedClient?.razon_social || selectedClient?.nombre_comercial}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Variables:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>{hasCampos ? camposPlantilla.length : (plantilla.vars || 0)} a completar</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 2.5 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Completa el contenido del documento</p>
              <p style={{ margin: '0 0 12px', fontSize: 10, color: 'var(--text-muted)' }}>Campos propios de esta plantilla. Déjalos en blanco para conservar el texto de ejemplo.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                {camposPlantilla.map(c => (
                  <div key={c.nombre}>
                    <label style={{ display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</label>
                    {c.multilinea ? (
                      <textarea
                        value={camposValores[c.nombre] ?? ''}
                        onChange={e => setCamposValores(prev => ({ ...prev, [c.nombre]: e.target.value }))}
                        placeholder={c.default}
                        style={{ width: '100%', minHeight: 80, padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
                      />
                    ) : (
                      <input
                        value={camposValores[c.nombre] ?? ''}
                        onChange={e => setCamposValores(prev => ({ ...prev, [c.nombre]: e.target.value }))}
                        placeholder={c.default}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'previewIn 0.3s ease-out' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--success-tint)', color: 'var(--success-alt)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 28, boxShadow: '0 4px 12px rgba(5,150,105,0.15)'
              }}>✓</div>
              <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Contrato y documento creados con éxito</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Se ha creado un nuevo contrato basado en la plantilla <strong>{plantilla.abbr}</strong> para el cliente <strong>{selectedClient?.razon_social || selectedClient?.nombre_comercial}</strong> y se ha generado su documento correspondiente.<br/><br/>
                Puedes revisarlo y editarlo en la sección de Contratos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--neutral-200)',
          display: 'flex', justifyContent: step === 3 ? 'center' : 'space-between', gap: 8,
          background: 'var(--bg-faint)'
        }}>
          {step < 3 ? (() => {
            const isBlocked = step === 1 ? !selectedClient : step === 2 ? !contractName.trim() : false;
            const goNext = () => {
              if (step === 1) return setStep(2);
              if (step === 2) return hasCampos ? setStep(2.5) : handleCreate();
              return handleCreate();
            };
            const goBack = () => {
              if (step === 1) return onClose();
              if (step === 2.5) return setStep(2);
              return setStep(1);
            };
            const nextLabel = (step === 1 || (step === 2 && hasCampos)) ? 'Siguiente →' : (isCreating ? 'Creando...' : 'Crear contrato ✓');
            return (
              <>
                <button
                  onClick={goBack}
                  style={{
                    padding: '7px 14px', borderRadius: 5, border: '1px solid var(--border)',
                    background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >{step === 1 ? 'Cancelar' : '← Atrás'}</button>
                <button
                  disabled={isCreating || isBlocked}
                  onClick={goNext}
                  style={{
                    padding: '7px 16px', borderRadius: 5, border: 'none',
                    background: isCreating || isBlocked ? 'var(--primary-soft)' : 'var(--primary)',
                    color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
                    cursor: isCreating || isBlocked ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s'
                  }}
                >{nextLabel}</button>
              </>
            );
          })() : (
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '9px 16px', borderRadius: 5, border: 'none',
                background: 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
            >Terminar y Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}
