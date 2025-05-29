import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css'; //
import './styles/carousel.css'; //
import './styles/nlp.css'; //
import * as serviceWorker from './serviceWorker'; //

import { ServiceProvider } from './contexts/ServiceProvider';
import AppInitializer from './initialization/AppInitializer';
import { registerAllComponents } from './services/ui/component/registration/completeRegistration';

//registerAllUIComponents();
registerAllComponents();
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

serviceWorker.register();