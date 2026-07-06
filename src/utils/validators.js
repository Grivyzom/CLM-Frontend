/**
 * Valida un RUT/RUN chileno usando el algoritmo Módulo 11.
 * @param {string} rutCompleto - Ej: "12.345.678-9" o "123456789"
 * @returns {boolean} - true si es válido, false en caso contrario
 */
export const validarRut = (rutCompleto) => {
  if (typeof rutCompleto !== 'string') return false;

  const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, '').toUpperCase();

  if (rutLimpio.length < 2) return false;

  const cuerpo = rutLimpio.slice(0, -1);
  const dvIngresado = rutLimpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador < 7 ? multiplicador + 1 : 2;
  }

  const dvCalculado = 11 - (suma % 11);

  let dvEsperado = dvCalculado.toString();
  if (dvCalculado === 11) dvEsperado = '0';
  if (dvCalculado === 10) dvEsperado = 'K';

  return dvIngresado === dvEsperado;
};

/**
 * Valida el formato de un correo.
 * @param {string} correo - Correo ingresado por el usuario
 * @returns {boolean}
 */
export const validarEmail = (correo) => {
  if (typeof correo !== 'string') return false;

  const correoLimpio = correo.trim().toLowerCase();
  const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  return regexCorreo.test(correoLimpio);
};

/**
 * Valida el formato de un correo y verifica que su dominio esté permitido.
 * @param {string} correo - Correo ingresado por el usuario
 * @param {Array} dominiosPermitidos - Array con los dominios permitidos (ej: ["empresa.cl"])
 * @returns {boolean}
 */
export const validarDominioCorreo = (correo, dominiosPermitidos) => {
  if (typeof correo !== 'string' || !Array.isArray(dominiosPermitidos)) return false;

  const correoLimpio = correo.trim().toLowerCase();
  const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!regexCorreo.test(correoLimpio)) return false;

  const dominioIngresado = correoLimpio.split('@')[1];
  const dominiosMinusculas = dominiosPermitidos.map(d => d.toLowerCase());

  return dominiosMinusculas.includes(dominioIngresado);
};

/**
 * Valida que RUN/RUT no supere el máximo permitido (99.999.999).
 * @param {string} rut - RUT/RUN sin procesar
 * @returns {boolean}
 */
export const validarMaximoRut = (rut) => {
  if (typeof rut !== 'string') return false;
  const clean = rut.replace(/[^0-9kK]/g, '');
  const cuerpo = clean.slice(0, -1);
  return cuerpo.length <= 8 && parseInt(cuerpo || '0', 10) <= 99999999;
};

/**
 * Valida teléfono chileno con validación de largo.
 * Soporta números móviles y fijos, con o sin código de país (+56).
 * Rechaza si intenta más dígitos de lo permitido.
 * @param {string} telefono
 * @returns {object} { valido: boolean, razon?: string }
 */
export const validarTelefonoChile = (telefono) => {
  if (typeof telefono !== 'string') return { valido: false };

  const telefonoLimpio = telefono.trim();
  if (!telefonoLimpio) return { valido: false };

  const soloNumeros = telefonoLimpio.replace(/\D/g, '');

  if (soloNumeros.startsWith('56')) {
    if (soloNumeros.length > 11) {
      return { valido: false, razon: 'Teléfono supera máximo permitido (11 dígitos)' };
    }
    return { valido: soloNumeros.length === 11 };
  }

  if (soloNumeros.length > 9) {
    return { valido: false, razon: 'Teléfono supera máximo permitido (9 dígitos)' };
  }

  return { valido: soloNumeros.length === 9 };
};

/**
 * Valida email rechazando dominios con símbolos raros.
 * Dominio permitido: letras, números, puntos y guiones (ej: empresa1.cl, empresa-legal.com, 3m.com).
 * @param {string} correo
 * @returns {object} { valido: boolean, razon?: string }
 */
export const validarEmailDominioLimpio = (correo) => {
  if (typeof correo !== 'string') return { valido: false };

  const correoLimpio = correo.trim().toLowerCase();
  const regexBasico = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!regexBasico.test(correoLimpio)) {
    return { valido: false, razon: 'Formato de email inválido' };
  }

  const [, dominio] = correoLimpio.split('@');
  const regexDominio = /^[a-z0-9.-]+$/;

  if (!regexDominio.test(dominio)) {
    return { valido: false, razon: 'Dominio contiene símbolos no permitidos' };
  }

  return { valido: true };
};

