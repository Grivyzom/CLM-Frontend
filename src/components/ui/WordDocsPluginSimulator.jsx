import React, { useState, useEffect, useRef } from 'react';
import { syncExternalContract, getClausulas } from '../../api';
import './WordDocsPluginSimulator.css';

// Fallback clauses if the database is empty
const MOCK_CLAUSES = [
  {
    id: 901,
    nombre: "Confidencialidad Estándar",
    categoria: "Confidencialidad",
    riesgo: "Bajo",
    texto: "Las Partes se obligan a mantener bajo estricta reserva y secreto toda la Información Confidencial recibida de la otra Parte durante la vigencia de este contrato y por un periodo de cinco (5) años posterior a su término."
  },
  {
    id: 902,
    nombre: "Jurisdicción y Ley Aplicable",
    categoria: "Legal",
    riesgo: "Bajo",
    texto: "Este contrato se rige en todos sus aspectos por las leyes de la República de Chile. Para cualquier controversia, las partes se someten a la jurisdicción de los Tribunales Ordinarios de Santiago."
  },
  {
    id: 903,
    nombre: "Propiedad Intelectual del Software",
    categoria: "Propiedad Intelectual",
    riesgo: "Medio",
    texto: "Toda la propiedad intelectual del software licenciado y los desarrollos adicionales pertenecen única y exclusivamente al Licenciante. El Cliente recibe una licencia de uso de carácter temporal, no exclusiva e intransferible."
  },
  {
    id: 904,
    nombre: "Limitación de Responsabilidad (Daño Emergente)",
    categoria: "Responsabilidad",
    riesgo: "Alto",
    texto: "En ningún caso la responsabilidad del Proveedor superará la suma total efectivamente pagada por el Cliente en los últimos seis (6) meses inmediatamente anteriores al hecho que cause la reclamación."
  },
  {
    id: 905,
    nombre: "Terminación Anticipada por Incumplimiento",
    categoria: "Terminación",
    riesgo: "Medio",
    texto: "Cualquiera de las partes podrá resolver el presente contrato de forma inmediata ante un incumplimiento grave de las obligaciones de la otra parte, previo requerimiento escrito otorgando un plazo de quince (15) días para subsanar."
  }
];

