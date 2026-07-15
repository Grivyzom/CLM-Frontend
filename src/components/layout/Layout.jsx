import React, { useRef } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import { useActiveView } from '../../contexts/ActiveViewContext';
import './Layout.css';

export default function Layout({ children }) {
  const mainRef = useRef(null);
  const { activeCliente, setGlobalView } = useActiveView();

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
