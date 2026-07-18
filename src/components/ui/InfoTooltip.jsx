import React, { useState, useRef, useId, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getDefinition } from '../../utils/glossary';
import './InfoTooltip.css';

/**
 * InfoTooltip — accessible, portal-rendered tooltip for help/info icons.
 *
 * @param {'help'|'info'} variant  Icon style. Default 'help'.
 * @param {React.ReactNode} content  Explicit tooltip body (overrides glossaryKey).
 * @param {string} glossaryKey  Key in utils/glossary to auto-resolve content.
 * @param {'top'|'bottom'|'left'|'right'} position  Balloon direction. Default 'top'.
 * @param {number} delay  Hover delay in ms before showing. Default 150.
 * @param {string} className  Extra class on the wrapper span.
 */
export default function InfoTooltip({
  variant = 'help',
  content,
  glossaryKey,
  position = 'top',
  delay = 150,
  className = '',
  ...props
}) {
  // Resolve content — must happen before any hooks
  const resolvedContent = content || (glossaryKey ? getDefinition(glossaryKey) : null);

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const triggerRef = useRef(null);
  const balloonRef = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const tooltipId = useId();

  // ── Position calculation ──────────────────────────────────────────────────
  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const sy = window.scrollY;
    const sx = window.scrollX;
    const cx = r.left + sx + r.width / 2;
    const cy = r.top + sy + r.height / 2;

    const map = {
      top:    { top: r.top + sy,          left: cx },
      bottom: { top: r.bottom + sy,       left: cx },
      left:   { top: cy,                  left: r.left + sx },
      right:  { top: cy,                  left: r.right + sx },
    };
    setCoords(map[position] || map.top);
  }, [position]);

  // ── Show / hide helpers ───────────────────────────────────────────────────
  const clearTimers = () => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  };

  const show = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => {
      reposition();
      setVisible(true);
    }, delay);
  }, [delay, reposition]);

  const hide = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setVisible(false), 120);
  }, []);

  // ── Reposition on scroll / resize while visible ───────────────────────────
  useEffect(() => {
    if (!visible) return;
    reposition();
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [visible, reposition]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => clearTimers(), []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { clearTimers(); setVisible(false); }
  };

  // If no content resolved, render nothing (after all hooks have been called)
  if (!resolvedContent) return null;

  const ariaLabel = props['aria-label'] || (variant === 'help' ? 'Ayuda' : 'Más información');

  return (
    <span className={`info-tooltip-wrap ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`info-tooltip-trigger ${visible ? 'is-active' : ''}`}
        aria-describedby={tooltipId}
        aria-label={ariaLabel}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={onKeyDown}
      >
        {variant === 'help' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            className="info-tooltip-svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            className="info-tooltip-svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </button>

      {createPortal(
        <div
          ref={balloonRef}
          id={tooltipId}
          role="tooltip"
          className={`info-tooltip-balloon pos-${position} ${visible ? 'is-visible' : ''}`}
          style={{ top: coords.top, left: coords.left }}
          onMouseEnter={() => clearTimers()}
          onMouseLeave={hide}
        >
          <span className="info-tooltip-text">{resolvedContent}</span>
          <span className="info-tooltip-caret" />
        </div>,
        document.body
      )}
    </span>
  );
}
