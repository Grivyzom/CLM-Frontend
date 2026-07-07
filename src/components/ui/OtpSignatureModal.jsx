import React, { useState, useEffect, useRef } from 'react';

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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [onClose]);

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

  // --- Visuals: Styling Tokens ---
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1500,
    background: 'rgba(10, 10, 10, 0.55)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  };

  const modalStyle = {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: 460,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e5e2da',
    animation: 'modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const headerStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e2da',
    background: '#efede8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const bodyStyle = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  };

  const footerStyle = {
    padding: '16px 24px',
    borderTop: '1px solid #e5e2da',
    background: '#fafaf9',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Inline styles for custom animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />

      <div style={overlayStyle} onClick={success ? undefined : onClose}>
        <div 
          ref={containerRef}
          style={modalStyle} 
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={headerStyle}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#3b3631', letterSpacing: '-0.01em' }}>
                Firma de Documento
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#7c7670' }}>
                Verificación de Identidad Electrónica
              </p>
            </div>
            {!success && !isSigning && !isGenerating && (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c7670',
                  fontSize: 18,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e5e2da'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Cerrar modal"
              >
                ×
              </button>
            )}
          </div>

          {/* Body */}
          {success ? (
            <div style={{ ...bodyStyle, padding: '36px 24px', alignItems: 'center', textAlign: 'center', gap: 16 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                marginBottom: 4,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#15803d' }}>
                  Documento Firmado Correctamente
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#7c7670', lineHeight: 1.5 }}>
                  La firma digital se ha registrado exitosamente en el historial de auditoría inmutable del contrato.
                </p>
              </div>
              <div style={{
                width: '100%',
                background: '#fafaf9',
                border: '1px solid #e5e2da',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 12,
                color: '#3b3631',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#7c7670' }}>Documento:</span>
                  <span style={{ fontWeight: 600 }}>{contractName}</span>
                </div>
                {contractId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#7c7670' }}>ID Contrato:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{contractId}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#7c7670' }}>Método:</span>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>Firma OTP autorizada</span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '10px 16px',
                  borderRadius: 6,
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Entendido
              </button>
            </div>
          ) : isGenerating ? (
            /* Generating/Sending Loader Step */
            <div style={{ ...bodyStyle, padding: '48px 24px', alignItems: 'center', textAlign: 'center', gap: 16 }}>
              <div style={{
                width: 36,
                height: 36,
                border: '3px solid #e5e2da',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#3b3631', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  Generando firma y enviando código...
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7c7670' }}>
                  Preparando el entorno seguro de firma digital
                </p>
              </div>
            </div>
          ) : (
            /* OTP Entry Form Step */
            <form onSubmit={handleSubmit}>
              <div style={bodyStyle}>
                {/* Warning / Explanation Banner */}
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: '#92400e',
                  lineHeight: 1.45,
                  display: 'flex',
                  gap: 10,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong style={{ display: 'block', marginBottom: 2 }}>Fricción de Seguridad Requerida</strong>
                    Estás firmando el documento <strong style={{ color: '#78350f' }}>{contractName}</strong>. Esta acción tiene validez jurídica. Confirma tu intención ingresando el código OTP enviado.
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#3b3631' }}>
                    Hemos enviado un código temporal de {otpLength} dígitos a:
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                    {recipientPhone} y {recipientEmail}
                  </p>
                </div>

                {/* Input Fields Row */}
                <div 
                  style={{ 
                    display: 'flex', 
                    gap: 8, 
                    justifyContent: 'center', 
                    margin: '10px 0',
                  }}
                  onPaste={handlePaste}
                >
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
                      onChange={(e) => handleInputChange(e.target.value, i)}
                      onKeyDown={(e) => handleInputKeyDown(e, i)}
                      style={{
                        width: 44,
                        height: 52,
                        textAlign: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        border: digit !== '' ? '2px solid #2563eb' : '1px solid #d8d4cc',
                        borderRadius: 6,
                        color: '#3b3631',
                        backgroundColor: timeLeft === 0 ? '#f4f3ef' : '#ffffff',
                        outline: 'none',
                        boxShadow: digit !== '' ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = digit !== '' ? '#2563eb' : '#d8d4cc';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  ))}
                </div>

                {/* Error message */}
                {error && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#dc2626',
                    fontSize: 12,
                    textAlign: 'center',
                    fontWeight: 600,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Countdown & Resend Option */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  borderTop: '1px solid #e5e2da',
                  paddingTop: 14,
                  marginTop: 6,
                }}>
                  {/* Countdown Timer */}
                  <span style={{ 
                    color: timeLeft < 60 ? '#dc2626' : '#7c7670', 
                    fontWeight: timeLeft < 60 ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
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
                    disabled={resendCooldown > 0 || isSigning}
                    onClick={handleResend}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: resendCooldown > 0 ? '#b0aaa3' : '#2563eb',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      border: 'none',
                      background: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (resendCooldown === 0) e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {resendCooldown > 0
                      ? `Reenviar código (${resendCooldown}s)`
                      : 'Reenviar código'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div style={footerStyle}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSigning}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #d8d4cc',
                    background: '#efede8',
                    color: '#3b3631',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isSigning ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => !isSigning && (e.currentTarget.style.background = '#e5e2da')}
                  onMouseLeave={e => !isSigning && (e.currentTarget.style.background = '#efede8')}
                >
                  Cancelar
                </button>
                <button
                  ref={confirmButtonRef}
                  type="submit"
                  disabled={!isOtpComplete || isSigning || timeLeft === 0}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSigning
                      ? '#93c5fd'
                      : !isOtpComplete || timeLeft === 0
                      ? '#d8d4cc'
                      : '#2563eb',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: (!isOtpComplete || isSigning || timeLeft === 0) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, box-shadow 0.15s',
                    boxShadow: (isOtpComplete && !isSigning && timeLeft > 0) ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (isOtpComplete && !isSigning && timeLeft > 0) {
                      e.currentTarget.style.background = '#1d4ed8';
                    }
                  }}
                  onMouseLeave={e => {
                    if (isOtpComplete && !isSigning && timeLeft > 0) {
                      e.currentTarget.style.background = '#2563eb';
                    }
                  }}
                >
                  {isSigning ? 'Verificando...' : 'Firmar Contrato ✓'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
