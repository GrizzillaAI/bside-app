import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { PlayerProvider } from './lib/player';
import { PlaybackModeProvider } from './lib/playbackMode';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlaybackModeProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </PlaybackModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
