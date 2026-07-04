import React, { useState, useRef, useEffect } from 'react';
import './Pagination.css';

function PaginationEllipsis({ totalPages, setPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setInputValue('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputValue) return;

    let targetPage = parseInt(inputValue, 10);
    if (isNaN(targetPage)) return;

    // Range validation: adjust automatically to closest limit
    if (targetPage < 1) {
      targetPage = 1;
    } else if (targetPage > totalPages) {
      targetPage = totalPages;
    }

    setPage(targetPage);
    setIsOpen(false);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'Enter'];
    if (allowedKeys.includes(e.key)) {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setInputValue('');
      }
      return;
    }

    // Only allow digits (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const cleanVal = val.replace(/\D/g, '');
    setInputValue(cleanVal);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={buttonRef}>
      <button
        type="button"
        className="ui-page-btn ellipsis trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ir a página..."
      >
        …
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="ui-pagination-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ui-popover-arrow"></div>
          <div className="ui-popover-content">
            <span className="ui-popover-help">Ir a la página (1 - {totalPages})</span>
            <div className="ui-popover-form">
              <input
                type="number"
                autoFocus
                min={1}
                max={totalPages}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="ui-popover-input"
                placeholder="Nº"
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="ui-popover-submit-btn"
                disabled={!inputValue}
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Pagination({ page, totalPages, totalCount, pageSize, setPage, itemName = 'items' }) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalCount);

  // Generar números de página
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div className="ui-pagination">
      <span className="ui-pagination-info">
        Mostrando <b>{from}–{to}</b> de <b>{totalCount}</b> {itemName}
      </span>
      <div className="ui-pagination-btns">
        <button
          className="ui-page-btn"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Página anterior"
        >‹</button>
        {pages.map((p, i) => {
          if (p === '…') {
            return (
              <PaginationEllipsis
                key={`ellipsis-${i}`}
                totalPages={totalPages}
                setPage={setPage}
              />
            );
          }
          return (
            <button
              key={i}
              className={`ui-page-btn ${p === page ? 'active' : ''}`}
              onClick={() => setPage(p)}
              aria-current={p === page ? 'page' : undefined}
            >{p}</button>
          );
        })}
        <button
          className="ui-page-btn"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >›</button>
      </div>
    </div>
  );
}
