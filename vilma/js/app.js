/**
 * ============================================================================
 * EPG VISOR PRO V2.0 — MOTOR JAVASCRIPT
 * Alto Rendimiento, Parser Inteligente, Grilla Deco y Persistencia IndexedDB
 * ============================================================================
 */

(function () {
  'use strict';

  // --- CONFIGURACIÓN Y CONSTANTES ---
  const DEFAULT_EPG_URL = "https://puticastillo.github.io/EPGCL/vilma/public/guia-de-programacion.xml";
  const DB_NAME = "EPG_CACHE_DB_V2";
  const DB_VERSION = 2;
  const STORE_NAME = "epg_data";
  const EMPTY_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const CARDS_INITIAL_LIMIT = 28;
  const CARDS_STEP = 28;
  const MINUTE_WIDTH_PX = 2.4; // Pixels por minuto para la Grilla Deco (144px por hora)

  // --- ESTADO DE LA APLICACIÓN ---
  const state = {
    channels: [],
    channelsMap: {},
    currentView: 'cards', // 'cards' (Inicio), 'list', 'grid', 'guide' (Canales)
    navHistory: [],       // Pila de navegación para retorno exacto
    filter: 'all',        // 'all', 'favorites', 'adults'
    searchQuery: '',
    showBanners: true,
    showAdults: false,
    favorites: new Set(),
    cardsLimit: CARDS_INITIAL_LIMIT,
    gridVisibleCount: 35,
    
    // Hero Banner
    heroChannels: [],
    heroIndex: 0,
    heroTimer: null,
    heroPlaying: true,

    // Vista Canales
    selectedGuideChId: null,
    selectedGuideDayOffset: 0,

    // Vista Grilla
    gridDayOffset: 0,

    // Modales activos
    activeModalProg: null,
    activeChannelForQuick: null
  };

  // --- REFERENCIAS AL DOM ---
  const el = {};

  function initDOMElements() {
    el.mainHeader = document.getElementById('mainHeader');
    el.btnBack = document.getElementById('btnBack');
    el.brandLogo = document.getElementById('brandLogo');
    el.searchInput = document.getElementById('searchInput');
    el.btnClearSearch = document.getElementById('btnClearSearch');
    el.tabButtons = document.querySelectorAll('.tab-btn');
    el.filterChips = document.querySelectorAll('.filter-chip');
    el.favCount = document.getElementById('favCount');
    el.channelCounter = document.getElementById('channelCounter');
    el.liveClock = document.getElementById('liveClock');
    el.btnSettings = document.getElementById('btnSettings');
    
    el.appContainer = document.getElementById('appContainer');
    el.loader = document.getElementById('loader');
    el.loaderText = document.getElementById('loaderText');
    el.loaderProgress = document.getElementById('loaderProgress');

    // 1. Inicio
    el.viewCards = document.getElementById('viewCards');
    el.heroSection = document.getElementById('heroSection');
    el.heroContentBox = document.getElementById('heroContentBox');
    el.heroLiveBadge = document.getElementById('heroLiveBadge');
    el.heroChLogo = document.getElementById('heroChLogo');
    el.heroChName = document.getElementById('heroChName');
    el.heroProgressBar = document.getElementById('heroProgressBar');
    el.heroTitle = document.getElementById('heroTitle');
    el.heroEpisode = document.getElementById('heroEpisode');
    el.heroDesc = document.getElementById('heroDesc');
    el.heroBtnGoChannel = document.getElementById('heroBtnGoChannel');
    el.heroBtnPrev = document.getElementById('heroBtnPrev');
    el.heroBtnPlay = document.getElementById('heroBtnPlay');
    el.heroBtnNext = document.getElementById('heroBtnNext');
    el.heroBannerSide = document.getElementById('heroBannerSide');
    el.heroBannerImg = document.getElementById('heroBannerImg');
    el.cardsGrid = document.getElementById('cardsGrid');
    el.cardsCounterText = document.getElementById('cardsCounterText');
    el.emptyCards = document.getElementById('emptyCards');
    el.cardsLoadMoreBox = document.getElementById('cardsLoadMoreBox');
    el.btnLoadMoreCards = document.getElementById('btnLoadMoreCards');

    // 2. Lista
    el.viewList = document.getElementById('viewList');
    el.listContainer = document.getElementById('listContainer');
    el.emptyList = document.getElementById('emptyList');

    // 3. Grilla Deco
    el.viewGrid = document.getElementById('viewGrid');
    el.btnGridNow = document.getElementById('btnGridNow');
    el.gridDateSelector = document.getElementById('gridDateSelector');
    el.decoGridWrapper = document.getElementById('decoGridWrapper');
    el.decoRulerHours = document.getElementById('decoRulerHours');
    el.decoNowLine = document.getElementById('decoNowLine');
    el.decoGridRows = document.getElementById('decoGridRows');
    el.emptyGrid = document.getElementById('emptyGrid');
    el.gridLoadMoreBox = document.getElementById('gridLoadMoreBox');
    el.btnLoadMoreGrid = document.getElementById('btnLoadMoreGrid');

    // 4. Canales (Guía)
    el.viewGuide = document.getElementById('viewGuide');
    el.guideChSearch = document.getElementById('guideChSearch');
    el.guideChList = document.getElementById('guideChList');
    el.guideSelectedLogo = document.getElementById('guideSelectedLogo');
    el.guideSelectedName = document.getElementById('guideSelectedName');
    el.guideSelectedMeta = document.getElementById('guideSelectedMeta');
    el.guideDateTabs = document.getElementById('guideDateTabs');
    el.guideTimeline = document.getElementById('guideTimeline');

    // Popup Rápido Lista
    el.popupQuickList = document.getElementById('popupQuickList');
    el.quickChLogo = document.getElementById('quickChLogo');
    el.quickChName = document.getElementById('quickChName');
    el.quickProgramsList = document.getElementById('quickProgramsList');
    el.btnCloseQuick = document.getElementById('btnCloseQuick');
    el.btnOpenFullGuideFromQuick = document.getElementById('btnOpenFullGuideFromQuick');

    // Modal Detalle
    el.modalDetail = document.getElementById('modalDetail');
    el.modalBannerBox = document.getElementById('modalBannerBox');
    el.modalBannerImg = document.getElementById('modalBannerImg');
    el.btnCloseDetail = document.getElementById('btnCloseDetail');
    el.modalChLogo = document.getElementById('modalChLogo');
    el.modalChName = document.getElementById('modalChName');
    el.modalLiveBadge = document.getElementById('modalLiveBadge');
    el.modalTagBadge = document.getElementById('modalTagBadge');
    el.modalTitle = document.getElementById('modalTitle');
    el.modalEpisode = document.getElementById('modalEpisode');
    el.modalTimeText = document.getElementById('modalTimeText');
    el.modalDuration = document.getElementById('modalDuration');
    el.modalCategory = document.getElementById('modalCategory');
    el.modalDescription = document.getElementById('modalDescription');
    el.btnModalGoToChannel = document.getElementById('btnModalGoToChannel');

    // Modal Ajustes
    el.modalSettings = document.getElementById('modalSettings');
    el.btnCloseSettings = document.getElementById('btnCloseSettings');
    el.chkShowPosters = document.getElementById('chkShowPosters');
    el.chkShowAdults = document.getElementById('chkShowAdults');
    el.customEpgUrl = document.getElementById('customEpgUrl');
    el.btnLoadCustomUrl = document.getElementById('btnLoadCustomUrl');
    el.btnRestoreDefaultUrl = document.getElementById('btnRestoreDefaultUrl');
  }

  // ==========================================================================
  // 1. HELPERS: PARSER INTELIGENTE, ORDEN Y FORMATOS
  // ==========================================================================

  /**
   * Extrae y limpia título, capítulo, etiqueta de transmisión e indicador en vivo.
   */
  function parseProgramInfo(rawTitle, rawDesc) {
    let title = (rawTitle || '').trim();
    let desc = (rawDesc || '').trim();
    let episode = '';
    let tag = '';
    let isBroadcastLive = false;

    // 1. Detectar y quitar [En vivo] del título
    if (/\[\s*en\s+vivo\s*\]/i.test(title)) {
      isBroadcastLive = true;
      title = title.replace(/\[\s*en\s+vivo\s*\]/gi, '').trim();
    }

    // 2. Extraer capítulo del título con punto ("•" o "·")
    const dotMatch = title.match(/^(.+?)\s*[•·]\s*(.+)$/);
    if (dotMatch) {
      title = dotMatch[1].trim();
      episode = dotMatch[2].trim();
    }

    // 3. Extraer etiqueta de transmisión de la descripción (separador ║)
    if (desc.includes('║')) {
      const parts = desc.split('║');
      tag = parts[0].trim();
      desc = parts.slice(1).join('║').trim();
      if (/en\s+vivo/i.test(tag)) {
        isBroadcastLive = true;
      }
    }

    // 4. Si aún no hay capítulo o si desc tiene formato "Capítulo | Sinopsis"
    if (desc.includes('|')) {
      const pipeIdx = desc.indexOf('|');
      if (pipeIdx > 0 && pipeIdx < 65) {
        const possibleCap = desc.slice(0, pipeIdx).trim();
        const remainder = desc.slice(pipeIdx + 1).trim();
        if (!episode) {
          episode = possibleCap;
        }
        desc = remainder;
      }
    }

    return {
      title: title || 'Sin Título',
      desc: desc || '',
      episode,
      tag,
      isBroadcastLive
    };
  }

  /**
   * Ordena canales respetando la estructura numérica de los IDs (YXXX):
   * Los últimos 3 dígitos indican el número/dial, y el primer dígito indica el feed.
   */
  function compareYXXX(a, b) {
    const idA = String(a.id || '');
    const idB = String(b.id || '');

    const baseA = parseInt(idA.slice(-3), 10);
    const baseB = parseInt(idB.slice(-3), 10);
    const feedA = parseInt(idA.slice(0, -3), 10);
    const feedB = parseInt(idB.slice(0, -3), 10);

    if (!isNaN(baseA) && !isNaN(baseB)) {
      if (baseA !== baseB) return baseA - baseB;
      if (!isNaN(feedA) && !isNaN(feedB)) return feedA - feedB;
    }
    return idA.localeCompare(idB, undefined, { numeric: true });
  }

  /**
   * Rango del Día Televisivo (de 06:00 AM a 06:00 AM del día siguiente).
   */
  function getTvDayRange(dayOffset = 0) {
    const now = new Date();
    // Si la hora actual es antes de las 06:00, pertenece al día televisivo que empezó ayer
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    now.setDate(now.getDate() + dayOffset);

    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return { start, end };
  }

  function getDayTabLabel(dayOffset) {
    if (dayOffset === 0) return "Hoy";
    if (dayOffset === 1) return "Mañana";

    const tvDay = getTvDayRange(dayOffset);
    const d = new Date(tvDay.start);
    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return daysOfWeek[d.getDay()];
  }

  function formatTime(ms) {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cleanStr(str) {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ==========================================================================
  // 2. INTERSECTION OBSERVER PARA BANNERS (Cero Lag)
  // ==========================================================================
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src && src !== EMPTY_IMG) {
          img.src = src;
          img.onload = () => img.classList.add('loaded');
          img.onerror = () => {
            img.src = EMPTY_IMG;
            img.classList.remove('loaded');
          };
        }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px 0px' });

  // ==========================================================================
  // 3. NAVEGACIÓN INDEPENDIENTE, URL HASH ROUTING E HISTORIAL
  // ==========================================================================
  const VIEW_MAP = {
    'inicio': 'cards',
    'lista': 'list',
    'grilla': 'grid',
    'canales': 'guide'
  };

  const REVERSE_VIEW_MAP = {
    'cards': 'inicio',
    'list': 'lista',
    'grid': 'grilla',
    'guide': 'canales'
  };

  function parseCurrentHash() {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (!raw) return { view: 'cards', channelId: null };

    const [path, query] = raw.split('?');
    const parts = path.split('/');
    const section = (parts[0] || '').toLowerCase();
    const view = VIEW_MAP[section] || 'cards';

    let channelId = parts[1] || null;
    if (query) {
      const params = new URLSearchParams(query);
      channelId = params.get('canal') || params.get('id') || params.get('ch') || channelId;
    }

    return { view, channelId };
  }

  function updateRouteHash(targetView, channelId = null, pushState = false) {
    const hashName = REVERSE_VIEW_MAP[targetView] || 'inicio';
    let targetHash = `#${hashName}`;
    if (targetView === 'guide' && channelId) {
      targetHash += `?canal=${encodeURIComponent(channelId)}`;
    }

    if (window.location.hash !== targetHash) {
      if (pushState) {
        window.history.pushState({ view: targetView, channelId }, '', targetHash);
      } else {
        window.history.replaceState({ view: targetView, channelId }, '', targetHash);
      }
    }
  }

  function navigateTo(targetView, channelId = null, pushState = true) {
    const previousView = state.currentView;

    // Pausar timer de hero si salimos de Inicio
    if (previousView === 'cards' && targetView !== 'cards') {
      stopHeroAutoPlay();
    }

    // Limpiar DOM pesado de Grilla al salir de ella para rendimiento óptimo
    if (previousView === 'grid' && targetView !== 'grid') {
      if (el.decoGridRows) el.decoGridRows.innerHTML = '';
    }

    state.currentView = targetView;
    if (channelId) {
      state.selectedGuideChId = channelId;
    }

    updateNavButtonsUI();

    // Alternar visibilidad de vistas
    el.viewCards.classList.toggle('hidden', targetView !== 'cards');
    el.viewList.classList.toggle('hidden', targetView !== 'list');
    el.viewGrid.classList.toggle('hidden', targetView !== 'grid');
    el.viewGuide.classList.toggle('hidden', targetView !== 'guide');

    // Actualizar tabs en el header
    el.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === targetView);
    });

    updateRouteHash(targetView, channelId || state.selectedGuideChId, pushState);

    renderActiveView();

    // Si volvemos a Inicio, reactivar Hero autoplay si estaba activo
    if (targetView === 'cards' && state.heroPlaying) {
      startHeroAutoPlay();
    }

    // Si entramos a la Grilla, centrar en la hora actual
    if (targetView === 'grid') {
      setTimeout(centerGridOnNow, 80);
    }
  }

  function switchView(targetView, channelId = null, updateHash = true) {
    navigateTo(targetView, channelId, false);
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('cards', null, true);
    }
  }

  function updateNavButtonsUI() {
    if (state.currentView !== 'cards') {
      el.btnBack.classList.remove('hidden');
    } else {
      el.btnBack.classList.add('hidden');
    }
  }

  function renderActiveView() {
    updateChannelCounter();
    if (state.currentView === 'cards') {
      renderCardsView();
    } else if (state.currentView === 'list') {
      renderListView();
    } else if (state.currentView === 'grid') {
      renderGridView();
    } else if (state.currentView === 'guide') {
      renderGuideView();
    }
  }

  function getFilteredChannels() {
    const query = cleanStr(state.searchQuery);

    return state.channels.filter(ch => {
      if (!state.showAdults && ch.isAdult) return false;
      if (state.filter === 'favorites' && !state.favorites.has(ch.id)) return false;
      if (state.filter === 'adults' && !ch.isAdult) return false;

      if (!query) return true;

      // Buscar por nombre, ID o programa actual
      if (ch.cleanName.includes(query) || ch.id.toLowerCase().includes(query)) return true;
      const now = Date.now();
      const cur = getCurrentProgram(ch, now);
      if (cur && cleanStr(cur.title).includes(query)) return true;

      return false;
    });
  }

  function getCurrentProgram(ch, nowMs) {
    if (!ch.programs || ch.programs.length === 0) return null;
    return ch.programs.find(p => p.start <= nowMs && p.stop > nowMs) ||
           ch.programs.find(p => p.start > nowMs) ||
           ch.programs[0];
  }

  function getNextProgram(ch, curProg) {
    if (!ch.programs || !curProg) return null;
    const idx = ch.programs.indexOf(curProg);
    if (idx !== -1 && idx + 1 < ch.programs.length) {
      return ch.programs[idx + 1];
    }
    return null;
  }

  // ==========================================================================
  // 4. VISTA INICIO — HERO BANNER & TARJETAS
  // ==========================================================================
  const FIXED_CARDS_IDS = ['0102', '0103', '0104', '0105', '0106', '0107', '0401', '0403'];
  const HERO_CYCLE_DURATION = 7000; // 7 segundos de rotación por programa

  function isGenericDesc(desc) {
    if (!desc) return true;
    const d = cleanStr(desc);
    if (d.length < 15) return true;
    return d.includes("sin descripcion") ||
           d.includes("sin informacion") ||
           d.includes("programacion diaria") ||
           d.includes("transmision diaria") ||
           d.includes("no disponible") ||
           d.includes("sin info");
  }

  function isRealBannerProg(p, ch) {
    if (!p || !p.icon) return false;
    const icon = p.icon.trim();
    if (!icon || icon === EMPTY_IMG) return false;
    if (icon.toLowerCase().includes('fallback')) return false;
    if (icon === ch.icon) return false;
    if (isGenericDesc(p.desc)) return false;
    return true;
  }

  function isChannelFallbackProg(p, ch) {
    if (!p || !p.icon) return false;
    const icon = p.icon.trim().toLowerCase();
    if (!icon || icon === EMPTY_IMG) return false;
    return icon.includes(`${ch.id.toLowerCase()}_fallback`) || icon.includes('fallback');
  }

  function setupHeroChannels() {
    const now = Date.now();

    // Canales base elegibles (excluyendo 000x y adultos si no están permitidos)
    const baseChannels = state.channels.filter(ch => {
      if (ch.id.startsWith('000')) return false;
      if (!state.showAdults && ch.isAdult) return false;
      return ch.programs && ch.programs.length > 0;
    });

    // NIVEL 1: Programas con BANNER REAL (no fallback, no logo de canal) y descripción real
    let candidateList = [];
    const seenIdsTier1 = new Set();

    for (const ch of baseChannels) {
      if (seenIdsTier1.has(ch.id)) continue;
      // 1. Probar con el programa que está al aire ahora mismo
      const cur = ch.programs.find(p => p.start <= now && p.stop > now);
      if (cur && isRealBannerProg(cur, ch)) {
        seenIdsTier1.add(ch.id);
        candidateList.push({ channel: ch, program: cur });
        continue;
      }
      // 2. Si el actual no califica, buscar en los próximos programas (dentro de 4 horas)
      const nextProg = ch.programs.find(p => p.start > now && p.start <= now + 4 * 3600000 && isRealBannerProg(p, ch));
      if (nextProg) {
        seenIdsTier1.add(ch.id);
        candidateList.push({ channel: ch, program: nextProg });
      }
    }

    // NIVEL 2: Si por algún error o actualización no hay programas con banners reales,
    // buscar los canales con fallback de los propios canales (con el id del canal)
    if (candidateList.length === 0) {
      const seenIdsTier2 = new Set();
      for (const ch of baseChannels) {
        if (seenIdsTier2.has(ch.id)) continue;
        const cur = ch.programs.find(p => p.start <= now && p.stop > now) ||
                    ch.programs.find(p => p.start > now && p.start <= now + 4 * 3600000);
        if (cur && isChannelFallbackProg(cur, ch)) {
          seenIdsTier2.add(ch.id);
          candidateList.push({ channel: ch, program: cur });
        }
      }
    }

    // NIVEL 3: Si aún no hay nada disponible, usar todo lo que haya disponible
    if (candidateList.length === 0) {
      const seenIdsTier3 = new Set();
      for (const ch of baseChannels) {
        if (seenIdsTier3.has(ch.id)) continue;
        const cur = ch.programs.find(p => p.start <= now && p.stop > now) ||
                    ch.programs.find(p => p.start > now) ||
                    ch.programs[0];
        if (cur) {
          seenIdsTier3.add(ch.id);
          candidateList.push({ channel: ch, program: cur });
        }
      }
    }

    // REQUERIMIENTO: Los canales de banner hero no deben repetirse hasta haber pasado por todos
    // Barajar aleatoriamente para una rotación fresca y sin duplicados por ciclo
    candidateList.sort(() => Math.random() - 0.5);

    state.heroList = candidateList;
    state.heroChannels = candidateList.map(item => item.channel);
    state.heroIndex = 0;

    if (state.heroList.length > 0) {
      el.heroSection.classList.remove('hidden');
      updateHeroBanner(false);
      startHeroAutoPlay();
    } else {
      el.heroSection.classList.add('hidden');
      stopHeroAutoPlay();
    }
  }

  function updateHeroBanner(withTransition = true) {
    if (!state.heroList || state.heroList.length === 0) {
      el.heroSection.classList.add('hidden');
      return;
    }
    const item = state.heroList[state.heroIndex];
    if (!item) return;

    const ch = item.channel;
    const now = Date.now();

    // Obtener el programa más fresco (si el actual al aire tiene banner real, usarlo; sino el guardado; sino el actual)
    let cur = ch.programs.find(p => p.start <= now && p.stop > now);
    if (!cur || !isRealBannerProg(cur, ch)) {
      if (item.program && item.program.stop > now) {
        cur = item.program;
      } else {
        cur = cur || ch.programs.find(p => p.start > now) || ch.programs[0];
      }
    }
    if (!cur) return;

    const applyData = () => {
      // Banner nítido 16:9 del programa (sin fallback a logo)
      const bannerSrc = cur.icon;
      if (bannerSrc && state.showBanners) {
        el.heroBannerSide.classList.remove('hidden');
        el.heroBannerImg.src = bannerSrc;
      } else {
        el.heroBannerSide.classList.add('hidden');
      }

      el.heroChLogo.src = ch.icon || EMPTY_IMG;
      el.heroChName.innerText = ch.name;

      // Regla de Insignias: Rojo EN VIVO exclusivo para [En vivo], Verde AL AIRE para los demás
      if (cur.isBroadcastLive) {
        el.heroLiveBadge.className = 'live-pill badge-en-vivo';
        el.heroLiveBadge.innerText = 'EN VIVO';
      } else {
        el.heroLiveBadge.className = 'live-pill badge-al-aire';
        el.heroLiveBadge.innerText = 'AL AIRE';
      }

      el.heroTitle.innerText = cur.title;
      if (cur.episode) {
        el.heroEpisode.innerText = cur.episode;
        el.heroEpisode.classList.remove('hidden');
      } else {
        el.heroEpisode.classList.add('hidden');
      }

      el.heroDesc.innerText = cur.desc;

      // Botón para ir directo a la programación del canal
      el.heroBtnGoChannel.onclick = (e) => {
        e.stopPropagation();
        navigateTo('guide', ch.id);
      };

      // Click en el contenido o banner abre el detalle del programa
      el.heroContentBox.onclick = () => openProgramDetail(ch, cur);
      el.heroBannerSide.onclick = () => openProgramDetail(ch, cur);
    };

    // Transición suave al cambiar de programa
    if (withTransition && el.heroContentBox && el.heroBannerImg) {
      el.heroContentBox.classList.add('is-fading');
      el.heroBannerImg.classList.add('is-fading');
      setTimeout(() => {
        applyData();
        el.heroContentBox.classList.remove('is-fading');
        el.heroBannerImg.classList.remove('is-fading');
      }, 160);
    } else {
      applyData();
    }
  }

  function resetHeroProgressBar() {
    if (!el.heroProgressBar) return;
    el.heroProgressBar.style.transition = 'none';
    el.heroProgressBar.style.width = '0%';
    void el.heroProgressBar.offsetWidth; // Forzar reflow en el navegador
    if (state.heroPlaying && state.heroList && state.heroList.length > 1) {
      el.heroProgressBar.style.transition = `width ${HERO_CYCLE_DURATION}ms linear`;
      el.heroProgressBar.style.width = '100%';
    }
  }

  function stopHeroProgressBar() {
    if (!el.heroProgressBar) return;
    el.heroProgressBar.style.transition = 'none';
    el.heroProgressBar.style.width = '0%';
  }

  function startHeroAutoPlay() {
    clearInterval(state.heroTimer);
    if (!state.heroPlaying || !state.heroList || state.heroList.length <= 1) {
      stopHeroProgressBar();
      return;
    }
    resetHeroProgressBar();
    state.heroTimer = setInterval(() => {
      if (state.heroList.length > 1) {
        state.heroIndex = (state.heroIndex + 1) % state.heroList.length;
        updateHeroBanner(true);
        resetHeroProgressBar();
      }
    }, HERO_CYCLE_DURATION);
  }

  function stopHeroAutoPlay() {
    clearInterval(state.heroTimer);
    stopHeroProgressBar();
  }

  function initCardsPool() {
    const fixedSet = new Set(FIXED_CARDS_IDS);
    const now = Date.now();

    // Filtrar piscina base: excluir canales 000x y los fijos
    const pool = state.channels.filter(ch => {
      if (ch.id.startsWith('000')) return false;
      if (fixedSet.has(ch.id)) return false;
      if (!state.showAdults && ch.isAdult) return false;
      return ch.programs && ch.programs.length > 0;
    });

    // NIVEL 1: Canales con banner REAL del programa (no fallback, no logo de canal) y descripción real
    const tier1 = [];
    // NIVEL 2: Canales con banner fallback propio del canal (id_fallback)
    const tier2 = [];
    // NIVEL 3: Canales restantes disponibles
    const tier3 = [];

    for (const ch of pool) {
      const cur = ch.programs.find(p => p.start <= now && p.stop > now) ||
                  ch.programs.find(p => p.start > now && p.start <= now + 4 * 3600000) ||
                  ch.programs[0];

      if (cur && isRealBannerProg(cur, ch)) {
        tier1.push(ch);
      } else if (cur && isChannelFallbackProg(cur, ch)) {
        tier2.push(ch);
      } else {
        tier3.push(ch);
      }
    }

    // Barajar aleatoriamente cada nivel para garantizar frescura y variedad
    tier1.sort(() => Math.random() - 0.5);
    tier2.sort(() => Math.random() - 0.5);
    tier3.sort(() => Math.random() - 0.5);

    // REQUERIMIENTO: Misma lógica del hero (banners reales primero, luego fallback de canal, luego disponibles)
    state.randomCardsPool = [...tier1, ...tier2, ...tier3];
  }

  function renderCardsView() {
    const grid = el.cardsGrid;
    grid.innerHTML = '';

    const query = cleanStr(state.searchQuery);
    let displayedChannels = [];

    if (query || state.filter !== 'all') {
      // Si el usuario busca o filtra, mostrar los que coincidan (ocultando 000x)
      displayedChannels = getFilteredChannels().filter(ch => !ch.id.startsWith('000'));
      el.cardsCounterText.innerText = `Resultados: ${displayedChannels.length} canales`;
      el.cardsLoadMoreBox.classList.add('hidden');
    } else {
      // Vista Inicio normal:
      // 1. Canales fijos siempre: 0102 al 0107, 0401 y 0403
      const fixedChannels = FIXED_CARDS_IDS.map(id => state.channelsMap[id]).filter(Boolean);
      
      // 2. Rellenar el resto con la piscina priorizada hasta cardsLimit
      if (!state.randomCardsPool || state.randomCardsPool.length === 0) {
        initCardsPool();
      }
      const neededRandom = Math.max(0, state.cardsLimit - fixedChannels.length);
      const randomChannels = (state.randomCardsPool || []).slice(0, neededRandom);

      displayedChannels = [...fixedChannels, ...randomChannels];

      // REQUERIMIENTO: Quitar el texto de "Mostrando 28 canales destacados y aleatorios"
      el.cardsCounterText.innerText = '';

      const totalAvailable = fixedChannels.length + (state.randomCardsPool ? state.randomCardsPool.length : 0);
      if (displayedChannels.length < totalAvailable) {
        el.cardsLoadMoreBox.classList.remove('hidden');
      } else {
        el.cardsLoadMoreBox.classList.add('hidden');
      }
    }

    if (displayedChannels.length === 0) {
      if (state.filter === 'favorites') {
        el.emptyCards.innerText = 'No tienes canales en favoritos. Toca la estrella (☆) en cualquier canal para agregarlo aquí.';
      } else {
        el.emptyCards.innerText = 'No se encontraron canales que coincidan.';
      }
      el.emptyCards.classList.remove('hidden');
      return;
    }
    el.emptyCards.classList.add('hidden');

    const now = Date.now();
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < displayedChannels.length; i++) {
      const ch = displayedChannels[i];
      const prog = getCurrentProgram(ch, now);
      if (!prog) continue;

      const isLive = prog.start <= now && prog.stop > now;
      let progressPercent = 0;
      if (isLive && prog.stop > prog.start) {
        progressPercent = Math.min(100, Math.max(0, ((now - prog.start) / (prog.stop - prog.start)) * 100));
      }

      const card = document.createElement('div');
      card.className = 'card-item';
      card.onclick = () => openProgramDetail(ch, prog);

      const timeRange = `${formatTime(prog.start)} - ${formatTime(prog.stop)}`;
      const bannerSrc = prog.icon || ch.icon || '';

      // Insignia: Rojo exclusivo para [En vivo], verde para el resto al aire
      let badgeHtml = '';
      if (prog.isBroadcastLive) {
        badgeHtml = '<span class="live-pill badge-en-vivo">EN VIVO</span>';
      } else if (isLive) {
        badgeHtml = '<span class="live-pill badge-al-aire">AL AIRE</span>';
      }

      card.innerHTML = `
        <div class="card-banner-wrapper">
          <img class="card-banner" data-src="${bannerSrc || EMPTY_IMG}" alt="" loading="lazy" src="${EMPTY_IMG}">
          <div class="card-badge-container">${badgeHtml}</div>
          <span class="card-time-badge">${timeRange}</span>
        </div>
        <div class="card-content">
          <div class="card-header-ch">
            <img class="ch-logo-tiny" src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy">
            <div class="ch-title-bar">
              <span class="ch-name">${escapeHtml(ch.name)}</span>
            </div>
            <button class="btn-fav" data-id="${ch.id}" title="Favorito">
              ${state.favorites.has(ch.id) ? '★' : '☆'}
            </button>
          </div>
          <div class="card-prog-title">${escapeHtml(prog.title)}</div>
          ${prog.episode ? `<div class="card-prog-sub">${escapeHtml(prog.episode)}</div>` : ''}
          <div class="card-progress-bar">
            <div class="card-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
      `;

      // Observador de banner
      const bannerImg = card.querySelector('.card-banner');
      if (bannerImg && bannerSrc) {
        imageObserver.observe(bannerImg);
      }

      // Favoritos
      const favBtn = card.querySelector('.btn-fav');
      if (favBtn) {
        favBtn.onclick = (e) => {
          e.stopPropagation();
          toggleFavorite(ch.id);
        };
      }

      fragment.appendChild(card);
    }

    grid.appendChild(fragment);
  }

  // ==========================================================================
  // 5. VISTA LISTA COMPACTA
  // Logo, actual en verde y negrita, siguiente atenuado
  // ==========================================================================
  function renderListView() {
    const channels = getFilteredChannels();
    const container = el.listContainer;
    container.innerHTML = '';

    if (channels.length === 0) {
      if (state.filter === 'favorites') {
        el.emptyList.innerText = 'No tienes canales en favoritos. Toca la estrella (☆) en cualquier canal para agregarlo aquí.';
      } else {
        el.emptyList.innerText = 'No se encontraron canales.';
      }
      el.emptyList.classList.remove('hidden');
      return;
    }
    el.emptyList.classList.add('hidden');

    const now = Date.now();
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      const curProg = getCurrentProgram(ch, now);
      if (!curProg) continue;

      const nextProg = getNextProgram(ch, curProg);

      const row = document.createElement('div');
      row.className = 'list-row';
      row.onclick = () => openQuickTodayPopup(ch);

      // Insignia en vivo
      let badgeHtml = '';
      if (curProg.isBroadcastLive) {
        badgeHtml = '<span class="live-pill badge-en-vivo" style="margin-left:8px; font-size:0.7rem; padding:2px 6px;">EN VIVO</span>';
      }

      row.innerHTML = `
        <div class="list-ch-col">
          <img class="list-ch-logo" src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy">
          <div class="list-ch-name-group">
            <span class="list-ch-number">${escapeHtml(ch.id)}</span>
            <span class="list-ch-name">${escapeHtml(ch.name)}</span>
          </div>
        </div>
        <div class="list-programs-col">
          <!-- Programa Actual: Hora en verde y Título en blanco negrita -->
          <div class="list-prog-now">
            <span class="list-time-now">${formatTime(curProg.start)}</span>
            <span class="list-title-now">${escapeHtml(curProg.title)}</span>
            ${curProg.episode ? `<span class="list-episode-now">• ${escapeHtml(curProg.episode)}</span>` : ''}
            ${badgeHtml}
          </div>
          <!-- Siguiente Programa: Hora y título atenuados -->
          ${nextProg ? `
            <div class="list-prog-next">
              <span class="list-time-next">${formatTime(nextProg.start)}</span>
              <span class="list-title-next">${escapeHtml(nextProg.title)}</span>
            </div>
          ` : ''}
        </div>
      `;

      fragment.appendChild(row);
    }

    container.appendChild(fragment);
  }

  // ==========================================================================
  // 6. POPUP RÁPIDO VISTA LISTA (Solo Hora y Título: Día televisivo hasta 06:00)
  // ==========================================================================
  function openQuickTodayPopup(ch) {
    state.activeChannelForQuick = ch;
    el.quickChLogo.src = ch.icon || EMPTY_IMG;
    el.quickChName.innerText = ch.name;

    const list = el.quickProgramsList;
    list.innerHTML = '';

    const now = Date.now();
    const tvDay = getTvDayRange(0);

    // Filtrar desde el momento actual hasta el fin del día televisivo (06:00 AM de mañana)
    const progs = (ch.programs || []).filter(p => p.stop > now && p.start < tvDay.end);

    if (progs.length === 0) {
      list.innerHTML = '<div class="empty-state">No hay más programas programados para este día televisivo.</div>';
    } else {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < progs.length; i++) {
        const p = progs[i];
        const isCurrent = p.start <= now && p.stop > now;

        const item = document.createElement('div');
        item.className = `quick-item ${isCurrent ? 'now-playing' : ''}`;
        item.title = "Haz clic para ver detalles";
        item.onclick = () => {
          closeQuickPopup();
          openProgramDetail(ch, p);
        };

        // REQUERIMIENTO ESTRICTO: Solo hora y título (sin banner ni capítulo)
        item.innerHTML = `
          <span class="quick-time">${formatTime(p.start)}</span>
          <span class="quick-item-title">${escapeHtml(p.title)}</span>
        `;

        fragment.appendChild(item);
      }
      list.appendChild(fragment);
    }

    el.popupQuickList.classList.remove('hidden');
  }

  function closeQuickPopup() {
    el.popupQuickList.classList.add('hidden');
    state.activeChannelForQuick = null;
  }

  // ==========================================================================
  // 7. VISTA GRILLA DE PROGRAMACIÓN (Estilo Decodificador de TV)
  // ==========================================================================
  function renderGridView() {
    renderGridDateSelector();

    const channels = getFilteredChannels();
    const rowsContainer = el.decoGridRows;
    const rulerHours = el.decoRulerHours;
    rowsContainer.innerHTML = '';
    rulerHours.innerHTML = '';

    if (channels.length === 0) {
      el.emptyGrid.classList.remove('hidden');
      return;
    }
    el.emptyGrid.classList.add('hidden');

    const tvDay = getTvDayRange(state.gridDayOffset);
    const dayStart = tvDay.start;
    const dayEnd = tvDay.end;
    const totalMinutes = 24 * 60; // 1440 min
    const totalWidthPx = totalMinutes * MINUTE_WIDTH_PX;

    // 1. Renderizar Regla de Horas (06:00 a 05:00 del día siguiente)
    for (let m = 0; m < totalMinutes; m += 60) {
      const cell = document.createElement('div');
      cell.className = 'deco-hour-cell';
      cell.style.width = `${60 * MINUTE_WIDTH_PX}px`;
      const timeMs = dayStart + m * 60000;
      cell.innerText = formatTime(timeMs);
      rulerHours.appendChild(cell);
    }

    // 2. Posicionar línea roja de la hora actual
    const now = Date.now();
    if (now >= dayStart && now <= dayEnd) {
      const offsetMin = (now - dayStart) / 60000;
      const lineLeft = offsetMin * MINUTE_WIDTH_PX + 220; // 220px corner
      el.decoNowLine.style.left = `${lineLeft}px`;
      el.decoNowLine.classList.remove('hidden');
    } else {
      el.decoNowLine.classList.add('hidden');
    }

    // 3. Renderizar Filas de Canales y Bloques (Paginación de 35 canales para rendimiento óptimo)
    const maxChannels = state.gridVisibleCount || 35;
    const displayedChannels = channels.slice(0, maxChannels);

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < displayedChannels.length; i++) {
      const ch = displayedChannels[i];
      const row = document.createElement('div');
      row.className = 'deco-channel-row';

      // Columna fija de canal
      const chInfo = document.createElement('div');
      chInfo.className = 'deco-ch-info';
      chInfo.title = `Ver guía de ${ch.name}`;
      chInfo.onclick = () => navigateTo('guide', ch.id);
      chInfo.innerHTML = `
        <img class="deco-ch-logo" src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy">
        <div class="deco-ch-details">
          <span class="deco-ch-num">${escapeHtml(ch.id)}</span>
          <span class="deco-ch-name">${escapeHtml(ch.name)}</span>
        </div>
      `;
      row.appendChild(chInfo);

      // Track horizontal de programas
      const track = document.createElement('div');
      track.className = 'deco-programs-track';
      track.style.width = `${totalWidthPx}px`;

      const dayProgs = (ch.programs || []).filter(p => p.stop > dayStart && p.start < dayEnd);

      for (let j = 0; j < dayProgs.length; j++) {
        const p = dayProgs[j];
        const progStart = Math.max(dayStart, p.start);
        const progStop = Math.min(dayEnd, p.stop);
        const durationMin = (progStop - progStart) / 60000;
        if (durationMin <= 1) continue;

        const leftPx = ((progStart - dayStart) / 60000) * MINUTE_WIDTH_PX;
        const widthPx = durationMin * MINUTE_WIDTH_PX;

        const isCurrent = p.start <= now && p.stop > now;

        const block = document.createElement('div');
        block.className = `deco-prog-block ${p.isBroadcastLive ? 'is-broadcast-live' : (isCurrent ? 'is-live' : '')}`;
        block.style.left = `${leftPx}px`;
        block.style.width = `${Math.max(30, widthPx - 4)}px`;
        block.title = `${p.title} (${formatTime(p.start)} - ${formatTime(p.stop)})`;
        block.onclick = () => openProgramDetail(ch, p);

        block.innerHTML = `
          <span class="deco-block-title">${escapeHtml(p.title)}</span>
          <span class="deco-block-time">${formatTime(p.start)} - ${formatTime(p.stop)}</span>
        `;

        track.appendChild(block);
      }

      row.appendChild(track);
      fragment.appendChild(row);
    }

    rowsContainer.appendChild(fragment);

    if (channels.length > maxChannels) {
      el.gridLoadMoreBox.classList.remove('hidden');
      const span = el.btnLoadMoreGrid.querySelector('span');
      if (span) span.innerText = `Cargar más canales en la grilla (${displayedChannels.length} de ${channels.length})`;
    } else {
      el.gridLoadMoreBox.classList.add('hidden');
    }
  }

  function renderGridDateSelector() {
    const container = el.gridDateSelector;
    container.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const btn = document.createElement('button');
      btn.className = `grid-date-chip ${state.gridDayOffset === i ? 'active' : ''}`;
      btn.innerText = getDayTabLabel(i);
      btn.onclick = () => {
        state.gridDayOffset = i;
        renderGridView();
      };
      container.appendChild(btn);
    }
  }

  function centerGridOnNow() {
    const tvDay = getTvDayRange(state.gridDayOffset);
    const now = Date.now();
    if (now >= tvDay.start && now <= tvDay.end) {
      const offsetMin = (now - tvDay.start) / 60000;
      const targetX = offsetMin * MINUTE_WIDTH_PX;
      el.decoGridWrapper.scrollTo({
        left: Math.max(0, targetX - 300),
        behavior: 'smooth'
      });
    }
  }

  // ==========================================================================
  // 8. VISTA CANALES (was Guía: Banner a la derecha y solo hora de inicio)
  // ==========================================================================
  function renderGuideView() {
    const channels = getFilteredChannels();
    const sideList = el.guideChList;
    sideList.innerHTML = '';

    if (channels.length === 0) {
      sideList.innerHTML = '<div class="empty-state">Sin canales</div>';
      return;
    }

    if (!state.selectedGuideChId || !state.channelsMap[state.selectedGuideChId]) {
      state.selectedGuideChId = channels[0].id;
    }

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      const item = document.createElement('div');
      item.className = `guide-ch-item ${ch.id === state.selectedGuideChId ? 'active' : ''}`;
      item.onclick = () => selectGuideChannel(ch.id);

      item.innerHTML = `
        <img src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy">
        <span>${escapeHtml(ch.name)}</span>
      `;
      fragment.appendChild(item);
    }
    sideList.appendChild(fragment);

    renderSelectedGuideSchedule();
  }

  function selectGuideChannel(chId, updateHash = true) {
    state.selectedGuideChId = chId;
    const items = el.guideChList.querySelectorAll('.guide-ch-item');
    const channels = getFilteredChannels();
    items.forEach((it, idx) => {
      const isActive = channels[idx] && channels[idx].id === chId;
      it.classList.toggle('active', isActive);
      if (isActive) {
        it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
    if (updateHash) {
      updateRouteHash('guide', chId, false);
    }
    renderSelectedGuideSchedule();
  }

  function renderSelectedGuideSchedule() {
    const ch = state.channelsMap[state.selectedGuideChId];
    if (!ch) return;

    el.guideSelectedLogo.src = ch.icon || EMPTY_IMG;
    el.guideSelectedName.innerText = ch.name;
    el.guideSelectedMeta.innerText = `Canal ${ch.id} • ${ch.programs ? ch.programs.length : 0} programas en guía`;

    renderGuideDateTabs();

    const timeline = el.guideTimeline;
    timeline.innerHTML = '';

    const tvDay = getTvDayRange(state.selectedGuideDayOffset);
    const dayProgs = (ch.programs || []).filter(p => p.stop > tvDay.start && p.start < tvDay.end);

    if (dayProgs.length === 0) {
      timeline.innerHTML = '<div class="empty-state">No hay programación registrada para este día televisivo.</div>';
      return;
    }

    const now = Date.now();
    const fragment = document.createDocumentFragment();
    let liveCardElement = null;

    for (let i = 0; i < dayProgs.length; i++) {
      const prog = dayProgs[i];
      const isLive = prog.start <= now && prog.stop > now;

      // Línea de la izquierda (borde): SOLO para el programa que está al aire en este momento
      let cardBorderClass = '';
      if (isLive) {
        cardBorderClass = prog.isBroadcastLive ? 'is-broadcast-live' : 'is-live';
      }

      // Insignias:
      // - Si es transmisión en vivo (prog.isBroadcastLive), SIEMPRE muestra su badge rojo "EN VIVO"
      // - Si no es en vivo pero está al aire en este momento (isLive), muestra el badge verde "AL AIRE"
      let badgeHtml = '';
      if (prog.isBroadcastLive) {
        badgeHtml = '<span class="live-pill badge-en-vivo" style="font-size:0.75rem; padding:2px 8px;">EN VIVO</span>';
      } else if (isLive) {
        badgeHtml = '<span class="live-pill badge-al-aire" style="font-size:0.75rem; padding:2px 8px;">AL AIRE</span>';
      }

      const card = document.createElement('div');
      card.className = `guide-prog-card ${cardBorderClass}`;
      if (isLive) {
        liveCardElement = card;
      } else if (!liveCardElement && prog.start > now && state.selectedGuideDayOffset === 0) {
        liveCardElement = card;
      }
      card.onclick = () => openProgramDetail(ch, prog);

      const bannerSrc = prog.icon || ch.icon || '';

      // REQUERIMIENTO: Quitar el cartel duplicado en vivo (el azul)
      let tagHtml = '';
      if (prog.tag && !/en\s*vivo/i.test(prog.tag)) {
        tagHtml = `<span class="tag-pill">${escapeHtml(prog.tag)}</span>`;
      }

      // REQUERIMIENTO: Banner a la derecha y solo hora de inicio (sin hora de fin)
      card.innerHTML = `
        <div class="guide-prog-content">
          <div class="guide-prog-time-row">
            <span class="guide-prog-start-time">${formatTime(prog.start)}</span>
            ${badgeHtml}
            ${tagHtml}
          </div>
          <h3 class="guide-prog-title">${escapeHtml(prog.title)}</h3>
          ${prog.episode ? `<div class="guide-prog-episode">${escapeHtml(prog.episode)}</div>` : ''}
          <p class="guide-prog-desc">${escapeHtml(prog.desc || 'Sin descripción disponible.')}</p>
        </div>
        ${bannerSrc ? `
          <img class="guide-prog-banner" data-src="${bannerSrc}" alt="" loading="lazy" src="${EMPTY_IMG}">
        ` : ''}
      `;

      const bannerImg = card.querySelector('.guide-prog-banner');
      if (bannerImg && bannerSrc) {
        imageObserver.observe(bannerImg);
      }

      fragment.appendChild(card);
    }

    timeline.appendChild(fragment);

    // REQUERIMIENTO: En canales, hacer scroll automático al programa que está al aire
    if (liveCardElement && state.selectedGuideDayOffset === 0) {
      setTimeout(() => {
        liveCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    } else {
      timeline.scrollTop = 0;
    }
  }

  function renderGuideDateTabs() {
    const tabs = el.guideDateTabs;
    tabs.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const btn = document.createElement('button');
      btn.className = `date-tab-btn ${state.selectedGuideDayOffset === i ? 'active' : ''}`;
      btn.innerText = getDayTabLabel(i);
      btn.onclick = () => {
        state.selectedGuideDayOffset = i;
        renderSelectedGuideSchedule();
      };
      tabs.appendChild(btn);
    }
  }

  // ==========================================================================
  // 9. MODAL DETALLE COMPLETO
  // ==========================================================================
  function openProgramDetail(ch, prog) {
    state.activeModalProg = prog;
    state.modalActiveChannel = ch;

    el.modalChLogo.src = ch.icon || EMPTY_IMG;
    el.modalChName.innerText = ch.name;
    
    const now = Date.now();
    const isLive = prog.start <= now && prog.stop > now;

    if (prog.isBroadcastLive) {
      el.modalLiveBadge.className = 'live-pill badge-en-vivo';
      el.modalLiveBadge.innerText = 'EN VIVO';
      el.modalLiveBadge.classList.remove('hidden');
    } else if (isLive) {
      el.modalLiveBadge.className = 'live-pill badge-al-aire';
      el.modalLiveBadge.innerText = 'AL AIRE';
      el.modalLiveBadge.classList.remove('hidden');
    } else {
      el.modalLiveBadge.classList.add('hidden');
    }

    if (prog.tag && !/en\s*vivo/i.test(prog.tag)) {
      el.modalTagBadge.innerText = prog.tag;
      el.modalTagBadge.classList.remove('hidden');
    } else {
      el.modalTagBadge.classList.add('hidden');
    }

    el.modalTitle.innerText = prog.title;
    el.modalEpisode.innerText = prog.episode || '';
    el.modalEpisode.classList.toggle('hidden', !prog.episode);

    el.modalTimeText.innerText = `${formatTime(prog.start)} - ${formatTime(prog.stop)}`;
    const durationMins = Math.round((prog.stop - prog.start) / 60000);
    el.modalDuration.innerText = `${durationMins} min`;
    el.modalCategory.innerText = prog.category || 'General';

    el.modalDescription.innerText = prog.desc || 'No hay descripción disponible para este programa.';

    const banner = prog.icon || ch.icon || '';
    if (banner && state.showBanners) {
      el.modalBannerImg.src = banner;
      el.modalBannerBox.classList.remove('hidden');
    } else {
      el.modalBannerBox.classList.add('hidden');
    }

    el.modalDetail.classList.remove('hidden');
  }

  function closeModalDetail() {
    el.modalDetail.classList.add('hidden');
    state.activeModalProg = null;
  }

  // ==========================================================================
  // 10. FAVORITOS Y AJUSTES
  // ==========================================================================
  function toggleFavorite(chId) {
    if (state.favorites.has(chId)) {
      state.favorites.delete(chId);
    } else {
      state.favorites.add(chId);
    }
    localStorage.setItem('epg_favorites', JSON.stringify(Array.from(state.favorites)));
    updateFavCount();
    renderActiveView();
  }

  function updateFavCount() {
    el.favCount.innerText = state.favorites.size;
  }

  function updateChannelCounter() {
    const total = state.channels.length;
    el.channelCounter.innerText = `${total} canales`;
  }

  function startLiveClock() {
    function tick() {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      el.liveClock.innerText = `${h}:${m}:${s}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ==========================================================================
  // 11. PARSER XMLTV ALTA VELOCIDAD Y GESTIÓN DE CACHÉ
  // ==========================================================================
  function parseXMLTV(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const channelNodes = xmlDoc.getElementsByTagName("channel");
    const channels = [];
    const channelsMap = {};

    for (let i = 0; i < channelNodes.length; i++) {
      const ch = channelNodes[i];
      const id = ch.getAttribute("id");
      if (!id) continue;

      const nameEl = ch.getElementsByTagName("display-name")[0];
      const name = nameEl ? nameEl.textContent.trim() : id;

      const iconEl = ch.getElementsByTagName("icon")[0];
      const icon = iconEl ? iconEl.getAttribute("src") : "";

      const isAdult = /adult|porn|xxx|venus|playboy|sextreme|hot\s*pack|hustler/i.test(name) || /adult|xxx/i.test(id);

      const chObj = {
        id,
        name,
        cleanName: cleanStr(name),
        icon,
        isAdult,
        programs: []
      };

      channels.push(chObj);
      channelsMap[id] = chObj;
    }

    const progNodes = xmlDoc.getElementsByTagName("programme");

    for (let i = 0; i < progNodes.length; i++) {
      const p = progNodes[i];
      const chId = p.getAttribute("channel");
      const chObj = channelsMap[chId];
      if (!chObj) continue;

      const startStr = p.getAttribute("start");
      const stopStr = p.getAttribute("stop");
      if (!startStr || !stopStr) continue;

      const start = parseXMLTVDate(startStr);
      const stop = parseXMLTVDate(stopStr);
      if (!start || !stop) continue;

      const titleEl = p.getElementsByTagName("title")[0];
      const rawTitle = titleEl ? titleEl.textContent : '';

      const descEl = p.getElementsByTagName("desc")[0];
      const rawDesc = descEl ? descEl.textContent : '';

      const iconEl = p.getElementsByTagName("icon")[0];
      const icon = iconEl ? iconEl.getAttribute("src") : "";

      const catEl = p.getElementsByTagName("category")[0];
      const category = catEl ? catEl.textContent.trim() : "";

      // Extracción limpia de título, capítulo y etiquetas
      const parsed = parseProgramInfo(rawTitle, rawDesc);

      chObj.programs.push({
        start,
        stop,
        title: parsed.title,
        desc: parsed.desc,
        episode: parsed.episode,
        tag: parsed.tag,
        isBroadcastLive: parsed.isBroadcastLive,
        icon,
        category
      });
    }

    // Ordenar programas cronológicamente dentro de cada canal
    for (let i = 0; i < channels.length; i++) {
      channels[i].programs.sort((a, b) => a.start - b.start);
    }

    // REQUERIMIENTO: Ordenar canales estrictamente por regla de ID numérico (YXXX)
    channels.sort(compareYXXX);

    return { channels, channelsMap };
  }

  function parseXMLTVDate(str) {
    if (!str || str.length < 14) return 0;
    const y = parseInt(str.substring(0, 4), 10);
    const m = parseInt(str.substring(4, 6), 10) - 1;
    const d = parseInt(str.substring(6, 8), 10);
    const h = parseInt(str.substring(8, 10), 10);
    const min = parseInt(str.substring(10, 12), 10);
    const sec = parseInt(str.substring(12, 14), 10);

    let offsetMinutes = 0;
    if (str.length >= 19) {
      const sign = str[15] === '-' ? -1 : 1;
      const tzH = parseInt(str.substring(16, 18), 10);
      const tzM = parseInt(str.substring(18, 20), 10);
      offsetMinutes = sign * (tzH * 60 + tzM);
      const utcMs = Date.UTC(y, m, d, h, min, sec) - (offsetMinutes * 60000);
      return utcMs;
    }

    return new Date(y, m, d, h, min, sec).getTime();
  }

  // --- INDEXEDDB ---
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getFromIndexedDB(key) {
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async function saveToIndexedDB(key, data) {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(data, key);
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  async function fetchAndProcessEPG(forceRefresh = false) {
    const url = localStorage.getItem('epg_custom_url') || DEFAULT_EPG_URL;

    // 1. Cargar caché inmediata si no es forzado
    if (!forceRefresh) {
      const cached = await getFromIndexedDB("parsed_epg");
      if (cached && cached.channels && cached.channels.length > 0) {
        state.channels = cached.channels;
        state.channelsMap = cached.channelsMap;
        setupHeroChannels();
        renderActiveView();
      }
    }

    if (state.channels.length === 0) {
      el.loader.classList.remove('hidden');
    }

    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const xmlText = await response.text();
      const parsed = parseXMLTV(xmlText);

      state.channels = parsed.channels;
      state.channelsMap = parsed.channelsMap;

      await saveToIndexedDB("parsed_epg", parsed);

      el.loader.classList.add('hidden');

      setupHeroChannels();
      renderActiveView();
    } catch (err) {
      el.loader.classList.add('hidden');
      if (state.channels.length === 0) {
        alert("No se pudo descargar la guía. Verifica tu conexión o la URL en Ajustes.");
      }
    }
  }

  // ==========================================================================
  // 12. EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    el.btnBack.onclick = goBack;

    el.brandLogo.onclick = () => {
      navigateTo('cards', null, true);
    };

    el.tabButtons.forEach(btn => {
      btn.onclick = () => {
        const target = btn.getAttribute('data-view');
        navigateTo(target, null, true);
      };
    });

    el.filterChips.forEach(chip => {
      chip.onclick = () => {
        el.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filter = chip.getAttribute('data-filter');
        state.gridVisibleCount = 35;
        renderActiveView();
      };
    });

    // Buscador
    let searchDebounce;
    el.searchInput.oninput = (e) => {
      clearTimeout(searchDebounce);
      const val = e.target.value.trim();
      el.btnClearSearch.classList.toggle('hidden', val.length === 0);
      searchDebounce = setTimeout(() => {
        state.searchQuery = val;
        state.gridVisibleCount = 35;
        renderActiveView();
      }, 150);
    };

    el.btnClearSearch.onclick = () => {
      el.searchInput.value = '';
      el.btnClearSearch.classList.add('hidden');
      state.searchQuery = '';
      state.gridVisibleCount = 35;
      renderActiveView();
    };

    // Hero controles
    el.heroBtnPrev.onclick = (e) => {
      e.stopPropagation();
      if (!state.heroList || state.heroList.length === 0) return;
      state.heroIndex = (state.heroIndex - 1 + state.heroList.length) % state.heroList.length;
      updateHeroBanner(true);
      if (state.heroPlaying) {
        startHeroAutoPlay();
      } else {
        stopHeroProgressBar();
      }
    };

    el.heroBtnNext.onclick = (e) => {
      e.stopPropagation();
      if (!state.heroList || state.heroList.length === 0) return;
      state.heroIndex = (state.heroIndex + 1) % state.heroList.length;
      updateHeroBanner(true);
      if (state.heroPlaying) {
        startHeroAutoPlay();
      } else {
        stopHeroProgressBar();
      }
    };

    el.heroBtnPlay.onclick = (e) => {
      e.stopPropagation();
      state.heroPlaying = !state.heroPlaying;
      el.heroBtnPlay.innerHTML = state.heroPlaying ? '&#10074;&#10074;' : '&#9658;';
      if (state.heroPlaying) {
        startHeroAutoPlay();
      } else {
        stopHeroAutoPlay();
      }
    };

    // Botón Cargar Más Canales
    el.btnLoadMoreCards.onclick = () => {
      state.cardsLimit += CARDS_STEP;
      renderCardsView();
    };

    // Botón Cargar Más Canales en Grilla
    if (el.btnLoadMoreGrid) {
      el.btnLoadMoreGrid.onclick = () => {
        state.gridVisibleCount = (state.gridVisibleCount || 35) + 35;
        renderGridView();
      };
    }

    // Botón Ir a Ahora en Grilla
    el.btnGridNow.onclick = centerGridOnNow;

    // Buscador en Canales
    el.guideChSearch.oninput = (e) => {
      const q = cleanStr(e.target.value);
      const items = el.guideChList.querySelectorAll('.guide-ch-item');
      const channels = getFilteredChannels();
      items.forEach((it, idx) => {
        const ch = channels[idx];
        const match = ch && (ch.cleanName.includes(q) || ch.id.toLowerCase().includes(q));
        it.style.display = match ? 'flex' : 'none';
      });
    };

    // Ir a Guía completa desde el popup de Lista
    el.btnOpenFullGuideFromQuick.onclick = () => {
      const ch = state.activeChannelForQuick;
      if (ch) {
        closeQuickPopup();
        state.selectedGuideDayOffset = 0;
        navigateTo('guide', ch.id, true);
      }
    };

    // Cerrar Popups
    el.btnCloseQuick.onclick = closeQuickPopup;
    el.popupQuickList.onclick = (e) => {
      if (e.target === el.popupQuickList) closeQuickPopup();
    };

    el.btnCloseDetail.onclick = closeModalDetail;
    el.btnModalGoToChannel.onclick = () => {
      const ch = state.modalActiveChannel;
      if (ch) {
        closeModalDetail();
        state.selectedGuideDayOffset = 0;
        navigateTo('guide', ch.id, true);
      }
    };
    el.modalDetail.onclick = (e) => {
      if (e.target === el.modalDetail) closeModalDetail();
    };

    // Modal Ajustes
    el.btnSettings.onclick = () => el.modalSettings.classList.remove('hidden');
    el.btnCloseSettings.onclick = () => el.modalSettings.classList.add('hidden');
    el.modalSettings.onclick = (e) => {
      if (e.target === el.modalSettings) el.modalSettings.classList.add('hidden');
    };

    el.chkShowPosters.onchange = (e) => {
      state.showBanners = e.target.checked;
      localStorage.setItem('epg_show_banners', state.showBanners);
      document.body.classList.toggle('hide-banners', !state.showBanners);
      renderActiveView();
    };

    el.chkShowAdults.onchange = (e) => {
      state.showAdults = e.target.checked;
      localStorage.setItem('epg_show_adults', state.showAdults);
      renderActiveView();
    };

    el.btnLoadCustomUrl.onclick = () => {
      const val = el.customEpgUrl.value.trim();
      if (val) {
        localStorage.setItem('epg_custom_url', val);
        el.modalSettings.classList.add('hidden');
        fetchAndProcessEPG(true);
      }
    };

    el.btnRestoreDefaultUrl.onclick = () => {
      localStorage.removeItem('epg_custom_url');
      el.customEpgUrl.value = DEFAULT_EPG_URL;
      el.modalSettings.classList.add('hidden');
      fetchAndProcessEPG(true);
    };

    // Soporte para botones Atrás/Adelante del navegador con URL Hash
    window.addEventListener('popstate', () => {
      const route = parseCurrentHash();
      switchView(route.view, route.channelId, false);
    });

    // Tecla Escape para cerrar modales
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModalDetail();
        closeQuickPopup();
        el.modalSettings.classList.add('hidden');
      }
    });

    // Auto-refresh al volver a la pestaña
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        renderActiveView();
      }
    });
  }

  // ==========================================================================
  // 13. INICIALIZACIÓN
  // ==========================================================================
  function init() {
    initDOMElements();

    // Restaurar vista desde URL hash si existe
    const initialRoute = parseCurrentHash();
    state.currentView = initialRoute.view;
    if (initialRoute.channelId) {
      state.selectedGuideChId = initialRoute.channelId;
    }
    updateNavButtonsUI();
    el.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === initialRoute.view);
    });
    el.viewCards.classList.toggle('hidden', initialRoute.view !== 'cards');
    el.viewList.classList.toggle('hidden', initialRoute.view !== 'list');
    el.viewGrid.classList.toggle('hidden', initialRoute.view !== 'grid');
    el.viewGuide.classList.toggle('hidden', initialRoute.view !== 'guide');

    // Cargar preferencias
    try {
      const favs = localStorage.getItem('epg_favorites');
      if (favs) state.favorites = new Set(JSON.parse(favs));
    } catch {}

    const savedBanners = localStorage.getItem('epg_show_banners');
    if (savedBanners !== null) {
      state.showBanners = savedBanners === 'true';
      el.chkShowPosters.checked = state.showBanners;
      document.body.classList.toggle('hide-banners', !state.showBanners);
    }

    const savedAdults = localStorage.getItem('epg_show_adults');
    if (savedAdults !== null) {
      state.showAdults = savedAdults === 'true';
      el.chkShowAdults.checked = state.showAdults;
    }

    el.customEpgUrl.value = localStorage.getItem('epg_custom_url') || DEFAULT_EPG_URL;

    updateFavCount();
    startLiveClock();
    setupEventListeners();
    fetchAndProcessEPG();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
