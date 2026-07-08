import React, { useState, useEffect, useRef } from 'react';
import './OtpSignatureModal.css';

/**
 * OtpSignatureModal Component
 *
 * A high-friction confirmation modal for signing legal documents with OTP verification.
 * Follows strict UX guidelines: positive friction, focus trapping, immediate loading feedback,
 * smart multi-input autofocus/backspace/paste handlers, countdown manager, and resend cooldown.
 */
export default function OtpSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  contractName = 'Contrato de Servicios',
  contractId = '',
  recipientPhone = '+56 9 •••• 5678',
  recipientEmail = 'j•••@empresa.com',
  otpLength = 6,
  expirationMinutes = 5,
  resendCooldownSeconds = 30,
  simulateLoadingTime = 1800, // Time in ms to show initial "Generando firma..." state
}) {
  // --- States ---
  const [isGenerating, setIsGenerating] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otp, setOtp] = useState(Array(otpLength).fill(''));
  const [timeLeft, setTimeLeft] = useState(expirationMinutes * 60);
  const [resendCooldown, setResendCooldown] = useState(resendCooldownSeconds);
  const [error, setError] = useState('');

  // --- Refs ---
  const inputRefs = useRef([]);
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const resendRef = useRef(null);

  // --- Initial Generation Loading Simulation ---
  useEffect(() => {
    if (isOpen) {
      setIsGenerating(true);
      setSuccess(false);
      setOtp(Array(otpLength).fill(''));
      setTimeLeft(expirationMinutes * 60);
      setResendCooldown(resendCooldownSeconds);
      setError('');

      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, simulateLoadingTime);

      return () => clearTimeout(timer);
    }
  }, [isOpen, simulateLoadingTime, otpLength, expirationMinutes, resendCooldownSeconds]);

  // --- Expiration & Resend Cooldown Timers ---
  useEffect(() => {
    if (isGenerating || isSigning || success) return;

    const interval = setInterval(() => {
      // Countdown Timer
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setError('El código OTP ha expirado. Por favor, solicita uno nuevo.');
          return 0;
        }
        return prev - 1;
      });

      // Resend Cooldown
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, isSigning, success]);

  // --- Autofocus to the First Field on Load ---
  useEffect(() => {
    if (!isGenerating && inputRefs.current[0]) {
      // Give a tiny render frame buffer
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [isGenerating]);

  // --- Keyboard & Focus Management (Focus Trap) ---
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // No cerrar mientras se está firmando (evita estados a medias)
        if (!isSigning) onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!containerRef.current) return;
        const focusableElements = containerRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), a:not([disabled])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSigning, onClose]);

  // --- Format Seconds into MM:SS ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Handle Digit Input Changes ---
  const handleInputChange = (value, index) => {
    // Only accept numeric inputs
    if (value !== '' && !/^[0-9]$/.test(value)) return;

    setError('');
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next field
    if (value !== '' && index < otpLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // --- Handle Key Press Navigation (Backspace, Arrows) ---
  const handleInputKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        // Clear previous and focus previous
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Just clear current
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
      setError('');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < otpLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // --- Handle OTP Pasting ---
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');

    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < otpLength; i++) {
        if (pastedData[i]) {
          newOtp[i] = pastedData[i];
        }
      }
      setOtp(newOtp);
      setError('');

      // Focus the last input filled or the last one in the series
      const targetIndex = Math.min(pastedData.length, otpLength - 1);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  // --- Handle Resending OTP ---
  const handleResend = () => {
    if (resendCooldown > 0 || isSigning) return;

    // Reset OTP fields
    setOtp(Array(otpLength).fill(''));
    setError('');

    // Simulate generation loading state again for sending
    setIsGenerating(true);
    setResendCooldown(resendCooldownSeconds);
    setTimeLeft(expirationMinutes * 60);

    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  // --- Handle Confirmation ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeLeft === 0) {
      setError('El código ha expirado. Por favor, solicita uno nuevo.');
      return;
    }

    const codeString = otp.join('');
    if (codeString.length < otpLength) {
      setError('Por favor, completa todos los dígitos del código de verificación.');
      return;
    }

    setIsSigning(true);
    setError('');

    try {
      // Execute parent signing function
      await onConfirm(codeString);
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'Código OTP incorrecto. Por favor, verifica e intenta de nuevo.');
      // Keep inputs but focus the first one for correction
      inputRefs.current[0]?.focus();
    } finally {
      setIsSigning(false);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  if (!isOpen) return null;

  return (
    <div className="otp-overlay" onClick={(success || isSigning) ? undefined : onClose}>
      <div
        ref={containerRef}
        className="otp-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Firma de documento con código OTP"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="otp-header">
          <div>
            <h3 className="otp-title">Firma de Documento</h3>
            <p className="otp-subtitle">Verificación de Identidad Electrónica</p>
          </div>
          {!success && !isSigning && !isGenerating && (
            <button
              ref={closeButtonRef}
              className="otp-close"
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        {success ? (
          <div className="otp-body otp-body--center">
            <div className="otp-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h4 className="otp-success-title">Documento Firmado Correctamente</h4>
              <p className="otp-success-text">
                La firma digital se ha registrado exitosamente en el historial de auditoría inmutable del contrato.
              </p>
            </div>
            <div className="otp-receipt">
              <div className="otp-receipt-row">
                <span className="otp-receipt-label">Documento:</span>
                <span className="otp-receipt-value" title={contractName}>{contractName}</span>
              </div>
              {contractId && (
                <div className="otp-receipt-row">
                  <span className="otp-receipt-label">ID Contrato:</span>
                  <span className="otp-receipt-value mono">#{contractId}</span>
                </div>
              )}
              <div className="otp-receipt-row">
                <span className="otp-receipt-label">Método:</span>
                <span className="otp-receipt-value accent">Firma OTP autorizada</span>
              </div>
            </div>
            <button className="otp-btn-block" onClick={onClose}>
              Entendido
            </button>
          </div>
        ) : isGenerating ? (
          /* Generating/Sending Loader Step */
          <div className="otp-body otp-body--center otp-body--loading">
            <div className="otp-spinner" aria-hidden="true" />
            <div>
              <p className="otp-loading-title">Generando firma y enviando código...</p>
              <p className="otp-loading-sub">Preparando el entorno seguro de firma digital</p>
            </div>
          </div>
        ) : (
          /* OTP Entry Form Step */
          <form onSubmit={handleSubmit}>
            <div className="otp-body">
              {/* Warning / Explanation Banner */}
              <div className="otp-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <strong className="otp-banner-title">Fricción de Seguridad Requerida</strong>
                  Estás firmando el documento <strong className="otp-banner-name">{contractName}</strong>. Esta acción tiene validez jurídica. Confirma tu intención ingresando el código OTP enviado.
                </div>
              </div>

              {/* Instructions */}
              <div className="otp-instructions">
                <p className="otp-inst">
                  Hemos enviado un código temporal de {otpLength} dígitos a:
                </p>
                <p className="otp-inst-target">
                  {recipientPhone} y {recipientEmail}
                </p>
              </div>

              {/* Input Fields Row */}
              <div className="otp-inputs" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={digit}
                    disabled={timeLeft === 0 || isSigning}
                    aria-label={`Dígito ${i + 1} de ${otpLength}`}
                    className={`otp-digit${digit !== '' ? ' filled' : ''}`}
                    onChange={(e) => handleInputChange(e.target.value, i)}
                    onKeyDown={(e) => handleInputKeyDown(e, i)}
                  />
                ))}
              </div>

              {/* Error message */}
              {error && (
                <div className="otp-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Countdown & Resend Option */}
              <div className="otp-meta">
                {/* Countdown Timer */}
                <span className={`otp-countdown${timeLeft < 60 ? ' warn' : ''}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Expira en {formatTime(timeLeft)}
                </span>

                {/* Resend Cooldown Button */}
                <button
                  ref={resendRef}
                  type="button"
                  className="otp-resend"
                  disabled={resendCooldown > 0 || isSigning}
                  onClick={handleResend}
                >
                  {resendCooldown > 0
                    ? `Reenviar código (${resendCooldown}s)`
                    : 'Reenviar código'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="otp-footer">
              <button
                type="button"
                className="otp-btn otp-btn-cancel"
                onClick={onClose}
                disabled={isSigning}
              >
                Cancelar
              </button>
              <button
                ref={confirmButtonRef}
                type="submit"
                className={`otp-btn otp-btn-sign${isSigning ? ' signing' : ''}`}
                disabled={!isOtpComplete || isSigning || timeLeft === 0}
              >
                {isSigning ? 'Verificando...' : (
                  <>
                    Firmar Contrato
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
