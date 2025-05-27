// Passive event listeners polyfill for CodeMirror
(function() {
  // Override addEventListener to add passive: true for touch events
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    let modifiedOptions = options;
    
    // Add passive: true for touch and wheel events
    if (type === 'touchstart' || type === 'touchmove' || type === 'wheel') {
      if (typeof options === 'object') {
        modifiedOptions = Object.assign({}, options, { passive: true });
      } else {
        modifiedOptions = { passive: true, capture: options };
      }
    }
    
    originalAddEventListener.call(this, type, listener, modifiedOptions);
  };
})();
