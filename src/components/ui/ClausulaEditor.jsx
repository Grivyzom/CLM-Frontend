import React, { useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ClausulaBloqueRichText from './ClausulaBloqueRichText';
import { labelTipoTexto, TIPOS_APERTURA, TIPOS_CIERRE } from '../../utils/tiposTexto';
import './ClausulaEditor.css';

/**
 * Editor de bloques de cláusulas de un contrato.
 *
 * Cada bloque: { uid, titulo, texto, clausula_id?, version_id?, origen }
 *  - origen 'biblioteca'    → insertado desde la biblioteca de cláusulas
 *  - origen 'personalizada' → texto libre escrito por el usuario
 * "modificada" no se guarda en el estado: se deriva comparando el texto del
 * bloque contra la versión original de la biblioteca (prop clausulas).
 *
 * Props:
 *  - bloques / onChange : estado controlado por el padre
 *  - clausulas          : biblioteca (shape del API: {id, name, cat, risk, versions[]})
 *  - disabled           : solo lectura
 */

let uidSeq = 0;
export function nuevoUid() { return `b${Date.now().toString(36)}${++uidSeq}`; }

/** Calcula numeración jerárquica (1., 1.1, a)) para lista plana de bloques. */
export function numerarBloques(bloques) {
  const contadores = [0, 0, 0];
  return bloques.map(b => {
    const nivel = Math.max(0, Math.min(2, parseInt(b.nivel) || 0));
    contadores[nivel] += 1;
    for (let l = nivel + 1; l < 3; l++) contadores[l] = 0;
    let numero;
    if (nivel === 0) numero = `${contadores[0]}.`;
    else if (nivel === 1) numero = `${contadores[0]}.${contadores[1]}`;
    else numero = `${String.fromCharCode(97 + contadores[2] - 1)})`;
    return { numero, nivel };
  });
}

/** Construye los bloques iniciales a partir de las cláusulas de una plantilla. */
export function bloquesDesdePlantilla(clausulaIds, biblioteca) {
  const bloques = [];
  for (const c of biblioteca) {
    if (!clausulaIds.includes(c.id)) continue;
    const std = c.versions?.find(v => v.tipo === 'Estándar') || c.versions?.[0];
    if (!std) continue;
    bloques.push({
      uid: nuevoUid(),
      titulo: c.name,
      texto: std.texto,
      clausula_id: c.id,
      version_id: std.id,
      origen: 'biblioteca',
    });
  }
  return bloques;
}

/** Serializa los bloques al payload que espera el backend. */
export function bloquesAPayload(bloques, biblioteca = []) {
  return bloques
    .filter(b => (b.titulo || '').trim() || (b.texto || '').trim())
    .map(b => {
      const payload = {
        titulo: (b.titulo || '').trim(),
        texto: (b.texto || '').trim(),
        clausula_id: b.clausula_id ?? null,
        version_id: b.version_id ?? null,
        origen: b.origen === 'biblioteca' ? 'biblioteca' : 'personalizada',
        modificada: esBloqueModificado(b, biblioteca),
      };
      if (b.nivel !== undefined && b.nivel !== 0) {
        payload.nivel = b.nivel;
      }
      if (b.contenido) {
        payload.contenido = b.contenido;
      }
      return payload;
    });
}

/** Restaura bloques guardados (detail del contrato / draft) al estado del editor. */
export function bloquesDesdeGuardado(guardados) {
  if (!Array.isArray(guardados)) return [];
  return guardados.map(b => ({
    uid: nuevoUid(),
    titulo: b.titulo || '',
    texto: b.texto || '',
    contenido: b.contenido || null,
    nivel: b.nivel ?? 0,
    clausula_id: b.clausula_id ?? null,
    version_id: b.version_id ?? null,
    origen: b.origen === 'biblioteca' ? 'biblioteca' : 'personalizada',
  }));
}

function textoOriginal(bloque, biblioteca) {
  if (!bloque.clausula_id) return null;
  const c = biblioteca.find(x => x.id === bloque.clausula_id);
  if (!c) return null;
  const v = (bloque.version_id && c.versions?.find(x => x.id === bloque.version_id))
    || c.versions?.find(x => x.tipo === 'Estándar');
  return v ? v.texto : null;
}

function esBloqueModificado(bloque, biblioteca) {
  const original = textoOriginal(bloque, biblioteca);
  if (original == null) return false;
  return (bloque.texto || '').trim() !== original.trim();
}

// ─── Sugerencias de estructura (espejo de plantillas/services/sugerencias.py) ─
// Un documento profesional abre con saludo/introducción y cierra con
// despedida, cierre legal o bloque de firmas. Para bloques personalizados se
// usa una heurística por palabras clave.
const RE_APERTURA = /(saludo|estimad[oa]s?|de\s+nuestra\s+consideraci[oó]n|presente|comparec|pre[aá]mbulo|introducci[oó]n|antecedentes)/i;
const RE_CIERRE = /(atentamente|cordialmente|se\s+despide|despedida|sin\s+otro\s+particular|en\s+comprobante|en\s+se[ñn]al\s+de\s+conformidad|firman?|firmas?)/i;
const VENTANA_BORDES = 2;

function rolBloque(bloque, biblioteca) {
  const lib = bloque.clausula_id ? biblioteca.find(c => c.id === bloque.clausula_id) : null;
  const tipo = lib ? (lib.tipo_texto || 'CLAUSULA') : null;
  if (tipo && TIPOS_APERTURA.includes(tipo)) return 'apertura';
  if (tipo && TIPOS_CIERRE.includes(tipo)) return 'cierre';
  if (tipo && tipo !== 'OTRO') return null;
  const muestra = `${bloque.titulo || ''} ${(bloque.texto || '').slice(0, 300)}`;
  if (RE_APERTURA.test(muestra)) return 'apertura';
  if (RE_CIERRE.test(muestra)) return 'cierre';
  return null;
}

function candidataParaTipos(biblioteca, tipos) {
  for (const tipo of tipos) {
    const c = biblioteca.find(x => (x.tipo_texto || 'CLAUSULA') === tipo && (x.versions || []).length > 0);
    if (c) {
      const v = c.versions.find(x => x.tipo === 'Estándar') || c.versions[0];
      return { clausula: c, version: v };
    }
  }
  return null;
}

function RiesgoBadge({ riesgo }) {
  if (!riesgo) return null;
  const nivel = riesgo.toLowerCase();
  return <span className={`cle-badge cle-badge-riesgo-${nivel}`}>Riesgo {riesgo}</span>;
}

function Icon({ d, size = 13, sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function SortableBloque({ b, idx, disabled, modificada, libInfo, actualizar, mover, eliminar, restaurar, total }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.uid });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={`cle-bloque ${isDragging ? 'cle-bloque-dragging' : ''}`}>
      <div className="cle-bloque-head">
        {!disabled && (
          <div className="cle-drag-handle" {...attributes} {...listeners} title="Arrastrar para reordenar" style={{cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0 8px', color: 'var(--text-muted)'}}>
            <Icon d={['M8 6h8', 'M8 12h8', 'M8 18h8']} />
          </div>
        )}
        <span className="cle-bloque-num">{idx + 1}</span>
        <input
          className="cle-bloque-titulo"
          value={b.titulo}
          disabled={disabled}
          placeholder="TÍTULO DE LA CLÁUSULA"
          aria-label={`Título de la cláusula ${idx + 1}`}
          onChange={e => actualizar(b.uid, { titulo: e.target.value })}
        />
        {!disabled && (
          <div className="cle-bloque-actions">
            <button type="button" className="cle-icon-btn" title="Subir" aria-label="Subir cláusula"
              disabled={idx === 0} onClick={() => mover(idx, -1)}>
              <Icon d="M12 19V5M5 12l7-7 7 7" />
            </button>
            <button type="button" className="cle-icon-btn" title="Bajar" aria-label="Bajar cláusula"
              disabled={idx === total - 1} onClick={() => mover(idx, 1)}>
              <Icon d="M12 5v14M19 12l-7 7-7-7" />
            </button>
            <button type="button" className="cle-icon-btn cle-icon-btn-danger" title="Quitar" aria-label="Quitar cláusula"
              onClick={() => eliminar(b.uid)}>
              <Icon d={['M18 6 6 18', 'M6 6l12 12']} />
            </button>
          </div>
        )}
      </div>
      <ClausulaBloqueRichText
        contenido={b.contenido}
        texto={b.texto}
        disabled={disabled}
        onUpdate={({ contenido, texto }) => actualizar(b.uid, { contenido, texto })}
      />
      <div className="cle-bloque-foot">
        <span className="cle-badge cle-badge-origen">
          {b.origen === 'biblioteca' ? 'Biblioteca' : 'Personalizada'}
        </span>
        {libInfo && <RiesgoBadge riesgo={libInfo.risk} />}
        {modificada && (
          <span className="cle-badge cle-badge-editada" title="El texto difiere de la versión de la biblioteca">
            Editada
          </span>
        )}
        {modificada && !disabled && (
          <button type="button" className="cle-restaurar" onClick={() => restaurar(b)}>
            Restaurar texto original
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClausulaEditor({
  bloques,
  onChange,
  clausulas = [],
  disabled = false,
  idsUsadosExternos = new Set()
}) {
  const [libAbierta, setLibAbierta] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoLib, setTipoLib] = useState('');
  const rootRef = useRef(null);

  const categorias = useMemo(
    () => [...new Set(clausulas.map(c => c.cat).filter(Boolean))].sort(),
    [clausulas]
  );

  // Tipos de texto presentes en la biblioteca, en el orden canónico.
  const tiposEnBiblioteca = useMemo(() => {
    const presentes = new Set(clausulas.map(c => c.tipo_texto || 'CLAUSULA'));
    return ['CLAUSULA', ...TIPOS_APERTURA, ...TIPOS_CIERRE, 'OTRO'].filter(t => presentes.has(t));
  }, [clausulas]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clausulas.filter(c => {
      if (tipoLib && (c.tipo_texto || 'CLAUSULA') !== tipoLib) return false;
      if (categoria && c.cat !== categoria) return false;
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q) || (c.cat || '').toLowerCase().includes(q);
    });
  }, [clausulas, busqueda, categoria, tipoLib]);

  // Sugerencias de apertura/cierre: solo si hay bloques y el rol no está cubierto.
  const sugerencias = useMemo(() => {
    if (disabled || bloques.length === 0) return [];
    const roles = new Set([
      ...bloques.slice(0, VENTANA_BORDES).map(b => rolBloque(b, clausulas) === 'apertura' ? 'apertura' : null),
      ...bloques.slice(-VENTANA_BORDES).map(b => rolBloque(b, clausulas) === 'cierre' ? 'cierre' : null),
    ]);
    const out = [];
    if (!roles.has('apertura')) {
      out.push({
        pos: 'inicio',
        label: 'saludo o introducción inicial',
        candidata: candidataParaTipos(clausulas, TIPOS_APERTURA),
      });
    }
    if (!roles.has('cierre')) {
      out.push({
        pos: 'final',
        label: 'despedida, cierre o firmas',
        candidata: candidataParaTipos(clausulas, TIPOS_CIERRE),
      });
    }
    return out;
  }, [bloques, clausulas, disabled]);

  const insertarSugerencia = (s) => {
    if (!s.candidata) return;
    const { clausula, version } = s.candidata;
    const bloque = {
      uid: nuevoUid(),
      titulo: clausula.name,
      texto: version.texto,
      contenido: null,
      nivel: 0,
      clausula_id: clausula.id,
      version_id: version.id,
      origen: 'biblioteca',
    };
    onChange(s.pos === 'inicio' ? [bloque, ...bloques] : [...bloques, bloque]);
  };

  const idsInsertados = useMemo(() => {
    const usados = new Set(bloques.filter(b => b.clausula_id).map(b => String(b.clausula_id)));
    idsUsadosExternos.forEach(id => usados.add(String(id)));
    return usados;
  }, [bloques, idsUsadosExternos]);

  const actualizar = (uid, cambios) =>
    onChange(bloques.map(b => (b.uid === uid ? { ...b, ...cambios } : b)));

  const mover = (idx, delta) => {
    const destino = idx + delta;
    if (destino < 0 || destino >= bloques.length) return;
    const copia = [...bloques];
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    onChange(copia);
  };

  const eliminar = (uid) => onChange(bloques.filter(b => b.uid !== uid));

  const insertarDesdeBiblioteca = (clausula, version) => {
    onChange([...bloques, {
      uid: nuevoUid(),
      titulo: clausula.name,
      texto: version.texto,
      contenido: null,
      nivel: 0,
      clausula_id: clausula.id,
      version_id: version.id,
      origen: 'biblioteca',
    }]);
  };

  const agregarPersonalizado = () => {
    onChange([...bloques, {
      uid: nuevoUid(), titulo: '', texto: '', contenido: null, nivel: 0, clausula_id: null, version_id: null,
      origen: 'personalizada',
    }]);
    // Enfoca el título del bloque recién creado al pintarse.
    requestAnimationFrame(() => {
      const inputs = rootRef.current?.querySelectorAll('.cle-bloque-titulo');
      inputs?.[inputs.length - 1]?.focus();
    });
  };

  const restaurar = (bloque) => {
    const original = textoOriginal(bloque, clausulas);
    if (original != null) actualizar(bloque.uid, { texto: original, contenido: null });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = bloques.findIndex(b => b.uid === active.id);
      const newIndex = bloques.findIndex(b => b.uid === over.id);
      onChange(arrayMove(bloques, oldIndex, newIndex));
    }
  };

  return (
    <div className="cle-root" ref={rootRef}>
      {!disabled && (
        <div className="cle-toolbar">
          <span className="cle-count">
            {bloques.length === 0 ? 'Sin cláusulas' : `${bloques.length} cláusula${bloques.length === 1 ? '' : 's'} en el documento`}
          </span>
          <button type="button" className="cle-btn cle-btn-primary"
            aria-expanded={libAbierta}
            onClick={() => setLibAbierta(a => !a)}>
            <Icon d={['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z']} />
            {libAbierta ? 'Cerrar biblioteca' : 'Insertar cláusula'}
          </button>
          <button type="button" className="cle-btn" onClick={agregarPersonalizado}>
            <Icon d={['M12 5v14', 'M5 12h14']} />
            Texto personalizado
          </button>
        </div>
      )}

      {sugerencias.length > 0 && (
        <div className="cle-sugerencias" role="status">
          <Icon d={['M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z', 'M9 21h6']} />
          <span className="cle-sug-texto">
            Para un documento profesional falta:{' '}
            {sugerencias.map(s => s.label).join(' y ')}.
          </span>
          {sugerencias.map(s => s.candidata ? (
            <button
              key={s.pos}
              type="button"
              className="cle-sug-btn"
              title={`Insertar "${s.candidata.clausula.name}" al ${s.pos === 'inicio' ? 'inicio' : 'final'} del documento`}
              onClick={() => insertarSugerencia(s)}
            >
              + {s.pos === 'inicio' ? 'Añadir apertura' : 'Añadir cierre'}
            </button>
          ) : (
            <span key={s.pos} className="cle-sug-vacio">
              (sin textos de este tipo en la biblioteca)
            </span>
          ))}
        </div>
      )}

      {libAbierta && !disabled && (
        <div className="cle-lib">
          <div className="cle-lib-head">
            <input
              className="cle-lib-search"
              placeholder="Buscar cláusula por nombre o categoría…"
              value={busqueda}
              autoFocus
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setLibAbierta(false); } }}
            />
            {tiposEnBiblioteca.length > 1 && (
              <select className="cle-lib-cat" value={tipoLib} onChange={e => setTipoLib(e.target.value)}
                aria-label="Filtrar por tipo de texto">
                <option value="">Todos los tipos</option>
                {tiposEnBiblioteca.map(t => <option key={t} value={t}>{labelTipoTexto(t)}</option>)}
              </select>
            )}
            {categorias.length > 0 && (
              <select className="cle-lib-cat" value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
          <div className="cle-lib-list">
            {resultados.length === 0 && (
              <div className="cle-lib-empty">No hay cláusulas que coincidan con la búsqueda.</div>
            )}
            {resultados.map(c => {
              const versiones = (c.versions || []);
              const yaInsertada = idsInsertados.has(String(c.id));
              return (
                <div key={c.id} className="cle-lib-item">
                  <div className="cle-lib-item-info">
                    <div className="cle-lib-item-name">{c.name}</div>
                    <div className="cle-lib-item-meta">{c.cat}</div>
                  </div>
                  {(c.tipo_texto && c.tipo_texto !== 'CLAUSULA') && (
                    <span className="cle-badge cle-badge-tipo">{labelTipoTexto(c.tipo_texto)}</span>
                  )}
                  <RiesgoBadge riesgo={c.risk} />
                  {yaInsertada
                    ? <span className="cle-lib-added">✓ Agregada</span>
                    : versiones.length === 0
                      ? <span className="cle-lib-item-meta">Sin versiones</span>
                      : versiones.map(v => (
                        <button key={v.id} type="button" className="cle-ver-btn"
                          title={`Insertar versión ${v.etiqueta}`}
                          onClick={() => insertarDesdeBiblioteca(c, v)}>
                          + {v.tipo === 'Estándar' ? 'Estándar' : v.etiqueta}
                        </button>
                      ))
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bloques.length === 0 ? (
        <div className="cle-empty">
          El documento no tiene cláusulas todavía. Inserta cláusulas de la biblioteca
          o agrega bloques de texto personalizado.
        </div>
      ) : (
        <div className="cle-bloques">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={bloques.map(b => b.uid)} strategy={verticalListSortingStrategy}>
              {bloques.map((b, idx) => {
                const modificada = esBloqueModificado(b, clausulas);
                const libInfo = b.clausula_id ? clausulas.find(x => x.id === b.clausula_id) : null;
                return (
                  <SortableBloque
                    key={b.uid}
                    b={b}
                    idx={idx}
                    disabled={disabled}
                    modificada={modificada}
                    libInfo={libInfo}
                    actualizar={actualizar}
                    mover={mover}
                    eliminar={eliminar}
                    restaurar={restaurar}
                    total={bloques.length}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
