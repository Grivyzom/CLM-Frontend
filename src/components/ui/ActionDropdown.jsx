import React, { useState, useEffect, useRef } from 'react';

export default function ActionDropdown({ anchorRef, items, onClose }) {
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const margin = 4;
    const top = anchorRect.bottom + margin;
    const left = anchorRect.left;

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let adjLeft = left;
      if (adjLeft + rect.width + margin > viewportWidth) {
        adjLeft = Math.max(margin, anchorRect.right - rect.width);
      }
      setPos({ top, left: adjLeft });
    });

    setPos({ top, left });
  }, [anchorRef]);

  return (
    <div
      ref={dropdownRef}
      className="cl-action-dropdown"
      role="menu"
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className="cl-action-dropdown-item"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => { item.onClick(); onClose(); }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
