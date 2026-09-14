import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { startSyncManager } from './lib/syncManager';

// Iniciar el motor de sincronización en segundo plano (IndexedDB → Neon)
startSyncManager();

// Registrar Service Worker para carga instantánea y modo offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.info('[SW] Registrado:', reg.scope))
      .catch((err) => console.warn('[SW] Error al registrar:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
