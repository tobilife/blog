// Ultra-optimized Swup performance enhancements

let scrollbarInitialized = false;
let scrollbarInstances = new WeakMap();

export function ultraOptimizeSwup() {
  if (!window.swup) return;

  // Cache DOM queries
  const cache = {
    body: document.body,
    navbar: null,
    toc: null,
    tocInner: null,
    heightExtend: null
  };

  // Pre-calculate values
  let cachedBannerThreshold = 0;
  
  function updateCache() {
    cache.navbar = document.getElementById('navbar-wrapper');
    cache.toc = document.getElementById('toc-wrapper');
    cache.tocInner = document.getElementById('toc-inner-wrapper');
    cache.heightExtend = document.getElementById('page-height-extend');
    
    const BANNER_HEIGHT = window.BANNER_HEIGHT || 0;
    cachedBannerThreshold = window.innerHeight * (BANNER_HEIGHT / 100) - 72 - 16;
  }

  // Replace heavy scrollbar initialization
  function lightweightScrollbarInit() {
    if (scrollbarInitialized) return;
    
    // Only initialize for body once
    if (window.OverlayScrollbars && !scrollbarInstances.has(cache.body)) {
      const instance = window.OverlayScrollbars(cache.body, {
        scrollbars: {
          theme: 'scrollbar-base scrollbar-auto py-1',
          autoHide: 'move',
          autoHideDelay: 500,
          autoHideSuspend: false,
        },
      });
      scrollbarInstances.set(cache.body, instance);
      scrollbarInitialized = true;
    }
  }

  // Optimize visit lifecycle
  window.swup.hooks.on('link:click', () => {
    // Immediate visual feedback
    document.documentElement.style.setProperty('--content-delay', '0ms');
    
    // Remove navbar hiding logic - it was causing issues
    // Let the normal scroll handler manage navbar visibility
  });

  window.swup.hooks.on('visit:start', (visit) => {
    updateCache();
    
    // Use CSS classes instead of JS manipulation
    const isHome = visit.to.url === '/' || visit.to.url.endsWith('/');
    cache.body.classList.toggle('lg:is-home', isHome);
    
    // Hide elements using CSS instead of JS
    if (cache.heightExtend) cache.heightExtend.style.display = 'block';
    
    // Don't hide TOC completely, just add the not-ready class
    if (cache.toc) cache.toc.classList.add('toc-not-ready');
    
    // Pause all animations
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
  });

  window.swup.hooks.on('content:replace', () => {
    // Lightweight scrollbar init
    lightweightScrollbarInit();
    
    // Update cache after content replacement
    updateCache();
    
    // Initialize TOC scrollbar if it exists
    if (cache.tocInner && window.OverlayScrollbars && !scrollbarInstances.has(cache.tocInner)) {
      window.OverlayScrollbars(cache.tocInner, {
        scrollbars: {
          theme: 'scrollbar-base scrollbar-auto',
          autoHide: 'move',
          autoHideDelay: 500,
          autoHideSuspend: false
        }
      });
      scrollbarInstances.set(cache.tocInner, true);
    }
    
    // Only init scrollbars for new pre elements
    requestAnimationFrame(() => {
      const preElements = document.querySelectorAll('pre:not([data-scrollbar])');
      preElements.forEach(el => {
        el.setAttribute('data-scrollbar', 'true');
        if (window.OverlayScrollbars) {
          window.OverlayScrollbars(el, {
            scrollbars: {
              theme: 'scrollbar-base scrollbar-dark px-2',
              autoHide: 'leave',
              autoHideDelay: 500,
              autoHideSuspend: false
            }
          });
        }
      });
    });
  });

  window.swup.hooks.on('page:view', () => {
    // Use RAF instead of setTimeout
    requestAnimationFrame(() => {
      if (cache.heightExtend) cache.heightExtend.style.display = 'none';
      
      // Reset navbar styles to ensure it's visible
      if (cache.navbar) {
        cache.navbar.style.transform = '';
        cache.navbar.style.opacity = '';
        cache.navbar.classList.remove('navbar-hidden');
      }
      
      // Remove toc-not-ready class
      if (cache.toc) {
        cache.toc.classList.remove('toc-not-ready');
      }
    });
  });

  window.swup.hooks.on('visit:end', () => {
    // Immediate restoration
    requestAnimationFrame(() => {
      // Remove toc-not-ready class
      if (cache.toc) {
        cache.toc.classList.remove('toc-not-ready');
      }
      
      document.documentElement.style.setProperty('--animation-play-state', 'running');
      
      // Ensure navbar is visible after transition
      updateCache();
      if (cache.navbar) {
        cache.navbar.style.transform = '';
        cache.navbar.style.opacity = '';
        cache.navbar.classList.remove('navbar-hidden');
      }
    });
  });

  // Initial setup
  updateCache();
  lightweightScrollbarInit();
}
