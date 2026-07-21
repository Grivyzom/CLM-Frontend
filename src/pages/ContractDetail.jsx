import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Contratos.css';
import {
  getContratoDetail, updateContrato, deleteContrato, generarDocumentoContrato,
  createObligacion, updateObligacion, deleteObligacion, getObligacionHistorial, enmendarContrato,
  getPlantillas, togglePlantillaActiva, getCamposPlantilla, syncExternalContract, manageSignature,
  getAnalisisIA, runAnalisisIA, getClausulas,
  getComentariosContrato, createComentarioContrato, deleteComentario,
  previewBorradorPdf, apiGenerateGuestLink
} from '../api';
import ClausulaEditor, { bloquesDesdeGuardado, bloquesAPayload, nuevoUid } from '../components/ui/ClausulaEditor';
import { fmtDate, fmtMoney, contratoIdDisplay } from '../utils/formatters';
import CampoClausulaHtml, { versionInsertable } from '../components/ui/CampoClausulaHtml';
import Modal from '../components/ui/Modal';
import { useConfirm } from '../contexts/ConfirmContext';
import { Icon, EtapaBadge, StatusOpBadge, SoftwareTag, ETAPA_SIGUIENTE } from './contractDetail/shared';
import TabResumen from './contractDetail/TabResumen';
import TabDocumento from './contractDetail/TabDocumento';
import TabHistorial from './contractDetail/TabHistorial';
import TabSla from './contractDetail/TabSla';
import TabAsistenteIA from './contractDetail/TabAsistenteIA';
import TabComentarios from './contractDetail/TabComentarios';

// Los simuladores solo aparecen bajo demanda (vincular Word/Docs o abrir el
// portal de firma): se cargan perezosos para no pesar en el chunk del detalle.
const SignatureSimulator = lazy(() => import('../components/ui/SignatureSimulator'));
const WordDocsPluginSimulator = lazy(() => import('../components/ui/WordDocsPluginSimulator'));

