import React, { useState, useRef } from 'react';
import { importClientesExcel } from '../api';

function Svg({ paths = [], circles = [], size = 14, color = 'var(--text-muted)', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
      {circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
    </svg>
  );
}

const VALID_EXTENSIONS = ['.xls', '.xlsx'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidExcelFile(file) {
  const name = file.name.toLowerCase();
  return VALID_EXTENSIONS.some(ext => name.endsWith(ext));
}

export default function ImportClientsModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChosen = (chosenFile) => {
    if (!chosenFile) return;
    if (!isValidExcelFile(chosenFile)) {
      setError('Formato no soportado. Solo se aceptan archivos .xls o .xlsx');
      setFile(null);
      return;
    }
    setError(null);
    setFile(chosenFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    handleFileChosen(dropped);
  };

  const handleInputChange = (e) => {
    handleFileChosen(e.target.files?.[0]);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const resultado = await importClientesExcel(file);
      onSuccess(resultado);
    } catch (err) {
      setError(err.message || 'Error al importar el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={!uploading ? onClose : undefined}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', zIndex: 40,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)', zIndex: 50,
          width: '90%', maxWidth: 460, animation: 'modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Importar clientes</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Desde archivo Excel (.xls, .xlsx)</p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--bg-topbar)',
              borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: uploading ? 0.6 : 1, transition: 'background 0.12s',
            }}
            onMouseEnter={e => !uploading && (e.currentTarget.style.background = 'var(--danger-tint)')}
            onMouseLeave={e => !uploading && (e.currentTarget.style.background = 'var(--bg-topbar)')}
          >
            <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-faint)" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {!file ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '36px 20px',
                textAlign: 'center',
                background: dragOver ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-faint)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{
                width: 44, height: 44, margin: '0 auto 12px', borderRadius: '50%',
                background: 'var(--bg-topbar)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Svg paths={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} color="var(--text-muted)" size={20} />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Arrastra tu archivo Excel aquí
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--text-faint)' }}>o</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="cl-btn"
                style={{ margin: '0 auto' }}
              >
                Buscar en el equipo
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-faint)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 6, background: 'var(--success-tint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Svg paths={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--success-deep)" size={17} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(file.size)}</p>
              </div>
              {!uploading && (
                <button
                  onClick={handleRemoveFile}
                  aria-label="Quitar archivo"
                  style={{
                    width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Svg paths={['M18 6 6 18', 'M6 6l12 12']} color="var(--text-faint)" size={13} />
                </button>
              )}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 6,
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              fontSize: 12, color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--bg-topbar)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '8px 16px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!file || uploading}
            style={{
              padding: '8px 16px', borderRadius: 5, border: 'none',
              background: 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: (!file || uploading) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: (!file || uploading) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {uploading && <span className="cl-spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'var(--surface)' }} />}
            {uploading ? 'Importando...' : 'Confirmar importación'}
          </button>
        </div>
      </div>
    </>
  );
}
