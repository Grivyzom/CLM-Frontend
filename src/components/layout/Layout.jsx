import React, { useRef } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import './Layout.css';

export default function Layout({ children }) {
  const mainRef = useRef(null);

  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-wrapper">
        <main className="main-content fade-in" ref={mainRef}>
          {children}
        </main>
        <StatusBar scrollContainerRef={mainRef} />
      </div>
    </div>
  );
}
