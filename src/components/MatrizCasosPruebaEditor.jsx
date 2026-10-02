import React, { useState, useMemo } from 'react';

export const ESTADOS_UAT = [
  { valor: 'Aprobado', badge: 'pass', label: 'Aprobado (Pass)', color: '#137333', bg: '#e6f4ea', border: '#ceead6' },
  { valor: 'Aprobado con Obs.', badge: 'obs', label: 'Aprobado con Obs.', color: '#b06000', bg: '#fef7e0', border: '#feefc3' },
  { valor: 'Rechazado', badge: 'fail', label: 'Rechazado (Fail)', color: '#c5221f', bg: '#fce8e6', border: '#fad2cf' },
  { valor: 'Bloqueado', badge: 'block', label: 'Bloqueado (Blocked)', color: '#7b1fa2', bg: '#f3e8fd', border: '#e1bee7' },
  { valor: 'Pendiente', badge: 'pending', label: 'Pendiente (Pending)', color: '#5f6368', bg: '#f1f3f4', border: '#dadce0' },
];

export const DEFAULT_CASOS_PRUEBA = [
  {
    id: 'CP-01',
    modulo: 'Autenticación',
    caso_uso: 'CU-01 Inicio de Sesión',
    escenario: 'Inicio de sesión con usuario estándar y credenciales válidas',
    pasos: 'Usuario activo en base de datos.\n1. Ir a pantalla /login.\n2. Ingresar usuario y clave autorizados.\n3. Clic en botón "Ingresar".',
    resultado_esperado: 'Acceso correcto al panel principal mostrando el nombre y rol del usuario.',
    resultado_obtenido: 'Funciona según lo esperado en todos los navegadores homologados.',
    estado: 'Aprobado',
    estado_badge: 'pass',
  },
  {
    id: 'CP-02',
    modulo: 'Facturación',
    caso_uso: 'CU-02 Emisión de Facturas',
    escenario: 'Creación y emisión de factura electrónica con cálculo de IVA',
    pasos: 'Catálogo de servicios y cliente configurados.\n1. Ir a Nueva Venta.\n2. Agregar 2 ítems gravados.\n3. Clic en "Emitir Documento".',
    resultado_esperado: 'Factura con cálculo de IVA correcto (19%) y estado persistido como "Emitida".',
    resultado_obtenido: 'Cálculo correcto, tarda 1.2s en procesar la emisión.',
    estado: 'Aprobado con Obs.',
    estado_badge: 'obs',
  },
  {
    id: 'CP-03',
    modulo: 'Reportes',
    caso_uso: 'CU-03 Exportación Mensual',
    escenario: 'Exportación de reporte consolidado de operaciones a Excel',
    pasos: 'Operaciones registradas en el mes actual.\n1. Ir a Reportes.\n2. Seleccionar rango mensual.\n3. Clic en "Exportar XLS".',
    resultado_esperado: 'Descarga automática de archivo .xlsx íntegro con la totalidad de registros.',
    resultado_obtenido: 'Error 500 al filtrar más de 500 registros simultáneos.',
    estado: 'Rechazado',
    estado_badge: 'fail',
  },
  {
    id: 'CP-04',
    modulo: 'Usuarios',
    caso_uso: 'CU-04 Control de Acceso',
    escenario: 'Desactivación de cuenta de empleado y revocación de sesión',
    pasos: 'Rol Operador asignado.\n1. Configuración > Usuarios.\n2. Elegir usuario.\n3. Conmutar switch a "Inactivo" y guardar.',
    resultado_esperado: 'El usuario ya no puede iniciar sesión ni realizar acciones protegidas.',
    resultado_obtenido: 'Pendiente de ejecución.',
    estado: 'Pendiente',
    estado_badge: 'pending',
  },
];

export function parseCasosPrueba(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
  }
  return null;
}

const ESTADO_MAP = Object.fromEntries(ESTADOS_UAT.map(e => [e.valor, e]));

