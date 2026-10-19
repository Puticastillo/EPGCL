/**
 * ============================================================================
 * EPG VISOR PRO V2.0 — MOTOR JAVASCRIPT
 * Alto Rendimiento, Parser Inteligente y Persistencia IndexedDB
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
  const VALID_TAG_REGEX = /^(en\s*vivo|al\s*aire|estreno|repetici[oó]n|grabado|diferido|vivo|nuevo|live|premiere|repeat|recorded)$/i;

  // --- ESTADO DE LA APLICACIÓN ---
  const state = {
    channels: [],
    channelsMap: {},
    currentView: 'cards', // 'cards' (Inicio), 'list', 'guide' (Canales)
    navHistory: [],       // Pila de navegación para retorno exacto
    filter: 'all',        // 'all', 'favorites', 'adults'
    searchQuery: '',
    activeViewBeforeSearch: null,
    showBanners: true,
    showAdults: false,
    favorites: new Set(),
    cardsLimit: CARDS_INITIAL_LIMIT,
    
    // Hero Banner
    heroChannels: [],
    heroIndex: 0,
    heroTimer: null,
    heroPlaying: true,

    // Vista Canales
    selectedGuideChId: null,
    selectedGuideDayOffset: 0,

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
    el.searchBox = document.getElementById('searchBox');
    el.btnSearchToggle = document.getElementById('btnSearchToggle');
    el.btnCloseMobileSearch = document.getElementById('btnCloseMobileSearch');
    el.tabButtons = document.querySelectorAll('.tab-btn');
    el.filterChips = document.querySelectorAll('.filter-chip');
    el.favCount = document.getElementById('favCount');
    el.channelCounter = document.getElementById('channelCounter');
    el.liveClock = document.getElementById('liveClock');
    el.btnSettings = document.getElementById('btnSettings');
    el.chkFilterFavorites = document.getElementById('chkFilterFavorites');
    
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



    // 4. Canales (Guía)
    el.viewGuide = document.getElementById('viewGuide');
    el.guideChSearch = document.getElementById('guideChSearch');
    el.guideChList = document.getElementById('guideChList');
    el.guideSelectedLogo = document.getElementById('guideSelectedLogo');
    el.guideSelectedName = document.getElementById('guideSelectedName');
    el.guideSelectedMeta = document.getElementById('guideSelectedMeta');
    el.guideDateTabs = document.getElementById('guideDateTabs');
    el.guideTimeline = document.getElementById('guideTimeline');
    el.btnToggleGuideChannels = document.getElementById('btnToggleGuideChannels');
    el.guideSidebar = document.getElementById('guideSidebar');
    el.guideChHeader = document.getElementById('guideChHeader');
    el.guideChHeaderMain = document.getElementById('guideChHeaderMain');
    el.btnCloseGuideSidebar = document.getElementById('btnCloseGuideSidebar');

    // Modal de Opciones del Canal (Long-press)
    el.modalChannelActions = document.getElementById('modalChannelActions');
    el.modalActionChLogo = document.getElementById('modalActionChLogo');
    el.modalActionChName = document.getElementById('modalActionChName');
    el.btnCloseChannelActions = document.getElementById('btnCloseChannelActions');
    el.btnActionCopyName = document.getElementById('btnActionCopyName');
    el.btnActionCopyId = document.getElementById('btnActionCopyId');
    el.btnActionSearchFeeds = document.getElementById('btnActionSearchFeeds');
    el.actionCopyNameDesc = document.getElementById('actionCopyNameDesc');
    el.actionCopyIdDesc = document.getElementById('actionCopyIdDesc');
    el.actionSearchFeedsDesc = document.getElementById('actionSearchFeedsDesc');
    el.actionFeedsCountBadge = document.getElementById('actionFeedsCountBadge');

    // Toast
    el.toastNotification = document.getElementById('toastNotification');
    el.toastMessage = document.getElementById('toastMessage');

    // 5. Búsqueda
    el.viewSearch = document.getElementById('viewSearch');
    el.searchResults = document.getElementById('searchResults');

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
    el.modalBannerChBadge = document.getElementById('modalBannerChBadge');
    el.modalBannerChLogo = document.getElementById('modalBannerChLogo');
    el.modalBannerTimeBadge = document.getElementById('modalBannerTimeBadge');
    el.modalBannerTimeText = document.getElementById('modalBannerTimeText');
    el.modalBannerRemainingBadge = document.getElementById('modalBannerRemainingBadge');
    el.modalBannerRemainingText = document.getElementById('modalBannerRemainingText');
    el.modalBannerLiveBadge = document.getElementById('modalBannerLiveBadge');
    el.btnCloseDetail = document.getElementById('btnCloseDetail');
    el.modalTitle = document.getElementById('modalTitle');
    el.modalEpisode = document.getElementById('modalEpisode');
    el.modalDescription = document.getElementById('modalDescription');
    el.modalCategoriesRow = document.getElementById('modalCategoriesRow');
    el.modalCategoriesList = document.getElementById('modalCategoriesList');
    el.modalCreditsSection = document.getElementById('modalCreditsSection');
    el.modalDirectorRow = document.getElementById('modalDirectorRow');
    el.modalDirectorText = document.getElementById('modalDirectorText');
    el.modalPresenterRow = document.getElementById('modalPresenterRow');
    el.modalPresenterText = document.getElementById('modalPresenterText');
    el.modalWriterRow = document.getElementById('modalWriterRow');
    el.modalWriterText = document.getElementById('modalWriterText');
    el.modalActorsRow = document.getElementById('modalActorsRow');
    el.modalActorsList = document.getElementById('modalActorsList');
    el.modalExtraInfo = document.getElementById('modalExtraInfo');
    el.modalDuration = document.getElementById('modalDuration');
    el.modalDurationVal = document.getElementById('modalDurationVal');
    el.modalYear = document.getElementById('modalYear');
    el.modalYearVal = document.getElementById('modalYearVal');
    el.modalCountry = document.getElementById('modalCountry');
    el.modalCountryVal = document.getElementById('modalCountryVal');
    el.modalRating = document.getElementById('modalRating');
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
   * Limpia emojis, símbolos decorativos y caracteres de formato especial.
   */
  function cleanEmojisAndSymbols(str) {
    if (!str) return '';
    return str.replace(/[\u{10000}-\u{10FFFF}\u2600-\u27BF\u2300-\u23FF\uFE00-\uFE0F\u200B-\u200F\u202A-\u202E]/gu, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Extrae y limpia título, capítulo, etiqueta de transmisión e indicador en vivo.
   */
  function parseProgramInfo(rawTitle, rawDesc) {
    let title = (rawTitle || '').trim();
    let desc = (rawDesc || '').trim();
    let episode = '';
    let tag = '';
    let isBroadcastLive = false;

    // 1. Detectar tags de transmisión entre corchetes ([NEW], [LIVE], [EN VIVO], [REPLAY], etc.)
    const transMatches = title.match(/\[\s*(NEW|PREMIERE|ESTRENO|NUEVO|LIVE|EN\s+VIVO|VIVO|REPLAY|REPETICI[OÓ]N)\s*\]/gi);
    if (transMatches) {
      for (let i = 0; i < transMatches.length; i++) {
        const tNorm = transMatches[i].replace(/[\[\]]/g, '').trim().toUpperCase();
        if (tNorm.includes('VIVO') || tNorm.includes('LIVE')) {
          tag = 'En vivo';
          isBroadcastLive = true;
          break;
        } else if (['NEW', 'PREMIERE', 'ESTRENO', 'NUEVO'].includes(tNorm) || tNorm.includes('ESTRENO')) {
          if (!tag) tag = 'Estreno';
        } else if (tNorm.includes('REPLAY') || tNorm.includes('REPETICI')) {
          if (!tag) tag = 'Repetición';
        }
      }
    }

    // 2. Extraer capítulo del título con punto ("•" o "·")
    const dotMatch = title.match(/^(.+?)\s*[•·]\s*(.+)$/);
    if (dotMatch) {
      title = dotMatch[1].trim();
      episode = dotMatch[2].trim();
    }

    // 3. Limpiar todos los corchetes [...] y emojis de título y episodio
    title = cleanEmojisAndSymbols(title.replace(/\[.*?\]/g, ''));
    if (episode) {
      episode = cleanEmojisAndSymbols(episode.replace(/\[.*?\]/g, ''));
      if (/^(SH|EP|MV|SP)\d+\./i.test(episode)) {
        episode = '';
      }
    }

    // 4. Extraer etiqueta de transmisión de la descripción (separador ║)
    if (desc.includes('║')) {
      const parts = desc.split('║');
      const candidateTag = parts[0].trim();
      if (VALID_TAG_REGEX.test(candidateTag)) {
        if (!tag) tag = candidateTag;
        desc = parts.slice(1).join('║').trim();
        if (/en\s+vivo/i.test(tag)) {
          isBroadcastLive = true;
        }
      } else {
        // No es una etiqueta de emisión (ej. descripción de episodio ║ sinopsis de serie, o elenco colado)
        desc = parts.map(p => p.trim()).filter(Boolean).join('. ');
      }
    }

    // 5. Si aún no hay capítulo o si desc tiene formato "Capítulo | Sinopsis"
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

    if (episode && /^(SH|EP|MV|SP)\d+\./i.test(episode)) {
      episode = '';
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

  function fuzzyMatchPreCleaned(cleanText, searchWords) {
    if (!cleanText || !searchWords || searchWords.length === 0) return false;
    for (let i = 0; i < searchWords.length; i++) {
      if (!cleanText.includes(searchWords[i])) return false;
    }
    return true;
  }

  function getSearchDateString(p, chName) {
    const now = Date.now();
    const isLive = p.start <= now && p.stop > now;
    const isPast = p.stop <= now;

    const startDate = new Date(p.start);
    const nowDate = new Date(now);

    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const nowDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const diffDays = Math.round((startDay - nowDay) / 86400000);

    const timeRange = `${formatTime(p.start)} - ${formatTime(p.stop)}`;
    let datePrefix = "";

    if (diffDays === 0) {
      if (isLive) {
        datePrefix = "Al aire ahora";
      } else if (isPast) {
        datePrefix = `Se emitió hoy a las ${formatTime(p.start)}`;
      } else {
        datePrefix = `Hoy a las ${formatTime(p.start)}`;
      }
    } else if (diffDays === 1) {
      datePrefix = `Mañana a las ${formatTime(p.start)}`;
    } else if (diffDays === -1) {
      datePrefix = `Se emitió ayer a las ${formatTime(p.start)}`;
    } else if (diffDays > 1) {
      const dayName = startDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      datePrefix = `${capDay} a las ${formatTime(p.start)}`;
    } else {
      const dayName = startDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      datePrefix = `Se emitió el ${capDay} a las ${formatTime(p.start)}`;
    }

    return `${datePrefix} en ${chName} (${timeRange})`;
  }

  // ==========================================================================
  // 2. INTERSECTION OBSERVER PARA BANNERS & MANEJO TMS (Cero Lag)
  // ==========================================================================
  function handleTmsImageError(img) {
    if (!img) return false;
    const currentSrc = img.src || '';
    if (currentSrc.includes('tmsimg.com')) {
      if (currentSrc.includes('_h8_')) {
        img.src = currentSrc.replace('_h8_', '_h10_');
        return true;
      }
    }
    return false;
  }
  window.handleTmsImgErr = handleTmsImageError;

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src && src !== EMPTY_IMG) {
          img.src = src;
          img.onload = () => {
            if (img.naturalHeight > img.naturalWidth || (img.naturalWidth / img.naturalHeight) < 1.1) {
              img.style.display = 'none';
              img.classList.remove('loaded');
              return;
            }
            img.classList.add('loaded');
            img.style.display = '';
          };
          img.onerror = () => {
            if (handleTmsImageError(img)) {
              return;
            }
            img.style.display = 'none';
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
    'grilla': 'cards',
    'grid': 'cards',
    'canales': 'guide'
  };

  const REVERSE_VIEW_MAP = {
    'cards': 'inicio',
    'list': 'lista',
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

    // Si la búsqueda estaba activa, limpiarla al navegar por tabs o enlaces
    if (state.searchQuery) {
      state.searchQuery = '';
      if (el.searchInput) el.searchInput.value = '';
      if (el.btnClearSearch) el.btnClearSearch.classList.add('hidden');
      if (el.viewSearch) el.viewSearch.classList.add('hidden');
      state.activeViewBeforeSearch = null;
    }

    // Pausar timer de hero si salimos de Inicio
    if (previousView === 'cards' && targetView !== 'cards') {
      stopHeroAutoPlay();
    }

    state.currentView = targetView;
    if (channelId) {
      state.selectedGuideChId = channelId;
    }

    closeGuideChDropdown();
    document.body.classList.remove('header-hidden');
    if (el.appContainer) el.appContainer.scrollTop = 0;

    updateNavButtonsUI();

    // Alternar visibilidad de vistas
    if (el.viewSearch) el.viewSearch.classList.add('hidden');
    el.viewCards.classList.toggle('hidden', targetView !== 'cards');
    el.viewList.classList.toggle('hidden', targetView !== 'list');
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
  }

  function switchView(targetView, channelId = null, updateHash = true) {
    navigateTo(targetView, channelId, false);
  }

  function goBack() {
    if (state.searchQuery) {
      clearSearchState();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('cards', null, true);
    }
  }

  function updateNavButtonsUI() {
    if (el.btnBack) {
      if (state.currentView !== 'cards' || state.searchQuery) {
        el.btnBack.classList.remove('hidden');
      } else {
        el.btnBack.classList.add('hidden');
      }
    }
  }

  function renderActiveView() {
    updateChannelCounter();
    if (state.searchQuery) {
      if (el.viewSearch) el.viewSearch.classList.remove('hidden');
      el.viewCards.classList.add('hidden');
      el.viewList.classList.add('hidden');
      el.viewGuide.classList.add('hidden');
      renderSearchView();
      return;
    }
    if (state.currentView === 'cards') {
      renderCardsView();
    } else if (state.currentView === 'list') {
      renderListView();
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
        if (el.heroBannerImg.src && !el.heroBannerSide.classList.contains('hidden')) {
          el.heroBannerImg.onload = () => {
            el.heroContentBox.classList.remove('is-fading');
            el.heroBannerImg.classList.remove('is-fading');
            el.heroBannerImg.onload = null;
          };
          el.heroBannerImg.onerror = () => {
            if (handleTmsImageError(el.heroBannerImg)) {
              return;
            }
            el.heroBannerSide.classList.add('hidden');
            el.heroContentBox.classList.remove('is-fading');
            el.heroBannerImg.classList.remove('is-fading');
            el.heroBannerImg.onerror = null;
          };
        } else {
          el.heroContentBox.classList.remove('is-fading');
          el.heroBannerImg.classList.remove('is-fading');
        }
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

      const nextProg = ch.programs[ch.programs.indexOf(prog) + 1];
      const nextTitle = nextProg ? escapeHtml(nextProg.title) : 'Sin información';
      const bannerSrc = prog.icon || ch.icon || '';
      const isFallback = !prog.icon;

      const card = document.createElement('div');
      card.className = 'card-item-emision';
      card.setAttribute('data-ch-id', ch.id);
      card.innerHTML = `
        <div class="emision-banner-container">
          <img class="emision-banner-img ${isFallback ? 'fallback-img' : ''}" src="${bannerSrc || EMPTY_IMG}" alt="${escapeHtml(prog.title)}" loading="lazy" onerror="this.onerror=null;this.classList.add('fallback-img');this.src='${ch.icon || EMPTY_IMG}';">
          <div class="emision-banner-gradient"></div>
          <div class="emision-ch-logo-badge" title="${escapeHtml(ch.name)}">
            <img class="emision-ch-logo" src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy">
          </div>
          ${progressPercent > 0 ? `<div class="emision-progress-track"><div class="emision-progress-bar" style="width: ${progressPercent}%;"></div></div>` : ''}
        </div>
        <div class="emision-info">
          <div class="emision-row emision-now">
            <span class="emision-label label-ahora">Ahora:</span>
            <span class="emision-title title-now" title="${escapeHtml(prog.title)}">${escapeHtml(prog.title)}</span>
          </div>
          <div class="emision-row emision-next">
            <span class="emision-label label-despues">Después:</span>
            <span class="emision-title title-next" title="${escapeHtml(nextTitle)}">${nextTitle}</span>
          </div>
        </div>
      `;

      card.onclick = () => {
        openProgramDetail(ch, prog);
      };

      card.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu(e, [
          { label: '<b>' + escapeHtml(ch.name) + '</b>', action: () => {} },
          { label: 'Ver programación de este canal', action: () => navigateTo('guide', ch.id) },
          { label: 'Detalles del programa', action: () => openProgramDetail(ch, prog) }
        ]);
      };

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

      // Insignia en vivo compacta / adaptativa (punto rojo en móvil, badge en desktop)
      let curLiveHtml = '';
      if (curProg.isBroadcastLive) {
        curLiveHtml = `
          <span class="live-indicator-compact" title="Transmisión En Vivo">
            <span class="live-red-dot"></span>
            <span class="live-label-text">EN VIVO</span>
          </span>
        `;
      }

      let nextLiveHtml = '';
      if (nextProg && nextProg.isBroadcastLive) {
        nextLiveHtml = `
          <span class="live-indicator-compact" title="Transmisión En Vivo">
            <span class="live-red-dot"></span>
            <span class="live-label-text">EN VIVO</span>
          </span>
        `;
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
          <!-- Programa Actual: Prioridad al título completo -->
          <div class="list-prog-now">
            <span class="list-time-now">${formatTime(curProg.start)}</span>
            ${curLiveHtml}
            <span class="list-title-now">${escapeHtml(curProg.title)}</span>
            ${curProg.episode ? `
              <span class="list-chapter-badge">
                <span class="chapter-dot" title="Capítulo: ${escapeHtml(curProg.episode)}">•</span>
                <span class="chapter-name">${escapeHtml(curProg.episode)}</span>
              </span>
            ` : ''}
          </div>
          <!-- Siguiente Programa -->
          ${nextProg ? `
            <div class="list-prog-next">
              <span class="list-time-next">${formatTime(nextProg.start)}</span>
              ${nextLiveHtml}
              <span class="list-title-next">${escapeHtml(nextProg.title)}</span>
              ${nextProg.episode ? `
                <span class="list-chapter-badge muted">
                  <span class="chapter-dot" title="Capítulo: ${escapeHtml(nextProg.episode)}">•</span>
                  <span class="chapter-name">${escapeHtml(nextProg.episode)}</span>
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;

      fragment.appendChild(row);
    }

    container.appendChild(fragment);
    requestAnimationFrame(() => adjustListChapters());
  }

  /**
   * Ajusta la visibilidad del nombre del capítulo en la Vista Lista.
   * Si no hay espacio suficiente para mostrar el título y el capítulo completo sin
   * recortar el título o el nombre del capítulo, se oculta el texto del capítulo y
   * se mantiene únicamente el punto azul (•), priorizando siempre el título completo.
   */
  function adjustListChapters() {
    if (!el.listContainer) return;
    if (window.innerWidth <= 768) return; // En móvil se fuerza por CSS

    const badges = el.listContainer.querySelectorAll('.list-chapter-badge');
    if (badges.length === 0) return;

    badges.forEach(badge => {
      const parent = badge.parentElement;
      if (!parent) return;

      badge.classList.remove('dot-only');

      const nameEl = badge.querySelector('.chapter-name');
      const titleEl = parent.querySelector('.list-title-now, .list-title-next');
      if (!nameEl || !titleEl) return;

      // Si el contenedor desborda o el texto del capítulo se comprime, dejamos solo el punto
      if (parent.scrollWidth > parent.clientWidth || (nameEl.offsetWidth < nameEl.scrollWidth - 1)) {
        badge.classList.add('dot-only');
      }
    });
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

        const liveHtml = p.isBroadcastLive ? `
          <span class="live-indicator-compact" title="Transmisión En Vivo">
            <span class="live-red-dot"></span>
            <span class="live-label-text">EN VIVO</span>
          </span>
        ` : '';

        // REQUERIMIENTO: Solo mostrar el punto azul en caso de tener capítulo
        const chapterDotHtml = p.episode ? `
          <span class="chapter-dot" title="Capítulo: ${escapeHtml(p.episode)}">•</span>
        ` : '';

        item.innerHTML = `
          <span class="quick-time">${formatTime(p.start)}</span>
          ${liveHtml}
          <span class="quick-item-title">${escapeHtml(p.title)}</span>
          ${chapterDotHtml}
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

  function toggleGuideChDropdown() {
    if (!el.guideSidebar) return;
    const isOpen = el.guideSidebar.classList.toggle('mobile-open');
    if (el.btnToggleGuideChannels) {
      el.btnToggleGuideChannels.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      const chevron = el.btnToggleGuideChannels.querySelector('.picker-chevron');
      if (chevron) chevron.classList.toggle('open', isOpen);
    }
    if (isOpen && el.guideChSearch) {
      setTimeout(() => el.guideChSearch.focus(), 80);
    }
  }

  function closeGuideChDropdown() {
    if (!el.guideSidebar) return;
    el.guideSidebar.classList.remove('mobile-open');
    if (el.btnToggleGuideChannels) {
      el.btnToggleGuideChannels.setAttribute('aria-expanded', 'false');
      const chevron = el.btnToggleGuideChannels.querySelector('.picker-chevron');
      if (chevron) chevron.classList.remove('open');
    }
  }

  function selectGuideChannel(chId, updateHash = true) {
    state.selectedGuideChId = chId;
    closeGuideChDropdown();
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
    // Ocultar ID del canal por completo
    el.guideSelectedMeta.innerText = `${ch.programs ? ch.programs.length : 0} programas en guía`;

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
      if (prog.tag && VALID_TAG_REGEX.test(prog.tag) && !/en\s*vivo/i.test(prog.tag)) {
        tagHtml = `<span class="tag-pill">${escapeHtml(prog.tag)}</span>`;
      }

      // Etiquetas de metadatos rápidos (Solo Clasificación de edad, quitando año y categoría)
      let metaExtraHtml = '';
      const metaItems = [];
      if (prog.rating) metaItems.push(`<span class="guide-chip-rating">${escapeHtml(prog.rating)}</span>`);
      if (metaItems.length > 0) {
        metaExtraHtml = `<div class="guide-prog-chips-row">${metaItems.join('')}</div>`;
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
          ${metaExtraHtml}
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
  // 8B. VISTA BÚSQUEDA Y RESULTADOS
  // Canales primero, luego programas al aire, luego próximos y finalizados
  // ==========================================================================
  function clearSearchState() {
    state.searchQuery = '';
    if (el.searchInput) el.searchInput.value = '';
    if (el.btnClearSearch) el.btnClearSearch.classList.add('hidden');
    if (el.viewSearch) el.viewSearch.classList.add('hidden');
    if (el.searchBox) el.searchBox.classList.remove('mobile-open');

    const targetView = state.activeViewBeforeSearch || state.currentView || 'cards';
    state.activeViewBeforeSearch = null;

    el.viewCards.classList.toggle('hidden', targetView !== 'cards');
    el.viewList.classList.toggle('hidden', targetView !== 'list');
    el.viewGuide.classList.toggle('hidden', targetView !== 'guide');

    updateNavButtonsUI();
    renderActiveView();

    if (targetView === 'cards' && state.heroPlaying) {
      startHeroAutoPlay();
    }
  }

  function createSearchProgramCard(ch, p, type, now) {
    const card = document.createElement('div');
    const isLive = type === 'live';
    const isUpcoming = type === 'upcoming';
    const isPast = type === 'past';

    let cardClasses = 'search-prog-card';
    if (isLive) {
      cardClasses += p.isBroadcastLive ? ' is-broadcast-live is-live' : ' is-live';
    } else if (isUpcoming) {
      cardClasses += ' is-upcoming';
    } else if (isPast) {
      cardClasses += ' is-past';
    }
    card.className = cardClasses;

    // Badges de estado diferenciados
    let badgeHtml = '';
    if (isLive) {
      if (p.isBroadcastLive) {
        badgeHtml = '<span class="search-status-badge en-vivo">EN VIVO</span>';
      } else {
        badgeHtml = '<span class="search-status-badge live">AL AIRE</span>';
      }
    } else if (isUpcoming) {
      badgeHtml = '<span class="search-status-badge upcoming">PRÓXIMO</span>';
    } else if (isPast) {
      badgeHtml = '<span class="search-status-badge past">FINALIZADO</span>';
    }

    const metaString = getSearchDateString(p, ch.name);
    const posterSrc = state.showBanners ? (p.icon || '') : '';

    // Barra de progreso si está al aire
    let progressBarHtml = '';
    if (isLive && p.stop > p.start) {
      const pct = Math.min(100, Math.max(0, ((now - p.start) / (p.stop - p.start)) * 100));
      progressBarHtml = `
        <div class="search-prog-progress-track">
          <div class="search-prog-progress-bar" style="width: ${pct}%"></div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="search-prog-ch-logo" title="${escapeHtml(ch.name)} (${escapeHtml(ch.id)})">
        <img src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy" onerror="this.src='${EMPTY_IMG}'">
      </div>
      <div class="search-prog-main">
        <div class="search-prog-header">
          ${badgeHtml}
          <span class="search-prog-title">${escapeHtml(p.title)}</span>
          ${p.episode ? `<span class="search-prog-episode">• ${escapeHtml(p.episode)}</span>` : ''}
        </div>
        <div class="search-prog-meta-row">
          <span class="search-prog-meta-text">${escapeHtml(metaString)}</span>
        </div>
        ${progressBarHtml}
      </div>
      ${posterSrc ? `
        <div class="search-prog-banner">
          <img src="${posterSrc}" alt="" loading="lazy" onerror="if (window.handleTmsImgErr && window.handleTmsImgErr(this)) return; this.parentElement.style.display='none'">
        </div>
      ` : ''}
    `;

    card.onclick = () => {
      openProgramDetail(ch, p);
    };

    return card;
  }

  function renderSearchView() {
    const term = state.searchQuery.trim();
    const container = el.searchResults;
    if (!container) return;

    if (!term) {
      container.innerHTML = `
        <div class="search-empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" class="search-empty-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p class="search-empty-text">Escribe para buscar canales o programas...</p>
        </div>
      `;
      return;
    }

    const cleanTerm = cleanStr(term);
    const searchWords = cleanTerm.split(/\s+/).filter(Boolean);

    const now = Date.now();
    const matchedChannels = [];
    const livePrograms = [];
    const upcomingPrograms = [];
    const pastPrograms = [];

    // 1. Buscar canales y programas en el catálogo completo
    state.channels.forEach(ch => {
      if (!state.showAdults && ch.isAdult) return;
      if (state.filter === 'favorites' && !state.favorites.has(ch.id)) return;
      if (state.filter === 'adults' && !ch.isAdult) return;

      // Coincidencia de canal (por nombre o dial/id)
      const isChMatch = fuzzyMatchPreCleaned(ch.cleanName, searchWords) ||
                        ch.id.toLowerCase().includes(cleanTerm);
      if (isChMatch) {
        matchedChannels.push(ch);
      }

      // Coincidencia en programas del canal
      if (ch.programs && ch.programs.length > 0) {
        ch.programs.forEach(p => {
          const cTitle = p.cleanTitle || (p.cleanTitle = cleanStr(p.title));
          const cDesc = p.cleanDesc || (p.cleanDesc = cleanStr(p.desc));
          const cEp = p.cleanEpisode || (p.cleanEpisode = cleanStr(p.episode));

          if (fuzzyMatchPreCleaned(cTitle, searchWords) ||
              fuzzyMatchPreCleaned(cDesc, searchWords) ||
              fuzzyMatchPreCleaned(cEp, searchWords)) {

            const item = { ch, prog: p };
            if (p.start <= now && p.stop > now) {
              livePrograms.push(item);
            } else if (p.start > now) {
              upcomingPrograms.push(item);
            } else {
              pastPrograms.push(item);
            }
          }
        });
      }
    });

    // 2. Ordenamiento específico
    matchedChannels.sort(compareYXXX);
    livePrograms.sort((a, b) => a.prog.start - b.prog.start);
    upcomingPrograms.sort((a, b) => a.prog.start - b.prog.start);
    pastPrograms.sort((a, b) => b.prog.stop - a.prog.stop);

    // 3. Estado vacío si no hay nada
    if (matchedChannels.length === 0 && livePrograms.length === 0 && upcomingPrograms.length === 0 && pastPrograms.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" class="search-empty-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p class="search-empty-text">No se encontraron resultados para "<strong>${escapeHtml(term)}</strong>".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    // =========================================================
    // SECCIÓN 1: CANALES ENCONTRADOS (PRIMERO)
    // =========================================================
    if (matchedChannels.length > 0) {
      const chSec = document.createElement('div');
      chSec.className = 'search-results-section';
      chSec.innerHTML = `
        <div class="search-section-header">
          <h3 class="search-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
            <span>Canales Encontrados</span>
            <span class="search-count-pill">${matchedChannels.length}</span>
          </h3>
        </div>
      `;

      const grid = document.createElement('div');
      grid.className = 'search-channels-grid';

      matchedChannels.forEach(ch => {
        const item = document.createElement('div');
        item.className = 'search-ch-card';
        item.title = `${ch.name} (Dial ${ch.id})`;
        item.innerHTML = `
          <div class="search-ch-logo-wrap">
            <img src="${ch.icon || EMPTY_IMG}" alt="" loading="lazy" onerror="this.src='${EMPTY_IMG}'">
          </div>
          <span class="search-ch-card-name">${escapeHtml(ch.name)}</span>
          <span class="search-ch-card-id">${escapeHtml(ch.id)}</span>
        `;
        item.onclick = () => {
          clearSearchState();
          state.selectedGuideDayOffset = 0;
          navigateTo('guide', ch.id, true);
        };
        grid.appendChild(item);
      });

      chSec.appendChild(grid);
      container.appendChild(chSec);
    }

    // =========================================================
    // SECCIÓN 2: PROGRAMAS AL AIRE (SEGUNDO)
    // =========================================================
    if (livePrograms.length > 0) {
      const liveSec = document.createElement('div');
      liveSec.className = 'search-results-section';
      liveSec.innerHTML = `
        <div class="search-section-header">
          <h3 class="search-section-title">
            <span class="live-pulse-dot"></span>
            <span>Programas Al Aire</span>
            <span class="search-count-pill live">${livePrograms.length}</span>
          </h3>
        </div>
      `;

      const list = document.createElement('div');
      list.className = 'search-prog-list';

      livePrograms.forEach(item => {
        list.appendChild(createSearchProgramCard(item.ch, item.prog, 'live', now));
      });

      liveSec.appendChild(list);
      container.appendChild(liveSec);
    }

    // =========================================================
    // SECCIÓN 3: PROGRAMAS QUE SE TRANSMITIRÁN (PRÓXIMOS)
    // =========================================================
    if (upcomingPrograms.length > 0) {
      const upSec = document.createElement('div');
      upSec.className = 'search-results-section';
      
      const count = upcomingPrograms.length;
      upSec.innerHTML = `
        <div class="search-section-header">
          <h3 class="search-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Próximas Emisiones</span>
            <span class="search-count-pill upcoming">${count}</span>
          </h3>
        </div>
      `;

      const list = document.createElement('div');
      list.className = 'search-prog-list';

      const initialUpcoming = upcomingPrograms.slice(0, 40);
      initialUpcoming.forEach(item => {
        list.appendChild(createSearchProgramCard(item.ch, item.prog, 'upcoming', now));
      });

      upSec.appendChild(list);

      if (upcomingPrograms.length > 40) {
        const moreBox = document.createElement('div');
        moreBox.className = 'load-more-box';
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn-load-more';
        moreBtn.innerHTML = `<span>Ver ${upcomingPrograms.length - 40} programas próximos más</span>`;
        moreBtn.onclick = () => {
          upcomingPrograms.slice(40).forEach(item => {
            list.appendChild(createSearchProgramCard(item.ch, item.prog, 'upcoming', now));
          });
          moreBox.remove();
        };
        moreBox.appendChild(moreBtn);
        upSec.appendChild(moreBox);
      }

      container.appendChild(upSec);
    }

    // =========================================================
    // SECCIÓN 4: PROGRAMAS YA TRANSMITIDOS (FINALIZADOS)
    // =========================================================
    if (pastPrograms.length > 0) {
      const pastSec = document.createElement('div');
      pastSec.className = 'search-results-section';
      
      const count = pastPrograms.length;
      pastSec.innerHTML = `
        <div class="search-section-header">
          <h3 class="search-section-title past-header">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Ya Transmitidos (Finalizados)</span>
            <span class="search-count-pill past">${count}</span>
          </h3>
        </div>
      `;

      const list = document.createElement('div');
      list.className = 'search-prog-list';

      const initialPast = pastPrograms.slice(0, 30);
      initialPast.forEach(item => {
        list.appendChild(createSearchProgramCard(item.ch, item.prog, 'past', now));
      });

      pastSec.appendChild(list);

      if (pastPrograms.length > 30) {
        const moreBox = document.createElement('div');
        moreBox.className = 'load-more-box';
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn-load-more';
        moreBtn.innerHTML = `<span>Ver ${pastPrograms.length - 30} programas anteriores más</span>`;
        moreBtn.onclick = () => {
          pastPrograms.slice(30).forEach(item => {
            list.appendChild(createSearchProgramCard(item.ch, item.prog, 'past', now));
          });
          moreBox.remove();
        };
        moreBox.appendChild(moreBtn);
        pastSec.appendChild(moreBox);
      }

      container.appendChild(pastSec);
    }
  }

  // ==========================================================================
  // 9. MODAL DETALLE COMPLETO
  // ==========================================================================
  function openProgramDetail(ch, prog) {
    state.activeModalProg = prog;
    state.modalActiveChannel = ch;

    // Logo del canal en la esquina inferior izquierda
    if (el.modalBannerChLogo) {
      el.modalBannerChLogo.src = ch.icon || EMPTY_IMG;
    }

    const now = Date.now();
    const isLive = prog.start <= now && prog.stop > now;

    // Badge de AL AIRE / EN VIVO en la esquina inferior derecha del banner (arriba del tiempo restante)
    if (el.modalBannerLiveBadge) {
      if (prog.isBroadcastLive) {
        el.modalBannerLiveBadge.className = 'live-pill badge-en-vivo';
        el.modalBannerLiveBadge.innerText = 'EN VIVO';
        el.modalBannerLiveBadge.classList.remove('hidden');
      } else if (isLive) {
        el.modalBannerLiveBadge.className = 'live-pill badge-al-aire';
        el.modalBannerLiveBadge.innerText = 'AL AIRE';
        el.modalBannerLiveBadge.classList.remove('hidden');
      } else {
        el.modalBannerLiveBadge.classList.add('hidden');
      }
    }

    // Hora de inicio y fin sobre el banner (abajo a la izquierda junto al logo)
    const timeFormatted = `${formatTime(prog.start)} - ${formatTime(prog.stop)}`;
    if (el.modalBannerTimeText) {
      el.modalBannerTimeText.innerText = timeFormatted;
    }

    // Cuántos minutos quedan sobre el banner (abajo a la derecha, debajo del badge al aire)
    if (el.modalBannerRemainingText) {
      if (now >= prog.start && now < prog.stop) {
        const minsLeft = Math.max(1, Math.round((prog.stop - now) / 60000));
        el.modalBannerRemainingText.innerText = `Quedan ${minsLeft} min`;
        if (el.modalBannerRemainingBadge) el.modalBannerRemainingBadge.classList.remove('hidden');
      } else if (now < prog.start) {
        const minsToStart = Math.round((prog.start - now) / 60000);
        if (minsToStart < 60) {
          el.modalBannerRemainingText.innerText = `Empieza en ${minsToStart} min`;
        } else {
          const h = Math.floor(minsToStart / 60);
          const m = minsToStart % 60;
          el.modalBannerRemainingText.innerText = m > 0 ? `En ${h}h ${m}m` : `En ${h}h`;
        }
        if (el.modalBannerRemainingBadge) el.modalBannerRemainingBadge.classList.remove('hidden');
      } else {
        el.modalBannerRemainingText.innerText = 'Finalizado';
        if (el.modalBannerRemainingBadge) el.modalBannerRemainingBadge.classList.remove('hidden');
      }
    }

    // 1. TÍTULO
    el.modalTitle.innerText = prog.title;

    // 2. CAPÍTULO (si existe)
    if (el.modalEpisode) {
      if (prog.episode) {
        el.modalEpisode.innerText = prog.episode;
        el.modalEpisode.classList.remove('hidden');
      } else {
        el.modalEpisode.innerText = '';
        el.modalEpisode.classList.add('hidden');
      }
    }

    // 3. DESCRIPCIÓN
    el.modalDescription.innerText = prog.desc || 'Sin descripción disponible para este programa.';

    // 4. CATEGORÍAS (con la etiqueta de emisión saliendo de primero en la misma línea)
    const cats = (prog.categories && prog.categories.length > 0) ? [...prog.categories] : (prog.category ? [prog.category] : []);
    const hasTag = prog.tag && VALID_TAG_REGEX.test(prog.tag) && !/en\s*vivo/i.test(prog.tag);

    if (hasTag || cats.length > 0) {
      el.modalCategoriesList.innerHTML = '';

      // Si hay etiqueta (ej: Estreno, Película, Especial), se muestra primero
      if (hasTag) {
        const tagChip = document.createElement('span');
        tagChip.className = 'category-chip tag-chip';
        tagChip.innerText = prog.tag;
        el.modalCategoriesList.appendChild(tagChip);
      }

      // Luego el resto de categorías
      cats.forEach(cat => {
        if (hasTag && cat.toLowerCase() === prog.tag.toLowerCase()) return;
        const chip = document.createElement('span');
        chip.className = 'category-chip';
        chip.innerText = cat;
        el.modalCategoriesList.appendChild(chip);
      });

      el.modalCategoriesRow.classList.remove('hidden');
    } else {
      el.modalCategoriesRow.classList.add('hidden');
    }

    // 5. REPARTO
    let hasCredits = false;
    if (prog.directors && prog.directors.length > 0) {
      el.modalDirectorText.innerText = prog.directors.join(', ');
      el.modalDirectorRow.classList.remove('hidden');
      hasCredits = true;
    } else {
      el.modalDirectorRow.classList.add('hidden');
    }

    if (prog.presenters && prog.presenters.length > 0) {
      el.modalPresenterText.innerText = prog.presenters.join(', ');
      el.modalPresenterRow.classList.remove('hidden');
      hasCredits = true;
    } else {
      el.modalPresenterRow.classList.add('hidden');
    }

    if (prog.writers && prog.writers.length > 0) {
      el.modalWriterText.innerText = prog.writers.join(', ');
      el.modalWriterRow.classList.remove('hidden');
      hasCredits = true;
    } else {
      el.modalWriterRow.classList.add('hidden');
    }

    if (prog.actors && prog.actors.length > 0) {
      el.modalActorsList.innerHTML = '';
      prog.actors.forEach(actor => {
        const aChip = document.createElement('span');
        aChip.className = 'actor-chip';
        aChip.innerText = actor;
        el.modalActorsList.appendChild(aChip);
      });
      el.modalActorsRow.classList.remove('hidden');
      hasCredits = true;
    } else {
      el.modalActorsRow.classList.add('hidden');
    }

    el.modalCreditsSection.classList.toggle('hidden', !hasCredits);

    // 6. OTRA INFO (duración, año, país, etc.)
    let hasExtra = false;
    const durationMins = Math.round((prog.stop - prog.start) / 60000);
    if (durationMins > 0) {
      if (el.modalDurationVal) el.modalDurationVal.innerText = `${durationMins} min`;
      if (el.modalDuration) el.modalDuration.classList.remove('hidden');
      hasExtra = true;
    } else if (el.modalDuration) {
      el.modalDuration.classList.add('hidden');
    }

    if (prog.year) {
      if (el.modalYearVal) el.modalYearVal.innerText = prog.year;
      if (el.modalYear) el.modalYear.classList.remove('hidden');
      hasExtra = true;
    } else if (el.modalYear) {
      el.modalYear.classList.add('hidden');
    }

    if (prog.country) {
      if (el.modalCountryVal) el.modalCountryVal.innerText = prog.country;
      if (el.modalCountry) el.modalCountry.classList.remove('hidden');
      hasExtra = true;
    } else if (el.modalCountry) {
      el.modalCountry.classList.add('hidden');
    }

    if (prog.rating) {
      if (el.modalRating) {
        el.modalRating.innerText = prog.rating;
        el.modalRating.classList.remove('hidden');
      }
      hasExtra = true;
    } else if (el.modalRating) {
      el.modalRating.classList.add('hidden');
    }

    if (el.modalExtraInfo) {
      el.modalExtraInfo.classList.toggle('hidden', !hasExtra);
    }

    const banner = prog.icon || ch.icon || '';
    if (el.modalBannerBox) {
      el.modalBannerBox.classList.remove('hidden');
    }
    if (banner && state.showBanners) {
      el.modalBannerImg.classList.remove('hidden');
      el.modalBannerImg.onerror = () => {
        if (handleTmsImageError(el.modalBannerImg)) return;
        el.modalBannerImg.classList.add('hidden');
        el.modalBannerImg.onerror = null;
      };
      el.modalBannerImg.src = banner;
    } else {
      el.modalBannerImg.classList.add('hidden');
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
    if (el.favCount) el.favCount.innerText = state.favorites.size;
  }

  function updateChannelCounter() {
    if (el.channelCounter) {
      const total = state.channels.length;
      el.channelCounter.innerText = `${total} canales`;
    }
  }

  function startLiveClock() {
    function tick() {
      if (!el.liveClock) return;
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
      let icon = iconEl ? iconEl.getAttribute("src") : "";
      if (icon && icon.includes("tmsimg.com")) {
        if (/\/assets\/GNL[A-Z0-9]+\.jpg/i.test(icon)) {
          icon = "";
        } else {
          icon = icon.replace(/_(?:v\d+|v)_/i, "_h8_");
          if (/[?&]w=\d+/.test(icon)) {
            icon = icon.replace(/([?&]w=)\d+/, "$11280");
          } else if (icon.includes("?")) {
            icon += "&w=1280";
          } else {
            icon += "?w=1280";
          }
        }
      }

      // Categorías múltiples y filtrado de episodios colados (ej: mitv)
      const catEls = p.getElementsByTagName("category");
      const categories = [];
      let catEpRescued = '';
      let catSubRescued = '';
      for (let c = 0; c < catEls.length; c++) {
        const val = catEls[c].textContent.trim();
        if (!val) continue;

        if (/^(?:temporada|episodio|cap[ií]tulo)\b/i.test(val) || /^[\-–—]\s*/.test(val) || /\/\s*(?:19|20)\d\d/.test(val) || /\b(?:temporada\s+\d+|episodio\s+\d+)\b/i.test(val)) {
          if (!catEpRescued) {
            const mEp = val.match(/(?:Temporada\s+(\d+)\s+)?(?:Episodio|Cap[ií]tulo)\s+(\d+)/i);
            if (mEp) {
              catEpRescued = mEp[1] ? `T${mEp[1]} E${mEp[2]}` : `E${mEp[2]}`;
            }
          }
          if (!catSubRescued) {
            const mSub = val.match(/(?:Temporada\s+\d+\s+)?(?:Episodio\s+\d+\s*)?[\-–—]\s*(.+)/i);
            if (mSub) {
              catSubRescued = mSub[1].trim();
            }
          }
          continue;
        }

        if (!categories.includes(val)) categories.push(val);
      }
      const category = categories[0] || "";

      // Año de lanzamiento (<date>) - extraer solo 4 dígitos
      const dateEl = p.getElementsByTagName("date")[0];
      let year = dateEl ? dateEl.textContent.trim() : "";
      if (year) {
        const mYear = year.match(/(19\d\d|20\d\d)/);
        if (mYear) {
          year = mYear[1];
        } else if (year.length >= 4 && /^\d{4}/.test(year)) {
          year = year.substring(0, 4);
        }
      }

      // País de origen (<country>)
      const countryEl = p.getElementsByTagName("country")[0];
      const country = countryEl ? countryEl.textContent.trim() : "";

      // Clasificación por edad (<rating><value>)
      const ratingEl = p.getElementsByTagName("rating")[0];
      let rating = "";
      if (ratingEl) {
        const valEl = ratingEl.getElementsByTagName("value")[0];
        rating = valEl ? valEl.textContent.trim() : ratingEl.textContent.trim();
      }

      // Créditos (<credits>: director, actor, presenter, writer)
      const creditsEl = p.getElementsByTagName("credits")[0];
      const directors = [];
      const actors = [];
      const presenters = [];
      const writers = [];
      if (creditsEl) {
        const dNodes = creditsEl.getElementsByTagName("director");
        for (let d = 0; d < dNodes.length; d++) {
          const v = dNodes[d].textContent.trim();
          if (v && !directors.includes(v)) directors.push(v);
        }
        const aNodes = creditsEl.getElementsByTagName("actor");
        for (let a = 0; a < aNodes.length; a++) {
          const v = aNodes[a].textContent.trim();
          if (v && !actors.includes(v)) actors.push(v);
        }
        const prNodes = creditsEl.getElementsByTagName("presenter");
        for (let pr = 0; pr < prNodes.length; pr++) {
          const v = prNodes[pr].textContent.trim();
          if (v && !presenters.includes(v)) presenters.push(v);
        }
        const wNodes = creditsEl.getElementsByTagName("writer");
        for (let w = 0; w < wNodes.length; w++) {
          const v = wNodes[w].textContent.trim();
          if (v && !writers.includes(v)) writers.push(v);
        }
      }

      // Extracción limpia de título, capítulo y etiquetas
      const parsed = parseProgramInfo(rawTitle, rawDesc);

      // Si no detectó capítulo en texto pero viene <sub-title> o <episode-num>
      const subTitleEl = p.getElementsByTagName("sub-title")[0];
      let cleanSub = subTitleEl ? subTitleEl.textContent.trim() : '';
      if (!cleanSub && catSubRescued) {
        cleanSub = catSubRescued;
      }
      if (cleanSub) {
        cleanSub = cleanEmojisAndSymbols(cleanSub.replace(/\[.*?\]/g, ''));
        if (/^(SH|EP|MV|SP)\d+\./i.test(cleanSub)) {
          cleanSub = '';
        }
      }

      const epNumEls = p.getElementsByTagName("episode-num");
      let validEpNum = '';
      for (let eIdx = 0; eIdx < epNumEls.length; eIdx++) {
        const epVal = epNumEls[eIdx].textContent.trim();
        const sysVal = epNumEls[eIdx].getAttribute("system") || "";
        if (sysVal === "dd_progid" || /^(SH|EP|MV|SP)\d+\./i.test(epVal)) {
          continue;
        }
        if (sysVal === "xmltv_ns" || /^\d+\.\d+\./.test(epVal)) {
          const mNs = epVal.match(/^(\d+)\.(\d+)\./);
          if (mNs && parseInt(mNs[1], 10) < 100) {
            validEpNum = `T${parseInt(mNs[1], 10) + 1} E${parseInt(mNs[2], 10) + 1}`;
            break;
          }
          continue;
        }
        validEpNum = epVal;
        break;
      }
      if (!validEpNum && catEpRescued) {
        validEpNum = catEpRescued;
      }

      const extraEp = cleanSub || validEpNum;
      if (!parsed.episode && extraEp && !/^(SH|EP|MV|SP)\d+\./i.test(extraEp)) {
        parsed.episode = extraEp;
      }

      chObj.programs.push({
        start,
        stop,
        title: parsed.title,
        cleanTitle: cleanStr(parsed.title),
        desc: parsed.desc,
        cleanDesc: cleanStr(parsed.desc),
        episode: parsed.episode,
        cleanEpisode: cleanStr(parsed.episode),
        tag: parsed.tag,
        isBroadcastLive: parsed.isBroadcastLive,
        icon,
        category,
        categories,
        year,
        country,
        rating,
        directors,
        actors,
        presenters,
        writers
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
  // 11B. TOAST Y OPCIONES DE CANAL (LONG-PRESS / MANTENER PRESIONADO)
  // ==========================================================================
  let toastTimer = null;
  function showToast(message) {
    if (!el.toastNotification || !el.toastMessage) return;
    el.toastMessage.innerText = message;
    el.toastNotification.classList.remove('hidden');
    void el.toastNotification.offsetWidth;
    el.toastNotification.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toastNotification.classList.remove('visible');
      setTimeout(() => {
        el.toastNotification.classList.add('hidden');
      }, 240);
    }, 2200);
  }

  function getChannelBaseName(name) {
    if (!name) return '';
    if (name.includes('•')) return name.split('•')[0].trim();
    if (name.includes('·')) return name.split('·')[0].trim();
    if (name.includes('-')) {
      const p = name.split('-');
      if (p.length === 2 && /feed|señal|chile|latam|sur|norte|panregional|hdi/i.test(p[1])) {
        return p[0].trim();
      }
    }
    return name.trim();
  }

  function getOtherFeedsForChannel(ch) {
    if (!ch) return [];
    const base = getChannelBaseName(ch.name);
    const cleanBase = cleanStr(base);
    const dial = (ch.id && ch.id.length >= 4) ? ch.id.slice(-3) : null;

    return state.channels.filter(c => {
      if (c.id === ch.id) return false;
      if (cleanBase.length >= 3 && c.cleanName.includes(cleanBase)) return true;
      if (dial && c.id && c.id.length >= 4 && c.id.slice(-3) === dial) return true;
      return false;
    });
  }

  function openChannelActionsModal(ch) {
    const channel = ch || state.channelsMap[state.selectedGuideChId];
    if (!channel) return;
    state.activeChannelForActions = channel;

    if (el.modalActionChLogo) el.modalActionChLogo.src = channel.icon || EMPTY_IMG;
    if (el.modalActionChName) el.modalActionChName.innerText = channel.name;
    if (el.actionCopyNameDesc) el.actionCopyNameDesc.innerText = channel.name;
    if (el.actionCopyIdDesc) el.actionCopyIdDesc.innerText = `ID: ${channel.id}`;

    const otherFeeds = getOtherFeedsForChannel(channel);
    if (el.btnActionSearchFeeds) {
      if (otherFeeds.length > 0) {
        el.btnActionSearchFeeds.classList.remove('hidden');
        const baseName = getChannelBaseName(channel.name);
        if (el.actionSearchFeedsDesc) {
          el.actionSearchFeedsDesc.innerText = `Filtrar "${baseName}" en selector`;
        }
        if (el.actionFeedsCountBadge) {
          const total = otherFeeds.length + 1;
          el.actionFeedsCountBadge.innerText = `${total} feeds`;
        }
      } else {
        el.btnActionSearchFeeds.classList.add('hidden');
      }
    }

    if (el.modalChannelActions) {
      el.modalChannelActions.classList.remove('hidden');
    }
  }

  function closeChannelActionsModal() {
    if (el.modalChannelActions) {
      el.modalChannelActions.classList.add('hidden');
    }
    state.activeChannelForActions = null;
  }

  function copyChannelName() {
    const ch = state.activeChannelForActions || state.channelsMap[state.selectedGuideChId];
    if (!ch) return;
    closeChannelActionsModal();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ch.name).then(() => {
        showToast(`Nombre copiado: ${ch.name}`);
      }).catch(() => {
        showToast(`Nombre: ${ch.name}`);
      });
    } else {
      showToast(`Nombre: ${ch.name}`);
    }
  }

  function copyChannelId() {
    const ch = state.activeChannelForActions || state.channelsMap[state.selectedGuideChId];
    if (!ch) return;
    closeChannelActionsModal();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ch.id).then(() => {
        showToast(`ID copiado: ${ch.id}`);
      }).catch(() => {
        showToast(`ID: ${ch.id}`);
      });
    } else {
      showToast(`ID: ${ch.id}`);
    }
  }

  function searchChannelOtherFeeds() {
    const ch = state.activeChannelForActions || state.channelsMap[state.selectedGuideChId];
    if (!ch) return;
    closeChannelActionsModal();

    const base = getChannelBaseName(ch.name);

    if (state.currentView !== 'guide') {
      navigateTo('guide', ch.id, true);
    }

    if (el.guideSidebar && !el.guideSidebar.classList.contains('mobile-open')) {
      toggleGuideChDropdown();
    }

    if (el.guideChSearch) {
      el.guideChSearch.value = base;
      el.guideChSearch.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        el.guideChSearch.focus();
        if (el.guideChSearch.select) el.guideChSearch.select();
      }, 100);
    }

    if (el.guideChList) {
      el.guideChList.scrollTop = 0;
    }
    showToast(`Filtrando feeds de "${base}"`);
  }

  // ==========================================================================
  // 12. EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    if (el.btnBack) el.btnBack.onclick = goBack;

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
        if (val.length > 0) {
          if (!state.searchQuery && !state.activeViewBeforeSearch) {
            state.activeViewBeforeSearch = state.currentView;
          }
          state.searchQuery = val;
          el.viewCards.classList.add('hidden');
          el.viewList.classList.add('hidden');
          el.viewGuide.classList.add('hidden');
          if (el.viewSearch) el.viewSearch.classList.remove('hidden');
          updateNavButtonsUI();
          renderSearchView();
        } else {
          clearSearchState();
        }
      }, 150);
    };

    el.btnClearSearch.onclick = () => {
      clearSearchState();
      el.searchInput.focus();
    };

    // Toggle barra de búsqueda en móvil
    if (el.btnSearchToggle) {
      el.btnSearchToggle.onclick = (e) => {
        e.stopPropagation();
        const isOpen = el.searchBox.classList.toggle('mobile-open');
        if (isOpen) {
          el.searchInput.focus();
        }
      };
    }

    if (el.btnCloseMobileSearch) {
      el.btnCloseMobileSearch.onclick = () => {
        el.searchBox.classList.remove('mobile-open');
        clearSearchState();
      };
    }

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

    // Toggle menú desplegable de canales en móvil
    if (el.btnToggleGuideChannels) {
      el.btnToggleGuideChannels.onclick = (e) => {
        e.stopPropagation();
        toggleGuideChDropdown();
      };
    }

    if (el.btnCloseGuideSidebar) {
      el.btnCloseGuideSidebar.onclick = (e) => {
        e.stopPropagation();
        closeGuideChDropdown();
      };
    }

    // Modal de Opciones del Canal
    if (el.btnCloseChannelActions) {
      el.btnCloseChannelActions.onclick = closeChannelActionsModal;
    }
    if (el.modalChannelActions) {
      el.modalChannelActions.onclick = (e) => {
        if (e.target === el.modalChannelActions) {
          closeChannelActionsModal();
        }
      };
    }
    if (el.btnActionCopyName) {
      el.btnActionCopyName.onclick = copyChannelName;
    }
    if (el.btnActionCopyId) {
      el.btnActionCopyId.onclick = copyChannelId;
    }
    if (el.btnActionSearchFeeds) {
      el.btnActionSearchFeeds.onclick = searchChannelOtherFeeds;
    }

    // Long press y click en la cabecera del canal
    let longPressTimer = null;
    let isLongPressTriggered = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const startChannelHold = (x, y) => {
      touchStartX = x;
      touchStartY = y;
      isLongPressTriggered = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        isLongPressTriggered = true;
        if (navigator.vibrate) {
          try { navigator.vibrate(45); } catch (err) {}
        }
        openChannelActionsModal();
      }, 500);
    };

    const cancelChannelHold = () => {
      clearTimeout(longPressTimer);
    };

    const targetHeader = el.guideChHeaderMain || el.guideChHeader;
    if (targetHeader) {
      // Touch events (Móvil)
      targetHeader.addEventListener('touchstart', (e) => {
        if (e.target.closest('#btnToggleGuideChannels')) return;
        if (e.touches && e.touches[0]) {
          startChannelHold(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      targetHeader.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          if (Math.abs(e.touches[0].clientX - touchStartX) > 10 || Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            cancelChannelHold();
          }
        }
      }, { passive: true });

      targetHeader.addEventListener('touchend', cancelChannelHold);
      targetHeader.addEventListener('touchcancel', cancelChannelHold);

      // Mouse events (Desktop)
      targetHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('#btnToggleGuideChannels')) return;
        if (e.button === 0) {
          startChannelHold(e.clientX, e.clientY);
        }
      });
      targetHeader.addEventListener('mousemove', (e) => {
        if (Math.abs(e.clientX - touchStartX) > 10 || Math.abs(e.clientY - touchStartY) > 10) {
          cancelChannelHold();
        }
      });
      targetHeader.addEventListener('mouseup', cancelChannelHold);
      targetHeader.addEventListener('mouseleave', cancelChannelHold);

      // Clic derecho (Desktop)
      targetHeader.addEventListener('contextmenu', (e) => {
        if (e.target.closest('#btnToggleGuideChannels')) return;
        e.preventDefault();
        cancelChannelHold();
        openChannelActionsModal();
      });

      // Clic normal
      targetHeader.addEventListener('click', (e) => {
        if (isLongPressTriggered) {
          isLongPressTriggered = false;
          return;
        }
        if (e.target.closest('#btnToggleGuideChannels')) return;
        if (window.innerWidth <= 768) {
          toggleGuideChDropdown();
        }
      });
    }

    // Cerrar menú desplegable de canales si se hace clic fuera
    document.addEventListener('click', (e) => {
      if (el.guideSidebar && el.guideSidebar.classList.contains('mobile-open')) {
        if (!el.guideSidebar.contains(e.target) &&
            (!el.btnToggleGuideChannels || !el.btnToggleGuideChannels.contains(e.target)) &&
            (!el.guideChHeader || !el.guideChHeader.contains(e.target))) {
          closeGuideChDropdown();
        }
      }
    });

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
    el.btnSettings.onclick = () => {
      if (el.chkFilterFavorites) {
        el.chkFilterFavorites.checked = (state.filter === 'favorites');
      }
      el.modalSettings.classList.remove('hidden');
    };
    el.btnCloseSettings.onclick = () => el.modalSettings.classList.add('hidden');
    el.modalSettings.onclick = (e) => {
      if (e.target === el.modalSettings) el.modalSettings.classList.add('hidden');
    };

    if (el.chkFilterFavorites) {
      el.chkFilterFavorites.checked = (state.filter === 'favorites');
      el.chkFilterFavorites.onchange = (e) => {
        state.filter = e.target.checked ? 'favorites' : 'all';
        renderActiveView();
      };
    }

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
      if (state.searchQuery) {
        state.searchQuery = '';
        if (el.searchInput) el.searchInput.value = '';
        if (el.btnClearSearch) el.btnClearSearch.classList.add('hidden');
        if (el.viewSearch) el.viewSearch.classList.add('hidden');
        state.activeViewBeforeSearch = null;
      }
      const route = parseCurrentHash();
      switchView(route.view, route.channelId, false);
    });

    // Tecla Escape para cerrar modales y menús desplegables
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.searchQuery) {
          clearSearchState();
          return;
        }
        closeModalDetail();
        closeQuickPopup();
        closeGuideChDropdown();
        if (el.searchBox) el.searchBox.classList.remove('mobile-open');
        el.modalSettings.classList.add('hidden');
      }
    });

    // Auto-refresh removido para evitar resets indeseados

    // Ajustar capítulos en vista lista ante cambios de tamaño de ventana
    window.addEventListener('resize', () => {
      if (state.currentView === 'list') {
        adjustListChapters();
      }
    });

    // Ocultar barra principal (#mainHeader) al deslizar hacia abajo y restaurar al deslizar hacia arriba
    let lastScrollTop = 0;
    let isHeaderHidden = false;
    if (el.appContainer) {
      el.appContainer.addEventListener('scroll', () => {
        if (el.guideSidebar && el.guideSidebar.classList.contains('mobile-open')) return;
        if (el.searchBox && el.searchBox.classList.contains('mobile-open')) return;

        const st = el.appContainer.scrollTop;
        if (st < 0) return;

        if (st > 40 && st > lastScrollTop + 8) {
          if (!isHeaderHidden) {
            document.body.classList.add('header-hidden');
            isHeaderHidden = true;
          }
        } else if (st < lastScrollTop - 12 || st <= 15) {
          if (isHeaderHidden) {
            document.body.classList.remove('header-hidden');
            isHeaderHidden = false;
          }
        }
        lastScrollTop = st;
      }, { passive: true });
    }
  }

  
  // ==========================================================================
  // CONTEXT MENU LOGIC
  // ==========================================================================
  function openContextMenu(e, options) {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('contextMenu');
    const list = document.getElementById('contextMenuList');
    if (!menu || !list) return;
    list.innerHTML = '';
    options.forEach(opt => {
      const li = document.createElement('li');
      li.innerHTML = opt.label;
      li.onclick = (ev) => {
        ev.stopPropagation();
        menu.classList.add('hidden');
        if (opt.action) opt.action();
      };
      list.appendChild(li);
    });
    
    menu.classList.remove('hidden');
    
    let x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    let y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const menuWidth = menu.offsetWidth || 180;
    const menuHeight = menu.offsetHeight || 150;
    
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    const closeFn = () => {
      menu.classList.add('hidden');
      document.removeEventListener('click', closeFn);
      document.removeEventListener('touchstart', closeFn);
    };
    setTimeout(() => {
      document.addEventListener('click', closeFn);
      document.addEventListener('touchstart', closeFn);
    }, 10);
  }

  // ==========================================================================
  // 13. INICIALIZACI
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
