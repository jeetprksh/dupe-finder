// src/polyfills.ts
(window as any).global = window;   // fixes "global is not defined"
(window as any).process = { env: {} };  // fixes "process is not defined"
(window as any).Buffer = [];
