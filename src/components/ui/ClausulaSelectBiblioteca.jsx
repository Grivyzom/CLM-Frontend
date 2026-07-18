import React, { useState, useMemo } from 'react';

export default function ClausulaSelectBiblioteca({
  bibliotecaClausulas = [],
  onInsertar,
  disabled = false,
}) {
  const [selectedId, setSelectedId] = useState('');

  const handleChange = (e) => {
    const id = e.target.value;
    if (id) {
      const partes = id.split('|'); // "clausula_id|version_id"
      onInsertar?.(parseInt(partes[0]), parseInt(partes[1]));
      setSelectedId('');
      e.target.value = '';
    }
  };

  const options = useMemo(() => {
    const opts = [];
    for (const clausula of bibliotecaClausulas) {
      if (!clausula.versiones) continue;
      for (const version of clausula.versiones) {
        opts.push({
          label: `${clausula.nombre} (${version.etiqueta || version.tipo})`,
          value: `${clausula.id}|${version.id}`,
          risk: clausula.risk,
        });
      }
    }
    return opts;
  }, [bibliotecaClausulas]);

  return (
    <select
      value={selectedId}
      onChange={handleChange}
      disabled={disabled}
      className="cle-lib-select"
    >
      <option value="">+ Insertar cláusula de biblioteca</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
