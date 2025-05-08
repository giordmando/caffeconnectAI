import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/App.css';
import './styles/carousel.css';
import './styles/nlp.css'; // Importiamo i nuovi stili NLP
import * as serviceWorker from './serviceWorker';
import { registerComponents } from './components/ui/registry/ComponentRegistration';
// Aggiungi un controllo per verificare la registrazione
import { isComponentRegistered } from './components/ui/registry/ComponentRegistration';
import { extendComponentRegistration } from './components/ui/registry/NLPComponentRegistration';
import { RootServiceProvider } from './contexts/RootServiceProvider';


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
    <RootServiceProvider>
      <App />
    </RootServiceProvider>
  </React.StrictMode>
);

serviceWorker.unregister();