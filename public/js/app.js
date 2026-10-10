const API_URL = '/pokemon';

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
const resultSummary = document.querySelector('#result-summary');
const pokemonStatus = document.querySelector('#pokemon-status');
const pokemonStatusMessage = document.querySelector('#pokemon-status-message');

const previousButtons = [
  document.querySelector('#previous-page'),
  document.querySelector('#previous-page-bottom'),
];
const nextButtons = [
  document.querySelector('#next-page'),
  document.querySelector('#next-page-bottom'),
];

let currentLimitValue = Number(pageSizeInput.value);
let currentOffsetValue = 0;
let currentPagePokemon = [];
let canGoNext = false;
let requestController = null;
let requestNumber = 0;

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
  pokemonStatus.querySelector('.loading-spinner').hidden = !loading;
}

function updatePaginationUi() {
  const pageNumber = Math.floor(currentOffsetValue / currentLimitValue) + 1;

  currentLimit.textContent = String(currentLimitValue);
  currentOffset.textContent = String(currentOffsetValue);
  currentPage.textContent = `PAGE ${pageNumber}`;
  offsetInput.value = String(currentOffsetValue);

  const canGoPrevious = currentOffsetValue > 0;
  previousButtons.forEach((button) => {
    button.disabled = !canGoPrevious;
  });
  nextButtons.forEach((button) => {
    button.disabled = !canGoNext;
  });
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
    const unavailable = document.createElement('span');
    unavailable.className = 'artwork-unavailable';
    unavailable.textContent = 'Artwork unavailable';
    imageContainer.append(unavailable);
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
    const byNumber = String(pokemon.no).includes(normalizedNumber);
    return byName || byNumber;
  });

  const fragment = document.createDocumentFragment();
  filtered.forEach((pokemon) => fragment.append(createPokemonCard(pokemon)));
  pokemonGrid.replaceChildren(fragment);

  if (query) {
    resultSummary.textContent = `Showing ${filtered.length} matching Pokémon on this page`;
  } else {
    const firstNumber = currentPagePokemon[0]?.no;
    const lastNumber = currentPagePokemon.at(-1)?.no;
    resultSummary.textContent = currentPagePokemon.length
      ? `Showing ${formatNumber(firstNumber)}–${formatNumber(lastNumber)} · ${currentPagePokemon.length} results on this page`
      : 'No results on this page';
  }

  if (filtered.length === 0 && currentPagePokemon.length > 0) {
    showStatus('No Pokémon on this page match your search. Try another term or browse to a different page.');
  } else if (currentPagePokemon.length === 0) {
    showStatus('No Pokémon found at this offset. Try a lower offset.');
  } else {
    showStatus('');
  }
}

async function loadPokemon() {
  const thisRequest = ++requestNumber;
  if (requestController) requestController.abort();
  requestController = new AbortController();

  canGoNext = false;
  updatePaginationUi();
  showStatus('Loading Pokémon from your database...', { loading: true });
  collectionStatus.textContent = 'Fetching API data';
  collectionStatus.classList.add('is-loading');

  const params = new URLSearchParams({
    limit: String(currentLimitValue),
    offset: String(currentOffsetValue),
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: requestController.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Expected GET /pokemon to return an array.');
    }

    // Ignore an old request if the user changed the page while it was loading.
    if (thisRequest !== requestNumber) return;

    const validPokemon = data
      .map(({ name, no }) => ({ name: String(name ?? ''), no: Number(no) }))
      .filter((pokemon) =>
        pokemon.name.length > 0 && Number.isSafeInteger(pokemon.no) && pokemon.no > 0,
      )
      .sort((a, b) => a.no - b.no);

    // The API currently returns an array only, not total-count metadata.
    // A full page means there may be another page.
    if (validPokemon.length === 0 && currentOffsetValue > 0) {
      currentPagePokemon = [];
      canGoNext = false;
      collectionStatus.textContent = 'End of collection';
      collectionStatus.classList.remove('is-loading');
      updatePaginationUi();
      renderPokemon();
      return;
    }

    currentPagePokemon = validPokemon;
    canGoNext = validPokemon.length === currentLimitValue;
    collectionStatus.textContent = 'API connected';
    collectionStatus.classList.remove('is-loading');
    updatePaginationUi();
    renderPokemon();
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (thisRequest !== requestNumber) return;

    console.error('Could not load Pokémon:', error);
    currentPagePokemon = [];
    canGoNext = false;
    pokemonGrid.replaceChildren();
    resultSummary.textContent = 'No data loaded';
    collectionStatus.textContent = 'Connection failed';
    collectionStatus.classList.remove('is-loading');
    updatePaginationUi();
    showStatus(
      'Could not load Pokémon. Make sure NestJS is running and GET /pokemon supports limit and offset.',
      { error: true },
    );
  }
}

function goToOffset(offset) {
  const parsedOffset = Number(offset);
  if (!Number.isSafeInteger(parsedOffset) || parsedOffset < 0) {
    showStatus('Offset must be a whole number greater than or equal to zero.', { error: true });
    return;
  }

  currentOffsetValue = parsedOffset;
  pokemonSearch.value = '';
  loadPokemon();
}

function goPrevious() {
  if (currentOffsetValue <= 0) return;
  goToOffset(Math.max(0, currentOffsetValue - currentLimitValue));
}

function goNext() {
  if (!canGoNext) return;
  goToOffset(currentOffsetValue + currentLimitValue);
}

pokemonSearch.addEventListener('input', renderPokemon);

pageSizeInput.addEventListener('change', () => {
  const nextLimit = Number(pageSizeInput.value);

  // Match the input constraints even if a value is typed or pasted manually.
  if (!Number.isSafeInteger(nextLimit) || nextLimit < 1 || nextLimit > 100) {
    pageSizeInput.value = String(currentLimitValue);
    showStatus('Page size must be a whole number between 1 and 100.', { error: true });
    return;
  }

  currentLimitValue = nextLimit;
  pageSizeInput.value = String(currentLimitValue);
  goToOffset(0);
});

offsetForm.addEventListener('submit', (event) => {
  event.preventDefault();
  goToOffset(offsetInput.value);
});

previousButtons.forEach((button) => button.addEventListener('click', goPrevious));
nextButtons.forEach((button) => button.addEventListener('click', goNext));

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    pokemonSearch.focus();
  }
});

loadPokemon();
