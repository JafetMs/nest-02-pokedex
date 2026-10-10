'use strict';

// This frontend is served by NestJS, so the API uses the same origin.
// The backend has the global prefix "api/v2".
const API_URL = 'http://localhost:3000/api/v2/pokemon';

const ARTWORK_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
const SPRITE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const pokemonGrid = document.querySelector('#pokemon-grid');
const pokemonSearch = document.querySelector('#pokemon-search');
const pageSizeInput = document.querySelector('#page-size');
const offsetForm = document.querySelector('#offset-form');
const offsetInput = document.querySelector('#offset-input');
const currentLimit = document.querySelector('#current-limit');
const currentOffset = document.querySelector('#current-offset');
const currentPage = document.querySelector('#current-page');
const collectionStatus = document.querySelector('#collection-status');
const collectionStatusContainer = document.querySelector('.collection-stat');
const resultSummary = document.querySelector('#result-summary');
const pokemonStatus = document.querySelector('#pokemon-status');
const pokemonStatusMessage = document.querySelector('#pokemon-status-message');
const loadingSpinner = pokemonStatus.querySelector('.loading-spinner');

const previousButtons = [
  document.querySelector('#previous-page'),
  document.querySelector('#previous-page-bottom'),
];
const nextButtons = [
  document.querySelector('#next-page'),
  document.querySelector('#next-page-bottom'),
];

let currentLimitValue = Number(pageSizeInput.value) || 12;
let currentOffsetValue = 0;
let currentPagePokemon = [];
let canGoNext = false;
let isLoading = false;
let requestController = null;
let requestNumber = 0;
// When the API doesn't return a total count, remember an empty page reached
// through Next so an exact-multiple collection doesn't leave the user stranded.
let knownEmptyOffset = null;

function formatNumber(number) {
  return `#${String(number).padStart(3, '0')}`;
}

