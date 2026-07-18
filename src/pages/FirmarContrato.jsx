import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFirmaTokenInfo, apiFirmaTokenConfirmar } from '../api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../styles/Login.css';

function todayLabel() {
  const s = new Intl.DateTimeFormat('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date()).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function FirmarContrato() {
  const { token } = useParams();

  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    let cancelado = false;
    apiFirmaTokenInfo(token)
      .then((data) => { if (!cancelado) setInfo(data); })
      .catch((err) => { if (!cancelado) setError(err.message || 'El enlace de firma es inválido o ya expiró.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [token]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.login-header > div > *',
      { y: -10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, clearProps: 'transform,opacity' })
      .fromTo('.login-header-date',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, clearProps: 'opacity' }, '<0.1')
      .fromTo('.login-card',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, clearProps: 'transform,opacity' }, '-=0.25')
      .fromTo('.login-card-icon, .login-card-badge, .login-card h2, .login-subtitle, .login-form > *',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.045, clearProps: 'all' }, '-=0.35')
      .fromTo('.login-footer',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, clearProps: 'opacity' }, '-=0.2');
  }, { scope: containerRef, dependencies: [loading] });

  const handleConfirmar = async () => {
    setError('');
    setConfirming(true);
    try {
      const blob = await apiFirmaTokenConfirmar(token);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message || 'No se pudo confirmar la firma.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="login-container" ref={containerRef}>
      <div className="login-header">
        <div>
          <p className="login-header-label">Enfoque Platform</p>
          <h1 className="login-header-title">Firma Electrónica</h1>
        </div>
        <span className="login-header-date">{todayLabel()}</span>
      </div>

      <div className="login-body">
        <svg
          className="login-bg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="fc-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeOpacity="0.045" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1440" height="900" fill="url(#fc-grid)" />
          <path className="lg-bg-draw" d="M -40 700 C 240 640, 420 760, 720 680 S 1220 560, 1490 640" fill="none" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="2" strokeDasharray="900" />
          <path className="lg-bg-dash" d="M -40 770 C 300 710, 520 810, 840 740 S 1260 650, 1490 710" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle className="lg-bg-pulse" cx="240" cy="140" r="3.5" fill="var(--primary)" fillOpacity="0.35" />
          <circle className="lg-bg-pulse d2" cx="1180" cy="180" r="3" fill="var(--success)" fillOpacity="0.4" />
          <circle className="lg-bg-pulse d3" cx="1330" cy="420" r="2.5" fill="var(--warning)" fillOpacity="0.35" />
        </svg>

        <div className="login-card">
          <div className="login-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </div>

          <div className="login-card-badge">
            <span className="login-ctx-dot" />
            Firma Electrónica
          </div>

          {loading ? (
            <>
              <h2>Verificando enlace…</h2>
              <p className="login-subtitle">Un momento, estamos validando tu enlace de firma.</p>
            </>
          ) : pdfUrl ? (
            <>
              <h2>Firma confirmada</h2>
              <p className="login-subtitle">
                Tu firma electrónica quedó registrada junto con el certificado de validación. Puedes descargar tu copia del documento firmado.
              </p>
              <a className="login-back-link" href={pdfUrl} download="documento_firmado.pdf" style={{ display: 'inline-block', marginBottom: 8 }}>
                ⬇ Descargar mi copia
              </a>
            </>
          ) : error ? (
            <>
              <h2>No se pudo continuar</h2>
              <p className="login-subtitle">{error}</p>
            </>
          ) : (
            <>
              <h2>Confirmar firma</h2>
              <p className="login-subtitle">
                {info?.cliente_nombre ? `${info.cliente_nombre}, se` : 'Se'} solicita tu firma electrónica para el contrato
                {info?.contrato_nombre ? ` "${info.contrato_nombre}"` : ''} con Grivyzom. Al confirmar, quedará registrada tu identidad
                (correo, fecha y dirección IP) en un certificado anexado al documento, conforme a la Ley 19.799.
              </p>

              <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleConfirmar(); }}>
                <button type="submit" disabled={confirming}>
                  {confirming ? <span className="spinner"></span> : 'Confirmar firma'}
                </button>
              </form>
            </>
          )}

          <Link to="/inicio" className="login-back-link">← Ir a Grivyzom</Link>
        </div>

        <p className="login-footer">
          <span className="login-footer-dot" />
          CLM‑Kyo · v1.0.4 · © 2026
        </p>
      </div>
    </div>
  );
}
