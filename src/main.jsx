import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'
import SmoothScrollProvider from './components/layout/SmoothScrollProvider.jsx'

// Tras un deploy, los chunks del build anterior dejan de existir (hash nuevo):
// una pestaña abierta con el index.html viejo falla al cargar rutas lazy
// ("Failed to fetch dynamically imported module"). Vite emite vite:preloadError
// en ese caso — se recarga la página para tomar el index.html nuevo, con guard
// en sessionStorage para no entrar en bucle si el error persiste.
window.addEventListener('vite:preloadError', (event) => {
  const ultima = Number(sessionStorage.getItem('chunk_reload_ts') || 0)
  if (Date.now() - ultima < 10000) return // ya se recargó hace <10s: error real
  sessionStorage.setItem('chunk_reload_ts', String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <SmoothScrollProvider>
        <App />
      </SmoothScrollProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
