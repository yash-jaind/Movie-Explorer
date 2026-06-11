// ============================================================
// CONFIG
// ============================================================
const API_KEY = '065f691295493e351ab1312339980265';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

// ============================================================
// STATE
// ============================================================
let currentPage = 1;
let totalPages = 1;
let currentCategory = 'popular';
let currentSearch = '';
let allMovies = [];
let genres = {};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  fetchGenres();
  fetchMovies();
});

// ============================================================
// FETCH GENRES
// ============================================================
async function fetchGenres() {
  try {
    const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
    const data = await res.json();
    data.genres.forEach(g => genres[g.id] = g.name);
  } catch(e) { console.error(e); }
}

// ============================================================
// FETCH MOVIES
// ============================================================
async function fetchMovies() {
  showLoading();
  try {
    let url;
    if (currentSearch) {
      url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(currentSearch)}&page=${currentPage}`;
    } else {
      url = `${BASE_URL}/movie/${currentCategory}?api_key=${API_KEY}&page=${currentPage}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    allMovies = data.results || [];
    totalPages = Math.min(data.total_pages || 1, 20);
    document.getElementById('result-count').textContent = `${data.total_results || 0} movies`;
    renderMovies(allMovies);
    renderPagination();
  } catch(e) {
    showError();
    showToast('Failed to load movies!');
  }
}

// ============================================================
// RENDER MOVIES
// ============================================================
function renderMovies(movies) {
  const grid = document.getElementById('movies-grid');
  if (!movies.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🎬</div><div class="empty-text">No movies found</div></div>`;
    return;
  }
  grid.innerHTML = movies.map((m, i) => `
    <div class="movie-card" style="animation-delay:${i * 0.05}s" onclick="openModal(${m.id})">
      ${m.poster_path
        ? `<img class="card-poster" src="${IMG_BASE}${m.poster_path}" alt="${esc(m.title)}" loading="lazy">`
        : `<div class="card-no-poster">🎬</div>`}
      <div class="card-body">
        <div class="card-title">${esc(m.title)}</div>
        <div class="card-meta">
          <span class="card-year">${m.release_date ? m.release_date.slice(0,4) : 'N/A'}</span>
          <span class="card-rating">⭐ ${m.vote_average ? m.vote_average.toFixed(1) : 'N/A'}</span>
        </div>
        ${m.genre_ids && m.genre_ids[0] ? `<div class="card-genre">${genres[m.genre_ids[0]] || ''}</div>` : ''}
      </div>
      <div class="card-overlay">
        <button class="overlay-btn">View Details</button>
      </div>
    </div>
  `).join('');
}

// ============================================================
// MODAL
// ============================================================
async function openModal(id) {
  try {
    const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=credits`);
    const m = await res.json();
    document.getElementById('modal-backdrop').src = m.backdrop_path ? `${BACKDROP_BASE}${m.backdrop_path}` : (m.poster_path ? `${IMG_BASE}${m.poster_path}` : '');
    document.getElementById('modal-title').textContent = m.title;
    document.getElementById('modal-meta').innerHTML = `
      <span class="modal-badge gold">⭐ ${m.vote_average ? m.vote_average.toFixed(1) : 'N/A'}</span>
      <span class="modal-badge">${m.release_date ? m.release_date.slice(0,4) : 'N/A'}</span>
      ${m.runtime ? `<span class="modal-badge">${m.runtime} min</span>` : ''}
      ${m.genres ? m.genres.slice(0,3).map(g => `<span class="modal-badge accent">${g.name}</span>`).join('') : ''}
      <span class="modal-badge">${m.vote_count ? m.vote_count.toLocaleString() + ' votes' : ''}</span>
    `;
    document.getElementById('modal-overview').textContent = m.overview || 'No overview available.';
    const cast = m.credits?.cast?.slice(0,5).map(c => c.name).join(', ');
    const director = m.credits?.crew?.find(c => c.job === 'Director')?.name;
    document.getElementById('modal-extra').innerHTML = `
      ${director ? `<div class="modal-section-title">Director</div><p style="color:var(--muted);font-size:14px;margin-bottom:16px;">${director}</p>` : ''}
      ${cast ? `<div class="modal-section-title">Cast</div><p style="color:var(--muted);font-size:14px;">${cast}</p>` : ''}
    `;
    document.getElementById('modal-overlay').classList.add('open');
  } catch(e) { showToast('Failed to load movie details!'); }
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function handleModalClick(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

// ============================================================
// SEARCH
// ============================================================
function searchMovies() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) { setCategory('popular', document.querySelector('.filter-btn')); return; }
  currentSearch = q;
  currentPage = 1;
  document.getElementById('section-label').textContent = `🔍 Results for "${q}"`;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  fetchMovies();
}

function handleKey(e) { if (e.key === 'Enter') searchMovies(); }

// ============================================================
// CATEGORY
// ============================================================
function setCategory(cat, btn) {
  currentCategory = cat;
  currentSearch = '';
  currentPage = 1;
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const labels = { popular:'🔥 Popular Movies', top_rated:'⭐ Top Rated', now_playing:'🎬 Now Playing', upcoming:'🗓️ Upcoming' };
  document.getElementById('section-label').textContent = labels[cat];
  fetchMovies();
}

// ============================================================
// SORT
// ============================================================
function sortMovies() {
  const sort = document.getElementById('sort-select').value;
  let sorted = [...allMovies];
  if (sort === 'rating-high') sorted.sort((a,b) => b.vote_average - a.vote_average);
  if (sort === 'rating-low')  sorted.sort((a,b) => a.vote_average - b.vote_average);
  if (sort === 'year-new')    sorted.sort((a,b) => new Date(b.release_date) - new Date(a.release_date));
  if (sort === 'year-old')    sorted.sort((a,b) => new Date(a.release_date) - new Date(b.release_date));
  if (sort === 'title-az')    sorted.sort((a,b) => a.title.localeCompare(b.title));
  renderMovies(sorted);
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination() {
  const p = document.getElementById('pagination');
  if (totalPages <= 1) { p.innerHTML = ''; return; }
  let pages = [];
  for (let i = Math.max(1, currentPage-2); i <= Math.min(totalPages, currentPage+2); i++) pages.push(i);
  p.innerHTML = `
    <button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>← Prev</button>
    ${pages.map(pg => `<button class="page-btn ${pg===currentPage?'active':''}" onclick="goPage(${pg})">${pg}</button>`).join('')}
    <button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>Next →</button>
  `;
}

function goPage(pg) {
  if (pg < 1 || pg > totalPages) return;
  currentPage = pg;
  fetchMovies();
  window.scrollTo({top:300, behavior:'smooth'});
}

// ============================================================
// HELPERS
// ============================================================
function showLoading() {
  document.getElementById('movies-grid').innerHTML = `
    <div class="loading" style="grid-column:1/-1">
      <div class="spinner"></div>
      <div class="loading-text">Loading movies...</div>
    </div>`;
  document.getElementById('pagination').innerHTML = '';
}

function showError() {
  document.getElementById('movies-grid').innerHTML = `
    <div class="empty" style="grid-column:1/-1">
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">Something went wrong. Try again!</div>
    </div>`;
}

function showToast(msg) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function esc(str) { return (str||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