export default function WordDocsPluginSimulator({ contratoId, currentText, onClose, onSyncSuccess }) {
  const [editorType, setEditorType] = useState('WORD'); // 'WORD' or 'GDOCS'
  const [docText, setDocText] = useState(currentText || '');
  const [clauses, setClauses] = useState(MOCK_CLAUSES);
  
  // Plugin sidebar state
  const [autoSync, setAutoSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'unsynced', 'error'
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [lockedByUs, setLockedByUs] = useState(false);
  const [clmLogs, setClmLogs] = useState([
    { time: new Date(Date.now() - 300000), action: "Vínculo establecido con CLM" }
  ]);
  const [searchClause, setSearchClause] = useState('');
  
  const textareaRef = useRef(null);
  const timerRef = useRef(null);

  // Load clauses on mount
  useEffect(() => {
    async function loadClauses() {
      try {
        const data = await getClausulas();
        const results = data.results || data;
        if (results && Array.isArray(results) && results.length > 0) {
          // Map to match structure or use raw safely
          const mapped = results
            .filter(c => c && typeof c === 'object')
            .map(c => ({
              id: c.id || Math.random(),
              nombre: c.nombre || '',
              categoria: c.categoria || '',
              riesgo: c.riesgo || 'Medio',
              texto: c.versiones && c.versiones.length > 0 ? c.versiones[0].texto : (c.texto || '')
            }));
          setClauses(mapped);
        }
      } catch (err) {
        console.warn("Failed to fetch library clauses, using high-quality fallback presets:", err);
      }
    }
    loadClauses();
  }, []);

  // Lock the contract externally on mount
  useEffect(() => {
    let active = true;
    async function lockContract() {
      try {
        await syncExternalContract(contratoId, { action: 'lock', editor: editorType });
        if (active) {
          setLockedByUs(true);
          setClmLogs(prev => [
            { time: new Date(), action: `Bloqueo de edición iniciado en ${editorType === 'WORD' ? 'Word' : 'Google Docs'}` },
            ...prev
          ]);
        }
      } catch (err) {
        console.error("Error locking contract:", err);
      }
    }
    lockContract();

    return () => {
      active = false;
      // Unlock on unmount
      syncExternalContract(contratoId, { action: 'unlock' })
        .then(() => { if (onSyncSuccess) onSyncSuccess(); })
        .catch(err => console.error("Error unlocking contract on exit:", err));
    };
  }, [contratoId, editorType]);

  // Handle auto-sync debouncing
  useEffect(() => {
    if (!autoSync) return;
    
    // Mark as unsynced/changes pending immediately when user types
    if (docText !== currentText && syncStatus === 'synced') {
      setSyncStatus('unsynced');
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      if (docText === currentText) return;
      await performPush();
    }, 1500); // 1.5s debounce

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [docText]);

  // Push changes to CLM
  async function performPush() {
    setSyncStatus('syncing');
    try {
      await syncExternalContract(contratoId, {
        action: 'sync_push',
        editor: editorType,
        content: docText
      });
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setClmLogs(prev => [
        { time: new Date(), action: "Cambios guardados y sincronizados en CLM" },
        ...prev
      ]);
      if (onSyncSuccess) onSyncSuccess();
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  }

  // Pull changes from CLM
  async function performPull() {
    setSyncStatus('syncing');
    try {
      const data = await syncExternalContract(contratoId, { action: 'sync_pull' });
      const text = data.texto_adicional_clausulas || '';
      setDocText(text);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setClmLogs(prev => [
        { time: new Date(), action: "Texto fresco importado desde el CLM" },
        ...prev
      ]);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  }

  // Unlock / Lock manually
  async function toggleManualLock() {
    try {
      if (lockedByUs) {
        await syncExternalContract(contratoId, { action: 'unlock' });
        setLockedByUs(false);
        setClmLogs(prev => [
          { time: new Date(), action: "Bloqueo liberado manualmente" },
          ...prev
        ]);
      } else {
        await syncExternalContract(contratoId, { action: 'lock', editor: editorType });
        setLockedByUs(true);
        setClmLogs(prev => [
          { time: new Date(), action: `Bloqueo adquirido en ${editorType === 'WORD' ? 'Word' : 'Google Docs'}` },
          ...prev
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Insert clause at cursor position
  function handleInsertClause(clauseText) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDocText(prev => prev + "\n\n" + clauseText);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = docText.substring(0, start);
    const textAfter = docText.substring(end, docText.length);

    setDocText(textBefore + "\n" + clauseText + "\n" + textAfter);
    
    // Put cursor right after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newPos = start + clauseText.length + 2; // +2 for newlines
      textarea.setSelectionRange(newPos, newPos);
    }, 50);

    setClmLogs(prev => [
      { time: new Date(), action: "Cláusula de biblioteca insertada" },
      ...prev
    ]);
  }

  // Filter clauses safely
  const filteredClauses = clauses.filter(c => {
    const nombre = c.nombre || '';
    const categoria = c.categoria || '';
    const texto = c.texto || '';
    const term = searchClause.toLowerCase();
    return nombre.toLowerCase().includes(term) ||
           categoria.toLowerCase().includes(term) ||
           texto.toLowerCase().includes(term);
  });

  return (
    <div className="plugin-sim-overlay">
      {/* Upper header - Simulation Controller */}
      <div className="plugin-sim-header">
        <div className="plugin-sim-header-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>Consola del Simulador: Plugins Nativos de Procesadores de Texto</span>
          <span style={{ fontSize: 11, color: '#9aa0a6', border: '1px solid #5f6368', padding: '2px 8px', borderRadius: 10 }}>
            Simula cómo interactúa el plugin de Word / Docs con el CLM en tiempo real
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', background: '#3c4043', padding: 3, borderRadius: 6, gap: 4 }}>
            <button 
              onClick={() => setEditorType('WORD')}
              style={{
                background: editorType === 'WORD' ? '#185abd' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: editorType === 'WORD' ? 'bold' : 'normal'
              }}
            >
              Microsoft Word
            </button>
            <button 
              onClick={() => setEditorType('GDOCS')}
              style={{
                background: editorType === 'GDOCS' ? '#1a73e8' : 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: editorType === 'GDOCS' ? 'bold' : 'normal'
              }}
            >
              Google Docs
            </button>
          </div>

          <button className="plugin-sim-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Cerrar Simulador y Volver
          </button>
        </div>
      </div>

      <div className="plugin-sim-container">
        
        {/* --- LEFT WINDOW: Word or Google Docs editor mockup --- */}
        {editorType === 'WORD' ? (
          <div className="word-window">
            <div className="word-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>Contrato_Draft_v{contratoId}.docx</span>
                <span style={{ opacity: 0.7 }}>- Guardado en la nube</span>
              </div>
              <div className="word-window-controls">
                <span>Buscar</span>
                <span>Iniciar sesión</span>
              </div>
            </div>

            <div className="word-tab-strip">
              <span className="word-tab">Archivo</span>
              <span className="word-tab active">Inicio</span>
              <span className="word-tab">Insertar</span>
              <span className="word-tab">Disposición</span>
              <span className="word-tab">Referencias</span>
              <span className="word-tab" style={{ color: '#185abd', fontWeight: 'bold' }}>Complementos CLM</span>
            </div>

            <div className="word-ribbon">
              <div className="word-ribbon-group">
                <div className="word-ribbon-buttons">
                  <button className="word-ribbon-btn primary" onClick={performPush}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <span>Guardar CLM</span>
                  </button>
                  <button className="word-ribbon-btn" onClick={performPull}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    <span>Traer CLM</span>
                  </button>
                </div>
                <span className="word-ribbon-group-label">Sincronización CLM</span>
              </div>

              <div className="word-ribbon-group">
                <div className="word-ribbon-buttons">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <select style={{ fontSize: 10, padding: '2px 4px', border: '1px solid #d2d0ce', borderRadius: 2 }}>
                      <option>Arial</option>
                      <option>Calibri</option>
                      <option>Times New Roman</option>
                    </select>
                    <select style={{ fontSize: 10, padding: '2px 4px', border: '1px solid #d2d0ce', borderRadius: 2 }}>
                      <option>11</option>
                      <option>12</option>
                      <option>14</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button style={{ fontWeight: 'bold', width: 20, height: 20, border: '1px solid #d2d0ce', background: '#f3f2f1', fontSize: 11 }}>N</button>
                    <button style={{ fontStyle: 'italic', width: 20, height: 20, border: '1px solid #d2d0ce', background: '#f3f2f1', fontSize: 11 }}>K</button>
                    <button style={{ textDecoration: 'underline', width: 20, height: 20, border: '1px solid #d2d0ce', background: '#f3f2f1', fontSize: 11 }}>S</button>
                  </div>
                </div>
                <span className="word-ribbon-group-label">Fuente</span>
              </div>

              <div className="word-ribbon-group" style={{ borderRight: 'none' }}>
                <div className="word-ribbon-buttons">
                  <button className="word-ribbon-btn" onClick={toggleManualLock}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {lockedByUs ? (
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 11v5h6v-5H9zm0 0V8.5a3 3 0 0 1 6 0V11H9z" />
                      ) : (
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 11v5h6v-5H9zm1-5h4a2 2 0 0 1 2 2v3H8V8a2 2 0 0 1 2-2z" />
                      )}
                    </svg>
                    <span>{lockedByUs ? 'Liberar' : 'Bloquear'}</span>
                  </button>
                </div>
                <span className="word-ribbon-group-label">Seguridad</span>
              </div>
            </div>

            <div className="sim-doc-workspace">
              <div className="sim-doc-sheet">
                <div className="sim-doc-sheet-ruler"></div>
                <textarea
                  ref={textareaRef}
                  className="sim-doc-sheet-content"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Redacta el contrato en Word... Los cambios se sincronizarán directamente en el CLM."
                />
              </div>
            </div>

            <div className="sim-doc-status-bar">
              <div className="sim-doc-status-left">
                <span>Página 1 de 1</span>
                <span>{docText.split(/\s+/).filter(Boolean).length} palabras</span>
                <span>Español (Chile)</span>
              </div>
              <div className="sim-doc-status-right">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
                <span>Conectado a CLM</span>
              </div>
            </div>
          </div>
        ) : (
          /* Google Docs Layout */
          <div className="gdocs-window">
            <div className="gdocs-header-bar">
              <div className="gdocs-title-row">
                <div className="gdocs-doc-title-container">
                  <svg className="gdocs-doc-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                  <div>
                    <div className="gdocs-doc-title">Contrato_Draft_v{contratoId}</div>
                    <div className="gdocs-menu-bar">
                      <span className="gdocs-menu-item">Archivo</span>
                      <span className="gdocs-menu-item">Editar</span>
                      <span className="gdocs-menu-item">Ver</span>
                      <span className="gdocs-menu-item">Insertar</span>
                      <span className="gdocs-menu-item">Formato</span>
                      <span className="gdocs-menu-item">Herramientas</span>
                      <span className="gdocs-menu-item" style={{ color: '#1a73e8', fontWeight: 'bold' }}>Extensiones (CLM)</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#5f6368' }}>Autoguardado en Drive</span>
                  <button style={{ background: '#c2e7ff', color: '#041e49', border: 'none', padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>
                    Compartir
                  </button>
                </div>
              </div>
            </div>

            <div className="gdocs-toolbar">
              <button className="gdocs-toolbar-btn active" onClick={performPush} title="Empujar cambios a CLM">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <span style={{ marginLeft: 4, fontSize: 11 }}>Guardar en CLM</span>
              </button>
              <button className="gdocs-toolbar-btn" onClick={performPull} title="Traer cambios del CLM">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                <span style={{ marginLeft: 4, fontSize: 11 }}>Importar de CLM</span>
              </button>
              <span style={{ color: '#dadce0' }}>|</span>
              <button className="gdocs-toolbar-btn" style={{ fontWeight: 'bold' }}>B</button>
              <button className="gdocs-toolbar-btn" style={{ fontStyle: 'italic' }}>I</button>
              <button className="gdocs-toolbar-btn" style={{ textDecoration: 'underline' }}>U</button>
            </div>

            <div className="sim-doc-workspace">
              <div className="sim-doc-sheet">
                <div className="sim-doc-sheet-ruler"></div>
                <textarea
                  ref={textareaRef}
                  className="sim-doc-sheet-content"
                  style={{ fontFamily: '"Arial", sans-serif' }}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Escribe el borrador en Google Docs... Se sincronizará automáticamente."
                />
              </div>
            </div>

            <div className="sim-doc-status-bar">
              <div className="sim-doc-status-left">
                <span>1 página</span>
                <span>{docText.split(/\s+/).filter(Boolean).length} palabras</span>
              </div>
              <div className="sim-doc-status-right" style={{ color: '#1a73e8' }}>
                <span>Plugin de Google Docs Activo</span>
              </div>
            </div>
          </div>
        )}

        {/* --- RIGHT PANEL: CLM Taskpane / Integration Add-in Mockup --- */}
        <div className="clm-taskpane">
          <div className={`clm-taskpane-header ${editorType === 'GDOCS' ? 'gdocs' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: editorType === 'GDOCS' ? '#1a73e8' : '#ffffff', color: editorType === 'GDOCS' ? '#ffffff' : '#185abd', width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                α
              </div>
              <span style={{ color: editorType === 'GDOCS' ? '#1a73e8' : '#ffffff' }}>Antigravity CLM</span>
            </div>
            <span style={{ fontSize: 10, opacity: 0.8 }}>v2.4</span>
          </div>

          <div className="clm-taskpane-content">
            {/* Status card */}
            <div className="clm-status-box">
              <span className="clm-status-title">Estado de Sincronización</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="clm-status-value">
                  {syncStatus === 'synced' && (
                    <>
                      <span className="clm-sync-badge synced">Sincronizado</span>
                      <span style={{ fontSize: 10, color: '#5f6368' }}>CLM ok</span>
                    </>
                  )}
                  {syncStatus === 'syncing' && (
                    <>
                      <span className="clm-sync-badge syncing">Sincronizando...</span>
                    </>
                  )}
                  {syncStatus === 'unsynced' && (
                    <>
                      <span className="clm-sync-badge unsynced">Cambios locales</span>
                    </>
                  )}
                  {syncStatus === 'error' && (
                    <>
                      <span className="clm-sync-badge unsynced">Error de red</span>
                    </>
                  )}
                </div>
                
                {/* Manual Force Sync Button if AutoSync is Off */}
                {!autoSync && (
                  <button 
                    onClick={performPush} 
                    className={`clm-action-btn ${editorType === 'GDOCS' ? 'gdocs' : ''}`}
                    style={{ padding: '3px 8px', fontSize: 10 }}
                    disabled={syncStatus === 'syncing'}
                  >
                    Guardar
                  </button>
                )}
              </div>

              <div style={{ fontSize: 10, color: '#605e5c', borderTop: '1px solid #e1dfdd', paddingTop: 6, marginTop: 4 }}>
                Última sincronización: {lastSyncTime.toLocaleTimeString()}
              </div>
            </div>

            {/* Lock management */}
            <div className="clm-status-box" style={{ gap: 4 }}>
              <span className="clm-status-title">Bloqueo de Contrato</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11 }}>
                  {lockedByUs ? "🔒 Bloqueado por ti en CLM" : "🔓 Sin bloqueo exclusivo"}
                </span>
                <button 
                  onClick={toggleManualLock} 
                  className="clm-action-btn secondary"
                  style={{ padding: '3px 8px', fontSize: 10 }}
                >
                  {lockedByUs ? "Liberar" : "Bloquear"}
                </button>
              </div>
            </div>

            {/* Auto sync option */}
            <div className="clm-toggle-container">
              <span style={{ fontWeight: 500, fontSize: 12 }}>Sincronización Automática</span>
              <label className="clm-switch">
                <input 
                  type="checkbox" 
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                />
                <span className={`clm-slider ${editorType === 'GDOCS' ? 'gdocs' : ''}`}></span>
              </label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />

            {/* Clause Library Section */}
            <div className="clm-clause-library">
              <span className="clm-status-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Biblioteca de Cláusulas</span>
                <span style={{ fontSize: 9, textTransform: 'none', color: '#185abd' }}>Hacer clic para insertar</span>
              </span>

              <input 
                type="text"
                placeholder="Buscar cláusula..."
                value={searchClause}
                onChange={e => setSearchClause(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: 12,
                  border: '1px solid #dadce0',
                  borderRadius: 4,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                {filteredClauses.length > 0 ? (
                  filteredClauses.map(clause => (
                    <button 
                      key={clause.id} 
                      className="clm-clause-card"
                      onClick={() => handleInsertClause(clause.texto)}
                    >
                      <div className="clm-clause-title">
                        <span>{clause.nombre}</span>
                        <span className={`clm-clause-risk ${
                          clause.riesgo.toLowerCase() === 'bajo' ? 'low' : 
                          clause.riesgo.toLowerCase() === 'medio' ? 'medium' : 'high'
                        }`}>
                          {clause.riesgo}
                        </span>
                      </div>
                      <div className="clm-clause-text">{clause.texto}</div>
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: '#5f6368', textAlign: 'center', padding: '12px 0' }}>
                    No se encontraron cláusulas.
                  </span>
                )}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />

            {/* Integration Logs / History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="clm-status-title">Registro de Actividad</span>
              <div style={{ 
                maxHeight: 120, 
                overflowY: 'auto', 
                fontSize: 10, 
                color: '#5f6368',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                border: '1px solid #edf2fc',
                borderRadius: 4,
                padding: 6,
                background: '#fafafa'
              }}>
                {clmLogs.map((log, index) => (
                  <div key={index} style={{ borderBottom: '1px solid #f1f3f4', paddingBottom: 4 }}>
                    <span style={{ color: '#9aa0a6' }}>{log.time.toLocaleTimeString()}</span> - {log.action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
