import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { hideBootLoaderEventually } from './bootLoader';

hideBootLoaderEventually();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
