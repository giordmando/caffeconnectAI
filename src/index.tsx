import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ServiceProvider } from './contexts/ServiceContext';
import './styles/App.css';
import './styles/carousel.css';
import './styles/nlp.css'; // Importiamo i nuovi stili NLP
import * as serviceWorker from './serviceWorker';
import { registerComponents } from './components/ui/registry/ComponentRegistration';
// Aggiungi un controllo per verificare la registrazione
import { isComponentRegistered } from './components/ui/registry/ComponentRegistration';
import { extendComponentRegistration } from './components/ui/registry/NLPComponentRegistration';


// Assicurati che i componenti siano registrati prima del render
registerComponents();
// Inizializziamo i componenti UI standard e quelli NLP
extendComponentRegistration();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);


console.log("MenuCarousel registrato?", isComponentRegistered('menuCarousel'));

root.render(
  <React.StrictMode>
    <ServiceProvider>
      <App />
    </ServiceProvider>
  </React.StrictMode>
);

serviceWorker.unregister();