function formatName(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function showStatus(message, { loading = false, error = false } = {}) {
  pokemonStatus.hidden = !message;
  pokemonStatus.classList.toggle('is-error', error);
  pokemonStatusMessage.textContent = message;
  loadingSpinner.hidden = !loading;
}

function setConnectionStatus(message, { loading = false, error = false } = {}) {
  collectionStatus.textContent = message;
  collectionStatusContainer.classList.toggle('is-loading', loading);
  collectionStatusContainer.classList.toggle('is-error', error);
}

function updatePaginationUi() {
  const pageNumber = Math.floor(currentOffsetValue / currentLimitValue) + 1;

  currentLimit.textContent = String(currentLimitValue);
  currentOffset.textContent = String(currentOffsetValue);
  currentPage.textContent = `PAGE ${pageNumber}`;
  offsetInput.value = String(currentOffsetValue);
  pageSizeInput.value = String(currentLimitValue);

  const canGoPrevious = currentOffsetValue > 0 && !isLoading;
  previousButtons.forEach((button) => {
    button.disabled = !canGoPrevious;
  });
  nextButtons.forEach((button) => {
    button.disabled = !canGoNext || isLoading;
  });
  pageSizeInput.disabled = isLoading;
  offsetInput.disabled = isLoading;
}

function createPokemonCard(pokemon) {
  const card = document.createElement('article');
  card.className = 'pokemon-card';

  const imageContainer = document.createElement('div');
  imageContainer.className = 'pokemon-image';

  const numberChip = document.createElement('span');
  numberChip.className = 'image-number-chip';
  numberChip.textContent = formatNumber(pokemon.no);

  const artwork = document.createElement('img');
  artwork.className = 'pokemon-artwork';
  artwork.alt = `${formatName(pokemon.name)} official artwork`;
  artwork.loading = 'lazy';
  artwork.decoding = 'async';
  artwork.src = `${ARTWORK_URL}/${pokemon.no}.png`;

  artwork.addEventListener('error', () => {
    if (artwork.dataset.fallback !== 'used') {
      artwork.dataset.fallback = 'used';
      artwork.src = `${SPRITE_URL}/${pokemon.no}.png`;
      return;
    }

    artwork.hidden = true;
    if (!imageContainer.querySelector('.artwork-unavailable')) {
      const unavailable = document.createElement('span');
      unavailable.className = 'artwork-unavailable';
      unavailable.textContent = 'Artwork unavailable';
      imageContainer.append(unavailable);
    }
  });

  const glow = document.createElement('span');
  glow.className = 'artwork-glow';
  glow.setAttribute('aria-hidden', 'true');
  imageContainer.append(glow, numberChip, artwork);

  const details = document.createElement('div');
  details.className = 'pokemon-info';

  const subtitle = document.createElement('div');
  subtitle.className = 'pokemon-card-topline';

  const number = document.createElement('span');
  number.className = 'pokemon-number';
  number.textContent = formatNumber(pokemon.no);

  const arrow = document.createElement('span');
  arrow.className = 'card-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';

  const name = document.createElement('h3');
  name.textContent = formatName(pokemon.name);

  const caption = document.createElement('p');
  caption.className = 'pokemon-caption';
  caption.textContent = 'Pokédex entry';

  subtitle.append(number, arrow);
  details.append(subtitle, name, caption);
  card.append(imageContainer, details);
  return card;
}

function renderPokemon() {
  const query = pokemonSearch.value.trim().toLowerCase();
  const normalizedNumber = query.replace(/^#/, '');

  const filtered = currentPagePokemon.filter((pokemon) => {
    const byName = pokemon.name.toLowerCase().includes(query);
    const byNumber = normalizedNumber.length > 0 && String(pokemon.no).includes(normalizedNumber);
    return byName || byNumber;
  });

  const fragment = document.createDocumentFragment();
  filtered.forEach((pokemon) => fragment.append(createPokemonCard(pokemon)));
  pokemonGrid.replaceChildren(fragment);

  if (query) {
    resultSummary.textContent = `Showing ${filtered.length} matching Pokémon on this page`;
  } else if (currentPagePokemon.length > 0) {
    const firstNumber = currentPagePokemon[0].no;
    const lastNumber = currentPagePokemon[currentPagePokemon.length - 1].no;
    resultSummary.textContent =
      `Showing ${formatNumber(firstNumber)}–${formatNumber(lastNumber)} · ${currentPagePokemon.length} results on this page`;
  } else {
    resultSummary.textContent = 'No results on this page';
  }

  if (filtered.length === 0 && query && currentPagePokemon.length > 0) {
    showStatus('No Pokémon on this page match your search. Try another term or browse to a different page.');
  } else if (currentPagePokemon.length === 0 && !isLoading) {
    showStatus('No Pokémon found at this offset. Try a lower offset.');
  } else if (filtered.length === 0 && query) {
    showStatus('No Pokémon found at this offset or matching your search.');
  } else {
    showStatus('');
  }
}

function normalizePokemon(data) {
  return data
    .map((item) => ({
      name: String(item?.name ?? '').trim(),
      no: Number(item?.no),
    }))
    .filter((pokemon) =>
      pokemon.name.length > 0 &&
      Number.isSafeInteger(pokemon.no) &&
      pokemon.no > 0,
    )
    .sort((a, b) => a.no - b.no);
}

async function loadPokemon({ fromNext = false, recoverFromEnd = false } = {}) {
  const thisRequest = ++requestNumber;
  if (requestController) requestController.abort();
  requestController = new AbortController();

  isLoading = true;
  canGoNext = false;
  updatePaginationUi();
  showStatus('Loading Pokémon from your database...', { loading: true });
  setConnectionStatus('Fetching API data', { loading: true });

  const params = new URLSearchParams();
  params.set('limit', String(currentLimitValue));
  // The current PaginationDto validates offset with @IsPositive(), which rejects 0.
  // Omitting offset at the beginning lets the backend use its default offset = 0.
  if (currentOffsetValue > 0) {
    params.set('offset', String(currentOffsetValue));
  }

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: requestController.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorBody = await response.json();
        detail = Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : String(errorBody.message ?? '');
      } catch {
        // The error response may not contain JSON.
      }
      throw new Error(`HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Expected GET /api/v2/pokemon to return a JSON array.');
    }
    if (thisRequest !== requestNumber) return;

    const validPokemon = normalizePokemon(data);

    // If the collection size is an exact multiple of the limit, a Next click can
    // request an empty page. Step back automatically and disable Next on the last page.
    if (validPokemon.length === 0 && fromNext && currentOffsetValue > 0 && !recoverFromEnd) {
      knownEmptyOffset = currentOffsetValue;
      currentOffsetValue = Math.max(0, currentOffsetValue - currentLimitValue);
      await loadPokemon({ recoverFromEnd: true });
      return;
    }

    currentPagePokemon = validPokemon;
    canGoNext =
      validPokemon.length === currentLimitValue &&
      !recoverFromEnd &&
      (knownEmptyOffset === null || currentOffsetValue + currentLimitValue < knownEmptyOffset);

    setConnectionStatus('API connected');
    renderPokemon();
  } catch (error) {
    if (error?.name === 'AbortError' || thisRequest !== requestNumber) return;

    console.error('Could not load Pokémon:', error);
    currentPagePokemon = [];
    canGoNext = false;
    pokemonGrid.replaceChildren();
    resultSummary.textContent = 'No data loaded';
    setConnectionStatus('Connection failed', { error: true });
    showStatus(
      `Could not load Pokémon. ${error instanceof Error ? error.message : 'Check your NestJS server and API route.'}`,
      { error: true },
    );
  } finally {
    if (thisRequest === requestNumber) {
      isLoading = false;
      updatePaginationUi();
    }
  }
}

function goToOffset(value, { fromNext = false, manual = false } = {}) {
  const parsedOffset = Number(value);
  if (!Number.isSafeInteger(parsedOffset) || parsedOffset < 0) {
    showStatus('Offset must be a whole number greater than or equal to zero.', { error: true });
    offsetInput.value = String(currentOffsetValue);
    return;
  }

  if (manual) knownEmptyOffset = null;
  currentOffsetValue = parsedOffset;
  pokemonSearch.value = '';
  loadPokemon({ fromNext });
}

function goPrevious() {
  if (currentOffsetValue <= 0 || isLoading) return;
  goToOffset(Math.max(0, currentOffsetValue - currentLimitValue));
}

function goNext() {
  if (!canGoNext || isLoading) return;
  goToOffset(currentOffsetValue + currentLimitValue, { fromNext: true });
}

pokemonSearch.addEventListener('input', renderPokemon);

pageSizeInput.addEventListener('change', () => {
  const nextLimit = Number(pageSizeInput.value);
  if (!Number.isSafeInteger(nextLimit) || nextLimit < 1 || nextLimit > 100) {
    pageSizeInput.value = String(currentLimitValue);
    showStatus('Page size must be a whole number between 1 and 100.', { error: true });
    return;
  }

  currentLimitValue = nextLimit;
  currentOffsetValue = 0;
  knownEmptyOffset = null;
  pokemonSearch.value = '';
  loadPokemon();
});

pageSizeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    pageSizeInput.blur();
  }
});

offsetForm.addEventListener('submit', (event) => {
  event.preventDefault();
  goToOffset(offsetInput.value, { manual: true });
});

previousButtons.forEach((button) => button.addEventListener('click', goPrevious));
nextButtons.forEach((button) => button.addEventListener('click', goNext));

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;

  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    pokemonSearch.focus();
  }
});

loadPokemon();
