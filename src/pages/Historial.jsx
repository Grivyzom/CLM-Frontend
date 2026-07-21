import React, { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Search, Filter, Clock, User, FileText, Shield, Settings, Mail, Download } from 'lucide-react';
import TopbarActions from '../components/layout/TopbarActions';
import SEO from '../components/SEO';
import './Historial.css';

gsap.registerPlugin(useGSAP);

const MOCK_HISTORY = [
  {
    id: 1,
    title: 'Contrato "Servicios IT 2026" firmado por todas las partes.',
    type: 'contract',
    user: 'Sistema (Firma Electrónica)',
    time: 'Hace 10 minutos',
    icon: FileText
  },
  {
    id: 2,
    title: 'Nueva versión del contrato "Acuerdo Confidencialidad" subida.',
    type: 'user',
    user: 'María Gonzáles (Legal)',
    time: 'Hace 1 hora',
    icon: FileText
  },
  {
    id: 3,
    title: 'Se añadió el usuario "Juan Pérez" con rol de Aprobador.',
    type: 'system',
    user: 'Admin Principal',
    time: 'Ayer, 16:30',
    icon: User
  },
  {
    id: 4,
    title: 'Inicio de sesión detectado desde IP no habitual (192.168.x.x).',
    type: 'security',
    user: 'Admin Principal',
    time: 'Ayer, 09:15',
    icon: Shield
  },
  {
    id: 5,
    title: 'Exportación masiva de contratos iniciada.',
    type: 'user',
    user: 'Carlos Ruiz',
    time: '18 Jul 2026, 11:20',
    icon: Download
  },
  {
    id: 6,
    title: 'Configuración de notificaciones actualizada.',
    type: 'system',
    user: 'Admin Principal',
    time: '15 Jul 2026, 14:00',
    icon: Settings
  }
];

export default function Historial() {
  const containerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

  useGSAP(() => {
    gsap.from('.hs-anim', {
      y: 15,
      opacity: 0,
      duration: 0.4,
      stagger: 0.08,
      ease: 'power2.out',
    });
  }, { scope: containerRef });

  const getBadgeClass = (type) => {
    switch(type) {
      case 'contract': return 'hs-type-contract';
      case 'system': return 'hs-type-system';
      case 'security': return 'hs-type-security';
      case 'user':
      default: return 'hs-type-user';
    }
  };

  const getBadgeText = (type) => {
    switch(type) {
      case 'contract': return 'Contratos';
      case 'system': return 'Sistema';
      case 'security': return 'Seguridad';
      case 'user':
      default: return 'Usuario';
    }
  };

  const filteredHistory = MOCK_HISTORY.filter(h => 
    h.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container" ref={containerRef}>
      <SEO title="Historial de Actividad | KyoCLM" />
      
      <header className="page-header hs-anim">
        <div>
          <h1 className="page-title">Historial de Actividad</h1>
          <p className="page-description">Consulta el registro de auditoría de todas las acciones realizadas en tu entorno.</p>
        </div>
        <TopbarActions />
      </header>

      <div className="page-content hs-anim">
        <div className="hs-container">
          <div className="hs-header-actions">
            <div className="hs-search">
              <Search size={18} className="hs-search-icon" />
              <input 
                type="text" 
                placeholder="Buscar en el historial de eventos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="hs-filter-btn">
              <Filter size={18} /> Filtros
            </button>
            <button className="hs-filter-btn">
              <Download size={18} /> Exportar
            </button>
          </div>

          <div className="hs-list">
            {filteredHistory.length > 0 ? filteredHistory.map((item) => (
              <div key={item.id} className="hs-row hs-anim">
                <div className={`hs-icon-wrapper ${getBadgeClass(item.type)}`} style={{ opacity: 0.8 }}>
                  <item.icon size={20} />
                </div>
                <div className="hs-content">
                  <h3 className="hs-title">{item.title}</h3>
                  <div className="hs-meta">
                    <span><User size={14} /> {item.user}</span>
                    <span><Clock size={14} /> {item.time}</span>
                  </div>
                </div>
                <div className={`hs-badge ${getBadgeClass(item.type)}`}>
                  {getBadgeText(item.type)}
                </div>
              </div>
            )) : (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se encontraron eventos que coincidan con tu búsqueda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
