import React, { useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import { useActiveView } from '../../contexts/ActiveViewContext';
import { useTour } from '../../contexts/TourContext';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const mainRef = useRef(null);
  const { activeCliente, setGlobalView } = useActiveView();
  const { startTour } = useTour();
  const { user } = useAuth();

  useEffect(() => {
    // Comentamos la validación de localStorage temporalmente para que puedas probar
    // if (user && !localStorage.getItem('appshell_tour_done')) {
    if (user) {
      console.log("Iniciando tour del AppShell...");
      const timer = setTimeout(() => {
        const tourSteps = [
          {
            target: '.sidebar-proto',
            content: '¡Bienvenido a KyoCLM! Esta es tu barra lateral principal, desde donde podrás navegar por toda la aplicación.',
            disableBeacon: true,
            placement: 'right',
          },
          {
            target: '.sb-nav-container',
            content: 'Aquí encontrarás todos tus módulos: Dashboard, Contratos, Clientes y reportes. Se irán adaptando según tus permisos.',
            placement: 'right',
          }
        ];

        if (document.querySelector('.sb-context-wrapper')) {
          tourSteps.splice(1, 0, {
            target: '.sb-context-wrapper',
            content: 'Usa este selector para cambiar tu "Vista Activa". Puedes trabajar a nivel global o focalizarte en un cliente específico.',
            placement: 'right',
          });
        }

        if (document.querySelector('.sb-pin-btn')) {
          tourSteps.push({
            target: '.sb-pin-btn',
            content: 'Si prefieres más espacio en pantalla, puedes anclar o desanclar esta barra lateral pulsando este botón.',
            placement: 'right',
          });
        }
        
        console.log("Pasos configurados para Joyride:", tourSteps);
        startTour(tourSteps);
        // localStorage.setItem('appshell_tour_done', 'true');
      }, 1500); // Dar tiempo a que los elementos y animaciones carguen

      return () => clearTimeout(timer);
    }
  }, [user, startTour]);

  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-wrapper">
        {activeCliente && (
          <div className="lay-cliente-banner" role="status">
            <span className="lay-cliente-banner-dot" aria-hidden="true" />
            <span className="lay-cliente-banner-text">
              Vista de cliente: <strong>{activeCliente.nombre}</strong>
            </span>
            <button
              type="button"
              className="lay-cliente-banner-btn"
              onClick={setGlobalView}
            >
              Volver a vista global
            </button>
          </div>
        )}
        <main className="main-content fade-in" ref={mainRef}>
          {children}
        </main>
        <StatusBar scrollContainerRef={mainRef} />
      </div>
    </div>
  );
}
