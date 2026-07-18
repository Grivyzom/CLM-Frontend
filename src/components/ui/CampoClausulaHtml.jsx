import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { similitudTitulos, UMBRAL_COINCIDENCIA } from '../../utils/similitudTexto';
import './CampoClausulaHtml.css';

/**
 * Campo de plantilla HTML (cuerpo_clausula_N o campo simple) — única fuente de
 * la UI de inserción de cláusulas, compartida por el panel "Contenido del
 * Documento" y el modal "Completar plantilla" de ContractDetail.
 *
 * Estructura para campos cuerpo_clausula*:
 *   [label = encabezado real de la sección]
 *   [select: SOLO cláusulas sugeridas (similitud nombre↔encabezado ≥ umbral)]
 *     — o caja "No hay cláusulas aún" + CTA al catálogo si no hay candidatas —
 *   [buscador: acceso al resto de la biblioteca sin listar todo]
 *   [warning de descalce si lo insertado no corresponde al encabezado]
 *   {children} = el input/textarea/richtext del valor, que difiere por contexto.
 *
 * Props:
 *  - campo        : {nombre, label, titulo_seccion?, ...} del API de campos
 *  - biblioteca   : biblioteca de cláusulas (shape API: {id, name, cat, tipo_texto, versions[]})
 *  - seleccionId  : id de la cláusula insertada en este campo (para warning y "ya utilizada")
 *  - idsUsados    : Set de ids ya usados en otros campos del documento
 *  - onInsert     : (clausula) => void — el padre escribe valor y selección
 */

/** Versión a insertar de una cláusula: la Estándar activa, o la primera. */
export function versionInsertable(clausula) {
  return clausula.versions?.find(v => v.tipo === 'Estándar') || clausula.versions?.[0] || null;
}

function BuscadorClausula({ clausulas, onSelect, esUsada }) {
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(0);
  const t = q.trim().toLowerCase();

  const resultados = useMemo(() => {
    if (!t) return [];
    return clausulas.filter(c =>
      (c.name || '').toLowerCase().includes(t) || (c.cat || '').toLowerCase().includes(t)
    ).slice(0, 8);
  }, [clausulas, t]);

  const elegir = (c) => {
    if (esUsada(c)) return;
    onSelect(c);
    setQ('');
    setActivo(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); setQ(''); return; }
    if (!resultados.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(i => Math.min(i + 1, resultados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (resultados[activo]) elegir(resultados[activo]); }
  };

  return (
    <div className="ccl-search">
      <input
        className="ccl-search-input"
        value={q}
        onChange={e => { setQ(e.target.value); setActivo(0); }}
        onKeyDown={onKeyDown}
        placeholder="Buscar otra cláusula…"
        aria-label="Buscar otra cláusula"
        role="combobox"
        aria-expanded={!!t}
        aria-autocomplete="list"
      />
      {t && (
        <div className="ccl-drop" role="listbox">
          {resultados.length === 0 ? (
            <div className="ccl-drop-empty">Sin resultados para «{q.trim()}».</div>
          ) : resultados.map((c, i) => {
            const usada = esUsada(c);
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={i === activo}
                disabled={usada}
                className={`ccl-res ${i === activo ? 'ccl-res-activo' : ''}`}
                onMouseDown={e => e.preventDefault() /* no perder el focus antes del click */}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(c)}
              >
                <span className="ccl-res-nombre">{c.name}</span>
                <span className="ccl-res-cat">{usada ? 'Ya utilizada' : c.cat}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CampoClausulaHtml({
  campo,
  biblioteca = [],
  seleccionId = '',
  idsUsados = new Set(),
  onInsert,
  children,
}) {
  const navigate = useNavigate();
  const esCuerpo = campo.nombre.startsWith('cuerpo_clausula');

  // Solo cláusulas legales en secciones numeradas (saludos, despedidas y
  // firmas quedan fuera). Memo: la biblioteca no cambia entre renders del padre.
  const opciones = useMemo(() => (
    esCuerpo
      ? biblioteca.filter(c => ['CLAUSULA', 'OTRO'].includes(c.tipo_texto || 'CLAUSULA'))
      : []
  ), [biblioteca, esCuerpo]);

  // El select solo ofrece las que calzan con el encabezado; el resto va por buscador.
  const sugeridas = useMemo(() => (
    (esCuerpo && campo.titulo_seccion)
      ? opciones.filter(c => similitudTitulos(campo.titulo_seccion, c.name) >= UMBRAL_COINCIDENCIA)
      : []
  ), [opciones, esCuerpo, campo.titulo_seccion]);

  const seleccionada = seleccionId
    ? biblioteca.find(c => String(c.id) === String(seleccionId))
    : null;
  const descalce = !!(seleccionada && campo.titulo_seccion &&
    similitudTitulos(campo.titulo_seccion, seleccionada.name) < UMBRAL_COINCIDENCIA);

  const esUsada = (c) =>
    idsUsados.has(String(c.id)) && String(c.id) !== String(seleccionId);

  return (
    <div className="ccl-field">
      <label className="ccl-label">{campo.titulo_seccion || campo.label}</label>

      {esCuerpo && sugeridas.length > 0 && (
        <select
          className="ccl-select"
          value={seleccionId || ''}
          onChange={(e) => {
            const clausula = sugeridas.find(c => String(c.id) === e.target.value);
            if (clausula && !esUsada(clausula)) onInsert(clausula);
          }}
          title="Insertar la cláusula sugerida para esta sección"
        >
          <option value="">-- Cláusula sugerida para esta sección --</option>
          {sugeridas.map(c => (
            <option key={c.id} value={c.id} disabled={esUsada(c)}>
              {c.name}{esUsada(c) ? ' (Ya utilizada en el documento)' : ''}
            </option>
          ))}
        </select>
      )}

      {esCuerpo && campo.titulo_seccion && sugeridas.length === 0 && (
        <div className="ccl-empty">
          <span>No hay cláusulas aún</span>
          <button
            type="button"
            className="ccl-add-btn"
            onClick={() => navigate('/catalogo?tab=clausulas')}
            title="Crear una cláusula para esta sección en el catálogo"
          >
            + Añadir cláusula
          </button>
        </div>
      )}

      {esCuerpo && opciones.length > 0 && (
        <BuscadorClausula clausulas={opciones} onSelect={onInsert} esUsada={esUsada} />
      )}

      {descalce && (
        <p role="alert" className="ccl-warning">
          La cláusula insertada («{seleccionada.name}») no parece corresponder a la
          sección «{campo.titulo_seccion}». Revisa el texto antes de generar.
        </p>
      )}

      {children}
    </div>
  );
}
