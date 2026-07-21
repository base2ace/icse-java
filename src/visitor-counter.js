/* ==========================================================================
   Base2ace Technologies - ICSE 10 Java
   Site Visitor Counter & Traffic Analytics Engine
   ========================================================================== */

(function () {
  const STORAGE_KEYS = {
    VISITOR_ID: 'icse_b2a_visitor_id',
    FIRST_VISIT: 'icse_b2a_first_visit',
    LAST_VISIT: 'icse_b2a_last_visit',
    USER_HITS: 'icse_b2a_user_hits',
    LOCAL_TOTAL: 'icse_b2a_cached_total_visits',
    LOCAL_UNIQUES: 'icse_b2a_cached_unique_visitors'
  };

  const SESSION_KEYS = {
    START_TIME: 'icse_b2a_session_start',
    PAGES_VIEWED: 'icse_b2a_session_pages'
  };

  let state = {
    totalVisits: 1,
    uniqueVisitors: 1,
    userHits: 1,
    visitorId: '',
    firstVisit: '',
    sessionStart: '',
    sessionPages: 1,
    isLive: false,
    isNewVisitor: false
  };

  /**
   * Auto-inject CSS stylesheet if not present
   */
  function ensureCSSLoaded() {
    if (document.getElementById('visitorCounterCSS')) return;
    const link = document.createElement('link');
    link.id = 'visitorCounterCSS';
    link.rel = 'stylesheet';

    // Determine correct relative path depending on location
    const currentPath = window.location.pathname;
    if (currentPath.includes('/programs/')) {
      link.href = '../src/styles/visitor-counter.css';
    } else if (currentPath.includes('/common/')) {
      link.href = 'visitor-counter.css';
    } else {
      link.href = 'src/styles/visitor-counter.css';
    }

    document.head.appendChild(link);
  }

  /**
   * Initialize counting logic
   */
  function init() {
    ensureCSSLoaded();
    setupUserIdentity();
    setupSession();
    updateCountsLocal();
    fetchOnlineCounts();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
      onDomReady();
    }
  }

  function onDomReady() {
    injectModalIfNeeded();
    injectCounterElements();
    renderAllCounters();
  }

  /**
   * Setup persistent visitor identity
   */
  function setupUserIdentity() {
    const now = new Date().toISOString();
    let visitorId = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    let isNewVisitor = false;

    if (!visitorId) {
      visitorId = 'b2a_icse_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.VISITOR_ID, visitorId);
      localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, now);
      isNewVisitor = true;
    }

    localStorage.setItem(STORAGE_KEYS.LAST_VISIT, now);

    let hits = parseInt(localStorage.getItem(STORAGE_KEYS.USER_HITS) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEYS.USER_HITS, hits.toString());

    state.visitorId = visitorId;
    state.firstVisit = localStorage.getItem(STORAGE_KEYS.FIRST_VISIT) || now;
    state.userHits = hits;
    state.isNewVisitor = isNewVisitor;
  }

  /**
   * Setup session information
   */
  function setupSession() {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let sessionStart = sessionStorage.getItem(SESSION_KEYS.START_TIME);
    let sessionPages = parseInt(sessionStorage.getItem(SESSION_KEYS.PAGES_VIEWED) || '0', 10) + 1;

    if (!sessionStart) {
      sessionStart = nowStr;
      sessionStorage.setItem(SESSION_KEYS.START_TIME, sessionStart);
    }
    sessionStorage.setItem(SESSION_KEYS.PAGES_VIEWED, sessionPages.toString());

    state.sessionStart = sessionStart;
    state.sessionPages = sessionPages;
  }

  /**
   * Local counts calculation with storage persistence
   */
  function updateCountsLocal() {
    let storedTotal = parseInt(localStorage.getItem(STORAGE_KEYS.LOCAL_TOTAL) || '0', 10);
    let storedUniques = parseInt(localStorage.getItem(STORAGE_KEYS.LOCAL_UNIQUES) || '0', 10);

    storedTotal += 1;
    if (state.isNewVisitor && storedUniques === 0) {
      storedUniques = 1;
    }

    localStorage.setItem(STORAGE_KEYS.LOCAL_TOTAL, storedTotal.toString());
    localStorage.setItem(STORAGE_KEYS.LOCAL_UNIQUES, storedUniques.toString());

    state.totalVisits = storedTotal;
    state.uniqueVisitors = storedUniques || 1;
  }

  /**
   * Fetch live counts from Counter API
   */
  async function fetchOnlineCounts() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('https://api.counterapi.dev/v1/icse-java-base2ace/visits/up', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.count === 'number') {
          state.totalVisits = data.count;
          state.uniqueVisitors = Math.max(1, Math.round(data.count * 0.72));
          state.isLive = true;

          localStorage.setItem(STORAGE_KEYS.LOCAL_TOTAL, state.totalVisits.toString());
          localStorage.setItem(STORAGE_KEYS.LOCAL_UNIQUES, state.uniqueVisitors.toString());

          renderAllCounters();
        }
      }
    } catch (e) {
      // Graceful offline fallback
    }
  }

  /**
   * Animated count up for numbers
   */
  function animateValue(element, start, end, duration) {
    if (!element) return;
    if (start === end || duration === 0) {
      element.textContent = end.toLocaleString();
      return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      element.textContent = current.toLocaleString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = end.toLocaleString();
      }
    };
    window.requestAnimationFrame(step);
  }

  /**
   * Render state across UI elements
   */
  function renderAllCounters() {
    const navCount = document.getElementById('navVisitCount');
    if (navCount) animateValue(navCount, 0, state.totalVisits, 1200);

    updateModalFields();
  }

  /**
   * Auto-inject missing UI elements (nav buttons)
   */
  function injectCounterElements() {
    // Inject into Nav Menu if navbar exists and button isn't added yet
    const navMenu = document.querySelector('.navbar__menu');
    if (navMenu && !document.getElementById('navVisitorBtn')) {
      const btn = document.createElement('button');
      btn.className = 'nav-visitor-btn';
      btn.id = 'navVisitorBtn';
      btn.setAttribute('onclick', 'openVisitorModal()');
      btn.title = 'Click to view site traffic analytics';
      btn.innerHTML = `
        <span class="visitor-live-dot"></span>
        <span>👁️ <strong id="navVisitCount">${state.totalVisits.toLocaleString()}</strong> Visits</span>
      `;
      navMenu.appendChild(btn);
    }
  }

  /**
   * Inject visitor stats modal overlay dynamically
   */
  function injectModalIfNeeded() {
    if (document.getElementById('visitorStatsModal')) return;

    const modalHtml = `
      <div class="visitor-modal-overlay" id="visitorStatsModal" onclick="handleOverlayClick(event)">
        <div class="visitor-modal-card">
          <div class="visitor-modal-header">
            <h3 class="visitor-modal-title">
              <span>📊</span> Site Traffic & Analytics
            </h3>
            <button class="visitor-modal-close" onclick="closeVisitorModal()">&times;</button>
          </div>
          
          <div class="visitor-analytics-grid">
            <div class="visitor-stat-box">
              <div class="visitor-stat-icon">👁️</div>
              <div class="visitor-stat-info">
                <span class="visitor-stat-lbl">Total Visits</span>
                <span class="visitor-stat-val" id="modalTotalVisits">--</span>
              </div>
            </div>
            
            <div class="visitor-stat-box">
              <div class="visitor-stat-icon">👤</div>
              <div class="visitor-stat-info">
                <span class="visitor-stat-lbl">Unique Visitors</span>
                <span class="visitor-stat-val" id="modalUniqueVisitors">--</span>
              </div>
            </div>
            
            <div class="visitor-stat-box">
              <div class="visitor-stat-icon">🎯</div>
              <div class="visitor-stat-info">
                <span class="visitor-stat-lbl">Your Visits</span>
                <span class="visitor-stat-val" id="modalUserHits">--</span>
              </div>
            </div>

            <div class="visitor-stat-box">
              <div class="visitor-stat-icon">📑</div>
              <div class="visitor-stat-info">
                <span class="visitor-stat-lbl">Session Pages</span>
                <span class="visitor-stat-val" id="modalSessionPages">--</span>
              </div>
            </div>
          </div>

          <div class="visitor-details-table">
            <div class="visitor-detail-row">
              <span class="visitor-detail-label">Status</span>
              <span id="modalLiveStatus"><span class="visitor-live-badge"><span class="visitor-live-dot"></span> Live Sync</span></span>
            </div>
            <div class="visitor-detail-row">
              <span class="visitor-detail-label">Your Visitor ID</span>
              <span class="visitor-detail-val" id="modalVisitorId">--</span>
            </div>
            <div class="visitor-detail-row">
              <span class="visitor-detail-label">First Visit</span>
              <span class="visitor-detail-val" id="modalFirstVisit">--</span>
            </div>
            <div class="visitor-detail-row">
              <span class="visitor-detail-label">Session Started</span>
              <span class="visitor-detail-val" id="modalSessionStart">--</span>
            </div>
          </div>

          <div class="visitor-modal-footer">
            <button class="visitor-btn-close" onclick="closeVisitorModal()">Close Analytics</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  /**
   * Update fields inside modal
   */
  function updateModalFields() {
    const totalEl = document.getElementById('modalTotalVisits');
    if (totalEl) totalEl.textContent = state.totalVisits.toLocaleString();

    const uniqueEl = document.getElementById('modalUniqueVisitors');
    if (uniqueEl) uniqueEl.textContent = state.uniqueVisitors.toLocaleString();

    const userHitsEl = document.getElementById('modalUserHits');
    if (userHitsEl) userHitsEl.textContent = state.userHits.toLocaleString();

    const sessionPagesEl = document.getElementById('modalSessionPages');
    if (sessionPagesEl) sessionPagesEl.textContent = state.sessionPages.toLocaleString();

    const visitorIdEl = document.getElementById('modalVisitorId');
    if (visitorIdEl) visitorIdEl.textContent = state.visitorId;

    const firstVisitEl = document.getElementById('modalFirstVisit');
    if (firstVisitEl) {
      try {
        const d = new Date(state.firstVisit);
        firstVisitEl.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        firstVisitEl.textContent = state.firstVisit;
      }
    }

    const sessionStartEl = document.getElementById('modalSessionStart');
    if (sessionStartEl) sessionStartEl.textContent = state.sessionStart;
  }

  // Global functions for modal opening / closing
  window.openVisitorModal = function () {
    injectModalIfNeeded();
    updateModalFields();
    const modal = document.getElementById('visitorStatsModal');
    if (modal) modal.classList.add('active');
  };

  window.closeVisitorModal = function () {
    const modal = document.getElementById('visitorStatsModal');
    if (modal) modal.classList.remove('active');
  };

  window.handleOverlayClick = function (e) {
    if (e.target && e.target.id === 'visitorStatsModal') {
      window.closeVisitorModal();
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeVisitorModal();
    }
  });

  // Run initialization
  init();
})();
