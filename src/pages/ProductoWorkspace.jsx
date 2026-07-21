import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './ProductoWorkspace.css';
import './Contratos.css';
import {
  getProductos, updateProducto, deleteProducto, getContratos, getContratoDetail, updateContrato,
} from '../api';
import { fmtMoney } from '../utils/formatters';
import { PRODUCTO_CATEGORIAS, formatPrecio } from './catalogo/helpers';
import { useConfirm } from '../contexts/ConfirmContext';
import TechIcon from '../components/TechIcon';

// ─── Paleta de categorías (espejo de ProductosTab) ────────────────────────────
const CAT_CFG = {
  Bot:         { color: 'var(--cyan)',           bg: 'var(--cyan-tint)',       dot: 'var(--cyan)' },
  Agente:      { color: 'var(--violet-bright)',  bg: 'var(--violet-tint)',     dot: 'var(--violet-bright)' },
  Script:      { color: 'var(--success-alt)',    bg: 'var(--success-tint)',    dot: 'var(--success-alt)' },
  Software:    { color: 'var(--primary)',        bg: 'var(--primary-bg)',      dot: 'var(--primary)' },
  'Auditoría': { color: 'var(--danger)',         bg: 'var(--danger-tint)',     dot: 'var(--danger)' },
  Consultoría: { color: 'var(--warning-bright)', bg: 'var(--warning-bg)',     dot: 'var(--warning-bright)' },
};

function getCatCfg(cat) {
  return CAT_CFG[cat] || { color: 'var(--text-muted)', bg: 'var(--neutral-200)', dot: 'var(--border)' };
}

