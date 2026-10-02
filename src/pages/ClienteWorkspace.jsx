import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import './Contratos.css';
import './ClienteWorkspace.css';
import { getClienteWorkspace, updateClienteStatus, crearCuentaCliente } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import StatusBadge from '../components/ui/StatusBadge';
import TipoBadge from '../components/ui/TipoBadge';
import { clienteIdDisplay } from '../utils/formatters';
import { Icon } from './clienteWorkspace/ui';

import ResumenTab from './clienteWorkspace/ResumenTab';
import MembresiaTab from './clienteWorkspace/MembresiaTab';
import PagosTab from './clienteWorkspace/PagosTab';
import ComunicacionesTab from './clienteWorkspace/ComunicacionesTab';
import ActividadTab from './clienteWorkspace/ActividadTab';
import RequerimientosTab from './clienteWorkspace/RequerimientosTab';

gsap.registerPlugin(useGSAP);

// Misma paleta de niveles que usa la tabla de Clientes
const CATEGORIA_META = {
  COBRE: { label: 'Cobre', color: 'var(--orange)', bg: 'var(--orange-tint)' },
  PLATA: { label: 'Plata', color: 'var(--text-muted)', bg: 'var(--neutral-200)' },
  PLATINO: { label: 'Platino', color: 'var(--cyan-deep)', bg: 'var(--cyan-tint)' },
  DIAMANTE: { label: 'Diamante', color: 'var(--indigo)', bg: 'var(--indigo-bg)' },
  OBSIDIANA: { label: 'Obsidiana', color: 'var(--violet-deep)', bg: 'var(--violet-tint)' },
};

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'] },
  { id: 'membresia', label: 'Membresía', icon: 'M12 2l3 6 6 .9-4.5 4.2 1 6.4L12 16.6 6.5 19.5l1-6.4L3 8.9 9 8z' },
  { id: 'pagos', label: 'Vencimientos e hitos', icon: ['M2 7h20v14H2z', 'M2 11h20', 'M6 15h4'] },
  { id: 'comunicaciones', label: 'Comunicaciones', icon: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'] },
  { id: 'requerimientos', label: 'Requerimientos', icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6'] },
  { id: 'actividad', label: 'Actividad', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
];

export default function ClienteWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const { confirm, alert: alertModal } = useConfirm();

  const [activeTab, setActiveTab] = useState('resumen');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const containerRef = useRef(null);
  const entranceDoneRef = useRef(false);

  // Guard anti-race: si el usuario navega rápido entre clientes, solo la
  // última respuesta escribe estado.
  const requestSeqRef = useRef(0);

  const fetchData = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    getClienteWorkspace(id)
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        if (err.status === 404) {
          navigate('/clientes', { replace: true });
          return;
        }
        setError(err.message || 'Error al cargar el workspace');
        setLoading(false);
      });
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Entrada en dos fases: la estructura (titlebar/tabs) anima al montar sin
  // esperar el fetch; las cards del contenido entran cuando llegan los datos.
  useGSAP(() => {
    if (entranceDoneRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (loading || !data) return;
    const cards = containerRef.current?.querySelectorAll('.ct-workspace-content .ct-resumen-card');
    if (!cards || cards.length === 0) return;
    entranceDoneRef.current = true;
    gsap.fromTo(cards, { y: 14, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.32, stagger: 0.05, ease: 'power2.out',
      clearProps: 'transform,opacity',
    });
  }, { dependencies: [loading, data], scope: containerRef });

  const perfil = data?.perfil;
  const nombre = perfil?.razon_social || perfil?.nombre_comercial || '';
  const bloqueado = perfil?.estado === 'Inactivo';
  const planMeta = data?.membresia
    ? (CATEGORIA_META[data.membresia.categoria] || { label: data.membresia.categoria, color: 'var(--text-muted)', bg: 'var(--neutral-200)' })
    : null;

  const handleToggleBloqueo = async () => {
    const ok = await confirm({
      title: bloqueado ? 'Desbloquear cliente' : 'Bloquear cliente',
      message: bloqueado
        ? `${nombre} recuperará el acceso de sus cuentas de usuario y volverá a estado activo.`
        : `${nombre} quedará inactivo y sus cuentas de usuario perderán el acceso a la plataforma de inmediato.`,
      isDangerous: !bloqueado,
    });
    if (!ok) return;
    setTogglingActive(true);
    try {
      await updateClienteStatus(id, bloqueado);
      fetchData();
    } catch (err) {
      alertModal({ title: 'Error al cambiar estado', message: err.message, isDangerous: true });
    } finally {
      setTogglingActive(false);
    }
  };

  const [inviting, setInviting] = useState(false);

  const handleInvitarPortal = async () => {
    if (!perfil.email) {
      alertModal({ title: 'Sin correo electrónico', message: 'Este cliente no tiene un email registrado para enviarle acceso.', isDangerous: true });
      return;
    }
    const ok = await confirm({
      title: perfil.cuenta_portal?.existe ? 'Reenviar invitación de acceso' : 'Enviar invitación de acceso',
      message: `Se enviará un correo a ${perfil.email} con el enlace de activación para que el cliente configure su contraseña y acceda al portal.`,
    });
    if (!ok) return;

    setInviting(true);
    try {
      const res = await crearCuentaCliente(id);
      if (res?.correo && !res.correo.enviado) {
        alertModal({
          title: 'Aviso: Problema de envío',
          message: `La cuenta fue configurada, pero el correo no pudo ser emitido por el servidor SMTP: ${res.correo.error || 'Error de conexión'}. Puedes verificar los detalles en la pestaña Comunicaciones.`,
          isDangerous: true,
        });
      } else {
        alertModal({
          title: 'Invitación emitida',
          message: `Se ha emitido el correo de activación a ${perfil.email} exitosamente.`,
        });
      }
      fetchData();
    } catch (err) {
      alertModal({
        title: 'Error al enviar invitación',
        message: err.message || 'No se pudo generar la invitación.',
        isDangerous: true,
      });
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="ct-workspace">
        <div className="ct-table-empty" style={{ flex: 1 }}>Cargando cliente…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="ct-workspace">
        <div className="ct-table-empty" style={{ flex: 1 }}>
          <p>{error || 'Cliente no encontrado'}</p>
          <button className="ct-btn-secondary" onClick={fetchData}>Reintentar</button>
          <button className="ct-btn-secondary" onClick={() => navigate('/clientes')}>← Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-workspace" ref={containerRef}>
      <div className="ct-workspace-header">
        <div className="ct-workspace-breadcrumb">
          <button className="ct-breadcrumb-btn" onClick={() => navigate('/clientes')}>
            <Icon d="M15 18l-6-6 6-6" color="var(--text-muted)" w={14} />
            Clientes
          </button>
          <Icon d="M9 18l6-6-6-6" color="var(--border)" w={12} />
          <span className="ct-breadcrumb-current">{clienteIdDisplay(perfil.id)}</span>
        </div>
        <div className="ct-workspace-actions">
          {canWrite && (
            <>
              {perfil.email && (
                <button
                  className="ct-btn-secondary"
                  disabled={inviting || bloqueado}
                  onClick={handleInvitarPortal}
                  title="Enviar enlace de activación de cuenta al cliente"
                >
                  <Icon d={['M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z']} color="currentColor" w={13} />
                  {inviting ? 'Enviando…' : perfil.cuenta_portal?.existe ? 'Reenviar invitación' : 'Invitar al portal'}
                </button>
              )}
              <button
                className="ct-btn-primary"
                onClick={() => navigate(`/contratos?nuevo=1&cliente=${id}`)}
              >
                <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
                Nuevo contrato
              </button>
              <button
                className={bloqueado ? 'ct-btn-secondary' : 'ct-btn-danger'}
                disabled={togglingActive}
                onClick={handleToggleBloqueo}
              >
                <Icon
                  d={bloqueado
                    ? ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 7.9-.9']
                    : ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4']}
                  color={bloqueado ? 'var(--text-muted)' : 'var(--text-on-accent)'}
                  w={13}
                />
                {togglingActive ? '…' : bloqueado ? 'Desbloquear' : 'Bloquear'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ct-workspace-titlebar">
        <div className="ct-workspace-title-left">
          <div>
            <div className="ct-workspace-id-row">
              <span className="ct-workspace-id">{clienteIdDisplay(perfil.id)}</span>
              <StatusBadge estado={perfil.estado} />
              <TipoBadge tipo={perfil.tipo} />
              {planMeta && (
                <span className="ct-days-chip" style={{ background: planMeta.bg, color: planMeta.color, border: `1px solid ${planMeta.color}` }}>
                  {planMeta.label}
                </span>
              )}
              {perfil.cuenta_portal && (
                perfil.cuenta_portal.is_active ? (
                  <span
                    className="ct-days-chip"
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                    title={`Cuenta activa en portal (Usuario: ${perfil.cuenta_portal.username || 'portal'})`}
                  >
                    <span style={{ fontSize: '10px' }}>●</span> Portal activo
                  </span>
                ) : perfil.cuenta_portal.ultimo_envio?.estado === 'ENVIADO' ? (
                  <span
                    className="ct-days-chip"
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                    title={`Correo de activación emitido exitosamente a ${perfil.cuenta_portal.ultimo_envio.destinatario} el ${new Date(perfil.cuenta_portal.ultimo_envio.fecha).toLocaleString()}`}
                  >
                    <span style={{ fontSize: '10px' }}>✓</span> Invitación emitida
                  </span>
                ) : perfil.cuenta_portal.ultimo_envio?.estado === 'FALLIDO' ? (
                  <span
                    className="ct-days-chip"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#dc2626',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                    title={`Fallo al emitir correo: ${perfil.cuenta_portal.ultimo_envio.error || 'Error de conexión'}`}
                  >
                    <span style={{ fontSize: '10px' }}>⚠</span> Error envío activación
                  </span>
                ) : perfil.cuenta_portal.existe ? (
                  <span
                    className="ct-days-chip"
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#d97706',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                    title="Cuenta creada, pendiente de emisión de activación"
                  >
                    Pendiente activación
                  </span>
                ) : (
                  <span
                    className="ct-days-chip"
                    style={{
                      background: 'var(--neutral-100, #f3f4f6)',
                      color: 'var(--text-muted, #6b7280)',
                      border: '1px solid var(--border-color, #e5e7eb)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                    title="Sin usuario de portal creado"
                  >
                    Sin portal
                  </span>
                )
              )}
            </div>
            <h2 className="ct-workspace-name">{nombre}</h2>
            <p className="ct-workspace-client">
              {perfil.email || '—'}{perfil.telefono ? ` · ${perfil.telefono}` : ''}
            </p>
          </div>
        </div>
        <div className="ct-workspace-kpis">
          <div className="ct-kpi">
            <p className="ct-kpi-label">Contratos</p>
            <p className="ct-kpi-value">{data.contratos.length}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">Incidencias</p>
            <p className="ct-kpi-value">{data.incidencias.length}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">{perfil.tipo === 'juridica' ? 'RUT' : 'RUN'}</p>
            <p className="ct-kpi-value">{perfil.id_fiscal || '—'}</p>
          </div>
        </div>
      </div>

      <div className="ct-workspace-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ct-workspace-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <Icon d={t.icon} color={activeTab === t.id ? 'var(--primary)' : 'var(--text-faint)'} w={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="ct-workspace-content">
        {activeTab === 'resumen' && <ResumenTab data={data} />}
        {activeTab === 'membresia' && <MembresiaTab membresia={data.membresia} />}
        {activeTab === 'pagos' && <PagosTab clienteId={id} />}
        {activeTab === 'comunicaciones' && (
          <ComunicacionesTab clienteId={id} emailPrincipal={perfil.email} onActividad={fetchData} />
        )}
        {activeTab === 'requerimientos' && <RequerimientosTab clienteId={id} contratos={data.contratos} />}
        {activeTab === 'actividad' && <ActividadTab actividad={data.actividad} />}
      </div>
    </div>
  );
}
