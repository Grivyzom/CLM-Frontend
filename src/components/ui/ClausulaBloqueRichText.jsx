import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const MAX_TITULO_BLOQUE = 300;
const MAX_TEXTO_BLOQUE = 20000;

export default function ClausulaBloqueRichText({
  contenido,
  texto,
  onUpdate,
  disabled = false,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: 'Escribe el texto de la cláusula...',
      }),
    ],
    content: contenido || texto || undefined,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      const plainText = ed.getText();
      onUpdate?.({ contenido: json, texto: plainText });
    },
  });

  React.useEffect(() => {
    if (editor && contenido === null && texto) {
      // Si se restauró el texto (contenido null pero hay texto)
      const currentText = editor.getText();
      if (currentText !== texto) {
        editor.commands.setContent(texto);
      }
    }
  }, [editor, contenido, texto]);

  if (!editor) return <div className="cle-bloque-texto">Cargando editor...</div>;

  const toolbarEnabled = !disabled;
  const charCount = texto?.length || 0;
  const isWarning = charCount > MAX_TEXTO_BLOQUE * 0.8;
  const isError = charCount > MAX_TEXTO_BLOQUE;

  return (
    <div className="cle-bloque-rich-text">
      {toolbarEnabled && (
        <div className="cle-toolbar">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`cle-btn ${editor.isActive('bold') ? 'active' : ''}`}
            title="Negrita (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`cle-btn ${editor.isActive('italic') ? 'active' : ''}`}
            title="Cursiva (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <div className="cle-toolbar-sep" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
            className={`cle-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            title="Lista con viñetas"
          >
            • Lista
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
            className={`cle-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
            title="Lista numerada"
          >
            # Lista
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={`cle-editor-content ${isError ? 'error' : isWarning ? 'warning' : ''}`}
      />
      {toolbarEnabled && (
        <div 
          className={`cle-char-count ${isError ? 'error' : isWarning ? 'warning' : ''}`}
          style={{ fontSize: 10, color: isError ? 'var(--danger)' : isWarning ? 'var(--warning-deep)' : 'var(--text-muted)', textAlign: 'right', padding: '4px 8px', marginTop: '-4px' }}
        >
          {charCount}/{MAX_TEXTO_BLOQUE} caracteres
          {isError && ' ❌ LÍMITE EXCEDIDO'}
          {isWarning && !isError && ' ⚠️ Acercándose al límite'}
        </div>
      )}
    </div>
  );
}
