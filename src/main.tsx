import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import './index.css';

// Register service worker with instant auto-update
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
