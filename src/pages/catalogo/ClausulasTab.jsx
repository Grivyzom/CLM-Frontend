import { useState, useMemo, useEffect } from 'react';
import { Icon, RiskBadge } from './ui';

const CLAUSES_PER_PAGE = 10;

// ─── Tab: Cláusulas ──────────────────────────────────────────────────────────
export default function ClausulasTab({
  apiClausulas, allClauseCategories,
  loading, error,
  selectedClause, setSelectedClause,
  clauseAlt, setClauseAlt,
  selectedClauseData, selectedAlt,
  onNewClause, onEditClause, onInsert, onImport, onExport
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchCat, setSearchCat] = useState('');
  const [searchClause, setSearchClause] = useState('');
  const [clausePage, setClausePage] = useState(1);

  // Reset states when changing category
  useEffect(() => {
    setSearchClause('');
    setClausePage(1);
    
    if (selectedCategory) {
      const clausesInCat = apiClausulas.filter(c => c.cat === selectedCategory);
      if (clausesInCat.length > 0 && (!selectedClause || !clausesInCat.find(c => c.id === selectedClause))) {
        setSelectedClause(clausesInCat[0].id);
        setClauseAlt(0);
      }
    }
  }, [selectedCategory, apiClausulas]);

  const filteredCategories = useMemo(() => {
    if (!searchCat) return allClauseCategories;
    return allClauseCategories.filter(cat => 
      cat.toLowerCase().includes(searchCat.toLowerCase())
    );
  }, [allClauseCategories, searchCat]);

  const clausesInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return apiClausulas.filter(c => c.cat === selectedCategory && (!searchClause || c.name.toLowerCase().includes(searchClause.toLowerCase())));
  }, [apiClausulas, selectedCategory, searchClause]);

  const totalClausePages = Math.ceil(clausesInCategory.length / CLAUSES_PER_PAGE);
  const paginatedClausulas = clausesInCategory.slice((clausePage - 1) * CLAUSES_PER_PAGE, clausePage * CLAUSES_PER_PAGE);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <br />Cargando biblioteca de cláusulas...
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  }

  if (!selectedCategory) {
    return (
      <div className="catalogo-clausulas-categories" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
           <div>
             <h2 style={{ fontSize: 24, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Librería de Cláusulas</h2>
             <p style={{ margin: 0, color: 'var(--text-faint)', fontSize: 14 }}>Selecciona una categoría general para acceder a sus variantes y configuraciones.</p>
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
             <div className="catalogo-search" style={{ width: 320 }}>
               <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={14} />
               <input type="text" placeholder="Buscar categoría…" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} />
             </div>
             <button
                className="catalogo-btn-secondary"
                onClick={onExport}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
             >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" color="currentColor" w={16} />
                Exportar
             </button>
             <button
                className="catalogo-btn-primary"
                onClick={onImport}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
             >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" color="currentColor" w={16} />
                Importar Cláusulas
             </button>
           </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
           {filteredCategories.map(cat => {
              const count = apiClausulas.filter(c => c.cat === cat).length;
              return (
                <div 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)} 
                  className="catalogo-card" 
                  style={{ 
                    cursor: 'pointer', 
                    padding: '24px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    background: 'var(--bg-panel)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                  }}
                >
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                     <div style={{ padding: 10, background: 'var(--bg-active)', borderRadius: 8, color: 'var(--primary)' }}>
                        <Icon d={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} w={18} />
                     </div>
                     <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{cat}</h3>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                     <span style={{ padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 4, fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                       {count} cláusula{count !== 1 ? 's' : ''}
                     </span>
                     <Icon d="M9 18l6-6-6-6" w={14} color="var(--border)" style={{ marginLeft: 'auto' }} />
                   </div>
                </div>
              );
           })}
        </div>
      </div>
    );
  }

  return (
    <div className="catalogo-clausulas">
      <div className="catalogo-clausulas-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setSelectedCategory(null)} 
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', 
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, 
              marginBottom: '16px', padding: 0, transition: 'color 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
             <Icon d="M15 18l-6-6 6-6" w={14} color="currentColor" />
             Volver a Categorías
          </button>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{selectedCategory}</h3>
          <div className="catalogo-search">
            <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={13} />
            <input type="text" placeholder="Buscar en esta categoría…" value={searchClause} onChange={(e) => setSearchClause(e.target.value)} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {paginatedClausulas.length === 0 ? (
             <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
               No se encontraron cláusulas.
             </div>
          ) : (
            paginatedClausulas.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedClause(c.id); setClauseAlt(0); }}
                className={`catalogo-clausulas-item ${selectedClause === c.id ? 'active' : ''}`}
                style={{ width: '100%', marginBottom: 8 }}
              >
                <span>{c.name}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <RiskBadge risk={c.risk} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{c.versions.length} versiones</span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="catalogo-clausulas-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderTop: '1px solid var(--border)' }}>
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
            style={{ width: '100%' }}
          >
            + Nueva Cláusula
          </button>
        </div>
      </div>

      <div className="catalogo-clausulas-detail">
        {selectedClauseData && selectedClauseData.cat === selectedCategory ? (
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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12 }}>Selecciona una cláusula de {selectedCategory}</span>
            <span style={{ fontSize: 11 }}>Explora y gestiona las cláusulas desde el panel lateral.</span>
          </div>
        )}
      </div>
    </div>
  );
}