export default function MatrizCasosPruebaEditor({ value, onChange, compact = false }) {
  // Inicialización o parsing seguro
  const casos = useMemo(() => {
    const p = parseCasosPrueba(value);
    return p !== null ? p : DEFAULT_CASOS_PRUEBA;
  }, [value]);

  const [expandedIndices, setExpandedIndices] = useState(() => new Set([0]));
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const emitirCambio = (nuevosCasos) => {
    onChange?.(nuevosCasos);
  };

  const toggleExpand = (idx) => {
    setExpandedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIndices(new Set(casos.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedIndices(new Set());
  };

  const actualizarCaso = (idx, campo, val) => {
    const nuevos = [...casos];
    const item = { ...nuevos[idx], [campo]: val };
    if (campo === 'estado') {
      const info = ESTADO_MAP[val];
      item.estado_badge = info ? info.badge : 'pending';
    }
    nuevos[idx] = item;
    emitirCambio(nuevos);
  };

  const agregarCaso = () => {
    const nuevoNumero = casos.length + 1;
    const nuevoId = `CP-${String(nuevoNumero).padStart(2, '0')}`;
    const nuevo = {
      id: nuevoId,
      modulo: '',
      caso_uso: '',
      escenario: '',
      pasos: '1. Ir a...\n2. Ingresar...\n3. Validar...',
      resultado_esperado: '',
      resultado_obtenido: 'Pendiente de ejecución',
      estado: 'Pendiente',
      estado_badge: 'pending',
    };
    const nuevos = [...casos, nuevo];
    emitirCambio(nuevos);
    setExpandedIndices(prev => new Set([...prev, nuevos.length - 1]));
  };

  const duplicarCaso = (idx, e) => {
    e?.stopPropagation();
    const orig = casos[idx];
    const nuevoNumero = casos.length + 1;
    const copia = {
      ...orig,
      id: `CP-${String(nuevoNumero).padStart(2, '0')}`,
      escenario: `${orig.escenario} (Copia)`,
      estado: 'Pendiente',
      estado_badge: 'pending',
      resultado_obtenido: 'Pendiente de ejecución',
    };
    const nuevos = [...casos.slice(0, idx + 1), copia, ...casos.slice(idx + 1)];
    emitirCambio(nuevos);
    setExpandedIndices(prev => new Set([...prev, idx + 1]));
  };

  const eliminarCaso = (idx, e) => {
    e?.stopPropagation();
    if (casos.length <= 1) {
      if (!window.confirm('¿Deseas eliminar el último caso de prueba? La matriz quedará vacía.')) return;
    }
    const nuevos = casos.filter((_, i) => i !== idx);
    emitirCambio(nuevos);
    setExpandedIndices(prev => {
      const next = new Set();
      for (const i of prev) {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      }
      return next;
    });
  };

  const moverCaso = (idx, direccion, e) => {
    e?.stopPropagation();
    const dest = idx + direccion;
    if (dest < 0 || dest >= casos.length) return;
    const nuevos = [...casos];
    const temp = nuevos[idx];
    nuevos[idx] = nuevos[dest];
    nuevos[dest] = temp;
    emitirCambio(nuevos);

    setExpandedIndices(prev => {
      const next = new Set(prev);
      const hadIdx = next.has(idx);
      const hadDest = next.has(dest);
      if (hadIdx) next.add(dest); else next.delete(dest);
      if (hadDest) next.add(idx); else next.delete(idx);
      return next;
    });
  };

  const cargarSugeridos = () => {
    if (casos.length > 0 && !window.confirm('Esto reemplazará los casos actuales con los 4 casos de prueba estándar recomendados. ¿Continuar?')) {
      return;
    }
    emitirCambio(DEFAULT_CASOS_PRUEBA);
    setExpandedIndices(new Set([0]));
  };

  const limpiarTodo = () => {
    if (window.confirm('¿Estás seguro de vaciar todos los casos de prueba de la matriz?')) {
      emitirCambio([]);
      setExpandedIndices(new Set());
    }
  };

  // Contadores de estado
  const contadores = useMemo(() => {
    const counts = { total: casos.length, pass: 0, obs: 0, fail: 0, block: 0, pending: 0 };
    for (const c of casos) {
      const b = c.estado_badge || ESTADO_MAP[c.estado]?.badge || 'pending';
      if (counts[b] !== undefined) counts[b]++;
      else counts.pending++;
    }
    return counts;
  }, [casos]);

  // Filtrado en UI
  const casosFiltrados = useMemo(() => {
    return casos.map((c, originalIndex) => ({ c, originalIndex })).filter(({ c }) => {
      if (filtroEstado !== 'TODOS') {
        const b = c.estado_badge || ESTADO_MAP[c.estado]?.badge || 'pending';
        if (b !== filtroEstado) return false;
      }
      if (filtroTexto.trim()) {
        const query = filtroTexto.toLowerCase();
        const textoCompleto = `${c.id} ${c.modulo} ${c.caso_uso} ${c.escenario} ${c.pasos} ${c.resultado_esperado}`.toLowerCase();
        return textoCompleto.includes(query);
      }
      return true;
    });
  }, [casos, filtroEstado, filtroTexto]);

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--surface)',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      fontFamily: 'inherit',
      marginTop: 6,
      marginBottom: 14
    }}>
      {/* Header del Editor */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-faint)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14
          }}>
            ✓
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Matriz de Casos de Prueba (UAT)
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(37,99,235,0.1)',
                color: 'var(--primary)',
                padding: '1px 8px',
                borderRadius: 12
              }}>
                {casos.length} {casos.length === 1 ? 'caso' : 'casos'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Ingresa los casos de uso, precondiciones, pasos y resultados para generar la matriz del documento.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={agregarCaso}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>+ Añadir Caso</span>
          </button>
          <button
            type="button"
            onClick={cargarSugeridos}
            title="Carga 4 casos de prueba preconfigurados con flujos de autenticación, facturación, etc."
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cargar Sugeridos
          </button>
          {casos.length > 0 && (
            <button
              type="button"
              onClick={limpiarTodo}
              title="Vaciar todos los casos"
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--text-faint)',
                border: '1px solid transparent',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              Vaciar
            </button>
          )}
        </div>
      </div>

      {/* Barra de Estadísticas y Filtros */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--bg-page)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 11
      }}>
        {/* Chips de estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-faint)', fontWeight: 600, marginRight: 2 }}>ESTADOS:</span>
          <button
            type="button"
            onClick={() => setFiltroEstado('TODOS')}
            style={{
              padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: 'none',
              background: filtroEstado === 'TODOS' ? 'var(--text-primary)' : 'var(--bg-faint)',
              color: filtroEstado === 'TODOS' ? 'var(--surface)' : 'var(--text-secondary)',
              fontWeight: 600
            }}
          >
            Todos ({contadores.total})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('pass')}
            style={{
              padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid #ceead6',
              background: filtroEstado === 'pass' ? '#137333' : '#e6f4ea',
              color: filtroEstado === 'pass' ? '#fff' : '#137333',
              fontWeight: 600
            }}
          >
            Aprobados ({contadores.pass})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('obs')}
            style={{
              padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid #feefc3',
              background: filtroEstado === 'obs' ? '#b06000' : '#fef7e0',
              color: filtroEstado === 'obs' ? '#fff' : '#b06000',
              fontWeight: 600
            }}
          >
            Con Obs. ({contadores.obs})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('fail')}
            style={{
              padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid #fad2cf',
              background: filtroEstado === 'fail' ? '#c5221f' : '#fce8e6',
              color: filtroEstado === 'fail' ? '#fff' : '#c5221f',
              fontWeight: 600
            }}
          >
            Rechazados ({contadores.fail})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('pending')}
            style={{
              padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: '1px solid #dadce0',
              background: filtroEstado === 'pending' ? '#5f6368' : '#f1f3f4',
              color: filtroEstado === 'pending' ? '#fff' : '#5f6368',
              fontWeight: 600
            }}
          >
            Pendientes ({contadores.pending})
          </button>
        </div>

        {/* Buscador y colapsar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="Filtrar casos..."
            value={filtroTexto}
            onChange={e => setFiltroTexto(e.target.value)}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              width: 130
            }}
          />
          <button
            type="button"
            onClick={expandedIndices.size === casos.length ? collapseAll : expandAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            {expandedIndices.size === casos.length ? 'Colapsar todo' : 'Expandir todo'}
          </button>
        </div>
      </div>

      {/* Lista de Casos de Prueba */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
        {casosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px', background: 'var(--bg-faint)', borderRadius: 6 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {casos.length === 0 ? 'No hay casos de prueba en la matriz' : 'No hay casos que coincidan con el filtro'}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--text-muted)' }}>
              {casos.length === 0 ? 'Puedes agregar nuevos casos de prueba manualmente o cargar la plantilla recomendada.' : 'Prueba cambiando el texto de búsqueda o el filtro de estado.'}
            </p>
            {casos.length === 0 && (
              <button
                type="button"
                onClick={cargarSugeridos}
                style={{
                  padding: '6px 14px', borderRadius: 6, background: 'var(--primary)',
                  color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cargar 4 casos recomendados
              </button>
            )}
          </div>
        ) : (
          casosFiltrados.map(({ c, originalIndex }) => {
            const isExpanded = expandedIndices.has(originalIndex);
            const estadoInfo = ESTADO_MAP[c.estado] || ESTADOS_UAT[4];

            return (
              <div
                key={originalIndex}
                style={{
                  border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  boxShadow: isExpanded ? '0 2px 8px rgba(37,99,235,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Cabecera del Caso (Card Header) */}
                <div
                  onClick={() => toggleExpand(originalIndex)}
                  style={{
                    padding: '8px 12px',
                    background: isExpanded ? 'rgba(37,99,235,0.03)' : 'var(--bg-faint)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    {/* Botones de mover orden */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={originalIndex === 0}
                        onClick={(e) => moverCaso(originalIndex, -1, e)}
                        style={{
                          border: 'none', background: 'transparent', padding: '0 2px',
                          cursor: originalIndex === 0 ? 'default' : 'pointer',
                          opacity: originalIndex === 0 ? 0.2 : 0.7, fontSize: 8
                        }}
                        title="Mover arriba"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={originalIndex === casos.length - 1}
                        onClick={(e) => moverCaso(originalIndex, 1, e)}
                        style={{
                          border: 'none', background: 'transparent', padding: '0 2px',
                          cursor: originalIndex === casos.length - 1 ? 'default' : 'pointer',
                          opacity: originalIndex === casos.length - 1 ? 0.2 : 0.7, fontSize: 8
                        }}
                        title="Mover abajo"
                      >
                        ▼
                      </button>
                    </div>

                    {/* ID Pill */}
                    <span style={{
                      padding: '2px 6px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--text-primary)'
                    }}>
                      {c.id || `CP-${originalIndex + 1}`}
                    </span>

                    {/* Módulo y Caso de Uso */}
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.modulo || 'Sin módulo'}
                      </span>
                      {c.caso_uso && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#6366f1',
                          background: 'rgba(99,102,241,0.08)',
                          padding: '1px 5px',
                          borderRadius: 3
                        }}>
                          {c.caso_uso}
                        </span>
                      )}
                      <span style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 240
                      }}>
                        &mdash; {c.escenario || 'Sin escenario definido'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de la derecha */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {/* Selector rápido de Estado */}
                    <select
                      value={c.estado || 'Pendiente'}
                      onChange={e => actualizarCaso(originalIndex, 'estado', e.target.value)}
                      style={{
                        padding: '2px 6px',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 4,
                        border: `1px solid ${estadoInfo.border}`,
                        background: estadoInfo.bg,
                        color: estadoInfo.color,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {ESTADOS_UAT.map(est => (
                        <option key={est.valor} value={est.valor}>{est.label}</option>
                      ))}
                    </select>

                    {/* Botón duplicar */}
                    <button
                      type="button"
                      onClick={(e) => duplicarCaso(originalIndex, e)}
                      title="Duplicar este caso"
                      style={{
                        border: 'none', background: 'transparent', color: 'var(--text-muted)',
                        cursor: 'pointer', padding: '2px 4px', fontSize: 12
                      }}
                    >
                      📋
                    </button>

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={(e) => eliminarCaso(originalIndex, e)}
                      title="Eliminar este caso"
                      style={{
                        border: 'none', background: 'transparent', color: 'var(--danger, #dc2626)',
                        cursor: 'pointer', padding: '2px 4px', fontSize: 12
                      }}
                    >
                      ✕
                    </button>

                    {/* Flecha expandir */}
                    <span style={{ fontSize: 9, color: 'var(--text-faint)', marginLeft: 4 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Formulario Expandido del Caso */}
                {isExpanded && (
                  <div style={{ padding: '14px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                      {/* ID y Estado */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                          ID Caso de Prueba
                        </label>
                        <input
                          type="text"
                          value={c.id || ''}
                          onChange={e => actualizarCaso(originalIndex, 'id', e.target.value)}
                          placeholder="Ej. CP-01"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12,
                            borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)',
                            fontFamily: "'JetBrains Mono', monospace"
                          }}
                        />
                      </div>

                      {/* Módulo */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                          Módulo / Función *
                        </label>
                        <input
                          type="text"
                          value={c.modulo || ''}
                          onChange={e => actualizarCaso(originalIndex, 'modulo', e.target.value)}
                          placeholder="Ej. Autenticación, Cobranzas, Reportes"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12,
                            borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      {/* Caso de Uso Referenciado */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                          Caso de Uso / Requerimiento (Ref)
                        </label>
                        <input
                          type="text"
                          value={c.caso_uso || ''}
                          onChange={e => actualizarCaso(originalIndex, 'caso_uso', e.target.value)}
                          placeholder="Ej. CU-01 Inicio de Sesión o RF-04"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12,
                            borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Escenario de Negocio */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                        Escenario de Negocio *
                      </label>
                      <input
                        type="text"
                        value={c.escenario || ''}
                        onChange={e => actualizarCaso(originalIndex, 'escenario', e.target.value)}
                        placeholder="Descripción breve de lo que se valida en términos del negocio"
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: 12,
                          borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    {/* Precondiciones y Pasos */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                        Precondiciones y Pasos de Ejecución
                      </label>
                      <textarea
                        rows={3}
                        value={c.pasos || ''}
                        onChange={e => actualizarCaso(originalIndex, 'pasos', e.target.value)}
                        placeholder={'Precondición: Usuario con permisos.\n1. Ir a...\n2. Ingresar datos...\n3. Presionar botón...'}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: 11.5,
                          borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)',
                          fontFamily: 'inherit', resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Resultado Esperado vs Resultado Obtenido */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                          Resultado Esperado (Criterio de Aceptación)
                        </label>
                        <textarea
                          rows={2}
                          value={c.resultado_esperado || ''}
                          onChange={e => actualizarCaso(originalIndex, 'resultado_esperado', e.target.value)}
                          placeholder="Comportamiento esperado del sistema según la especificación"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 11.5,
                            borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)',
                            fontFamily: 'inherit', resize: 'vertical'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                          Resultado Obtenido (Ejecución real)
                        </label>
                        <textarea
                          rows={2}
                          value={c.resultado_obtenido || ''}
                          onChange={e => actualizarCaso(originalIndex, 'resultado_obtenido', e.target.value)}
                          placeholder="Detalle de la prueba o hallazgo encontrado (ej. Funciona OK o Error 500...)"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 11.5,
                            borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)',
                            fontFamily: 'inherit', resize: 'vertical'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer informativo */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--bg-faint)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 10.5,
        color: 'var(--text-muted)'
      }}>
        <span>💡 Cada caso se renderizará como una fila en la sección "3. Matriz de Casos de Prueba" del documento PDF.</span>
        <span>{casos.length} filas listas para renderizar</span>
      </div>
    </div>
  );
}
