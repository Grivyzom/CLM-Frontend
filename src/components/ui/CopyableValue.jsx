import React, { useState } from 'react';
import Svg from './Svg';

export default function CopyableValue({ value, children }) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;
    const textToCopy = String(value);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error('Fallback copy failed', error);
        } finally {
          textArea.remove();
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };
  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', minHeight: 22 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        transition: 'transform 0.2s ease',
        transform: (isHovered || copied) ? 'translateX(-28px)' : 'translateX(0)',
        display: 'flex',
        alignItems: 'center'
      }}>
        {children || <span>{value}</span>}
      </div>
      <button
        title="Copiar"
        onClick={handleCopy}
        style={{
          position: 'absolute', right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22,
          borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent',
          opacity: (isHovered || copied) ? 1 : 0,
          pointerEvents: (isHovered || copied) ? 'auto' : 'none',
          transition: 'opacity 0.2s ease, background 0.2s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-topbar)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        aria-label="Copiar"
      >
        {copied ? (
          <Svg paths={['M20 6L9 17l-5-5']} color="var(--success-deep)" size={12} />
        ) : (
          <Svg paths={['M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.242a2 2 0 0 0-.602-1.43L16.083 2.57A2 2 0 0 0 14.685 2H10a2 2 0 0 0-2 2z', 'M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2']} color="var(--text-faint)" size={12} />
        )}
      </button>
    </div>
  );
}
