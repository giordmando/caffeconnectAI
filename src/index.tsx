import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css'; //
import './styles/carousel.css'; //
import './styles/nlp.css'; //
import * as serviceWorker from './serviceWorker'; //
// La registrazione dei componenti UI può avvenire qui o essere importata
// in un punto più alto dell'inizializzazione se necessario.
import { registerComponents } from './components/ui/registry/ComponentRegistration'; //
import { extendComponentRegistration } from './components/ui/registry/NLPComponentRegistration'; //

import { ServiceProvider } from './contexts/ServiceProvider';
import AppInitializer from './initialization/AppInitializer';

// Registra componenti UI standard e NLP
registerComponents(); //
extendComponentRegistration(); //

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ServiceProvider>
      <AppInitializer fallback={<div>Errore critico durante l'inizializzazione. Riprova più tardi.</div>}>
        <App />
      </AppInitializer>
    </ServiceProvider>
  </React.StrictMode>
);

serviceWorker.unregister(); //