// ─── Skeleton de carga del workspace ─────────────────────────────────────────
function WorkspaceSkeleton() {
  return (
    <div className="ct-workspace" aria-busy="true" aria-label="Cargando contrato">
      <div className="ct-workspace-header">
        <div className="ct-workspace-breadcrumb">
          <span className="ct-skeleton" style={{ width: 90 }} />
        </div>
      </div>
      <div className="ct-workspace-titlebar">
        <div className="ct-workspace-title-left">
          <div>
            <div className="ct-workspace-id-row">
              <span className="ct-skeleton" style={{ width: 72 }} />
              <span className="ct-skeleton" style={{ width: 48 }} />
              <span className="ct-skeleton" style={{ width: 84 }} />
            </div>
            <span className="ct-skeleton" style={{ width: 260, height: 20, marginTop: 8 }} />
            <br />
            <span className="ct-skeleton" style={{ width: 180, marginTop: 6 }} />
          </div>
        </div>
        <div className="ct-workspace-kpis">
          {[0, 1, 2].map(i => (
            <div className="ct-kpi" key={i}>
              <span className="ct-skeleton" style={{ width: 44, height: 10 }} />
              <br />
              <span className="ct-skeleton" style={{ width: 76, height: 18, marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="ct-workspace-tabs">
        {[88, 96, 72, 120, 96].map((w, i) => (
          <span key={i} className="ct-skeleton" style={{ width: w, height: 14, margin: '12px 10px' }} />
        ))}
      </div>
      <div className="ct-workspace-content">
        <div className="ct-resumen-grid">
          {[0, 1, 2, 3].map(i => (
            <div className="ct-resumen-card" key={i}>
              <span className="ct-skeleton" style={{ width: 130, height: 11 }} />
              <br />
              <span className="ct-skeleton" style={{ width: '80%', height: 14, marginTop: 12 }} />
              <br />
              <span className="ct-skeleton" style={{ width: '55%', height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, alert: alertModal } = useConfirm();

  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [busy, setBusy] = useState(false);

  const [showEditText, setShowEditText] = useState(false);
  const [editBloques, setEditBloques] = useState([]);
  const [bibliotecaClausulas, setBibliotecaClausulas] = useState([]);

  // Biblioteca de cláusulas: alimenta los badges de riesgo del panel del tab
  // Documento y el editor. Se carga una sola vez, al entrar al tab.
  useEffect(() => {
    if (activeTab === 'documento' && bibliotecaClausulas.length === 0) {
      getClausulas().then(setBibliotecaClausulas).catch(() => {});
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Campos manuales de la plantilla HTML (ej. Para/De/Asunto): se cargan al
  // entrar al tab Documento para que el usuario pueda completarlos inline
  // desde el workspace, sin depender del modal de generación.
  useEffect(() => {
    if (activeTab !== 'documento' || !contrato) return;
    if (contrato.plantilla_activa?.modo_origen !== 'html') return;
    if (camposPlantilla.length > 0) return; // ya cargados
    setCamposLoading(true);
    getCamposPlantilla({ contratoId: contrato.id })
      .then(({ campos }) => {
        setCamposPlantilla(campos || []);
        setCamposValores(prev => {
          const next = { ...prev };
          for (const c of (campos || [])) {
            if (next[c.nombre] === undefined) next[c.nombre] = '';
          }
          return next;
        });
      })
      .catch(() => setCamposPlantilla([]))
      .finally(() => setCamposLoading(false));
  }, [activeTab, contrato]); // eslint-disable-line react-hooks/exhaustive-deps

  const [actionError, setActionError] = useState(null);

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [obligationHistory, setObligationHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showObligacionModal, setShowObligacionModal] = useState(false);
  const [editingObligacion, setEditingObligacion] = useState(null);
  const [obForm, setObForm] = useState({ tipo_obligacion: '', descripcion: '', penalizacion: '' });

  const [showAssignTemplateModal, setShowAssignTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Previsualización del documento generado: null = versión más reciente.
  const [previewDocId, setPreviewDocId] = useState(null);
  // El PDF generado se muestra de entrada (el placeholder "usa Previsualizar"
  // solo consumía espacio); "Expandir" pasa a pantalla completa (focusMode).
  const [showPreview, setShowPreview] = useState(true);
  const [focusExpandido, setFocusExpandido] = useState(false);

  // Vista previa en vivo del borrador (plantilla HTML sin documento generado):
  // se re-renderiza con debounce a medida que el usuario completa los campos.
  const [borradorUrl, setBorradorUrl] = useState(null);
  const [borradorLoading, setBorradorLoading] = useState(false);
  const [borradorError, setBorradorError] = useState(null);
  const borradorSeqRef = useRef(0);

  const [showCamposModal, setShowCamposModal] = useState(false);
  const [camposPlantilla, setCamposPlantilla] = useState([]);
  const [camposValores, setCamposValores] = useState({});
  const [camposLoading, setCamposLoading] = useState(false);
  const [camposSelects, setCamposSelects] = useState({});
  const [camposPage, setCamposPage] = useState(1);

  // Inserción de cláusula en un campo cuerpo_clausula_N — única para el panel
  // "Contenido del Documento" y el modal "Completar plantilla": ambos comparten
  // camposValores/camposSelects, así la selección se ve igual en los dos.
  const insertarClausulaEnCampo = useCallback((nombre, clausula) => {
    const v = versionInsertable(clausula);
    if (!v?.texto) return;
    setCamposValores(prev => ({ ...prev, [nombre]: v.texto }));
    setCamposSelects(prev => ({ ...prev, [nombre]: String(clausula.id) }));
  }, []);

  // Edición manual del valor: el texto ya no es 1:1 la cláusula insertada.
  const limpiarSeleccionCampo = useCallback((nombre) => {
    setCamposSelects(prev => {
      if (!(nombre in prev)) return prev;
      const next = { ...prev };
      delete next[nombre];
      return next;
    });
  }, []);

  const [showPluginSimulator, setShowPluginSimulator] = useState(false);
  const [signatureProvider, setSignatureProvider] = useState(null);
  const [selectedFirmaMethod, setSelectedFirmaMethod] = useState('OTP');

  // Estados para el Asistente IA de Playbook
  const [analisisIA, setAnalisisIA] = useState(null);
  const [analisisIAWorking, setAnalisisIAWorking] = useState(false);
  const [analisisIALoading, setAnalisisIALoading] = useState(false);

  // Estados para Comentarios
  const [comentarios, setComentarios] = useState([]);
  const [comentariosLoading, setComentariosLoading] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [nuevoComentarioTipo, setNuevoComentarioTipo] = useState('SUGERENCIA');

  // Escape: primero sale del modo expandido; si no está expandido, oculta la
  // vista previa (además del breadcrumb "← Documento").
  useEffect(() => {
    if (!showPreview && !focusExpandido) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Con un modal abierto, Esc le pertenece al modal (no tocar el visor).
      if (document.querySelector('[role="dialog"]')) return;
      if (focusExpandido) setFocusExpandido(false);
      else setShowPreview(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPreview, focusExpandido]);

  // Escape cierra los modales propios (obligación / plantilla / campos) sin
  // depender de dónde esté el foco.
  useEffect(() => {
    if (!showObligacionModal && !showAssignTemplateModal && !showCamposModal) return;
    const onKey = (e) => {
      if (e.key !== 'Escape' || busy) return;
      if (showObligacionModal) setShowObligacionModal(false);
      else if (showAssignTemplateModal) setShowAssignTemplateModal(false);
      else if (showCamposModal) setShowCamposModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showObligacionModal, showAssignTemplateModal, showCamposModal, busy]);

  // ── Vista previa en vivo del borrador ─────────────────────────────────────
  // Contrato sin documento generado con plantilla activa: el visor muestra el
  // PDF tal como quedaría, re-renderizado completo (el PDF no admite refresh
  // parcial) al editar los campos HTML o las cláusulas del editor.
  const modoPlantilla = contrato?.plantilla_activa?.modo_origen;
  const esBorradorPreview = !!contrato && (contrato.documentos?.length ?? 0) === 0 && (
    (modoPlantilla === 'html' && camposPlantilla.length > 0) ||
    modoPlantilla === 'clausulas'
  );
  const [borradorNonce, setBorradorNonce] = useState(0);
  const borradorPrimeraRef = useRef(true);

  // Bloques del editor de cláusulas mientras está abierto: se serializan para
  // que el efecto reaccione a cada edición y el preview se renderice con los
  // bloques SIN guardar (el backend los aplica solo en memoria).
  const clausulasEnVivoJson = (showEditText && esBorradorPreview)
    ? JSON.stringify(bloquesAPayload(editBloques, bibliotecaClausulas))
    : null;

  useEffect(() => {
    if (!esBorradorPreview || activeTab !== 'documento') return;
    const seq = ++borradorSeqRef.current;
    setBorradorLoading(true);
    // Primera carga inmediata; las siguientes esperan a que se deje de tipear.
    // Las plantillas no-HTML pasan por LibreOffice (~2s) → debounce mayor.
    const delay = borradorPrimeraRef.current ? 0 : (modoPlantilla === 'html' ? 900 : 1600);
    const timer = setTimeout(async () => {
      try {
        const clausulas = clausulasEnVivoJson != null ? JSON.parse(clausulasEnVivoJson) : undefined;
        const blob = await previewBorradorPdf(contrato.id, camposValores, clausulas);
        if (seq !== borradorSeqRef.current) return;
        borradorPrimeraRef.current = false;
        setBorradorUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setBorradorError(null);
      } catch (err) {
        if (seq === borradorSeqRef.current) {
          setBorradorError(err.message || 'Error al generar la vista previa');
        }
      } finally {
        if (seq === borradorSeqRef.current) setBorradorLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
    // borradorNonce fuerza reintento manual tras un error;
    // clausulas_actualizado_en refresca el preview tras guardar cláusulas.
  }, [esBorradorPreview, activeTab, camposValores, clausulasEnVivoJson,
      contrato?.id, contrato?.clausulas_actualizado_en, borradorNonce]);

  // Libera el object URL vigente al desmontar la vista.
  const borradorUrlRef = useRef(null);
  borradorUrlRef.current = borradorUrl;
  useEffect(() => () => {
    if (borradorUrlRef.current) URL.revokeObjectURL(borradorUrlRef.current);
  }, []);

  async function handleOpenAssignTemplate() {
    setShowAssignTemplateModal(true);
    setTemplatesLoading(true);
    try {
      const data = await getPlantillas({ tipo_contrato: contrato.tipo_contrato, software: contrato.software.id });
      // Este picker activa la versión elegida: las archivadas se listan para poder
      // reactivarlas, pero los borradores se confirman solo desde el catálogo.
      setAvailableTemplates((data.results || data).filter(p => p.confirmada !== false));
    } catch (err) {
      console.error(err);
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function handleAssignTemplate(templateId) {
    setBusy(true);
    try {
      await togglePlantillaActiva(templateId, true);
      setShowAssignTemplateModal(false);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContratoDetail(id);
      setContrato(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAnalisisIA = useCallback(async () => {
    setAnalisisIALoading(true);
    try {
      const data = await getAnalisisIA(id);
      setAnalisisIA(data);
    } catch (err) {
      console.error("Error al cargar análisis IA:", err);
    } finally {
      setAnalisisIALoading(false);
    }
  }, [id]);

  const loadComentarios = useCallback(async () => {
    setComentariosLoading(true);
    try {
      const data = await getComentariosContrato(id);
      setComentarios(data);
    } catch (err) {
      console.error("Error al cargar comentarios:", err);
    } finally {
      setComentariosLoading(false);
    }
  }, [id]);

  async function handleAddComentario(e) {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setBusy(true);
    try {
      const res = await createComentarioContrato(id, { texto: nuevoComentario, tipo: nuevoComentarioTipo });
      setComentarios([res, ...comentarios]);
      setNuevoComentario('');
      setNuevoComentarioTipo('SUGERENCIA');
    } catch (err) {
      setActionError(err.message || 'Error al añadir comentario');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteComentario(comentarioId) {
    if (!await confirm({ title: 'Eliminar comentario', message: '¿Estás seguro de eliminar este comentario?', confirmText: 'Eliminar', danger: true })) return;
    setBusy(true);
    try {
      await deleteComentario(comentarioId);
      setComentarios(comentarios.filter(c => c.id !== comentarioId));
    } catch (err) {
      setActionError(err.message || 'Error al eliminar comentario');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunAnalisisIA() {
    setAnalisisIAWorking(true);
    setActionError(null);
    try {
      const data = await runAnalisisIA(id);
      setAnalisisIA(data);
      await load(); // Recargar el contrato por si se actualizó el texto base
    } catch (err) {
      setActionError(err.message || 'Error al ejecutar el análisis IA');
    } finally {
      setAnalisisIAWorking(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'asistente_ia') {
      loadAnalisisIA();
    }
  }, [activeTab, loadAnalisisIA]);

  useEffect(() => {
    if (activeTab === 'comentarios') {
      loadComentarios();
    }
  }, [activeTab, loadComentarios]);

  useEffect(() => {
    load();
  }, [load]);

  const onBack = () => {
    navigate('/contratos');
  };

  const handleVersionChange = (targetId) => {
    navigate(`/contratos/${targetId}`);
  };

  async function handleTransicion(s) {
    const target = s.etapa;
    if (target === 'ACTIVO' && contrato.etapa === 'PENDIENTE_FIRMA') {
      // La firma OTP se confirma únicamente desde el enlace enviado al correo
      // del cliente (ver panel "Firma Electrónica del Acuerdo" más abajo) --
      // este botón de cabecera solo aplica a los simuladores DocuSign/Adobe.
      if (contrato.firma_proveedor === 'DOCUSIGN') {
        setSignatureProvider('DOCUSIGN');
      } else if (contrato.firma_proveedor === 'ADOBE') {
        setSignatureProvider('ADOBE');
      }
      return;
    }
    if (s.confirm) {
      const ok = await confirm({ title: s.label, message: s.confirm, isDangerous: !!s.danger });
      if (!ok) return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await updateContrato(contrato.id, { etapa: target });
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleHistory(obId) {
    if (expandedHistoryId === obId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(obId);
    setHistoryLoading(true);
    try {
      const logs = await getObligacionHistorial(obId);
      setObligationHistory(prev => ({ ...prev, [obId]: logs }));
    } catch (err) {
      console.error("Error loading obligation history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleOpenObligacionModal(ob = null) {
    if (ob) {
      setEditingObligacion(ob);
      setObForm({
        tipo_obligacion: ob.tipo_obligacion || '',
        descripcion: ob.descripcion || '',
        penalizacion: ob.penalizacion || '',
      });
    } else {
      setEditingObligacion(null);
      setObForm({ tipo_obligacion: '', descripcion: '', penalizacion: '' });
    }
    setShowObligacionModal(true);
  }

  async function handleSaveObligacion(e) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      if (editingObligacion) {
        await updateObligacion(editingObligacion.id, obForm);
      } else {
        await createObligacion(contrato.id, obForm);
      }
      setShowObligacionModal(false);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminarObligacion(obId) {
    const ok = await confirm({
      title: 'Eliminar obligación',
      message: '¿Eliminar esta obligación? Esta acción no se puede deshacer.',
      isDangerous: true,
    });
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteObligacion(obId);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnmendar() {
    const ok = await confirm({
      title: 'Crear enmienda',
      message: 'Este contrato está aprobado. Modificar las obligaciones generará una nueva versión (Anexo) que requerirá una nueva aprobación. ¿Deseas continuar?',
      isDangerous: false,
    });
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      const cloned = await enmendarContrato(contrato.id);
      navigate(`/contratos/${cloned.id}`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Punto de entrada de los botones "Generar/Regenerar Documento": si la
  // plantilla resuelta pide campos manuales (ej. PARA/DE/ASUNTO de un
  // memorándum), usa los valores ya completados en el panel inline del
  // workspace; si no se han rellenado, abre el modal para completarlos.
  async function handleGenerarDocumento(forzar = false) {
    setActionError(null);
    setCamposLoading(true);
    try {
      const { campos } = await getCamposPlantilla({ contratoId: contrato.id });
      setCamposLoading(false);
      if (campos && campos.length > 0) {
        setCamposPlantilla(campos);
        // Si el panel inline ya tiene valores completados, usarlos directamente.
        const tieneValoresInline = campos.some(c => camposValores[c.nombre]?.trim());
        if (tieneValoresInline) {
          await ejecutarGeneracion(forzar, camposValores);
          return;
        }
        // Sin valores inline: abrir el modal para que los complete.
        setCamposValores(prev => {
          const next = { ...prev };
          for (const c of campos) {
            if (next[c.nombre] === undefined) next[c.nombre] = '';
          }
          return next;
        });
        setShowCamposModal(true);
        return;
      }
      await ejecutarGeneracion(forzar, {});
    } catch (err) {
      setCamposLoading(false);
      // Si no se pudo resolver la plantilla (ej. sin plantilla activa), se
      // deja que ejecutarGeneracion muestre el error real del backend.
      await ejecutarGeneracion(forzar, {});
    }
  }

  async function ejecutarGeneracion(forzar, campos) {
    setBusy(true);
    setActionError(null);
    try {
      const documento = await generarDocumentoContrato({ contrato_id: contrato.id, forzar, campos });
      setPreviewDocId(null); // la previsualización vuelve a la versión más reciente
      setShowCamposModal(false);
      await load();
      // Regenerar puede invalidar una firma en curso (SIGNED) o el enlace que
      // ya tiene el cliente (PENDING) -- ver contratos.services.sincronizar_firma_tras_regeneracion.
      if (documento?.aviso_firma) {
        alertModal({ title: 'Aviso de firma', message: documento.aviso_firma });
      }
    } catch (err) {
      if (!forzar && err.data?.requiere_confirmacion === true) {
        const ok = await confirm({ title: 'Regenerar documento', message: err.message, isDangerous: true });
        if (ok) return ejecutarGeneracion(true, campos);
      }
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmitCampos(e) {
    e.preventDefault();
    ejecutarGeneracion(false, camposValores);
  }

  // Abre el editor de cláusulas con los bloques guardados del contrato; los
  // contratos previos al editor (solo texto plano) se cargan como un bloque
  // personalizado único para no perder nada.
  function abrirEditorClausulas() {
    if (Array.isArray(contrato.clausulas_estructuradas) && contrato.clausulas_estructuradas.length > 0) {
      setEditBloques(bloquesDesdeGuardado(contrato.clausulas_estructuradas));
    } else if (contrato.texto_adicional_clausulas) {
      setEditBloques([{ uid: nuevoUid(), titulo: '', texto: contrato.texto_adicional_clausulas, clausula_id: null, version_id: null, origen: 'personalizada' }]);
    } else {
      setEditBloques([]);
    }
    if (bibliotecaClausulas.length === 0) {
      getClausulas().then(setBibliotecaClausulas).catch(() => {});
    }
    setShowEditText(true);
  }

  async function handleSaveEditText() {
    setBusy(true);
    const teniaDocumento = contrato.documentos.length > 0;
    try {
      await updateContrato(contrato.id, { clausulas_estructuradas: bloquesAPayload(editBloques, bibliotecaClausulas) });
      setShowEditText(false);
      await load();
    } catch (err) {
      alertModal({ title: 'Error', message: err.message || 'Error al guardar las cláusulas.' });
      setBusy(false);
      return;
    }
    setBusy(false);
    // El PDF vigente quedó desactualizado respecto a las cláusulas nuevas:
    // se ofrece regenerarlo de inmediato (mismo flujo del botón Regenerar).
    if (teniaDocumento) {
      const ok = await confirm({
        title: 'Regenerar documento',
        message: 'Las cláusulas se guardaron, pero el documento generado sigue siendo el anterior. ¿Regenerarlo ahora con las cláusulas nuevas?',
      });
      if (ok) handleGenerarDocumento(false);
    }
  }

  async function handleLinkExternal(editor) {
    setBusy(true);
    setActionError(null);
    try {
      await syncExternalContract(contrato.id, { action: 'link', editor });
      await load();
      setShowPluginSimulator(true); // Open simulator automatically upon linking
    } catch (err) {
      setActionError(err.message || 'Error al vincular el procesador externo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlinkExternal() {
    const ok = await confirm({
      title: 'Desvincular procesador externo',
      message: '¿Desvincular el contrato del procesador externo? Se detendrá la sincronización automática.',
      isDangerous: true,
    });
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      await syncExternalContract(contrato.id, { action: 'unlink' });
      await load();
    } catch (err) {
      setActionError(err.message || 'Error al desvincular el procesador externo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForceUnlockExternal() {
    setBusy(true);
    setActionError(null);
    try {
      await syncExternalContract(contrato.id, { action: 'unlock' });
      await load();
    } catch (err) {
      setActionError(err.message || 'Error al desbloquear el contrato.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendSignature(proveedor) {
    setBusy(true);
    setActionError(null);
    try {
      await manageSignature(contrato.id, { action: 'send', proveedor });
      await load();
      if (proveedor === 'DOCUSIGN' || proveedor === 'ADOBE') {
        setSignatureProvider(proveedor);
      }
      // OTP: el correo real ya salió (ver services.enviar_firma_electronica);
      // no hay nada que simular acá, el panel de abajo pasa a mostrar el estado
      // "esperando confirmación".
    } catch (err) {
      setActionError(err.message || 'Error al iniciar el sobre de firma electrónica.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelSignature() {
    const ok = await confirm({
      title: 'Cancelar firma electrónica',
      message: '¿Cancelar la solicitud de firma electrónica? El contrato volverá a estado Aprobado.',
      isDangerous: true,
    });
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      await manageSignature(contrato.id, { action: 'cancel' });
      await load();
    } catch (err) {
      setActionError(err.message || 'Error al cancelar la firma electrónica.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeclineSignature() {
    const ok = await confirm({
      title: 'Simular rechazo de firma',
      message: '¿Simular rechazo de firma por parte del cliente?',
      isDangerous: true,
    });
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    try {
      await manageSignature(contrato.id, { action: 'decline' });
      await load();
    } catch (err) {
      setActionError(err.message || 'Error al declinar el proceso de firma.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateGuestLink() {
    setBusy(true);
    try {
      const data = await apiGenerateGuestLink(contrato.id, {
        can_comment: true,
        can_sign: contrato.etapa === 'PENDIENTE_FIRMA'
      });
      const link = `${window.location.origin}/guest/${data.token}`;
      await navigator.clipboard.writeText(link);
      alertModal({ title: 'Enlace Generado', message: 'Se ha copiado el enlace mágico al portapapeles. Compártelo con la contraparte de forma segura.' });
    } catch (err) {
      alertModal({ title: 'Error', message: err.message || 'Error al generar el enlace', isDangerous: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminar() {
    const tieneDocumentos = contrato.documentos.length > 0;
    try {
      const isConfirmed = await confirm({
        title: 'Eliminar contrato',
        message: tieneDocumentos
          ? `¿Eliminar este contrato en Borrador? También se eliminarán ${contrato.documentos.length} documento(s) generado(s) y demás registros asociados. Esta acción no se puede deshacer.`
          : '¿Eliminar este contrato en Borrador? Esta acción no se puede deshacer.',
        isDangerous: true,
        action: async () => {
          setBusy(true);
          await deleteContrato(contrato.id);
        },
      });
      if (isConfirmed) onBack();
    } catch (err) {
      alertModal({ title: 'Error al eliminar contrato', message: err.message, isDangerous: true });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !contrato) {
    return <WorkspaceSkeleton />;
  }
  if (error || !contrato) {
    return (
      <div className="ct-workspace">
        <div className="ct-table-empty" style={{ flex: 1 }}>
          <p>{error || 'Contrato no encontrado'}</p>
          <button className="ct-btn-secondary" onClick={onBack}>← Volver</button>
        </div>
      </div>
    );
  }

  const esRecurrente = contrato.tipo_contrato === 'RECURRENTE';
  // "Registrar Firma" de cabecera solo aplica a los simuladores DocuSign/Adobe
  // (abre el simulador). La firma OTP real se envía y confirma exclusivamente
  // desde el panel "Firma Electrónica del Acuerdo" más abajo — ese botón de
  // cabecera debe quedar oculto mientras no haya un proveedor DocuSign/Adobe
  // elegido, si no queda un botón visible que no hace nada al clickearlo
  // (firma_proveedor es null hasta que se envía desde el panel).
  const siguientes = (ETAPA_SIGUIENTE[contrato.etapa] || []).filter(s => !(
    contrato.etapa === 'PENDIENTE_FIRMA' && s.etapa === 'ACTIVO'
    && contrato.firma_proveedor !== 'DOCUSIGN' && contrato.firma_proveedor !== 'ADOBE'
  ));
  // Modo enfoque: con la vista previa del PDF abierta se oculta la titlebar
  // (ID, versión, badges, cliente, KPIs) y los anexos para darle el máximo
  // de espacio al documento. El app shell y el breadcrumb siguen visibles.
  // Pantalla completa del visor: ahora es opt-in (botón "Expandir"), ya no un
  // efecto implícito de previsualizar — el PDF se muestra siempre en el visor.
  const focusMode = focusExpandido && showPreview && activeTab === 'documento' && contrato.documentos.length > 0;

  // ── Sección de cláusulas (tab Documento) ──
  // Visible cuando la plantilla activa es de cláusulas o el contrato ya trae
  // bloques/texto; editable solo en Borrador / En Revisión.
  const bloquesContrato = Array.isArray(contrato.clausulas_estructuradas) ? contrato.clausulas_estructuradas : [];
  const esPlantillaClausulas = contrato.plantilla_activa?.modo_origen === 'clausulas';
  const mostrarSeccionClausulas = esPlantillaClausulas || bloquesContrato.length > 0 || !!contrato.texto_adicional_clausulas;
  const clausulasEditables = contrato.etapa === 'BORRADOR' || contrato.etapa === 'REVISION';

  // Banner de documento desactualizado
  const docMasReciente = contrato.documentos?.[0];
  const documentoDesactualizado =
    !!contrato.clausulas_actualizado_en &&
    (!docMasReciente || new Date(contrato.clausulas_actualizado_en) > new Date(docMasReciente.fecha_generacion));

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: 'M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8' },
    { id: 'documento', label: 'Documento', count: contrato.documentos.length || null, icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h4'] },
    { id: 'historial', label: 'Historial', count: contrato.historial.length || null, icon: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 7v5l3 3'] },
    { id: 'sla', label: 'Obligaciones / SLA', count: contrato.obligaciones_sla.length || null, icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'] },
    { id: 'comentarios', label: 'Comentarios', icon: ['M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'] },
    { id: 'asistente_ia', label: 'Asistente IA Playbook', icon: ['M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z', 'M14 2v6h6', 'M10 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M14 16l-2.2-2.2'] },
  ];
  const idsUsadosEnDocumento = new Set([
    ...bloquesContrato.map(b => String(b.clausula_id)).filter(Boolean),
    ...editBloques.map(b => String(b.clausula_id)).filter(Boolean),
    ...Object.values(camposSelects).filter(Boolean).map(String)
  ]);

  return (
    <div className="ct-workspace">
      <div className="ct-workspace-header">
        <div className="ct-workspace-breadcrumb">
          {/* En modo enfoque, "volver" sale de la vista previa hacia el tab
              Documento; fuera de él, vuelve al listado de contratos. */}
          <button className="ct-breadcrumb-btn" onClick={focusMode ? () => setFocusExpandido(false) : onBack}>
            <Icon d="M15 18l-6-6 6-6" color="var(--text-muted)" w={14} />
            {focusMode ? 'Documento' : 'Contratos'}
          </button>
          <Icon d="M9 18l6-6-6-6" color="var(--border)" w={12} />
          <span className="ct-breadcrumb-current">
            {contratoIdDisplay(contrato.id)}{focusMode ? ' · Vista previa' : ''}
          </span>
        </div>
        <div className="ct-workspace-actions">
          {contrato.etapa === 'BORRADOR' && (
            <>
              {contrato.plantilla_activa?.modo_origen === 'clausulas' && (
                <button className="ct-btn-secondary" disabled={busy} onClick={abrirEditorClausulas}>
                  Editar Cláusulas
                </button>
              )}
              <button className="ct-btn-secondary" disabled={busy || camposLoading} onClick={() => handleGenerarDocumento(false)}>
                <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-muted)" w={13} />
                {contrato.documentos.length > 0 ? 'Regenerar Documento' : 'Generar Documento'}
              </button>
            </>
          )}
          <button className="ct-btn-secondary" disabled={busy} onClick={handleGenerateGuestLink} title="Generar enlace seguro para terceros">
            <Icon d={['M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1']} color="var(--primary)" w={13} />
            Portal Guest
          </button>
          {siguientes.map(s => (
            <button key={s.etapa}
              className={s.danger ? 'ct-btn-danger' : s.primary ? 'ct-btn-primary' : 'ct-btn-secondary'}
              disabled={busy}
              style={s.color ? { background: s.color, color: 'var(--text-on-accent)' } : undefined}
              onClick={() => handleTransicion(s)}>
              <Icon d={s.icon} color={s.danger || s.primary || s.color ? 'var(--text-on-accent)' : 'var(--text-muted)'} w={13} />
              {s.label}
            </button>
          ))}
          {contrato.etapa === 'BORRADOR' && (
            <button
              className="ct-icon-btn"
              title="Eliminar borrador"
              disabled={busy}
              onClick={handleEliminar}
            >
              <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="var(--danger)" w={14} />
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="ct-alert-error" role="alert">{actionError}</div>
      )}

      {!focusMode && (
      <div className="ct-workspace-titlebar">
        <div className="ct-workspace-title-left">
          <div>
            <div className="ct-workspace-id-row">
              <span className="ct-workspace-id">{contratoIdDisplay(contrato.id)}</span>

              {/* Version Selector */}
              {contrato.versiones && contrato.versiones.length > 1 ? (
                <div className="ct-version-pill">
                  <select
                    value={contrato.id}
                    onChange={(e) => handleVersionChange(Number(e.target.value))}
                    aria-label="Cambiar versión del contrato"
                  >
                    {contrato.versiones.map(v => (
                      <option key={v.id} value={v.id}>
                        Versión {v.version} ({v.etapa_display})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="ct-version-pill">v{contrato.version || '1.0'}</span>
              )}

              <EtapaBadge etapa={contrato.etapa} label={contrato.etapa_display} />
              <StatusOpBadge status={contrato.status} />
              {contrato.dias_restantes !== null && contrato.dias_restantes < 60 && (
                <span className="ct-days-chip" style={{ background: contrato.dias_restantes < 0 ? 'var(--rose-bg)' : 'var(--warning-bg)', color: contrato.dias_restantes < 0 ? 'var(--rose)' : 'var(--warning-bright)', border: `1px solid ${contrato.dias_restantes < 0 ? 'var(--rose-border)' : 'var(--warning-border)'}` }}>
                  {contrato.dias_restantes < 0 ? 'Vencido' : `Renueva en ${contrato.dias_restantes}d`}
                </span>
              )}
            </div>
            <h2 className="ct-workspace-name">{contrato.nombre}</h2>
            <p className="ct-workspace-client">{contrato.cliente.nombre} · <SoftwareTag software={contrato.software.nombre} /></p>
          </div>
        </div>
        <div className="ct-workspace-kpis">
          <div className="ct-kpi">
            <p className="ct-kpi-label">{esRecurrente ? 'MRR' : 'Monto'}</p>
            <p className="ct-kpi-value">{fmtMoney(esRecurrente ? contrato.mrr : contrato.monto)}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">{esRecurrente ? 'ARR' : 'Tipo'}</p>
            <p className="ct-kpi-value">{esRecurrente ? fmtMoney(contrato.arr) : contrato.tipo_contrato_display}</p>
          </div>
          <div className="ct-kpi-divider" />
          <div className="ct-kpi">
            <p className="ct-kpi-label">Facturación</p>
            <p className="ct-kpi-value">{contrato.frecuencia_facturacion === 'ANUAL' ? 'Anual' : contrato.frecuencia_facturacion === 'MENSUAL' ? 'Mensual' : '—'}</p>
          </div>
        </div>
      </div>
      )}

      {!focusMode && (
      <div className="ct-workspace-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id}
            className={`ct-workspace-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <Icon d={t.icon} color={activeTab === t.id ? 'var(--primary)' : 'var(--text-faint)'} w={14} />
            {t.label}
            {t.count != null && <span className="ct-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
      )}

      <div className={`ct-workspace-content${focusMode ? ' focus' : ''}`}>
        {activeTab === 'resumen' && (
          <TabResumen
            contrato={contrato}
            esRecurrente={esRecurrente}
            busy={busy}
            selectedFirmaMethod={selectedFirmaMethod}
            setSelectedFirmaMethod={setSelectedFirmaMethod}
            handleSendSignature={handleSendSignature}
            handleCancelSignature={handleCancelSignature}
            handleDeclineSignature={handleDeclineSignature}
            setSignatureProvider={setSignatureProvider}
            handleOpenAssignTemplate={handleOpenAssignTemplate}
            handleLinkExternal={handleLinkExternal}
            handleUnlinkExternal={handleUnlinkExternal}
            handleForceUnlockExternal={handleForceUnlockExternal}
            setShowPluginSimulator={setShowPluginSimulator}
          />
        )}

        {activeTab === 'documento' && (
          <TabDocumento
            contrato={contrato}
            focusMode={focusMode}
            busy={busy}
            camposLoading={camposLoading}
            previewDocId={previewDocId}
            setPreviewDocId={setPreviewDocId}
            showPreview={showPreview}
            setShowPreview={setShowPreview}
            setFocusExpandido={setFocusExpandido}
            esBorradorPreview={esBorradorPreview}
            modoPlantilla={modoPlantilla}
            borradorUrl={borradorUrl}
            borradorLoading={borradorLoading}
            borradorError={borradorError}
            setBorradorError={setBorradorError}
            setBorradorNonce={setBorradorNonce}
            documentoDesactualizado={documentoDesactualizado}
            clausulasEditables={clausulasEditables}
            mostrarSeccionClausulas={mostrarSeccionClausulas}
            bloquesContrato={bloquesContrato}
            bibliotecaClausulas={bibliotecaClausulas}
            idsUsadosEnDocumento={idsUsadosEnDocumento}
            camposPlantilla={camposPlantilla}
            camposValores={camposValores}
            setCamposValores={setCamposValores}
            camposSelects={camposSelects}
            camposPage={camposPage}
            setCamposPage={setCamposPage}
            insertarClausulaEnCampo={insertarClausulaEnCampo}
            abrirEditorClausulas={abrirEditorClausulas}
            handleGenerarDocumento={handleGenerarDocumento}
          />
        )}

        {activeTab === 'historial' && <TabHistorial contrato={contrato} />}

        {activeTab === 'sla' && (
          <TabSla
            contrato={contrato}
            handleOpenObligacionModal={handleOpenObligacionModal}
            handleEnmendar={handleEnmendar}
            handleEliminarObligacion={handleEliminarObligacion}
            toggleHistory={toggleHistory}
            expandedHistoryId={expandedHistoryId}
            obligationHistory={obligationHistory}
            historyLoading={historyLoading}
          />
        )}

        {activeTab === 'asistente_ia' && (
          <TabAsistenteIA
            contrato={contrato}
            analisisIA={analisisIA}
            analisisIALoading={analisisIALoading}
            analisisIAWorking={analisisIAWorking}
            handleRunAnalisisIA={handleRunAnalisisIA}
          />
        )}

        {activeTab === 'comentarios' && (
          <TabComentarios
            busy={busy}
            comentarios={comentarios}
            comentariosLoading={comentariosLoading}
            nuevoComentario={nuevoComentario}
            setNuevoComentario={setNuevoComentario}
            nuevoComentarioTipo={nuevoComentarioTipo}
            setNuevoComentarioTipo={setNuevoComentarioTipo}
            handleAddComentario={handleAddComentario}
            handleDeleteComentario={handleDeleteComentario}
          />
        )}
      </div>

      <Modal
        open={showEditText}
        onClose={() => setShowEditText(false)}
        title="Editar Cláusulas del Contrato"
        subtitle="Los cambios se aplican al próximo documento que generes (Regenerar Documento)."
        width={860}
        footer={
          <>
            <button className="ct-btn-secondary" onClick={() => setShowEditText(false)} disabled={busy}>Cancelar</button>
            <button className="ct-btn-primary" onClick={handleSaveEditText} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar Cláusulas'}
            </button>
          </>
        }
      >
        <ClausulaEditor bloques={editBloques} onChange={setEditBloques} clausulas={bibliotecaClausulas} idsUsadosExternos={idsUsadosEnDocumento} />
      </Modal>

      {showCamposModal && (
        <div className="ct-modal-backdrop ct-campos-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setShowCamposModal(false); }}>
          <form onSubmit={handleSubmitCampos} className="ct-modal ct-campos-modal" role="dialog" aria-modal="true" aria-label="Completar plantilla">
            <div>
              <h3>Completar plantilla</h3>
              <p className="ct-campos-modal-sub">Estos campos son propios de la plantilla del documento. Déjalos en blanco para conservar el texto de ejemplo.</p>
            </div>
            {camposPlantilla.map(c => (
              <CampoClausulaHtml
                key={c.nombre}
                campo={c}
                biblioteca={bibliotecaClausulas}
                seleccionId={camposSelects[c.nombre]}
                idsUsados={idsUsadosEnDocumento}
                onInsert={(clausula) => insertarClausulaEnCampo(c.nombre, clausula)}
              >
                {c.multilinea ? (
                  <textarea
                    className="ct-campo-input ct-campo-textarea"
                    value={camposValores[c.nombre] ?? ''}
                    onChange={e => {
                      const valor = e.target.value;
                      setCamposValores(prev => ({ ...prev, [c.nombre]: valor }));
                      limpiarSeleccionCampo(c.nombre);
                    }}
                    placeholder={c.default}
                  />
                ) : (
                  <input
                    className="ct-campo-input"
                    value={camposValores[c.nombre] ?? ''}
                    onChange={e => setCamposValores(prev => ({ ...prev, [c.nombre]: e.target.value }))}
                    placeholder={c.default}
                  />
                )}
              </CampoClausulaHtml>
            ))}
            {actionError && (
              <p className="ct-campos-modal-error" role="alert">{actionError}</p>
            )}
            <div className="ct-modal-footer">
              <button type="button" className="ct-btn-secondary" onClick={() => setShowCamposModal(false)} disabled={busy}>Cancelar</button>
              <button type="submit" className="ct-btn-primary" disabled={busy}>{busy ? 'Generando…' : 'Generar Documento'}</button>
            </div>
          </form>
        </div>
      )}

      {showObligacionModal && (
        <div className="ct-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setShowObligacionModal(false); }}>
          <div className="ct-modal" role="dialog" aria-modal="true"
            aria-label={editingObligacion ? 'Editar obligación' : 'Añadir obligación'}>
            <h3>{editingObligacion ? 'Editar Obligación / SLA' : 'Añadir Obligación / SLA'}</h3>
            <form onSubmit={handleSaveObligacion}>
              <div className="ct-modal-fields">
                <div className="ct-modal-field">
                  <label htmlFor="ob-tipo">Tipo de Obligación</label>
                  <input
                    id="ob-tipo"
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej. Soporte Técnico, Uptime de la aplicación"
                    value={obForm.tipo_obligacion}
                    onChange={e => setObForm(prev => ({ ...prev, tipo_obligacion: e.target.value }))}
                  />
                </div>
                <div className="ct-modal-field">
                  <label htmlFor="ob-desc">Descripción / Métrica</label>
                  <textarea
                    id="ob-desc"
                    required
                    rows={3}
                    placeholder="Ej. Garantizar un 99.9% de tiempo en línea mensual"
                    value={obForm.descripcion}
                    onChange={e => setObForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
                <div className="ct-modal-field">
                  <label htmlFor="ob-pena">Penalización / Consecuencia</label>
                  <textarea
                    id="ob-pena"
                    required
                    rows={2}
                    placeholder="Ej. Descuento del 10% en la siguiente factura si no se cumple"
                    value={obForm.penalizacion}
                    onChange={e => setObForm(prev => ({ ...prev, penalizacion: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ct-modal-footer">
                <button type="button" className="ct-btn-secondary" onClick={() => setShowObligacionModal(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="ct-btn-primary" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignTemplateModal && (
        <div className="ct-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !busy) setShowAssignTemplateModal(false); }}>
          <div className="ct-modal" role="dialog" aria-modal="true" aria-label="Asignar plantilla activa">
            <h3>Asignar Plantilla Activa</h3>
            <p className="ct-assign-modal-sub">
              Selecciona una plantilla para el tipo de contrato <strong>{contrato.tipo_contrato_display}</strong> y producto <strong>{contrato.software.nombre}</strong>.
            </p>
            {templatesLoading ? (
              <p className="ct-assign-modal-hint">Cargando plantillas...</p>
            ) : availableTemplates.length === 0 ? (
              <p className="ct-assign-modal-hint error">No hay plantillas creadas para este tipo y producto.</p>
            ) : (
              <div className="ct-assign-modal-list">
                {availableTemplates.map(tmpl => (
                  <div key={tmpl.id} className="ct-assign-modal-item">
                    <div>
                      <p className="ct-assign-modal-name">{tmpl.nombre} (v{tmpl.version_codigo})</p>
                      <p className="ct-assign-modal-date">Actualizado: {fmtDate(tmpl.fecha_creacion)}</p>
                    </div>
                    <button className="ct-btn-primary" disabled={busy} onClick={() => handleAssignTemplate(tmpl.id)}>
                      {busy ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="ct-modal-footer">
              <button type="button" className="ct-btn-secondary" onClick={() => setShowAssignTemplateModal(false)} disabled={busy}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPluginSimulator && (
        <Suspense fallback={null}>
          <WordDocsPluginSimulator
            contratoId={contrato.id}
            currentText={contrato.texto_adicional_clausulas}
            onClose={() => setShowPluginSimulator(false)}
            onSyncSuccess={load}
          />
        </Suspense>
      )}

      {signatureProvider && (
        <Suspense fallback={null}>
          <SignatureSimulator
            contrato={contrato}
            proveedor={signatureProvider}
            onClose={() => setSignatureProvider(null)}
            onSignComplete={async () => {
              setSignatureProvider(null);
              await load();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
