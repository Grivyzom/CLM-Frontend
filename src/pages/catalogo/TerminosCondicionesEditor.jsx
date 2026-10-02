import { useId, useRef } from 'react';
import { Icon } from './ui';

// Recuadro "Términos y condiciones" que el backend anexa al final de cada
// documento generado con la plantilla (plantillas/services/terminos.py).
// Shape: { activo, titulo, incluye[], no_incluye[], condiciones[] }

export const TERMINOS_VACIO = { activo: false, titulo: '', incluye: [], no_incluye: [], condiciones: [] };

const SECCIONES = [
  { clave: 'incluye', titulo: 'Qué está contemplado', marca: '✓', color: 'var(--success-deep)', placeholder: 'Ej: Diseño UI de hasta 8 pantallas' },
  { clave: 'no_incluye', titulo: 'Qué no está contemplado', marca: '✕', color: 'var(--danger)', placeholder: 'Ej: Hosting y dominio' },
  { clave: 'condiciones', titulo: 'Condiciones generales', marca: '•', color: 'var(--text-muted)', placeholder: 'Ej: Pago 50% al inicio y 50% contra entrega' },
];

const ICON_PLUS = 'M12 5v14M5 12h14';
const ICON_X = 'M18 6L6 18M6 6l12 12';

export function normalizarTerminos(t) {
  return { ...TERMINOS_VACIO, ...(t || {}) };
}

// Ítems vacíos se descartan antes de enviar (el backend también los filtra).
export function terminosParaEnviar(t) {
  const n = normalizarTerminos(t);
  const limpiar = (arr) => (arr || []).map(s => s.trim()).filter(Boolean);
  return {
    activo: !!n.activo,
    titulo: (n.titulo || '').trim(),
    incluye: limpiar(n.incluye),
    no_incluye: limpiar(n.no_incluye),
    condiciones: limpiar(n.condiciones),
  };
}

// True si los términos a imprimir cambian (ignora ítems vacíos y espacios):
// sirve para no guardar un override en el contrato idéntico a la plantilla.
export function terminosDifieren(a, b) {
  return JSON.stringify(terminosParaEnviar(a)) !== JSON.stringify(terminosParaEnviar(b));
}

const DESCRIPCION_DEFAULT = 'Se imprime al final de cada documento generado con esta plantilla, para dejarle claro al cliente qué está contemplado en el desarrollo y qué no.';

function ListaItems({ seccion, items, onChange, inputStyle }) {
  const refs = useRef([]);

  const actualizar = (i, valor) => onChange(items.map((it, j) => (j === i ? valor : it)));
  const quitar = (i) => onChange(items.filter((_, j) => j !== i));
  const agregar = (despuesDe = items.length - 1) => {
    const nuevos = [...items.slice(0, despuesDe + 1), '', ...items.slice(despuesDe + 1)];
    onChange(nuevos);
    // Foco al input recién creado una vez que React lo monte.
    requestAnimationFrame(() => refs.current[despuesDe + 1]?.focus());
  };

  const onKeyDown = (e, i) => {
    if (e.key === 'Enter') {
      // Enter agrega el siguiente ítem en vez de enviar el formulario.
      e.preventDefault();
      agregar(i);
    } else if (e.key === 'Backspace' && !items[i] && items.length > 0) {
      e.preventDefault();
      quitar(i);
      requestAnimationFrame(() => refs.current[Math.max(0, i - 1)]?.focus());
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ color: seccion.color, fontWeight: 700, fontSize: 12, width: 12, textAlign: 'center' }}>{seccion.marca}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{seccion.titulo}</span>
        {items.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({items.length})</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 18 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              ref={el => { refs.current[i] = el; }}
              style={{ ...inputStyle, padding: '6px 9px' }}
              value={item}
              maxLength={600}
              onChange={e => actualizar(i, e.target.value)}
              onKeyDown={e => onKeyDown(e, i)}
              placeholder={seccion.placeholder}
              aria-label={`${seccion.titulo} — ítem ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => quitar(i)}
              aria-label={`Quitar ítem ${i + 1} de ${seccion.titulo}`}
              title="Quitar"
              style={{ flexShrink: 0, width: 26, height: 26, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', cursor: 'pointer', padding: 0 }}
            >
              <Icon d={ICON_X} w={12} />
            </button>
          </div>
        ))}
        {items.length < 40 && (
          <button
            type="button"
            onClick={() => agregar()}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: '1px dashed var(--border)', borderRadius: 5, background: 'transparent', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon d={ICON_PLUS} w={11} /> Agregar ítem
          </button>
        )}
      </div>
    </div>
  );
}

const INPUT_STYLE_DEFAULT = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 5, fontSize: 12, fontFamily: 'inherit', outline: 'none',
  color: 'var(--text-primary)', backgroundColor: 'var(--surface)',
};
const LABEL_STYLE_DEFAULT = { display: 'block', margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };

export default function TerminosCondicionesEditor({
  value, onChange, inputStyle = INPUT_STYLE_DEFAULT, labelStyle = LABEL_STYLE_DEFAULT,
  descripcion = DESCRIPCION_DEFAULT, disabled = false,
}) {
  const uid = useId();
  const t = normalizarTerminos(value);
  const set = (campo, v) => onChange({ ...t, [campo]: v });
  const totalItems = t.incluye.length + t.no_incluye.length + t.condiciones.length;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-faint)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px' }}>
        <input
          type="checkbox"
          id={`${uid}-activo`}
          checked={t.activo}
          disabled={disabled}
          onChange={e => {
            const activo = e.target.checked;
            // Al encender por primera vez se deja un ítem listo para escribir.
            onChange(activo && totalItems === 0 ? { ...t, activo, incluye: [''] } : { ...t, activo });
          }}
          style={{ marginTop: 2 }}
        />
        <label htmlFor={`${uid}-activo`} style={{ fontSize: 11.5, color: 'var(--text-primary)', cursor: 'pointer' }}>
          <strong>Incluir recuadro de Términos y condiciones</strong>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {descripcion}
          </div>
        </label>
      </div>

      {t.activo && (
        <fieldset disabled={disabled} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 12px 12px', margin: 0, border: 'none', borderTop: '1px solid var(--border)', minWidth: 0 }}>
          <div style={{ paddingTop: 10 }}>
            <label style={labelStyle} htmlFor={`${uid}-titulo`}>Título del recuadro</label>
            <input
              id={`${uid}-titulo`}
              style={inputStyle}
              value={t.titulo}
              maxLength={120}
              onChange={e => set('titulo', e.target.value)}
              placeholder="Términos y condiciones"
            />
          </div>
          {SECCIONES.map(s => (
            <ListaItems
              key={s.clave}
              seccion={s}
              items={t[s.clave]}
              onChange={items => set(s.clave, items)}
              inputStyle={inputStyle}
            />
          ))}
          <p style={{ margin: 0, fontSize: 10.5, color: 'var(--text-muted)' }}>
            Enter agrega un ítem nuevo; las secciones sin ítems no se imprimen.
          </p>
        </fieldset>
      )}
    </div>
  );
}
