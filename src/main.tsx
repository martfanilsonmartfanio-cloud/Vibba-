import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { purgeLegacyClientState } from './lib/api.ts';
import './index.css';

purgeLegacyClientState();

try {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
    onRegisterError() {
      // Ignore SW registration issues in restricted WebViews
    },
  });
} catch {
  // Ignore SW initialization failures
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
