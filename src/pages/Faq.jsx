import React, { useState, useMemo } from 'react';
import TopbarActions from '../components/layout/TopbarActions';
import './Faq.css';
import SEO from '../components/SEO';

const Icon = ({ d, color = 'var(--text-muted)', w = 14 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const FAQS = [
  { cat: 'Contratos', q: '¿Cómo creo un nuevo contrato?', a: 'Ve a Contratos → Nuevo Contrato. Selecciona una plantilla del Catálogo, completa las variables solicitadas y el sistema generará el documento automáticamente aplicando las cláusulas y reglas de negocio vigentes.' },
  { cat: 'Contratos', q: '¿Por qué un contrato queda "En revisión"?', a: 'Las reglas de negocio activas (ej. aprobación por monto alto) pueden exigir validación adicional del Comité Legal o del Director Financiero antes de habilitar la firma.' },
  { cat: 'Catálogo', q: '¿Cuál es la diferencia entre una cláusula "Estándar" y "Alternativa"?', a: 'La versión Estándar es la aprobada por el equipo legal para uso general. Las Alternativas están pensadas para negociaciones puntuales y suelen requerir aprobación del Gerente Legal antes de insertarse en un contrato.' },
  { cat: 'Catálogo', q: '¿Cómo agrego un nuevo producto o tarifa?', a: 'En Catálogo → Productos / Tarifas, usa el botón "Agregar Ítem". Los productos marcados como "Descontinuado" quedan visibles para renovaciones existentes pero no se ofrecen en nuevas cotizaciones.' },
  { cat: 'Clientes', q: '¿Qué significa el estado "En revisión" en un cliente?', a: 'Indica que la ficha del cliente tiene información pendiente de validar (documentación legal, datos de contacto o KYC) antes de habilitarlo para nuevos contratos.' },
  { cat: 'Clientes', q: '¿Puedo eliminar un cliente con contratos activos?', a: 'No. El sistema bloquea la eliminación de clientes con contratos vigentes; primero debes finalizar o transferir esos contratos.' },
  { cat: 'Cuenta', q: '¿Cómo cambio mi contraseña?', a: 'Ve a Ajustes → Seguridad → Cambiar contraseña. Deberás ingresar tu contraseña actual y confirmar la nueva.' },
  { cat: 'Cuenta', q: '¿Olvidé mi contraseña, qué hago?', a: 'En la pantalla de inicio de sesión, usa el enlace "¿Olvidaste tu contraseña?". Actualmente el restablecimiento se gestiona contactando al administrador del sistema.' },
  { cat: 'Seguridad', q: '¿Qué es la verificación en dos pasos (2FA)?', a: 'Es una capa adicional de seguridad que exige un código temporal de 6 dígitos generado por una app autenticadora, además de tu contraseña, al iniciar sesión.' },
  { cat: 'Seguridad', q: '¿Qué pasa con "Recordarme" al iniciar sesión?', a: 'Si activas "Recordarme", tu sesión permanece activa por 14 días. Si lo dejas desactivado, la sesión se cierra automáticamente al cerrar el navegador.' },
];

const CATS = ['Todas', ...Array.from(new Set(FAQS.map((f) => f.cat)))];

export default function Faq() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todas');
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = useMemo(() => {
    return FAQS.filter((f) => {
      const matchCat = cat === 'Todas' || f.cat === cat;
      const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, cat]);

  return (
    <div className="faq-container">
      <SEO title="Preguntas Frecuentes | KyoCLM" description="Preguntas frecuentes y soporte." />
      <div className="faq-header">
        <div>
          <p className="faq-header-label">Enfoque Platform</p>
          <h1 className="faq-header-title">Preguntas Frecuentes</h1>
        </div>
        <div className="topbar-right-group">
          <span className="faq-header-date">Vie 4 jul 2026</span>
          <TopbarActions />
        </div>
      </div>

      <div className="faq-content">
        <div className="faq-toolbar">
          <div className="faq-search">
            <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
            <input
              type="text"
              placeholder="Buscar en preguntas frecuentes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="faq-cat-filters">
            {CATS.map((c) => (
              <button
                key={c}
                className={`faq-cat-chip ${cat === c ? 'active' : ''}`}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="faq-list">
          {filtered.length === 0 && (
            <div className="faq-empty">No se encontraron resultados para tu búsqueda.</div>
          )}
          {filtered.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button className="faq-item-question" onClick={() => setOpenIndex(isOpen ? null : i)}>
                  <span className="faq-item-cat">{f.cat}</span>
                  <span className="faq-item-text">{f.q}</span>
                  <Icon d="M6 9l6 6 6-6" color="var(--text-muted)" w={13} />
                </button>
                {isOpen && <div className="faq-item-answer">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
