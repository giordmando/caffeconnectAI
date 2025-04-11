import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserContextProvider } from './contexts/UserContext';
import './styles/App.css';
import './styles/carousel.css';
import * as serviceWorker from './serviceWorker';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <UserContextProvider>
      <App />
    </UserContextProvider>
  </React.StrictMode>
);

// Se vuoi che la tua app funzioni offline e si carichi più velocemente,
// puoi cambiare unregister() in register() qui sotto.
// Nota: questo comporta alcuni caveat.
// Scopri di più su service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();