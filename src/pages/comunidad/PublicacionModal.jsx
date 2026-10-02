import React, { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { X, Upload } from 'lucide-react';
import { createPublicacionComunidad, updatePublicacionComunidad } from '../../api';

const TIPO_LABELS = {
  GUIA: 'Guía',
  VIDEO: 'Video',
  ARCHIVO: 'Archivo descargable',
  ESPACIO: 'Espacio',
};

const COLORES = [
  { value: 'var(--primary)', label: 'Azul' },
  { value: 'var(--danger)', label: 'Rojo' },
  { value: 'var(--warning-bright)', label: 'Ámbar' },
  { value: 'var(--success)', label: 'Verde' },
  { value: 'var(--violet-bright)', label: 'Violeta' },
  { value: 'var(--cyan)', label: 'Cian' },
];

export default function PublicacionModal({ tipo, publicacion, onClose, onCreated, onUpdated }) {
  const isEdit = !!publicacion;
  const [titulo, setTitulo] = useState(publicacion?.titulo || '');
  const [descripcion, setDescripcion] = useState(publicacion?.descripcion || '');
  const [publicado, setPublicado] = useState(publicacion ? publicacion.publicado : true);
  const [videoModo, setVideoModo] = useState(publicacion?.archivo_video ? 'archivo' : 'link');
  const [urlExterna, setUrlExterna] = useState(publicacion?.url_externa || '');
  const [archivoVideo, setArchivoVideo] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [color, setColor] = useState(publicacion?.color || COLORES[0].value);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const archivoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escribe el contenido de la guía...' }),
    ],
    content: publicacion?.contenido_html || '',
  });

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      setError('El título es requerido.');
      return;
    }
    if (tipo === 'GUIA' && !isEdit && !editor?.getText().trim()) {
      setError('El contenido de la guía no puede estar vacío.');
      return;
    }
    if (tipo === 'VIDEO' && !isEdit) {
      if (videoModo === 'link' && !urlExterna.trim()) {
        setError('Indica la URL del video.');
        return;
      }
      if (videoModo === 'archivo' && !archivoVideo) {
        setError('Selecciona un archivo de video.');
        return;
      }
    }
    if (tipo === 'ARCHIVO' && !isEdit && !archivo) {
      setError('Selecciona un archivo.');
      return;
    }

    setError(null);
    setSaving(true);

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('titulo', titulo.trim());
    formData.append('descripcion', descripcion.trim());
    formData.append('publicado', publicado ? 'true' : 'false');

    if (tipo === 'GUIA') {
      formData.append('contenido_html', editor?.getHTML() || '');
    }
    if (tipo === 'VIDEO') {
      if (videoModo === 'link') {
        formData.append('url_externa', urlExterna.trim());
      } else if (archivoVideo) {
        formData.append('archivo_video', archivoVideo);
      }
    }
    if (tipo === 'ARCHIVO' && archivo) {
      formData.append('archivo', archivo);
    }
    if (tipo === 'ESPACIO') {
      formData.append('color', color);
    }

    try {
      if (isEdit) {
        const actualizada = await updatePublicacionComunidad(publicacion.id, formData);
        onUpdated(actualizada);
      } else {
        const creada = await createPublicacionComunidad(formData);
        onCreated(creada);
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar la publicación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        onClick={!saving ? onClose : undefined}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 40 }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)', zIndex: 50,
          width: '92%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEdit ? 'Editar' : 'Nueva'} {TIPO_LABELS[tipo]?.toLowerCase()}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--bg-topbar)',
              borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Título
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-faint)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 16,
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            placeholder="Título de la publicación"
          />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Descripción {tipo === 'GUIA' ? '(resumen corto)' : ''}
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-faint)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 16,
              fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
            }}
            placeholder="Breve descripción"
          />

          {tipo === 'GUIA' && (
            <>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Contenido
              </label>
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, marginBottom: 16, background: 'var(--bg-faint)' }}>
                <div style={{ display: 'flex', gap: 4, padding: 6, borderBottom: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}
                    style={{ padding: '4px 8px', border: 'none', background: editor?.isActive('bold') ? 'var(--bg-hover)' : 'none', borderRadius: 4, cursor: 'pointer' }}>
                    <strong>B</strong>
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}
                    style={{ padding: '4px 8px', border: 'none', background: editor?.isActive('italic') ? 'var(--bg-hover)' : 'none', borderRadius: 4, cursor: 'pointer' }}>
                    <em>I</em>
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    style={{ padding: '4px 8px', border: 'none', background: editor?.isActive('bulletList') ? 'var(--bg-hover)' : 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    • Lista
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    style={{ padding: '4px 8px', border: 'none', background: editor?.isActive('heading', { level: 2 }) ? 'var(--bg-hover)' : 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    H2
                  </button>
                </div>
                <EditorContent editor={editor} style={{ padding: '10px 12px', fontSize: 13, minHeight: 160, maxHeight: 300, overflowY: 'auto' }} />
              </div>
            </>
          )}

          {tipo === 'VIDEO' && (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" checked={videoModo === 'link'} onChange={() => setVideoModo('link')} /> Link externo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" checked={videoModo === 'archivo'} onChange={() => setVideoModo('archivo')} /> Subir archivo
                </label>
              </div>
              {videoModo === 'link' ? (
                <input
                  type="text"
                  value={urlExterna}
                  onChange={(e) => setUrlExterna(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg-faint)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 16,
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <button type="button" className="cm-btn-secondary" onClick={() => videoInputRef.current?.click()}>
                    <Upload size={14} /> {archivoVideo ? archivoVideo.name : 'Elegir video (.mp4, .webm)'}
                  </button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.webm"
                    style={{ display: 'none' }}
                    onChange={(e) => setArchivoVideo(e.target.files?.[0] || null)}
                  />
                </div>
              )}
            </>
          )}

          {tipo === 'ARCHIVO' && (
            <div style={{ marginBottom: 16 }}>
              <button type="button" className="cm-btn-secondary" onClick={() => archivoInputRef.current?.click()}>
                <Upload size={14} /> {archivo ? archivo.name : 'Elegir archivo'}
              </button>
              <input
                ref={archivoInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
            </div>
          )}

          {tipo === 'ESPACIO' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.value)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c.value,
                      border: color === c.value ? '2px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
            Publicado (visible para todos los usuarios)
          </label>

          {error && (
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 6,
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              fontSize: 12, color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'var(--bg-topbar)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '8px 16px', borderRadius: 5, border: 'none',
              background: 'var(--primary)', color: 'var(--text-on-accent)', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Publicar'}
          </button>
        </div>
      </div>
    </>
  );
}
