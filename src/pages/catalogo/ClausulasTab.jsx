import { useState, useMemo, useEffect } from 'react';
import { Icon, RiskBadge } from './ui';
import EditClauseModal from '../EditClauseModal';
import InsertarClausulaModal from './InsertarClausulaModal';
import ImportClausesModal from '../ImportClausesModal';
import { TIPOS_TEXTO, labelTipoTexto } from '../../utils/tiposTexto';

const CLAUSES_PER_PAGE = 10;

function TipoTextoBadge({ tipo }) {
  if (!tipo || tipo === 'CLAUSULA') return null;
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      background: 'var(--bg-active)', color: 'var(--primary)', whiteSpace: 'nowrap',
    }}>
      {labelTipoTexto(tipo)}
    </span>
  );
}

// ─── Tab: Cláusulas ──────────────────────────────────────────────────────────
export default function ClausulasTab({
  apiClausulas, allClauseCategories,
  loading, error, fetchClausulasData, onClausulaSaved
}) {
  const [selectedClause, setSelectedClause] = useState(0);
  const [clauseAlt, setClauseAlt] = useState(0);

  const [isClauseModalOpen, setIsClauseModalOpen] = useState(false);
  const [clauseToEdit, setClauseToEdit] = useState(null);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [isImportClausesModalOpen, setIsImportClausesModalOpen] = useState(false);

  const [clauseFormCache, setClauseFormCache] = useState({
    name: '',
    cat: '',
    risk: 'Medio',
    tipo_texto: 'CLAUSULA',
    versions: [
      { label: 'Estándar', tag: 'Estándar', text: '' }
    ]
  });

  // Filtro por tipo de texto (cláusulas, saludos, despedidas, cierres, …).
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const clausulasVisibles = useMemo(() => (
    tipoFiltro === 'TODOS'
      ? apiClausulas
      : apiClausulas.filter(c => (c.tipo_texto || 'CLAUSULA') === tipoFiltro)
  ), [apiClausulas, tipoFiltro]);

  const selectedClauseData = apiClausulas.find(c => c.id === selectedClause) || apiClausulas[0];
  const selectedAlt = selectedClauseData ? (selectedClauseData.versions[clauseAlt] || selectedClauseData.versions[0]) : null;
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchCat, setSearchCat] = useState('');
  const [searchClause, setSearchClause] = useState('');
  const [clausePage, setClausePage] = useState(1);

  // Reset states when changing category
  useEffect(() => {
    setSearchClause('');
    setClausePage(1);
    
    if (selectedCategory) {
      const clausesInCat = clausulasVisibles.filter(c => c.cat === selectedCategory);
      if (clausesInCat.length > 0 && (!selectedClause || !clausesInCat.find(c => c.id === selectedClause))) {
        setSelectedClause(clausesInCat[0].id);
        setClauseAlt(0);
      }
    }
  }, [selectedCategory, clausulasVisibles]);

  // Con filtro de tipo activo, las categorías derivan del subconjunto visible.
  const categoriasVisibles = useMemo(() => (
    tipoFiltro === 'TODOS'
      ? allClauseCategories
      : Array.from(new Set(clausulasVisibles.map(c => c.cat)))
  ), [allClauseCategories, clausulasVisibles, tipoFiltro]);

  const filteredCategories = useMemo(() => {
    if (!searchCat) return categoriasVisibles;
    return categoriasVisibles.filter(cat =>
      cat.toLowerCase().includes(searchCat.toLowerCase())
    );
  }, [categoriasVisibles, searchCat]);

  const clausesInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return clausulasVisibles.filter(c => c.cat === selectedCategory && (!searchClause || c.name.toLowerCase().includes(searchClause.toLowerCase())));
  }, [clausulasVisibles, selectedCategory, searchClause]);

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
             <h2 style={{ fontSize: 24, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Librería de Cláusulas y Textos</h2>
             <p style={{ margin: 0, color: 'var(--text-faint)', fontSize: 14 }}>Cláusulas, saludos, despedidas y otros textos útiles, clasificados por tipo y categoría.</p>
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
             <div className="catalogo-search" style={{ width: 320 }}>
               <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" color="var(--text-faint)" w={14} />
               <input type="text" placeholder="Buscar categoría…" value={searchCat} onChange={(e) => setSearchCat(e.target.value)} />
             </div>
             <button
                className="catalogo-btn-secondary"
                onClick={async () => {
                  try {
                    const { exportClausulas } = await import('../../api');
                    await exportClausulas();
                  } catch (e) {
                    alert('Error al exportar: ' + e.message);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
             >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" color="currentColor" w={16} />
                Exportar
             </button>
             <button
                className="catalogo-btn-primary"
                onClick={() => setIsImportClausesModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
             >
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" color="currentColor" w={16} />
                Importar Cláusulas
             </button>
           </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {[{ value: 'TODOS', label: 'Todos' }, ...TIPOS_TEXTO].map(t => {
            const activo = tipoFiltro === t.value;
            const count = t.value === 'TODOS'
              ? apiClausulas.length
              : apiClausulas.filter(c => (c.tipo_texto || 'CLAUSULA') === t.value).length;
            if (t.value !== 'TODOS' && count === 0) return null;
            return (
              <button
                key={t.value}
                onClick={() => setTipoFiltro(activo ? 'TODOS' : t.value)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  border: `1px solid ${activo ? 'var(--primary)' : 'var(--border)'}`,
                  background: activo ? 'var(--bg-active)' : 'var(--bg-panel)',
                  color: activo ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                {t.label} <span style={{ fontWeight: 500, opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
           {filteredCategories.map(cat => {
              const count = clausulasVisibles.filter(c => c.cat === cat).length;
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
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <RiskBadge risk={c.risk} />
                  <TipoTextoBadge tipo={c.tipo_texto} />
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
            onClick={() => { setClauseToEdit(null); setIsClauseModalOpen(true); }}
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
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  <RiskBadge risk={selectedClauseData.risk} />
                  <TipoTextoBadge tipo={selectedClauseData.tipo_texto} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{selectedClauseData.versions.length} versiones disponibles</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="catalogo-btn-secondary"
                  onClick={() => { setClauseToEdit(selectedClauseData); setIsClauseModalOpen(true); }}
                >
                  Editar
                </button>
                <button
                  className="catalogo-btn-primary"
                  onClick={() => setIsInsertModalOpen(true)}
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

      {isInsertModalOpen && (
        <InsertarClausulaModal
          clauseText={selectedClauseData?.versions[clauseAlt]?.text}
          clauseName={selectedClauseData?.name}
          clauseId={selectedClauseData?.id}
          onClose={() => setIsInsertModalOpen(false)}
        />
      )}

      {isClauseModalOpen && (
        <EditClauseModal
          clause={clauseToEdit}
          createForm={clauseFormCache}
          setCreateForm={setClauseFormCache}
          onClose={() => setIsClauseModalOpen(false)}
          onSuccess={(guardada) => {
            setIsClauseModalOpen(false);
            // El server devuelve la cláusula completa: upsert local sin refetch;
            // el refetch queda solo como red de seguridad si no vino cuerpo.
            if (guardada?.id && onClausulaSaved) onClausulaSaved(guardada);
            else fetchClausulasData();
          }}
        />
      )}

      {isImportClausesModalOpen && (
        <ImportClausesModal
          onClose={() => setIsImportClausesModalOpen(false)}
          onSuccess={() => {
            setIsImportClausesModalOpen(false);
            fetchClausulasData();
          }}
        />
      )}
    </div>
  );
}
