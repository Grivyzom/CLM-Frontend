import React from 'react';

const HeaderChevron = ({ ordering, field }) => {
  const isAsc = ordering === field;
  const isDesc = ordering === `-${field}`;

  if (isAsc) {
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
        <path d="M8 9l4-4 4 4" />
      </svg>
    );
  }
  if (isDesc) {
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
        <path d="M16 15l-4 4-4-4" />
      </svg>
    );
  }
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#b0aaa3" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M8 9l4-4 4 4" />
      <path d="M16 15l-4 4-4-4" />
    </svg>
  );
};

/**
 * Reusable sortable table header component.
 * Toggles through: Neutral -> Ascending -> Descending -> Neutral.
 */
export default function SortableHeader({ label, field, ordering, onSort, className = '' }) {
  const handleSort = (e) => {
    e?.stopPropagation();
    let nextOrdering = '';
    if (ordering === field) {
      nextOrdering = `-${field}`;
    } else if (ordering === `-${field}`) {
      nextOrdering = '';
    } else {
      nextOrdering = field;
    }
    onSort(nextOrdering);
  };

  return (
    <span 
      className={`${className} sortable`} 
      onClick={handleSort}
      style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      {label}
      <HeaderChevron ordering={ordering} field={field} />
    </span>
  );
}
