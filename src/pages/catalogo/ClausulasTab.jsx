import { Icon, RiskBadge } from './ui';

// ─── Tab: Cláusulas ──────────────────────────────────────────────────────────
export default function ClausulasTab({
  loading, error,
  paginatedClausulas, clauseCategories,
  clausePage, setClausePage, totalClausePages,
  selectedClause, setSelectedClause,
  clauseAlt, setClauseAlt,
  selectedClauseData, selectedAlt,
  onNewClause, onEditClause, onInsert,
}) {
  return (
    <div className="catalogo-clausulas">
      <div className="catalogo-clausulas-sidebar">
        <div className="catalogo-clausulas-sidebar-header">
          <div className="catalogo-search">
            <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
            <input type="text" placeholder="Buscar cláusula…" />
          </div>
        </div>

        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <br />Cargando cláusulas...
          </div>
        )}
        {error && <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)', fontSize: 12 }}>{error}</div>}

        {!loading && !error && clauseCategories.map(cat => (
          <div key={cat}>
            <div className="catalogo-clausulas-cat">{cat}</div>
            {paginatedClausulas.filter(c => c.cat === cat).map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedClause(c.id); setClauseAlt(0); }}
                className={`catalogo-clausulas-item ${selectedClause === c.id ? 'active' : ''}`}
              >
                <span>{c.name}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <RiskBadge risk={c.risk} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{c.versions.length} versiones</span>
                </div>
              </button>
            ))}
          </div>
        ))}
        <div className="catalogo-clausulas-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {totalClausePages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setClausePage(p => Math.max(1, p - 1))}
                disabled={clausePage === 1}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: clausePage === 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: clausePage === 1 ? 'var(--border)' : 'var(--text-primary)' }}
              >Anterior</button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Pág {clausePage} de {totalClausePages}</span>
              <button
                onClick={() => setClausePage(p => Math.min(totalClausePages, p + 1))}
                disabled={clausePage === totalClausePages}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: clausePage === totalClausePages ? 'not-allowed' : 'pointer', fontSize: 12, color: clausePage === totalClausePages ? 'var(--border)' : 'var(--text-primary)' }}
              >Siguiente</button>
            </div>
          )}
          <button
            className="catalogo-btn-primary"
            onClick={onNewClause}
          >
            + Nueva Cláusula
          </button>
        </div>
      </div>

      <div className="catalogo-clausulas-detail">
        {selectedClauseData ? (
          <>
            <div className="catalogo-clausulas-header">
              <div>
                <p className="catalogo-clausulas-cat">{selectedClauseData.cat}</p>
                <h3>{selectedClauseData.name}</h3>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <RiskBadge risk={selectedClauseData.risk} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{selectedClauseData.versions.length} versiones disponibles</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="catalogo-btn-secondary"
                  onClick={() => onEditClause(selectedClauseData)}
                >
                  Editar
                </button>
                <button
                  className="catalogo-btn-primary"
                  onClick={onInsert}
                >
                  Insertar en contrato
                </button>
              </div>
            </div>

            <div className="catalogo-clausulas-tabs">
              {selectedClauseData.versions.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setClauseAlt(i)}
                  className={`catalogo-clausulas-tab ${clauseAlt === i ? 'active' : ''}`}
                >
                  <span style={{ background: v.tagBg, color: v.tagColor, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>{v.tag}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>

            <div className="catalogo-clausulas-content">
              <div className="catalogo-clausulas-text">
                "{selectedAlt?.text}"
              </div>
              <div className={`catalogo-clausulas-note ${clauseAlt === 0 ? 'approved' : 'alternative'}`}>
                <Icon d={clauseAlt === 0 ? 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'} color={clauseAlt === 0 ? 'var(--success-deep)' : 'var(--warning)'} w={15} />
                <p>
                  {clauseAlt === 0
                    ? 'Cláusula estándar aprobada por el equipo legal. Uso recomendado en contratos de bajo y mediano riesgo.'
                    : 'Versión alternativa para negociaciones. Requiere aprobación del Gerente Legal antes de su uso.'}
                </p>
              </div>
            </div>

          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)' }}>
            <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} w={40} color="var(--border)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12 }}>Selecciona una cláusula</span>
            <span style={{ fontSize: 11 }}>Explora y gestiona las cláusulas desde el panel lateral.</span>
          </div>
        )}
      </div>
    </div>
  );
}
