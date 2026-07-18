/**
 * Software Technical Glossary
 * Holds definitions for main domain terms across the CLM application.
 */
export const GLOSSARY = {
  // ── Contratos ──────────────────────────────────────────────────
  cliente: {
    title: "Cliente",
    definition: "La persona natural o jurídica destinataria de los servicios pactados en el contrato."
  },
  tipo_contrato: {
    title: "Tipo de Contrato",
    definition: "Determina si el acuerdo es periódico (recurrente), de pago único (perpetuo), sin costo (pro bono) o para uso propio (interno)."
  },
  software: {
    title: "Producto / Software",
    definition: "El producto de software específico sobre el cual se licencian los derechos de uso o servicio."
  },
  plantilla: {
    title: "Plantilla de Contrato",
    definition: "El modelo legal preconfigurado utilizado para redactar y rellenar automáticamente las cláusulas del contrato."
  },
  sla: {
    title: "SLA (Nivel de Servicio)",
    definition: "Acuerdo de Nivel de Servicio que define los tiempos de respuesta de soporte comprometidos, multas y disponibilidad garantizada."
  },
  frecuencia: {
    title: "Frecuencia de Facturación",
    definition: "El intervalo de tiempo periódico con el que se emitirán las facturas del cobro pactado."
  },
  monto: {
    title: "Monto",
    definition: "El valor monetario neto que se cobrará por cada ciclo de facturación de acuerdo al tipo de contrato."
  },
  fecha_inicio: {
    title: "Fecha de Inicio",
    definition: "La fecha en la que entra en vigencia el acuerdo y se inician las obligaciones contractuales."
  },
  fecha_vencimiento: {
    title: "Fecha de Vencimiento",
    definition: "La fecha en la que el contrato expira formalmente, a menos que sea un contrato de duración indefinida."
  },
  dias_gracia: {
    title: "Días de Gracia",
    definition: "Período adicional permitido después del vencimiento de la factura antes de aplicar recargos o suspensión de servicios."
  },

  // ── Clientes ───────────────────────────────────────────────────
  tipo_cliente: {
    title: "Tipo de Cliente",
    definition: "Define si el cliente es una persona natural (individuo) o una persona jurídica (empresa o sociedad)."
  },
  nombre_completo: {
    title: "Nombre Completo",
    definition: "Nombre legal del cliente tal como aparece en su documento de identidad."
  },
  run: {
    title: "RUN",
    definition: "Rol Único Nacional. Identificador tributario de personas naturales en Chile, con dígito verificador."
  },
  razon_social: {
    title: "Razón Social",
    definition: "Denominación legal con la que se inscribió la empresa ante el SII. Aparece en contratos y facturas."
  },
  rut_empresa: {
    title: "RUT Empresa",
    definition: "Rol Único Tributario de la empresa. Identificador fiscal ante el Servicio de Impuestos Internos."
  },
  giro: {
    title: "Giro",
    definition: "Actividad económica principal declarada ante el SII que describe el rubro de la empresa."
  },
  email_principal: {
    title: "Email Principal",
    definition: "Correo electrónico de contacto principal del cliente. Se usará para notificaciones y envío de documentos."
  },
  telefono_contacto: {
    title: "Teléfono",
    definition: "Número telefónico de contacto. Formato chileno: +569XXXXXXXX para celulares o +562XXXXXXXX para fijos."
  },
  categoria_plan: {
    title: "Categoría (Plan)",
    definition: "Nivel de suscripción del cliente que determina los límites de uso, soporte prioritario y funcionalidades habilitadas."
  },
  estado_suscripcion: {
    title: "Estado Suscripción",
    definition: "Situación actual de la cuenta del cliente: Activo (operativo), En Gracia (plazo de cortesía) o Suspendido (acceso restringido)."
  },
  representante_legal: {
    title: "Representante Legal",
    definition: "Persona autorizada para actuar en nombre de la empresa en actos jurídicos y firmar contratos."
  },
  contacto_cargo: {
    title: "Cargo",
    definition: "Función o puesto que ocupa el representante dentro de la organización del cliente."
  },
};

/**
 * Retrieves the definition for a given glossary key.
 * @param {string} key - The key of the term in the glossary.
 * @returns {string} The term's definition, or an empty string if not found.
 */
export function getDefinition(key) {
  return GLOSSARY[key]?.definition || "";
}
