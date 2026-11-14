(function (global) {
  "use strict";
  if (global.AQWSafeStorage) return;

  global.AQWSafeStorage = Object.freeze({
    getItem(key) {
      try { return global.localStorage.getItem(key); }
      catch (_) { return null; }
    },
    setItem(key, value) {
      try { global.localStorage.setItem(key, String(value)); return true; }
      catch (_) { return false; }
    },
    removeItem(key) {
      try { global.localStorage.removeItem(key); return true; }
      catch (_) { return false; }
    },
    keys() {
      try { return Object.keys(global.localStorage); }
      catch (_) { return []; }
    },
  });
})(window);
