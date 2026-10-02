import React, { useState, useEffect } from 'react';
import {
  getClientes,
  getSLAs,
  getSlaNA,
  getSoftwareList,
  createContrato,
  createCliente,
  generarDocumentoContrato,
  getCamposPlantilla,
} from '../../api';
import { Icon } from './ui';
import TerminosCondicionesEditor, { terminosDifieren, terminosParaEnviar } from './TerminosCondicionesEditor';
import MatrizCasosPruebaEditor, { DEFAULT_CASOS_PRUEBA } from '../../components/MatrizCasosPruebaEditor';
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
  const [loadingClientes, setLoadingClientes] = useState(true);

  // Quick Client Registration state (for empty tenants or creating clients on the fly)
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    tipo: 'juridica',
    nombre_o_razon: '',
    id_fiscal: '',
    email_principal: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientFormError, setClientFormError] = useState('');

  const targetTenantId = plantilla.tenant_id || plantilla._raw?.tenant_id || null;
  const targetTenantNombre = plantilla.tenant_nombre || plantilla._raw?.tenant_nombre || '';

  // Campos manuales de la plantilla (ej. PARA/DE/ASUNTO de un memorándum):
  // se recolectan en un paso propio del wizard antes de crear el contrato,
  // porque el contrato todavía no existe en este punto del flujo.
  const [camposPlantilla, setCamposPlantilla] = useState([]);
  const [camposValores, setCamposValores] = useState({});
  // Términos y condiciones de la plantilla, ajustables para este contrato.
  // Solo se guardan en el contrato si difieren de los de la plantilla.
  const [terminosPlantilla, setTerminosPlantilla] = useState(null);
  const [terminosValor, setTerminosValor] = useState(null);
  const tieneTerminos = !!terminosPlantilla?.activo;
  const hasCampos = camposPlantilla.length > 0 || tieneTerminos;

  useEffect(() => {
    setLoadingClientes(true);
    const clientParams = { page_size: 200 };
    if (targetTenantId) clientParams.tenant_id = targetTenantId;

    getClientes(clientParams)
      .then((data) => setClientes(Array.isArray(data) ? data : data.results || []))
      .catch(() => setClientes([]))
      .finally(() => setLoadingClientes(false));

    getSLAs(targetTenantId ? { tenant_id: targetTenantId } : {})
      .then((data) => setSlas(Array.isArray(data) ? data : []))
      .catch(() => setSlas([]));

    // Todos los modos: los campos solo existen en HTML, pero los términos
    // se imprimen en los tres.
    getCamposPlantilla({ plantillaId: plantilla.id })
      .then(({ campos, terminos_condiciones }) => {
        setCamposPlantilla(campos || []);
        setCamposValores(Object.fromEntries((campos || []).map((c) => [
          c.nombre,
          (c.tipo === 'casos_prueba' || c.nombre === 'casos_prueba') ? DEFAULT_CASOS_PRUEBA : ''
        ])));
        setTerminosPlantilla(terminos_condiciones || null);
        setTerminosValor(terminos_condiciones || null);
      })
      .catch(() => setCamposPlantilla([]));
  }, [plantilla.id, plantilla.modo_origen, targetTenantId]);

  // Escape no cierra mientras se está creando el contrato (evita abandonar
  // el wizard a mitad de una creación en curso).
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !isCreating && !creatingClient) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isCreating, creatingClient]);

  const filteredClients = clientes.filter((c) => {
    const name = c.razon_social || c.nombre_comercial || '';
    const rut = c.id_fiscal || '';
    return name.toLowerCase().includes(clientSearch.toLowerCase()) || rut.includes(clientSearch);
  });

  const handleQuickCreateClient = async (e) => {
    if (e) e.preventDefault();
    setClientFormError('');
    const nombre = newClientData.nombre_o_razon.trim();
    const idFiscal = newClientData.id_fiscal.trim();
    const email = newClientData.email_principal.trim();

    if (!nombre) {
      setClientFormError(
        newClientData.tipo === 'juridica' ? 'Razón Social es requerida.' : 'Nombre Completo es requerido.'
      );
      return;
    }
    if (!idFiscal) {
      setClientFormError(newClientData.tipo === 'juridica' ? 'RUT es requerido.' : 'RUN es requerido.');
      return;
    }
    if (!email) {
      setClientFormError('Email principal es requerido.');
      return;
    }

    setCreatingClient(true);
    try {
      const payload = {
        tipo: newClientData.tipo,
        email_principal: email,
      };
      if (targetTenantId) {
        payload.tenant_id = targetTenantId;
      }
      if (newClientData.tipo === 'natural') {
        payload.nombre_completo = nombre;
        payload.run = idFiscal;
      } else {
        payload.razon_social = nombre;
        payload.rut = idFiscal;
        payload.giro = 'General';
      }

      const created = await createCliente(payload);
      setClientes((prev) => [created, ...prev]);
      setSelectedClient(created);
      setShowNewClientForm(false);
      setNewClientData({ tipo: 'juridica', nombre_o_razon: '', id_fiscal: '', email_principal: '' });
    } catch (err) {
      setClientFormError(err.message || 'Error al registrar cliente');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const validTipos = ['RECURRENTE', 'PERPETUO', 'PRO_BONO', 'INTERNO', 'REQUERIMIENTO', 'ERS'];
      let finalTipoContrato = plantilla.tipo_contrato;
      if (!validTipos.includes(finalTipoContrato)) {
        finalTipoContrato = 'RECURRENTE';
      }

      // SLA resolution:
      let finalSlaId = null;
      if (
        plantilla.requiere_sla_facturacion === false ||
        finalTipoContrato === 'ERS' ||
        finalTipoContrato === 'REQUERIMIENTO'
      ) {
        const slaNa = await getSlaNA(targetTenantId);
        finalSlaId = slaNa.id;
      } else if (slas.length > 0) {
        finalSlaId = slas[0].id;
      } else {
        const slaNa = await getSlaNA(targetTenantId);
        finalSlaId = slaNa.id;
      }

      // Software resolution:
      let finalSoftwareId = plantilla.software_id;
      if (!finalSoftwareId) {
        const softwareList = await getSoftwareList(targetTenantId ? { tenant_id: targetTenantId } : {});
        if (softwareList && softwareList.length > 0) {
          finalSoftwareId = softwareList[0].id;
        }
      }

      const payload = {
        cliente_id: selectedClient.id,
        software_id: finalSoftwareId,
        sla_id: finalSlaId,
        tipo_contrato: finalTipoContrato,
        nombre: contractName.trim() || plantilla.name,
        monto: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
      };
      if (targetTenantId) {
        payload.tenant_id = targetTenantId;
      }
      if (finalTipoContrato === 'RECURRENTE') {
        payload.frecuencia_facturacion = 'MENSUAL';
      }

      const nuevoContrato = await createContrato(payload);

      // Generar el documento con ESTA plantilla explícita (plantilla_id):
      // no hace falta activarla globalmente — y activar aquí archivaría en
      // silencio la versión activa de la misma familia como efecto colateral.
      await generarDocumentoContrato({
        contrato_id: nuevoContrato.id,
        plantilla_id: plantilla.id,
        campos: camposValores,
        ...(terminosDifieren(terminosValor, terminosPlantilla)
          ? { terminos_condiciones: terminosParaEnviar(terminosValor) }
          : {}),
      });

      setStep(3);
    } catch (e) {
      alertModal({ title: 'Error creando contrato', message: e.message || String(e), isDangerous: true });
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      onClick={onClose}
      onWheel={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        overscrollBehavior: 'contain'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.3)',
          width: '100%',
          maxWidth: (step === 2.5 && camposPlantilla.some(c => c.tipo === 'casos_prueba' || c.nombre === 'casos_prueba')) ? 840 : 520,
          maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'previewIn 0.2s ease-out',
          overscrollBehavior: 'contain',
          transition: 'max-width 0.2s ease'
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
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-faint)' }}>
                {plantilla.name} {targetTenantNombre ? `• ${targetTenantNombre}` : ''}
              </p>
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
          const stepsList = [{ n: 1, label: 'Cliente' }, { n: 2, label: 'Configuración del contrato' }];
          if (hasCampos) stepsList.push({ n: 2.5, label: 'Personalizar contenido' });
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
        <div style={{ padding: '16px 20px', minHeight: 220, overflowY: 'auto', overscrollBehavior: 'contain', flex: 1 }}>
          {step === 1 && (
            <>
              {/* Context bar with tenant name and quick register toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12, padding: '6px 12px', background: 'var(--bg-faint)',
                borderRadius: 6, border: '1px solid var(--neutral-200)'
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Empresa: <strong style={{ color: 'var(--text-primary)' }}>{targetTenantNombre || 'Predeterminada'}</strong>
                </span>
                {!showNewClientForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(true)}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      color: 'var(--primary)', fontSize: 11, fontWeight: 600, padding: '2px 6px'
                    }}
                  >
                    + Nuevo cliente
                  </button>
                )}
              </div>

              {showNewClientForm ? (
                /* Quick Client Registration Form */
                <div style={{
                  padding: '14px', borderRadius: 8, border: '1px solid var(--primary-soft)',
                  background: 'var(--bg-page)', animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Registrar nuevo cliente para {targetTenantNombre || 'esta empresa'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setShowNewClientForm(false); setClientFormError(''); }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}
                    >
                      Cancelar
                    </button>
                  </div>

                  {clientFormError && (
                    <div style={{ padding: '6px 10px', borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 11, marginBottom: 10 }}>
                      {clientFormError}
                    </div>
                  )}

                  {/* Radio tipo */}
                  <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        checked={newClientData.tipo === 'juridica'}
                        onChange={() => setNewClientData(d => ({ ...d, tipo: 'juridica' }))}
                      />
                      Empresa (Jurídica)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        checked={newClientData.tipo === 'natural'}
                        onChange={() => setNewClientData(d => ({ ...d, tipo: 'natural' }))}
                      />
                      Persona Natural
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
                        {newClientData.tipo === 'juridica' ? 'RAZÓN SOCIAL *' : 'NOMBRE COMPLETO *'}
                      </label>
                      <input
                        type="text"
                        value={newClientData.nombre_o_razon}
                        onChange={e => setNewClientData(d => ({ ...d, nombre_o_razon: e.target.value }))}
                        placeholder={newClientData.tipo === 'juridica' ? 'Ej. Mi Empresa SpA' : 'Ej. Juan Pérez'}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: 12,
                          border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
                          {newClientData.tipo === 'juridica' ? 'RUT *' : 'RUN *'}
                        </label>
                        <input
                          type="text"
                          value={newClientData.id_fiscal}
                          onChange={e => setNewClientData(d => ({ ...d, id_fiscal: e.target.value }))}
                          placeholder={newClientData.tipo === 'juridica' ? '76.123.456-7' : '12.345.678-9'}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: 12,
                            border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
                          EMAIL PRINCIPAL *
                        </label>
                        <input
                          type="email"
                          value={newClientData.email_principal}
                          onChange={e => setNewClientData(d => ({ ...d, email_principal: e.target.value }))}
                          placeholder="contacto@cliente.com"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: 12,
                            border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => { setShowNewClientForm(false); setClientFormError(''); }}
                      style={{
                        padding: '6px 12px', borderRadius: 5, border: '1px solid var(--border)',
                        background: 'var(--surface)', fontSize: 11, cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={creatingClient}
                      onClick={handleQuickCreateClient}
                      style={{
                        padding: '6px 14px', borderRadius: 5, border: 'none',
                        background: creatingClient ? 'var(--primary-soft)' : 'var(--primary)',
                        color: 'var(--text-on-accent)', fontSize: 11, fontWeight: 600, cursor: creatingClient ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {creatingClient ? 'Guardando...' : 'Guardar y Seleccionar'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Client Search and List */
                <>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Selecciona el cliente para el nuevo contrato
                  </p>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13}
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre o RUT…"
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
                    {loadingClientes && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                        Cargando clientes…
                      </p>
                    )}

                    {!loadingClientes && clientes.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 10px', background: 'var(--bg-faint)', borderRadius: 6 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                          No hay clientes registrados para <strong>{targetTenantNombre || 'esta empresa'}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowNewClientForm(true)}
                          style={{
                            padding: '6px 12px', borderRadius: 5, border: 'none',
                            background: 'var(--primary)', color: 'var(--text-on-accent)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          + Registrar cliente para esta empresa
                        </button>
                      </div>
                    )}

                    {!loadingClientes && clientes.length > 0 && filteredClients.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                        No se encontraron clientes para "{clientSearch}".
                      </p>
                    )}

                    {!loadingClientes && filteredClients.map((c) => {
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
                  {targetTenantNombre && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Empresa / Tenant:</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{targetTenantNombre}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cliente:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedClient?.razon_social || selectedClient?.nombre_comercial}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Variables:</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>{camposPlantilla.length > 0 ? camposPlantilla.length : (plantilla.vars || 0)} a completar</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 2.5 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Completa el contenido del documento</p>
              {camposPlantilla.length > 0 && (
                <p style={{ margin: '0 0 12px', fontSize: 10, color: 'var(--text-muted)' }}>Campos propios de esta plantilla. Déjalos en blanco para conservar el texto de ejemplo.</p>
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                maxHeight: camposPlantilla.some(c => c.tipo === 'casos_prueba' || c.nombre === 'casos_prueba') ? 'min(580px, 62vh)' : 360,
                overflowY: 'auto',
                paddingRight: 4
              }}>
                {camposPlantilla.map(c => {
                  if (c.tipo === 'casos_prueba' || c.nombre === 'casos_prueba') {
                    return (
                      <div key={c.nombre}>
                        <MatrizCasosPruebaEditor
                          value={camposValores[c.nombre]}
                          onChange={(nuevos) => setCamposValores(prev => ({ ...prev, [c.nombre]: nuevos }))}
                        />
                      </div>
                    );
                  }
                  return (
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
                  );
                })}
                {tieneTerminos && (
                  <TerminosCondicionesEditor
                    value={terminosValor}
                    onChange={setTerminosValor}
                    descripcion="Heredados de la plantilla. Ajústalos para este contrato: los cambios solo afectan a este documento."
                  />
                )}
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