function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── SVG Icon ─────────────────────────────────────────────────────────────────
function Icon({ d, color = 'var(--text-muted)', w = 14 }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

// ─── Badge: estado activo/inactivo del producto ──────────────────────────────
function StatusBadge({ status }) {
  const isActive = !status || status === 'Activo';
  return (
    <span className="pw-status-badge" style={{
      background: isActive ? 'var(--success-bg)' : 'var(--bg-topbar)',
      color:      isActive ? 'var(--success-deep)' : 'var(--text-muted)',
      border:     `1px solid ${isActive ? 'var(--success-border)' : 'var(--border)'}`,
    }}>
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ─── Tabs configuration ───────────────────────────────────────────────────────
const TABS = [
  {
    id: 'resumen',
    label: 'Resumen',
    icon: 'M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8',
  },
  {
    id: 'contratos',
    label: 'Contratos',
    icon: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h4'],
  },
  {
    id: 'editar',
    label: 'Editar',
    icon: ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
  },
];

// ─── Helper: format additional fields key ─────────────────────────────────────
function fmtKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Build edit form from product object ─────────────────────────────────────
function buildEditForm(p) {
  return {
    name:              p.name          || '',
    desc:              p.desc          || '',
    cat:               p.cat           || 'Software',
    tipo_licencia:     p.tipo_licencia || 'Comercial',
    price:             p.price         ?? '',
    currency:          p.currency      || 'USD',
    unit:              p.unit          || '',
    status:            p.status        || 'Activo',
    datos_adicionales: p.datos_adicionales || {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS RECOMENDADOS — motor de inferencia
// Analiza las características del producto y retorna una lista priorizada
// de contratos / documentos legales que debería tener el software.
// ─────────────────────────────────────────────────────────────────────────────

const PRIORIDAD = {
  CRITICO:    { label: 'Requerido',    color: 'var(--rose)',           bg: 'var(--rose-bg)',     border: 'var(--rose-border)' },
  IMPORTANTE: { label: 'Importante',   color: 'var(--warning-bright)', bg: 'var(--warning-bg)',  border: 'var(--warning-border)' },
  RECOMENDADO:{ label: 'Recomendado',  color: 'var(--primary)',        bg: 'var(--primary-bg)',  border: 'var(--primary-soft)' },
  OPCIONAL:   { label: 'Opcional',     color: 'var(--text-muted)',     bg: 'var(--bg-topbar)',   border: 'var(--border)' },
};

const DOC_ICONS = {
  contrato:        ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h4'],
  escudo:          ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  llave:           'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  dinero:          'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  privacidad:      ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  handshake:       ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  sla:             ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  datos:           ['M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7', 'M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4', 'M4 12c0 2.21 3.582 4 8 4s8-1.79 8-4'],
  codigo:          'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  tienda:          ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  mantenimiento:   ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
  auditoria:       ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  consulting:      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  propuesta:       ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
};

/**
 * Devuelve la lista de documentos recomendados para un producto dado.
 * @param {object} p — objeto producto con cat, tipo_licencia, datos_adicionales, etc.
 * @returns {Array<{id, titulo, desc, razon, prioridad, icono}>}
 */
function getDocsRecomendados(p) {
  const cat  = p.cat || '';
  const da   = p.datos_adicionales || {};
  const isFree = p.tipo_licencia === 'Gratuito / OpenSource';
  const tipoSW = da.tipo_software || '';
  const docs = [];

  // ── NDA / Confidencialidad — universal ────────────────────────────────
  docs.push({
    id: 'nda',
    titulo: 'Acuerdo de Confidencialidad (NDA)',
    desc: 'Protege la información sensible intercambiada durante negociaciones, demos y soporte.',
    razon: 'Requerido para cualquier software entregado a un tercero.',
    prioridad: 'CRITICO',
    icono: DOC_ICONS.escudo,
  });

  // ── Contrato base según categoría ────────────────────────────────────
  if (cat === 'Software') {
    docs.push({
      id: 'licencia-sw',
      titulo: isFree ? 'Términos de Uso de Software OpenSource' : 'Contrato de Licencia de Software',
      desc: isFree
        ? 'Define los términos de redistribución, modificación y atribución de la licencia libre.'
        : 'Documento principal que formaliza la cesión de uso del software, versiones, usuarios autorizados y restricciones.',
      razon: `Producto de categoría Software${isFree ? ' con licencia OpenSource' : ''}.`,
      prioridad: 'CRITICO',
      icono: DOC_ICONS.contrato,
    });

    if (tipoSW && ['App Web', 'Servicio Backend', 'App Android', 'App iOS', 'App Multiplataforma'].includes(tipoSW)) {
      docs.push({
        id: 'desarrollo',
        titulo: 'Contrato de Desarrollo de Software a Medida',
        desc: 'Regula entregables, plazos, metodología, responsabilidades y criterios de aceptación del desarrollo.',
        razon: `Software de tipo "${tipoSW}" implica desarrollo específico para el cliente.`,
        prioridad: 'CRITICO',
        icono: DOC_ICONS.codigo,
      });
    }

    if (da.modalidad_entrega === 'SaaS (Cloud)' || da.modalidad_entrega === 'Híbrido') {
      docs.push({
        id: 'saas',
        titulo: 'Contrato de Servicio SaaS (Software as a Service)',
        desc: 'Define condiciones del servicio en la nube: uptime, acceso, continuidad del negocio, backups y escalado.',
        razon: `Modalidad de entrega: ${da.modalidad_entrega}.`,
        prioridad: 'CRITICO',
        icono: DOC_ICONS.sla,
      });
    }

    if (da.nivel_soporte && da.nivel_soporte !== 'Sin soporte incluido') {
      docs.push({
        id: 'soporte',
        titulo: 'Contrato de Soporte y Mantenimiento',
        desc: 'Establece tiempos de respuesta, canales de atención, ventanas de mantenimiento y penalizaciones por incumplimiento.',
        razon: `Nivel de soporte incluido: ${da.nivel_soporte}.`,
        prioridad: 'CRITICO',
        icono: DOC_ICONS.mantenimiento,
      });
    }

    if (da.acuerdos_nivel_servicio_sla || da.modalidad_entrega === 'SaaS (Cloud)') {
      docs.push({
        id: 'sla-doc',
        titulo: 'Acuerdo de Nivel de Servicio (SLA)',
        desc: 'Formaliza los indicadores de rendimiento, disponibilidad y tiempo de recuperación ante fallos.',
        razon: da.acuerdos_nivel_servicio_sla
          ? `SLA acordado: "${da.acuerdos_nivel_servicio_sla}".`
          : 'Servicio en la nube requiere SLA explícito.',
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.escudo,
      });
    }

    if (da.alojamiento_datos) {
      docs.push({
        id: 'privacidad',
        titulo: 'Política de Privacidad y Protección de Datos',
        desc: 'Regula la recolección, almacenamiento y tratamiento de datos personales conforme a normativas vigentes (GDPR, Ley 19.628, etc.).',
        razon: `El software almacena datos en: ${da.alojamiento_datos}.`,
        prioridad: 'CRITICO',
        icono: DOC_ICONS.privacidad,
      });

      docs.push({
        id: 'dpa',
        titulo: 'Acuerdo de Procesamiento de Datos (DPA)',
        desc: 'Define las responsabilidades entre controlador y procesador de datos conforme a regulaciones de privacidad.',
        razon: 'Requerido cuando el desarrollador procesa datos personales del cliente.',
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.datos,
      });
    }

    if (da.propiedad_intelectual) {
      docs.push({
        id: 'ip',
        titulo: 'Addendum de Propiedad Intelectual',
        desc: 'Clarifica a quién pertenece el código fuente, las mejoras, las personalizaciones y los datos generados.',
        razon: `IP definida como: "${da.propiedad_intelectual}".`,
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.llave,
      });
    }

    if (['App Android', 'App iOS', 'App Multiplataforma'].includes(tipoSW) && da.publicacion_tiendas) {
      docs.push({
        id: 'tiendas',
        titulo: 'Acuerdo de Publicación en Tiendas de Aplicaciones',
        desc: 'Define responsabilidades sobre cuentas de desarrollador, actualizaciones, cumplimiento de políticas de la tienda y costos asociados.',
        razon: `Publicación en tiendas: ${da.publicacion_tiendas}.`,
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.tienda,
      });
    }

    if (['Software Nativo PC', 'Software Nativo Mac'].includes(tipoSW) && da.licenciamiento_equipos) {
      docs.push({
        id: 'licenciamiento-eq',
        titulo: 'Contrato de Licenciamiento por Equipos',
        desc: 'Formaliza el esquema de licenciamiento (por dispositivo, por usuario, global) y las condiciones de transferencia.',
        razon: `Licenciamiento por: ${da.licenciamiento_equipos}.`,
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.contrato,
      });
    }

    if (da.limite_usuarios && da.limite_usuarios !== 'Ilimitado') {
      docs.push({
        id: 'concurrencia',
        titulo: 'Adenda de Límite de Usuarios y Escalado',
        desc: 'Regula las condiciones para aumentar o reducir el número de licencias o usuarios concurrentes.',
        razon: `Límite de usuarios: ${da.limite_usuarios}.`,
        prioridad: 'RECOMENDADO',
        icono: DOC_ICONS.contrato,
      });
    }
  }

  if (cat === 'Agente') {
    docs.push({
      id: 'svc-ia',
      titulo: 'Contrato de Prestación de Servicios de Inteligencia Artificial',
      desc: 'Regula el alcance del agente IA, las salidas esperadas, limitaciones de responsabilidad y condiciones de uso ético.',
      razon: 'Producto de categoría Agente de IA.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.contrato,
    });

    docs.push({
      id: 'llm',
      titulo: 'Acuerdo de Uso de Modelos de Lenguaje (LLM)',
      desc: 'Define las responsabilidades legales y de privacidad derivadas del uso de modelos de lenguaje de terceros.',
      razon: da.integracion_llm
        ? `Integración con LLM: ${da.integracion_llm}.`
        : 'Agente integra modelos de lenguaje de terceros.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.escudo,
    });

    docs.push({
      id: 'datos-ia',
      titulo: 'Política de Tratamiento de Datos e IA',
      desc: 'Describe qué datos son procesados por el agente, con qué finalidad y cómo se garantiza la privacidad.',
      razon: 'Los agentes IA procesan datos potencialmente sensibles.',
      prioridad: 'IMPORTANTE',
      icono: DOC_ICONS.privacidad,
    });

    if (da.tipo_agente) {
      docs.push({
        id: 'autonomia',
        titulo: 'Límites de Autonomía y Responsabilidad del Agente',
        desc: 'Establece los límites de decisión autónoma del agente y quién asume responsabilidad ante errores o acciones inesperadas.',
        razon: `Tipo de agente: ${da.tipo_agente}.`,
        prioridad: da.tipo_agente === 'Autónomo' ? 'CRITICO' : 'IMPORTANTE',
        icono: DOC_ICONS.llave,
      });
    }
  }

  if (cat === 'Script') {
    docs.push({
      id: 'dev-script',
      titulo: 'Contrato de Desarrollo de Script / Automatización',
      desc: 'Define el alcance, entregables, lenguaje/entorno, pruebas de aceptación y propiedad del script.',
      razon: 'Producto de categoría Script.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.codigo,
    });

    docs.push({
      id: 'licencia-script',
      titulo: 'Licencia de Uso del Script',
      desc: 'Determina si el script puede ser reutilizado, redistribuido o modificado por el cliente.',
      razon: da.entorno_lenguaje
        ? `Script en ${da.entorno_lenguaje}.`
        : 'Entrega de código ejecutable.',
      prioridad: 'IMPORTANTE',
      icono: DOC_ICONS.llave,
    });

    if (da.proposito === 'Datos/ETL' || da.proposito === 'Scraping') {
      docs.push({
        id: 'datos-script',
        titulo: 'Acuerdo de Manejo de Datos y Fuentes',
        desc: 'Regula el acceso a fuentes de datos, propiedad de los datos extraídos y cumplimiento normativo.',
        razon: `Propósito del script: ${da.proposito}.`,
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.datos,
      });
    }
  }

  if (cat === 'Auditoría') {
    docs.push({
      id: 'svc-auditoria',
      titulo: 'Contrato de Servicios de Auditoría',
      desc: 'Define el alcance de la auditoría, metodología, entregables (informe), responsabilidades y confidencialidad de los hallazgos.',
      razon: 'Producto de categoría Auditoría.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.auditoria,
    });

    docs.push({
      id: 'nda-auditoria',
      titulo: 'NDA Reforzado para Auditoría',
      desc: 'Confidencialidad extendida para proteger los hallazgos de seguridad o calidad que podrían ser sensibles.',
      razon: 'Los informes de auditoría revelan vulnerabilidades internas.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.escudo,
    });

    if (da.enfoque) {
      const extra = {
        'Seguridad/Pentesting': {
          titulo: 'Autorización de Pruebas de Penetración (Pentest)',
          desc: 'Documento legal que autoriza explícitamente la realización de pruebas ofensivas sobre los sistemas del cliente.',
          prioridad: 'CRITICO',
        },
        'Cumplimiento Normativo': {
          titulo: 'Declaración de Conformidad Normativa',
          desc: 'Documenta el cumplimiento con normativas específicas (ISO 27001, SOC 2, GDPR, etc.).',
          prioridad: 'IMPORTANTE',
        },
        'Calidad de Código/QA': {
          titulo: 'Plan de Pruebas y Criterios de Aceptación',
          desc: 'Formaliza métricas de calidad, cobertura de pruebas y criterios para aprobar el entregable.',
          prioridad: 'IMPORTANTE',
        },
      }[da.enfoque];
      if (extra) {
        docs.push({ id: `auditoria-extra`, icono: DOC_ICONS.auditoria, razon: `Enfoque: ${da.enfoque}.`, ...extra });
      }
    }
  }

  if (cat === 'Consultoría') {
    docs.push({
      id: 'svc-consultoria',
      titulo: 'Contrato de Consultoría',
      desc: 'Regula el servicio: objetivos, entregables, tarifas, horas, disponibilidad y propiedad intelectual de las recomendaciones.',
      razon: 'Producto de categoría Consultoría.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.consulting,
    });

    docs.push({
      id: 'propuesta',
      titulo: 'Propuesta Técnica y Comercial (SOW)',
      desc: 'Statement of Work: documenta el alcance detallado, cronograma, responsables y criterios de éxito de la consultoría.',
      razon: 'Base contractual para servicios de consultoría.',
      prioridad: 'IMPORTANTE',
      icono: DOC_ICONS.propuesta,
    });

    if (da.modalidad === 'Por Hora') {
      docs.push({
        id: 'timesheet',
        titulo: 'Acuerdo de Registro de Horas (Timesheet)',
        desc: 'Define el proceso de reporte, validación y aprobación de horas trabajadas para facturación.',
        razon: 'Modalidad de cobro por hora.',
        prioridad: 'IMPORTANTE',
        icono: DOC_ICONS.dinero,
      });
    }
  }

  if (cat === 'Bot') {
    docs.push({
      id: 'svc-bot',
      titulo: 'Contrato de Implementación de Bot / Chatbot',
      desc: 'Regula la implementación, integración con plataformas (WhatsApp, Slack, web), mantenimiento y límites de conversaciones.',
      razon: 'Producto de categoría Bot.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.contrato,
    });
    docs.push({
      id: 'datos-bot',
      titulo: 'Política de Privacidad del Bot',
      desc: 'Describe qué datos de los usuarios finales recopila el bot y cómo son procesados.',
      razon: 'Los bots recopilan datos conversacionales de usuarios.',
      prioridad: 'CRITICO',
      icono: DOC_ICONS.privacidad,
    });
  }

  // ── Facturación / Pagos — aplica a todo lo comercial ──────────────────
  if (!isFree && p.price && Number(p.price) > 0) {
    docs.push({
      id: 'pago',
      titulo: 'Condiciones de Pago y Penalizaciones por Mora',
      desc: 'Regula fechas de pago, métodos aceptados, intereses por mora y consecuencias por impago.',
      razon: `Producto de pago: ${p.price} ${p.currency || ''} ${p.unit || ''}.`,
      prioridad: 'IMPORTANTE',
      icono: DOC_ICONS.dinero,
    });
  }

  // ── Garantía — opcional universal ────────────────────────────────────
  docs.push({
    id: 'garantia',
    titulo: 'Política de Garantía y Devoluciones',
    desc: 'Define el período de garantía, condiciones de uso para mantenerla vigente y proceso de reclamación.',
    razon: 'Buena práctica para proteger a ambas partes en caso de defectos.',
    prioridad: 'RECOMENDADO',
    icono: DOC_ICONS.handshake,
  });

  // Ordenar: CRITICO → IMPORTANTE → RECOMENDADO → OPCIONAL
  const orden = { CRITICO: 0, IMPORTANTE: 1, RECOMENDADO: 2, OPCIONAL: 3 };
  return docs.sort((a, b) => orden[a.prioridad] - orden[b.prioridad]);
}

// ─── Helper: Busca si existe un contrato que coincida con el documento recomendado ────
function findMatchingContract(docId, contratos) {
  if (!contratos || contratos.length === 0) return null;
  const clean = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const c of contratos) {
    const name = clean(c.nombre);
    
    switch (docId) {
      case 'nda':
      case 'nda-auditoria':
        if (name.includes('nda') || name.includes('confidencial') || name.includes('non-disclosure') || name.includes('revelacion')) return c;
        break;
      case 'licencia-sw':
      case 'licencia-script':
      case 'licenciamiento-eq':
        if (name.includes('licencia') || name.includes('license') || name.includes('licenciamiento') || name.includes('uso') || name.includes('perpetuo')) return c;
        break;
      case 'desarrollo':
      case 'dev-script':
        if (name.includes('desarrollo') || name.includes('dev') || name.includes('implementacion') || name.includes('creacion') || name.includes('construccion')) return c;
        break;
      case 'saas':
        if (name.includes('saas') || name.includes('nube') || name.includes('cloud') || name.includes('servicio')) return c;
        break;
      case 'soporte':
        if (name.includes('soporte') || name.includes('mantenimiento') || name.includes('support') || name.includes('sla')) return c;
        break;
      case 'sla-doc':
        if (name.includes('sla') || name.includes('nivel de servicio') || name.includes('disponibilidad')) return c;
        break;
      case 'privacidad':
      case 'datos-ia':
      case 'datos-script':
      case 'datos-bot':
      case 'dpa':
        if (name.includes('privacidad') || name.includes('datos') || name.includes('dpa') || name.includes('gdpr') || name.includes('proteccion') || name.includes('data')) return c;
        break;
      case 'ip':
        if (name.includes('propiedad') || name.includes('intelectual') || name.includes('ip') || name.includes('derechos') || name.includes('copyright')) return c;
        break;
      case 'tiendas':
        if (name.includes('tienda') || name.includes('store') || name.includes('play') || name.includes('app store') || name.includes('publicacion')) return c;
        break;
      case 'concurrencia':
        if (name.includes('limite') || name.includes('usuario') || name.includes('concurrencia') || name.includes('escala')) return c;
        break;
      case 'svc-ia':
      case 'llm':
      case 'autonomia':
        if (name.includes('ia') || name.includes('ai') || name.includes('llm') || name.includes('gpt') || name.includes('inteligencia') || name.includes('modelo')) return c;
        break;
      case 'svc-auditoria':
      case 'auditoria-extra':
        if (name.includes('auditoria') || name.includes('audit') || name.includes('pentest') || name.includes('qa') || name.includes('seguridad')) return c;
        break;
      case 'svc-consultoria':
      case 'propuesta':
      case 'timesheet':
        if (name.includes('consultoria') || name.includes('asesoria') || name.includes('propuesta') || name.includes('sow') || name.includes('horas') || name.includes('timesheet')) return c;
        break;
      case 'svc-bot':
        if (name.includes('bot') || name.includes('chatbot') || name.includes('implementacion')) return c;
        break;
      case 'pago':
        if (name.includes('pago') || name.includes('tarifa') || name.includes('financiero') || name.includes('factura') || name.includes('mora')) return c;
        break;
      case 'garantia':
        if (name.includes('garantia') || name.includes('devolucion') || name.includes('warranty')) return c;
        break;
    }
  }
  return null;
}

// ─── Componente: Previsualización de Documento ───────────────────────────────
function DocumentPreviewModal({ contract, onClose, onNavigateToContract }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    let active = true;
    getContratoDetail(contract.id)
      .then(data => {
        if (!active) return;
        if (data.documentos && data.documentos.length > 0) {
          // Ordenamos para agarrar la versión más reciente
          const sortedDocs = [...data.documentos].sort((a, b) => b.id - a.id);
          setPdfUrl(`/api/plantillas/documentos/${sortedDocs[0].id}/pdf/?inline=1#view=FitH`);
        } else {
          setError('El contrato existe, pero aún no se ha generado su documento PDF.');
        }
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Error al obtener los detalles del contrato.');
        setLoading(false);
      });

    return () => { active = false; };
  }, [contract.id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      padding: '24px', boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '12px',
        width: '1000px', maxWidth: '100%', height: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)',
        border: '1px solid var(--border)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-topbar)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Previsualización de Documento
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Contrato: <strong>{contract.nombre}</strong> (ID #{String(contract.id).padStart(5, '0')})
            </p>
          </div>
          <button onClick={onClose} style={{
            border: '1px solid var(--border)', background: 'var(--surface)',
            padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
            color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'inherit'
          }}>
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '12px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando PDF...</span>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '16px', padding: '40px', textAlign: 'center', flex: 1
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: 'var(--rose-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--rose-border)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                </svg>
              </div>
              <div style={{ maxWidth: '400px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {error.includes('generado') ? 'Falta Documento PDF' : 'Error al cargar'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {error}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button className="pw-btn-secondary" onClick={onClose}>Cerrar</button>
                {error.includes('generado') && (
                  <button className="pw-btn-primary" onClick={() => onNavigateToContract(contract.id)}>
                    Ir al Contrato para Generar PDF
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Previsualización de PDF"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Vincular Contrato Existente ──────────────────────────────────
function LinkContractModal({ doc, producto, onClose, onSuccess }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Carga inicial de contratos sin filtro
  useEffect(() => {
    searchContracts('');
  }, []);

  const searchContracts = async (q) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContratos({ search: q });
      const list = data.results || data || [];
      // Filtrar contratos que no estén vinculados a este software
      const filtered = list.filter(c => String(c.software?.id || c.software_id) !== String(producto.id));
      setResults(filtered);
    } catch (err) {
      setError('Error al buscar contratos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchContracts(query);
  };

  const handleLink = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await updateContrato(selectedId, { software_id: producto.id });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al vincular el contrato.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ctm-backdrop">
      <div className="ctm-panel ctm-panel-sm" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
        
        <div className="ctm-header">
          <div>
            <h3 className="ctm-title">Vincular Contrato Existente</h3>
            <p className="ctm-subtitle">Requisito: <strong>{doc.titulo}</strong></p>
          </div>
          <button className="ctm-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="ctm-body" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{
            padding: '16px 24px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: '8px', background: 'var(--bg-page)'
          }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID, nombre o cliente del contrato..."
              className="ctm-control"
              style={{ flex: 1, margin: 0 }}
            />
            <button type="submit" className="ct-btn-primary" disabled={loading} style={{ padding: '0 16px', height: '36px' }}>
              Buscar
            </button>
          </form>

          {/* Results Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '300px' }}>
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            )}

            {!loading && results.length === 0 && (
              <p style={{ margin: 0, padding: '24px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                No se encontraron contratos disponibles para vincular.
              </p>
            )}

            {error && (
              <div className="ct-alert-error ctm-alert" role="alert" style={{ marginBottom: '8px' }}>
                 {error}
              </div>
            )}

            {!loading && results.map(c => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    padding: '12px 14px', borderRadius: '8px',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--primary-bg)' : 'var(--surface)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: '12px', transition: 'all 0.15s ease'
                  }}
                >
                  <div className="ctm-check" style={{ pointerEvents: 'none' }}>
                    <input type="radio" checked={isSelected} readOnly />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.nombre}
                      </span>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>
                        #{String(c.id).padStart(5, '0')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Cliente: {c.cliente?.nombre || '—'}</span>
                      <span>Etapa: {c.etapa_display || c.etapa}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="ctm-footer">
          <button className="ct-btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className="ct-btn-primary"
            onClick={handleLink}
            disabled={busy || !selectedId}
          >
            {busy ? 'Vinculando...' : 'Vincular Contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Documentos Recomendados ─────────────────────────────────────
function DocsRecomendados({ producto, contratos = [], onNuevoContrato, onPreviewContract, onLinkContract }) {
  const docs = getDocsRecomendados(producto);
  const criticos   = docs.filter(d => d.prioridad === 'CRITICO');
  const importantes= docs.filter(d => d.prioridad === 'IMPORTANTE');
  const resto      = docs.filter(d => !['CRITICO','IMPORTANTE'].includes(d.prioridad));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'pw-fadeIn 0.2s ease-out', marginTop: '20px' }}>

      {/* Encabezado informativo */}
      {contratos.length === 0 ? (
        <div style={{
          background: 'var(--primary-bg)',
          border: '1px solid var(--primary-soft)',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="var(--primary)" w={20} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
              Este producto aún no tiene contratos activos
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Basado en las características de <strong>{producto.name}</strong> ({producto.cat}
              {producto.datos_adicionales?.tipo_software ? ` · ${producto.datos_adicionales.tipo_software}` : ''}
              {producto.datos_adicionales?.modalidad_entrega ? ` · ${producto.datos_adicionales.modalidad_entrega}` : ''}),
              a continuación se listan los documentos legales y contractuales que debería tener este software antes de ser entregado a un cliente.
            </p>
          </div>
          <button
            onClick={onNuevoContrato}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6,
              border: 'none', background: 'var(--primary)',
              color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            <Icon d={['M12 5v14', 'M5 12h14']} color="var(--text-on-accent)" w={13} />
            Crear contrato
          </button>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-topbar)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} color="var(--success-deep)" w={20} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--success-deep)' }}>
              Estatus de Cumplimiento de Contratos y Documentación
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A continuación se muestra el nivel de cobertura legal de este producto. Los documentos que ya tienes contratados se marcan con un check verde <span style={{ color: 'var(--success-deep)', fontWeight: 'bold' }}>✓</span> y puedes hacer clic para previsualizarlos.
            </p>
          </div>
        </div>
      )}

      {/* Grid de documentos */}
      <DocGroup titulo="Documentos Requeridos" color="var(--rose)" docs={criticos} contratos={contratos} onPreviewContract={onPreviewContract} onLinkContract={onLinkContract} />
      {importantes.length > 0 && <DocGroup titulo="Documentos Importantes" color="var(--warning-bright)" docs={importantes} contratos={contratos} onPreviewContract={onPreviewContract} onLinkContract={onLinkContract} />}
      {resto.length > 0 && <DocGroup titulo="Documentos Recomendados" color="var(--primary)" docs={resto} contratos={contratos} onPreviewContract={onPreviewContract} onLinkContract={onLinkContract} />}
    </div>
  );
}

function DocGroup({ titulo, color, docs, contratos, onPreviewContract, onLinkContract }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10,
      }}>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        <span style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.09em', color,
          fontFamily: "'JetBrains Mono', monospace",
          padding: '2px 10px',
          background: 'var(--bg-page)',
          border: `1px solid ${color}40`,
          borderRadius: 4,
        }}>
          {titulo}
        </span>
        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {docs.map(doc => {
          const matchingContract = findMatchingContract(doc.id, contratos);
          return (
            <DocCard 
              key={doc.id} 
              doc={doc} 
              matchingContract={matchingContract} 
              onPreviewContract={onPreviewContract}
              onLinkContract={onLinkContract}
            />
          );
        })}
      </div>
    </div>
  );
}

function DocCard({ doc, matchingContract, onPreviewContract, onLinkContract }) {
  const cfg = PRIORIDAD[doc.prioridad];
  const hasDoc = !!matchingContract;

  return (
    <div 
      onClick={() => {
        if (hasDoc) {
          onPreviewContract(matchingContract);
        } else {
          onLinkContract(doc);
        }
      }}
      style={{
        background: 'var(--surface)',
        border: hasDoc ? '1px solid var(--success-border)' : `1px solid ${cfg.border}`,
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Indicador de éxito sutil en el borde izquierdo */}
      {hasDoc && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
          background: 'var(--success-deep)'
        }} />
      )}

      {/* Ícono */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: hasDoc ? 'var(--success-bg)' : cfg.bg, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {hasDoc ? (
          <Icon d="M9 12l2 2 4-4" color="var(--success-deep)" w={18} />
        ) : (
          <Icon d={doc.icono} color={cfg.color} w={17} />
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
            {doc.titulo}
          </p>
          {hasDoc ? (
            <span style={{
              flexShrink: 0,
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '2px 7px', borderRadius: 4,
              background: 'var(--success-bg)', color: 'var(--success-deep)',
              fontFamily: "'JetBrains Mono', monospace",
              border: '1px solid var(--success-border)',
              display: 'flex', alignItems: 'center', gap: '3px'
            }}>
              <span style={{ fontSize: '10px' }}>✓</span> Contratado
            </span>
          ) : (
            <span style={{
              flexShrink: 0,
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '2px 7px', borderRadius: 4,
              background: cfg.bg, color: cfg.color,
              fontFamily: "'JetBrains Mono', monospace",
              border: `1px solid ${cfg.border}`,
            }}>
              {cfg.label}
            </span>
          )}
        </div>
        <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          {doc.desc}
        </p>
        
        {hasDoc ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <p style={{
              margin: 0, fontSize: 10, color: 'var(--success-deep)',
              fontStyle: 'italic', lineHeight: 1.4,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="var(--success-deep)" w={11} />
              Vinculado a: {matchingContract.nombre}
            </p>
            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              Previsualizar <span style={{ fontSize: '11px' }}>→</span>
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <p style={{
              margin: 0, fontSize: 10, color: cfg.color,
              fontStyle: 'italic', lineHeight: 1.4,
              display: 'flex', alignItems: 'flex-start', gap: 4,
            }}>
              <Icon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" color={cfg.color} w={11} />
              {doc.razon}
            </p>
            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              Vincular existente <span style={{ fontSize: '11px' }}>+</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductoWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();

  // Si venimos desde el catálogo, el producto llega en el state de la ruta.
  const stateProducto = location.state?.producto ?? null;

  const [producto, setProducto]   = useState(stateProducto);
  const [loading, setLoading]     = useState(!stateProducto); // si hay state, no hace falta cargar
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [busy, setBusy]           = useState(false);
  const [actionError, setActionError] = useState(null);

  // Contratos que usan este producto
  const [contratos, setContratos]           = useState([]);
  const [contratosLoading, setContratosLoading] = useState(false);
  const [contratosLoaded, setContratosLoaded]   = useState(false);
  const [selectedContractForPreview, setSelectedContractForPreview] = useState(null);
  const [selectedDocForLinking, setSelectedDocForLinking] = useState(null);

  // Edit form state: se inicializa con el state si ya está disponible
  const [editForm, setEditForm]   = useState(stateProducto ? buildEditForm(stateProducto) : null);
  const [editError, setEditError] = useState(null);
  const [showCustomUnit, setShowCustomUnit] = useState(() => {
    const predefinedUnits = ['/usuario/mes', '/usuario/año', '/mes', '/año', '/licencia', '/dispositivo', '/proyecto', '/hora', ''];
    return !!stateProducto?.unit && !predefinedUnits.includes(stateProducto?.unit);
  });

  // ── Aplica un producto cargado al estado local ───────────────────────────
  function applyProducto(data) {
    setProducto(data);
    setEditForm(buildEditForm(data));
    const predefinedUnits = ['/usuario/mes', '/usuario/año', '/mes', '/año', '/licencia', '/dispositivo', '/proyecto', '/hora', ''];
    setShowCustomUnit(!!data.unit && !predefinedUnits.includes(data.unit));
  }

  // ── Carga/recarga desde el backend usando la lista ──────────────────────
  // El backend no expone GET /productos/:id/, así que filtramos la lista
  // con el ID recibido por parámetro de ruta.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getProductos();
      const data = (Array.isArray(list) ? list : list.results ?? []).find(
        p => String(p.id) === String(id)
      );
      if (!data) throw new Error('Producto no encontrado en el catálogo');
      applyProducto(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Solo cargamos desde la API si NO teníamos state de la ruta anterior.
  useEffect(() => {
    if (!stateProducto) load();
  }, [load, stateProducto]);

  // ── Load contracts when tab is activated ────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'contratos' || contratosLoaded || !producto) return;
    setContratosLoading(true);
    // Try software ID filter first; fall back to name search
    getContratos({ software: id })
      .then(data => {
        const results = data.results || data || [];
        if (results.length === 0) {
          // Fallback: search by product name
          return getContratos({ search: producto.name });
        }
        return { results };
      })
      .then(data => {
        setContratos(data.results || data || []);
        setContratosLoaded(true);
      })
      .catch(() => setContratos([]))
      .finally(() => setContratosLoading(false));
  }, [activeTab, id, contratosLoaded, producto]);



  const setField = (field, value) =>
    setEditForm(prev => ({ ...prev, [field]: value }));

  const setExtraField = (key, val) =>
    setEditForm(prev => ({
      ...prev,
      datos_adicionales: { ...(prev.datos_adicionales || {}), [key]: val },
    }));

  // ── Save edit ───────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setEditError(null);
    const isFreeLicense = editForm.tipo_licencia === 'Gratuito / OpenSource';
    const payload = {
      ...editForm,
      price:    isFreeLicense ? '0' : editForm.price,
      currency: isFreeLicense ? 'N/A' : editForm.currency,
      unit:     isFreeLicense ? 'No aplica' : editForm.unit,
    };
    try {
      await updateProducto(id, payload);
      await load();
      setActiveTab('resumen');
    } catch (err) {
      setEditError(err.message || 'Error al guardar los cambios');
    } finally {
      setBusy(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${producto?.name}"? Esta acción no se puede deshacer y podría afectar contratos que usen este producto.`,
      confirmLabel: 'Eliminar',
      isDangerous: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteProducto(id);
      navigate('/catalogo');
    } catch (err) {
      setActionError(err.message || 'No se pudo eliminar el producto');
      setBusy(false);
    }
  }

  // ── Early returns ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pw-workspace">
        <div className="pw-state-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Cargando producto…</span>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="pw-workspace">
        <div className="pw-state-box">
          <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={36} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--danger)' }}>{error || 'Producto no encontrado'}</p>
          <button className="pw-btn-secondary" onClick={() => navigate('/catalogo')}>← Volver al catálogo</button>
        </div>
      </div>
    );
  }

  const catCfg = getCatCfg(producto.cat);
  const initials = getInitials(producto.name);
  const isFreeLicense = producto.tipo_licencia === 'Gratuito / OpenSource';
  const editIsFreeLicense = editForm?.tipo_licencia === 'Gratuito / OpenSource';

  // Helper: format money using existing formatPrecio
  const precioDisplay = isFreeLicense ? 'Gratuito' : formatPrecio(producto.price);

  return (
    <div className="pw-workspace">

      {/* ── Header / Breadcrumb ── */}
      <div className="pw-header">
        <div className="pw-breadcrumb">
          <button className="pw-breadcrumb-btn" onClick={() => navigate('/catalogo')}>
            <Icon d="M15 18l-6-6 6-6" color="var(--text-muted)" w={14} />
            Productos / Tarifas
          </button>
          <Icon d="M9 18l6-6-6-6" color="var(--border)" w={12} />
          <span className="pw-breadcrumb-current">{producto.sku}</span>
        </div>
        <div className="pw-header-actions">
          <button className="pw-btn-secondary" onClick={load} disabled={busy} title="Recargar datos">
            <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" color="var(--text-muted)" w={13} />
            Actualizar
          </button>
          <button className="pw-btn-danger" onClick={handleDelete} disabled={busy}>
            <Icon d={['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z']} color="var(--rose)" w={13} />
            Eliminar
          </button>
          <button className="pw-btn-primary" onClick={() => setActiveTab('editar')} disabled={busy}>
            <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} color="var(--text-on-accent)" w={13} />
            Editar
          </button>
        </div>
      </div>

      {/* ── Action Error ── */}
      {actionError && (
        <div className="pw-alert-error" role="alert">{actionError}</div>
      )}

      {/* ── Title Bar ── */}
      <div className="pw-titlebar">
        <div className="pw-titlebar-left">
          {/* Avatar */}
          <div className="pw-avatar" style={{ background: catCfg.bg, color: catCfg.color }}>
            {initials}
          </div>

          <div className="pw-titlebar-info">
            <div className="pw-id-row">
              <span className="pw-sku-chip">{producto.sku}</span>
              {/* Categoría badge */}
              <span className="pw-cat-badge" style={{ background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.color}30` }}>
                <span className="pw-cat-dot" style={{ background: catCfg.dot }} />
                {producto.cat}
              </span>
              <StatusBadge status={producto.status} />
            </div>
            <h2 className="pw-name">{producto.name}</h2>
            <p className="pw-desc-preview">{producto.desc || <span style={{ fontStyle: 'italic', color: 'var(--text-faint)' }}>Sin descripción registrada</span>}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="pw-kpis">
          <div className="pw-kpi">
            <p className="pw-kpi-label">Precio</p>
            <p className="pw-kpi-value" style={{ color: isFreeLicense ? 'var(--success-deep)' : 'var(--primary)' }}>
              {precioDisplay}
            </p>
            {!isFreeLicense && producto.currency && (
              <p className="pw-kpi-sub">{producto.currency}</p>
            )}
          </div>
          <div className="pw-kpi-divider" />
          <div className="pw-kpi">
            <p className="pw-kpi-label">Unidad</p>
            <p className="pw-kpi-value">{isFreeLicense ? '—' : (producto.unit || '—')}</p>
          </div>
          <div className="pw-kpi-divider" />
          <div className="pw-kpi">
            <p className="pw-kpi-label">Licencia</p>
            <p className="pw-kpi-value" style={{ fontSize: 11 }}>
              {producto.tipo_licencia || 'Comercial'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="pw-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`pw-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <Icon d={t.icon} color={activeTab === t.id ? 'var(--primary)' : 'var(--text-faint)'} w={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="pw-content">

        {/* ══ TAB: RESUMEN ══ */}
        {activeTab === 'resumen' && (
          <div className="pw-resumen-grid">

            {/* Información General */}
            <div className="pw-card">
              <p className="pw-card-title">
                <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" color={catCfg.color} w={14} />
                Información General
              </p>
              <div className="pw-rows">
                <div className="pw-row">
                  <span className="pw-row-label">SKU</span>
                  <span className="pw-row-value" style={{ color: 'var(--primary)' }}>{producto.sku}</span>
                </div>
                <div className="pw-row">
                  <span className="pw-row-label">Categoría</span>
                  <span className="pw-row-value" style={{ color: catCfg.color }}>{producto.cat}</span>
                </div>
                <div className="pw-row">
                  <span className="pw-row-label">Tipo de Licencia</span>
                  <span className="pw-row-value">{producto.tipo_licencia || 'Comercial'}</span>
                </div>
                <div className="pw-row">
                  <span className="pw-row-label">Estado</span>
                  <span className="pw-row-value" style={{ color: (!producto.status || producto.status === 'Activo') ? 'var(--success-deep)' : 'var(--text-muted)' }}>
                    {producto.status || 'Activo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Precio / Tarifa */}
            <div className="pw-card">
              <p className="pw-card-title">
                <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="var(--success-alt)" w={14} />
                Precio / Tarifa
              </p>
              {isFreeLicense ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="pw-price-block">
                    <span className="pw-price-main" style={{ color: 'var(--success-deep)' }}>Gratis</span>
                  </div>
                  <span className="pw-price-unit">Licencia OpenSource / Gratuita — sin costo</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="pw-price-block">
                    <span className="pw-price-currency">{producto.currency}</span>
                    <span className="pw-price-main">{formatPrecio(producto.price)}</span>
                  </div>
                  <span className="pw-price-unit">{producto.unit || 'Sin unidad definida'}</span>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="pw-card" style={{ gridRow: 'span 2' }}>
              <p className="pw-card-title">
                <Icon d="M4 6h16M4 12h16M4 18h12" color="var(--text-muted)" w={14} />
                Descripción
              </p>
              {producto.desc ? (
                <p className="pw-desc-full">{producto.desc}</p>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  Sin descripción registrada.
                </p>
              )}
            </div>

            {/* Datos Adicionales (solo si existen) */}
            {producto.datos_adicionales && Object.keys(producto.datos_adicionales).length > 0 && (
              <div className="pw-card">
                <p className="pw-card-title">
                  <Icon d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" color="var(--violet-bright)" w={14} />
                  Especificaciones Técnicas
                </p>
                <div className="pw-rows">
                  {Object.entries(producto.datos_adicionales).map(([k, v]) => {
                    if (!v) return null;
                    return (
                      <div key={k} className="pw-row">
                        <span className="pw-row-label">{fmtKey(k)}</span>
                        <span className="pw-row-value" style={{ maxWidth: 200, fontFamily: 'inherit', fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
                          {typeof v === 'object' && v !== null ? (Array.isArray(v) ? v.join(', ') : JSON.stringify(v)) : String(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Desarrollo / Tecnologías (Solo para Software) */}
            {producto.cat === 'Software' && (
              <div className="pw-card" style={{ gridColumn: '1 / -1' }}>
                <p className="pw-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Icon d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" color="var(--cyan)" w={14} />
                    Información de Desarrollo
                  </span>
                  <span style={{ fontSize: '10px', background: 'var(--cyan-tint)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Tech Stack
                  </span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginTop: '16px' }}>
                  
                  {/* Lenguajes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Composición de Código</span>
                    {(() => {
                      const str = producto.datos_adicionales?.lenguajes_porcentajes || 'JS:60, TS:25, CSS:15';
                      const parts = str.split(',').map(s => s.trim()).filter(Boolean);
                      const colors = ['#f1e05a', '#3178c6', '#563d7c', '#e34c26', '#b07219', '#ffac45'];
                      const data = parts.map((p, i) => {
                        const [name, val] = p.split(':').map(x => x.trim());
                        return { name: name || 'Desconocido', val: Number(val) || 0, color: colors[i % colors.length] };
                      });
                      const total = data.reduce((acc, curr) => acc + curr.val, 0) || 100;
                      
                      return (
                        <>
                          <div style={{ width: '100%', height: '8px', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                            {data.map((d, i) => (
                              <div key={i} style={{ width: `${(d.val / total) * 100}%`, background: d.color, height: '100%' }} title={`${d.name}: ${d.val}%`}></div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px' }}>
                            {data.map((d, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <TechIcon name={d.name} color={d.color} size={12} fallback={false} />
                                {!['js', 'ts', 'html', 'css', 'python', 'ruby', 'go'].includes(d.name.toLowerCase()) && (
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, display: (['react', 'node.js'].includes(d.name.toLowerCase()) ? 'none' : 'block') }}></div>
                                )}
                                <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {d.name} <span style={{ color: 'var(--text-muted)' }}>({((d.val / total) * 100).toFixed(0)}%)</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Tecnologías */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stack Tecnológico</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(producto.datos_adicionales?.stack_tecnologico || 'React, Node.js, PostgreSQL, Docker').split(',').map(t => t.trim()).filter(Boolean).map((tech, i) => (
                        <span key={i} style={{ padding: '4px 10px', background: 'var(--bg-topbar)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TechIcon name={tech} size={12} />
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Protocolos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Protocolos & Seguridad</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(producto.datos_adicionales?.protocolos_seguridad || '2FA (MFA), OAuth 2.0, Email / SMTP').split(',').map(p => p.trim()).filter(Boolean).map((prot, i) => {
                        let icon = 'M4 12a8 8 0 018-8 8 8 0 018 8m-8-4a4 4 0 00-4 4 4 4 0 004 4m-2 6a10 10 0 01-10-10 10 10 0 0110-10 10 10 0 0110 10';
                        let color = 'var(--cyan)';
                        const lp = prot.toLowerCase();
                        if (lp.includes('2fa') || lp.includes('mfa')) { icon = 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'; color = 'var(--success-deep)'; }
                        else if (lp.includes('oauth') || lp.includes('saml') || lp.includes('jwt') || lp.includes('sso')) { icon = 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'; color = 'var(--violet-bright)'; }
                        else if (lp.includes('email') || lp.includes('smtp') || lp.includes('msg')) { icon = 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6'; color = 'var(--primary)'; }
                        else if (lp.includes('wss') || lp.includes('webhooks')) { icon = 'M4 12a8 8 0 018-8 8 8 0 018 8m-8-4a4 4 0 00-4 4 4 4 0 004 4m-2 6a10 10 0 01-10-10 10 10 0 0110-10 10 10 0 0110 10'; color = 'var(--warning-bright)'; }
                        
                        return (
                          <span key={i} style={{ padding: '4px 10px', background: 'var(--bg-topbar)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon d={icon} w={12} color={color} />
                            {prot}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Resumen de contratos */}
            <div className="pw-card">
              <p className="pw-card-title">
                <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--warning-bright)" w={14} />
                En el Sistema
              </p>
              <div className="pw-rows">
                <div className="pw-row">
                  <span className="pw-row-label">Categoría de producto</span>
                  <span className="pw-row-value">{producto.cat}</span>
                </div>
                <div className="pw-row">
                  <span className="pw-row-label">Divisa</span>
                  <span className="pw-row-value">{isFreeLicense ? 'N/A' : (producto.currency || '—')}</span>
                </div>
              </div>
              <button className="pw-btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => setActiveTab('contratos')}>
                <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--text-muted)" w={13} />
                Ver contratos vinculados
              </button>
            </div>

          </div>
        )}

        {/* ══ TAB: CONTRATOS ══ */}
        {activeTab === 'contratos' && (
          <div className="pw-tab-contratos">
            <div className="pw-contratos-toolbar">
              <p className="pw-section-label">
                Contratos que usan: <span style={{ color: 'var(--primary)' }}>{producto.name}</span>
              </p>
            </div>

            {contratosLoading && (
              <div className="pw-state-box" style={{ minHeight: 200 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)"
                  strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span style={{ fontSize: 12 }}>Cargando contratos…</span>
              </div>
            )}

            {!contratosLoading && (
              <>
                {contratos.length > 0 && (
                  <div className="pw-contratos-table-wrap" style={{ marginBottom: '24px' }}>
                    <div className="pw-contratos-header">
                      <span>ID</span>
                      <span>Nombre</span>
                      <span>Cliente</span>
                      <span>Etapa</span>
                      <span>Valor</span>
                      <span>Acciones</span>
                    </div>
                    {contratos.map(c => (
                      <div key={c.id} className="pw-contratos-row"
                        onClick={() => navigate(`/contratos/${c.id}`)}
                        role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') navigate(`/contratos/${c.id}`); }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--primary)', fontWeight: 700 }}>
                          #{String(c.id).padStart(5, '0')}
                        </span>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
                        <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.cliente?.nombre || '—'}
                        </span>
                        <span>
                          <span style={{
                            fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            background: 'var(--bg-topbar)', border: '1px solid var(--border)',
                            borderRadius: 4, padding: '2px 6px', color: 'var(--text-muted)',
                          }}>
                            {c.etapa_display || c.etapa}
                          </span>
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          {c.mrr ? fmtMoney(c.mrr) : c.monto ? fmtMoney(c.monto) : '—'}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="pw-icon-btn"
                            title="Ver contrato"
                            onClick={e => { e.stopPropagation(); navigate(`/contratos/${c.id}`); }}
                          >
                            <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z']} w={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <DocsRecomendados 
                  producto={producto} 
                  contratos={contratos}
                  onNuevoContrato={() => navigate('/contratos/new')}
                  onPreviewContract={(c) => setSelectedContractForPreview(c)}
                  onLinkContract={(doc) => setSelectedDocForLinking(doc)}
                />
              </>
            )}
          </div>
        )}

        {/* ══ TAB: EDITAR ══ */}
        {activeTab === 'editar' && editForm && (
          <div className="pw-tab-editar">
            <form onSubmit={handleSave}>
              <div className="pw-edit-form">
                {/* Form Header */}
                <div className="pw-edit-form-header">
                  <p className="pw-edit-form-title">
                    <Icon d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} color="var(--text-muted)" w={13} />
                    Editando: {producto.name}
                  </p>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace' }}>SKU: {producto.sku}</span>
                </div>

                {/* Form Body */}
                <div className="pw-edit-form-body">
                  {/* Left: General fields */}
                  <div className="pw-edit-col-main">
                    <div className="pw-form-row pw-form-row-2">
                      <div className="pw-field">
                        <label>SKU</label>
                        <input value={producto.sku} disabled title="El SKU es auto-generado y no puede modificarse" />
                      </div>
                      <div className="pw-field">
                        <label>Nombre *</label>
                        <input
                          value={editForm.name}
                          onChange={e => setField('name', e.target.value)}
                          placeholder="Ej. SoftTrack Pro v3 – Anual"
                          required
                        />
                      </div>
                    </div>

                    <div className="pw-field">
                      <label>Descripción</label>
                      <textarea
                        value={editForm.desc}
                        onChange={e => setField('desc', e.target.value)}
                        placeholder="Licencia anual por usuario, incluye soporte 8×5"
                        rows={3}
                      />
                    </div>

                    <div className="pw-form-row pw-form-row-2-eq">
                      <div className="pw-field">
                        <label>Categoría</label>
                        <select value={editForm.cat} onChange={e => setField('cat', e.target.value)}>
                          {PRODUCTO_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="pw-field">
                        <label>Tipo de Licencia</label>
                        <select
                          value={editForm.tipo_licencia || 'Comercial'}
                          onChange={e => {
                            const type = e.target.value;
                            const isFree = type === 'Gratuito / OpenSource';
                            setEditForm(prev => ({
                              ...prev,
                              tipo_licencia: type,
                              price: isFree ? '0' : prev.price === '0' ? '' : prev.price,
                              currency: isFree ? 'N/A' : prev.currency === 'N/A' ? 'USD' : prev.currency,
                              unit: isFree ? 'No aplica' : prev.unit === 'No aplica' ? '' : prev.unit,
                            }));
                          }}
                        >
                          <option value="Comercial">Comercial</option>
                          <option value="Gratuito / OpenSource">Gratuito / OpenSource</option>
                        </select>
                      </div>
                    </div>

                    <div className="pw-form-row pw-form-row-3">
                      <div className="pw-field">
                        <label>Precio</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.price}
                          onChange={e => setField('price', e.target.value)}
                          disabled={editIsFreeLicense}
                          placeholder={editIsFreeLicense ? '0' : '1200'}
                          style={{ background: editIsFreeLicense ? 'var(--bg-page)' : undefined }}
                        />
                      </div>
                      <div className="pw-field">
                        <label>Divisa</label>
                        <input
                          value={editForm.currency}
                          onChange={e => setField('currency', e.target.value.toUpperCase())}
                          disabled={editIsFreeLicense}
                          placeholder={editIsFreeLicense ? 'N/A' : 'USD, EUR, MXN…'}
                          maxLength={8}
                          style={{ background: editIsFreeLicense ? 'var(--bg-page)' : undefined }}
                        />
                      </div>
                      <div className="pw-field">
                        <label>Unidad de cobro</label>
                        {showCustomUnit ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              value={editForm.unit}
                              onChange={e => setField('unit', e.target.value)}
                              disabled={editIsFreeLicense}
                              placeholder="/servidor/mes"
                              style={{ flex: 1, background: editIsFreeLicense ? 'var(--bg-page)' : undefined }}
                            />
                            {!editIsFreeLicense && (
                              <button type="button"
                                onClick={() => { setShowCustomUnit(false); setField('unit', ''); }}
                                style={{ padding: '0 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}
                                title="Volver al listado">
                                <Icon d="M6 18L18 6M6 6l12 12" w={13} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <select
                            value={editForm.unit || ''}
                            onChange={e => {
                              if (e.target.value === 'Otro') {
                                setShowCustomUnit(true);
                                setField('unit', '');
                              } else {
                                setField('unit', e.target.value);
                              }
                            }}
                            disabled={editIsFreeLicense}
                            style={{ background: editIsFreeLicense ? 'var(--bg-page)' : undefined }}
                          >
                            <option value="">Selecciona una unidad</option>
                            <option value="/usuario/mes">/usuario/mes</option>
                            <option value="/usuario/año">/usuario/año</option>
                            <option value="/mes">/mes</option>
                            <option value="/año">/año</option>
                            <option value="/licencia">/licencia</option>
                            <option value="/dispositivo">/dispositivo</option>
                            <option value="/proyecto">/proyecto</option>
                            <option value="/hora">/hora</option>
                            <option value="Otro">Otro…</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="pw-field">
                      <label>Estado del producto</label>
                      <select value={editForm.status || 'Activo'} onChange={e => setField('status', e.target.value)}>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                    

                    <div className="pw-field">
                      <label>Repositorios de GitHub</label>
                      {(editForm.datos_adicionales?.github_repos || []).map((repo, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input
                            style={{ flex: 1 }}
                            value={repo}
                            onChange={e => {
                              const newRepos = [...(editForm.datos_adicionales?.github_repos || [])];
                              newRepos[i] = e.target.value;
                              setExtraField('github_repos', newRepos);
                            }}
                            placeholder="https://github.com/org/repo"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newRepos = [...(editForm.datos_adicionales?.github_repos || [])];
                              newRepos.splice(i, 1);
                              setExtraField('github_repos', newRepos);
                            }}
                            style={{ padding: '0 12px', borderRadius: 6, border: '1px solid var(--danger)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer' }}
                            title="Eliminar Repositorio"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newRepos = [...(editForm.datos_adicionales?.github_repos || [])];
                          newRepos.push('');
                          setExtraField('github_repos', newRepos);
                        }}
                        style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                      >
                        + Añadir Repositorio
                      </button>
                    </div>

                    <div className="pw-field">
                      <label>Subir Archivos (Próximamente)</label>
                      <input
                        type="file"
                        multiple
                        disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        title="Esta opción estará disponible próximamente"
                      />
                    </div>
                  </div>

                  {/* Right: Dynamic side panel (same as ProductModal) */}
                  {['Software', 'Agente', 'Script', 'Auditoría', 'Consultoría'].includes(editForm.cat) && (
                    <div className="pw-edit-col-side">
                      <p className="pw-edit-side-title">Más Información</p>
                      <p className="pw-edit-side-sub">Campos específicos para la categoría <strong>{editForm.cat}</strong>.</p>
                      <div className="pw-edit-divider" />

                      {/* Software */}
                      {editForm.cat === 'Software' && (
                        <>
                          <div className="pw-field">
                            <label>Plataforma / Formato *</label>
                            <select
                              value={editForm.datos_adicionales?.tipo_software || ''}
                              onChange={e => {
                                setExtraField('tipo_software', e.target.value);
                                if (e.target.value !== 'Otro') setExtraField('tipo_software_otro', '');
                              }}>
                              <option value="">Selecciona</option>
                              <option>App Android</option>
                              <option>App iOS</option>
                              <option>App Multiplataforma</option>
                              <option>App Web</option>
                              <option>Software Nativo PC</option>
                              <option>Software Nativo Mac</option>
                              <option>Servicio Backend</option>
                              <option>Otro</option>
                            </select>
                          </div>
                          {editForm.datos_adicionales?.tipo_software === 'Otro' && (
                            <div className="pw-field">
                              <label>Describir software *</label>
                              <input
                                value={editForm.datos_adicionales?.tipo_software_otro || ''}
                                onChange={e => setExtraField('tipo_software_otro', e.target.value)}
                                placeholder="Ej. Sistema Embebido, Firmware…"
                              />
                            </div>
                          )}
                          <div className="pw-field">
                            <label>Más información *</label>
                            <textarea rows={2}
                              value={editForm.datos_adicionales?.mas_informacion || ''}
                              onChange={e => setExtraField('mas_informacion', e.target.value)}
                              placeholder="Funciones principales, tecnologías…"
                            />
                          </div>
                          <div className="pw-field">
                            <label>Modalidad de Entrega *</label>
                            <select value={editForm.datos_adicionales?.modalidad_entrega || ''} onChange={e => setExtraField('modalidad_entrega', e.target.value)}>
                              <option value="">Selecciona</option>
                              <option>SaaS (Cloud)</option>
                              <option>On-Premise</option>
                              <option>Híbrido</option>
                              <option>Instalación Local</option>
                            </select>
                          </div>
                          <div className="pw-field">
                            <label>Nivel de Soporte *</label>
                            <select value={editForm.datos_adicionales?.nivel_soporte || ''} onChange={e => setExtraField('nivel_soporte', e.target.value)}>
                              <option value="">Selecciona</option>
                              <option>Sin soporte incluido</option>
                              <option>Básico (Email/Tickets)</option>
                              <option>Estándar (Horario Laboral)</option>
                              <option>Premium (SLA 24/7)</option>
                            </select>
                          </div>
                          <div className="pw-field">
                            <label>Propiedad Intelectual *</label>
                            <select value={editForm.datos_adicionales?.propiedad_intelectual || ''} onChange={e => setExtraField('propiedad_intelectual', e.target.value)}>
                              <option value="">Selecciona</option>
                              <option>Propiedad del Desarrollador (Licencia de uso)</option>
                              <option>Propiedad del Cliente (Traspaso total)</option>
                              <option>Código Abierto (Open Source)</option>
                            </select>
                          </div>
                          
                          <div className="pw-field">
                            <label>Lenguajes (ej: JS:60, TS:30, CSS:10)</label>
                            <input
                              value={editForm.datos_adicionales?.lenguajes_porcentajes || ''}
                              onChange={e => setExtraField('lenguajes_porcentajes', e.target.value)}
                              placeholder="JS:60, TS:30, CSS:10"
                            />
                          </div>
                          <div className="pw-field">
                            <label>Stack Tecnológico</label>
                            <input
                              value={editForm.datos_adicionales?.stack_tecnologico || ''}
                              onChange={e => setExtraField('stack_tecnologico', e.target.value)}
                              placeholder="React, Node.js, PostgreSQL..."
                            />
                          </div>
                          <div className="pw-field">
                            <label>Protocolos y Seguridad</label>
                            <input
                              value={editForm.datos_adicionales?.protocolos_seguridad || ''}
                              onChange={e => setExtraField('protocolos_seguridad', e.target.value)}
                              placeholder="2FA, OAuth, SMTP, WSS..."
                            />
                          </div>

                          {['App Android', 'App iOS', 'App Multiplataforma'].includes(editForm.datos_adicionales?.tipo_software) && (
                            <>
                              <div className="pw-field">
                                <label>Publicación en Tiendas *</label>
                                <select value={editForm.datos_adicionales?.publicacion_tiendas || ''} onChange={e => setExtraField('publicacion_tiendas', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>A cargo del desarrollador</option>
                                  <option>A cargo del cliente</option>
                                  <option>No aplica / Distribución interna</option>
                                </select>
                              </div>
                              <div className="pw-field">
                                <label>Mantenimiento SO *</label>
                                <select value={editForm.datos_adicionales?.mantenimiento_so || ''} onChange={e => setExtraField('mantenimiento_so', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>Incluye adaptación a nuevas versiones (1 año)</option>
                                  <option>No incluye adaptación</option>
                                  <option>Mantenimiento continuo (Contrato SLA)</option>
                                </select>
                              </div>
                            </>
                          )}

                          {['App Web', 'Servicio Backend'].includes(editForm.datos_adicionales?.tipo_software) && (
                            <>
                              <div className="pw-field">
                                <label>Alojamiento de Datos *</label>
                                <select value={editForm.datos_adicionales?.alojamiento_datos || ''} onChange={e => setExtraField('alojamiento_datos', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>Nube del Desarrollador (SaaS)</option>
                                  <option>Nube del Cliente (On-Premise/Cloud propia)</option>
                                  <option>Tercero / PaaS</option>
                                </select>
                              </div>
                              <div className="pw-field">
                                <label>SLA de Servicio *</label>
                                <select value={editForm.datos_adicionales?.acuerdos_nivel_servicio_sla || ''} onChange={e => setExtraField('acuerdos_nivel_servicio_sla', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>Uptime 99.9% (Garantizado)</option>
                                  <option>Uptime 99% (Estándar)</option>
                                  <option>Mejor esfuerzo (Sin SLA estricto)</option>
                                </select>
                              </div>
                              <div className="pw-field">
                                <label>Límite de Usuarios *</label>
                                <select value={editForm.datos_adicionales?.limite_usuarios || ''} onChange={e => setExtraField('limite_usuarios', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>Ilimitado</option>
                                  <option>Por rangos (especificado en contrato)</option>
                                  <option>Concurrencia limitada</option>
                                </select>
                              </div>
                            </>
                          )}

                          {['Software Nativo PC', 'Software Nativo Mac'].includes(editForm.datos_adicionales?.tipo_software) && (
                            <>
                              <div className="pw-field">
                                <label>Licenciamiento por Equipos *</label>
                                <select value={editForm.datos_adicionales?.licenciamiento_equipos || ''} onChange={e => setExtraField('licenciamiento_equipos', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>Por dispositivo / MAC Address</option>
                                  <option>Por usuario nominal</option>
                                  <option>Licencia global / Ilimitada</option>
                                </select>
                              </div>
                              <div className="pw-field">
                                <label>Distribución *</label>
                                <select value={editForm.datos_adicionales?.distribucion || ''} onChange={e => setExtraField('distribucion', e.target.value)}>
                                  <option value="">Selecciona</option>
                                  <option>Instalador ejecutable (.exe / .dmg)</option>
                                  <option>Tienda oficial (MS Store / Mac App Store)</option>
                                  <option>Despliegue corporativo (MDM / GPO)</option>
                                </select>
                              </div>
                            </>
                          )}

                          {editForm.datos_adicionales?.tipo_software === 'Otro' && (
                            <div className="pw-field">
                              <label>Entregables Específicos *</label>
                              <textarea rows={2}
                                value={editForm.datos_adicionales?.entregables_especificos || ''}
                                onChange={e => setExtraField('entregables_especificos', e.target.value)}
                                placeholder="Binarios, código fuente, manuales, hardware…"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Agente */}
                      {editForm.cat === 'Agente' && (
                        <>
                          <div className="pw-field">
                            <label>Tipo de Agente *</label>
                            <select value={editForm.datos_adicionales?.tipo_agente || ''} onChange={e => setExtraField('tipo_agente', e.target.value)}>
                              <option value="">Selecciona</option>
                              <option>Autónomo</option>
                              <option>Semiautónomo</option>
                              <option>Reactivo / Reglas</option>
                            </select>
                          </div>
                          <div className="pw-field">
                            <label>Integración / LLM *</label>
                            <input
                              value={editForm.datos_adicionales?.integracion_llm || ''}
                              onChange={e => setExtraField('integracion_llm', e.target.value)}
                              placeholder="e.g. OpenAI GPT-4, Claude 3.5"
                            />
                          </div>
                        </>
                      )}

                      {/* Script */}
                      {editForm.cat === 'Script' && (
                        <>
                          <div className="pw-field">
                            <label>Entorno / Lenguaje *</label>
                            <select value={editForm.datos_adicionales?.entorno_lenguaje || ''} onChange={e => setExtraField('entorno_lenguaje', e.target.value)}>
                              <option value="">Selecciona</option>
                              <option>Bash/Shell</option>
                              <option>Python</option>
                              <option>Node.js</option>
                              <option>PowerShell</option>
                              <option>Go/CLI</option>
                            </select>
                          </div>
                          <div className="pw-field">
                            <label>Propósito *</label>
                            <select value={editForm.datos_adicionales?.proposito || ''} onChange={e => setExtraField('proposito', e.target.value)}>
                              <option value="">Selecciona</option>
                              <option>Automatización</option>
                              <option>Datos/ETL</option>
                              <option>DevOps</option>
                              <option>Scraping</option>
                            </select>
                          </div>
                        </>
                      )}

                      {/* Auditoría */}
                      {editForm.cat === 'Auditoría' && (
                        <div className="pw-field">
                          <label>Enfoque *</label>
                          <select value={editForm.datos_adicionales?.enfoque || ''} onChange={e => setExtraField('enfoque', e.target.value)}>
                            <option value="">Selecciona</option>
                            <option>Seguridad/Pentesting</option>
                            <option>Calidad de Código/QA</option>
                            <option>Rendimiento</option>
                            <option>Cumplimiento Normativo</option>
                          </select>
                        </div>
                      )}

                      {/* Consultoría */}
                      {editForm.cat === 'Consultoría' && (
                        <div className="pw-field">
                          <label>Modalidad *</label>
                          <select value={editForm.datos_adicionales?.modalidad || ''} onChange={e => setExtraField('modalidad', e.target.value)}>
                            <option value="">Selecciona</option>
                            <option>Por Hora</option>
                            <option>Por Proyecto</option>
                            <option>Asesoría Continua</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Form Footer */}
                <div className="pw-edit-form-footer">
                  {editError && (
                    <div className="pw-edit-error">
                      <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" color="var(--danger)" w={14} />
                      {editError}
                    </div>
                  )}
                  <button type="button" className="pw-btn-secondary" onClick={() => { setActiveTab('resumen'); setEditError(null); }} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="submit" className="pw-btn-primary" disabled={busy || !editForm.name.trim()}>
                    {busy ? 'Guardando…' : 'Guardar cambios ✓'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

      </div>

      {selectedContractForPreview && (
        <DocumentPreviewModal
          contract={selectedContractForPreview}
          onClose={() => setSelectedContractForPreview(null)}
          onNavigateToContract={(cid) => {
            setSelectedContractForPreview(null);
            navigate(`/contratos/${cid}`);
          }}
        />
      )}

      {selectedDocForLinking && (
        <LinkContractModal
          doc={selectedDocForLinking}
          producto={producto}
          onClose={() => setSelectedDocForLinking(null)}
          onSuccess={() => {
            setSelectedDocForLinking(null);
            setContratosLoaded(false); // Forzar recarga de contratos en la pestaña
            load(); // Recarga los datos principales
          }}
        />
      )}
    </div>
  );
}
