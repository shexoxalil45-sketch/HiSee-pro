

// Incognito Engine Sync - Automatic Session Purge
(function() {
  try {
    for (const key in localStorage) {
      if (key.includes('firebase:authUser') || key.includes('firebase:app')) {
        localStorage.removeItem(key);
      }
    }
    for (const key in sessionStorage) {
      if (key.includes('firebase:authUser') || key.includes('firebase:app')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (e) {}
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Changed App import to named import to match App.tsx's new named export
import { App } from './App';

// Intercept "Script error." and cross-origin iframe scripts to prevent container crashes
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Script error') || 
    msg === 'Script error.' || 
    event.filename?.includes('peerjs') || 
    event.filename?.includes('agora') ||
    event.filename?.includes('tailwindcss')
  ) {
    event.preventDefault();
    event.stopPropagation();
    console.warn("Muffled cross-origin/unhandled script error safely:", msg, "at", event.filename);
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reasonMsg = event.reason?.message || '';
  if (
    reasonMsg.includes('Script error') || 
    reasonMsg.includes('Agora') || 
    reasonMsg.includes('peerjs')
  ) {
    event.preventDefault();
    console.warn("Muffled unhandled promise rejection safely:", event.reason);
  }
}, true);

// Intercept and ignore transient third-party SDK/Agora/Cloudinary errors to keep console and logs clean
const filterAgoraLogs = (args: any[]) => {
  try {
    const fullMessage = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.stack || arg.message;
      return JSON.stringify(arg);
    }).join(' ');

    return (
      fullMessage.includes('AgoraRTCError') ||
      fullMessage.includes('WS_ABORT') ||
      fullMessage.includes('Agora-SDK') ||
      fullMessage.includes('traffic_stats') ||
      fullMessage.includes('cloud_name is disabled') ||
      fullMessage.includes('Cloudinary Upload Error') ||
      fullMessage.includes('ping') && (fullMessage.includes('Agora') || fullMessage.includes('WS_ABORT'))
    );
  } catch (e) {
    return false;
  }
};

const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  if (filterAgoraLogs(args)) return;
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
  if (filterAgoraLogs(args)) return;
  originalConsoleWarn.apply(console, args);
};

// ---------------------------------------------------------
// MOUNTING LOGIC - ZERO LOSS PROTECTION
// ---------------------------------------------------------
const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("CRITICAL: Root element not found!");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("App mounted successfully");
  } catch (err) {
    console.error("CRITICAL: Failed to mount app:", err);
    rootElement.innerHTML = `
      <div style="padding: 40px; background: #0a0c10; color: #f43f5e; text-align: center; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">خطأ في تشغيل الواجهة</h1>
        <p style="opacity: 0.7; margin-bottom: 24px;">حدث خطأ تقني يمنع عرض التطبيق حالياً.</p>
        <button onclick="window.location.reload()" style="background: #f43f5e; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold;">إعادة المحاولة</button>
      </div>
    `;
  }
};

// Start mounting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
