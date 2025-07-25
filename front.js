const apiKey = atob("ZjBmNTNjZDljOTc1NzcwM2UzMTBhOTRkYzQwY2I0ZWI=");
//const proxy = "https://thingproxy.freeboard.io/fetch/"; // WebView: Ensure proxy works; consider native HTTP if blocked
//const proxy = "https://cors-anywhere.herokuapp.com/";
const proxy = '';
const bust = () => `_cb=${Date.now()}`;

let currentFilter = "all";
let pages = { all: 1, movie: 1, tv: 1 };
let loading = false;
let query = localStorage.getItem("query") || "";
let selectedGenre = "";
let includeAdult = false;
let selectedLanguage = "en";
const genreCache = {};

const grid = { all: document.getElementById("combinedGridContainer") };
const searchInput = document.getElementById("searchInput");
const genreSelect = document.getElementById("genreSelect");
const contentTypeFilter = document.getElementById("contentTypeFilter");
const adultFilter = document.getElementById("adultFilter");
const detailPane = document.getElementById("detailPane");
const sentinel = document.getElementById("sentinel");
const themeToggle = document.getElementById("themeToggle");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const languageSelect = document.getElementById("languageSelect");
const filterToggle = document.getElementById("filterToggle");
const filterSection = document.querySelector(".filter-section");

// WebView: Ensure JavaScript and DOM storage are enabled in the app
function resetAndLoad() {
  pages = { all: 1, movie: 1, tv: 1 };
  if (grid.all) {
    grid.all.innerHTML = "";
    grid.all.style.display = "none";
  } else {
    console.error("combinedGridContainer not found in DOM");
  }
  fetchGenres();
  fetchContent();
  localStorage.setItem("query", query);
}

contentTypeFilter.addEventListener("change", () => {
  currentFilter = contentTypeFilter.value;
  resetAndLoad();
});

searchInput.addEventListener("input", () => {
  query = searchInput.value.trim();
  resetAndLoad();
});

genreSelect.addEventListener("change", () => {
  selectedGenre = genreSelect.value === "reset" ? "" : genreSelect.value;
  resetAndLoad();
});

if (adultFilter) {
  adultFilter.addEventListener("change", (e) => {
    includeAdult = e.target.checked;
    console.log(`Adult filter updated to: ${includeAdult}`);
    resetAndLoad();
  });
} else {
  console.warn("Adult filter checkbox not found in DOM. Ensure <input id='adultFilter'> exists in HTML.");
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    query = "";
    searchInput.value = "";
    resetAndLoad();
  });
} else {
  console.warn("Clear search button not found in DOM. Ensure <button id='clearSearchBtn'> exists in HTML.");
}

if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("light-mode", themeToggle.checked);
    localStorage.setItem("theme", themeToggle.checked ? "light" : "dark");
  });
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.checked = true;
  }
} else {
  console.warn("Theme toggle not found in DOM. Ensure <input id='themeToggle' type='checkbox'> exists in HTML.");
}

if (languageSelect) {
  languageSelect.addEventListener("change", () => {
    selectedLanguage = languageSelect.value;
    console.log(`Language updated to: ${selectedLanguage}`);
    resetAndLoad();
  });
} else {
  console.warn("Language select not found in DOM. Ensure <select id='languageSelect'> exists in HTML.");
}

if (filterToggle && filterSection) {
  filterToggle.addEventListener("click", () => {
    filterSection.classList.toggle("active");
  });
} else {
  console.warn("Filter toggle or filter section not found in DOM. Ensure <button id='filterToggle'> and .filter-section exist in HTML.");
}

if (searchInput) {
  searchInput.value = query;
}

async function fetchGenres() {
  if (genreCache[currentFilter] || genreCache["all"]) return populateGenres(genreCache[currentFilter] || genreCache["all"]);
  try {
    const url = `${proxy}https://api.themoviedb.org/3/genre/${currentFilter === "all" ? "movie" : currentFilter}/list?api_key=${apiKey}&language=${selectedLanguage}&${bust()}`;
    const res = await axios.get(url); // WebView: Ensure network access is permitted
    genreCache[currentFilter] = res.data.genres;
    populateGenres(res.data.genres);
  } catch (err) {
    console.error("Genre load error:", err);
  }
}

function populateGenres(genres) {
  genreSelect.innerHTML = `<option value="">All Genres</option><option value="reset">Reset Genre</option>` + genres.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
}

async function fetchContent() {
  if (loading) return;
  loading = true;
  const page = pages[currentFilter];
  let combinedResults = [];
  console.log(`Fetching content for filter: ${currentFilter}, page: ${page}, query: "${query}", genre: ${selectedGenre}, adult: ${includeAdult}, language: ${selectedLanguage}`);

  if (query) {
    try {
      const url = `${proxy}https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}&language=${selectedLanguage}&${bust()}`;
      const res = await axios.get(url);
      combinedResults = res.data.results || [];
    } catch (err) {
      console.error("Search fetch failed:", err);
      loading = false;
      return;
    }
  } else {
    if (currentFilter === "all") {
      try {
        const [movieRes, tvRes] = await Promise.all([
          axios.get(`${proxy}https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&page=${page}&include_adult=${includeAdult}&with_genres=${selectedGenre}&language=${selectedLanguage}&${bust()}`),
          axios.get(`${proxy}https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&sort_by=popularity.desc&page=${page}&include_adult=${includeAdult}&with_genres=${selectedGenre}&language=${selectedLanguage}&${bust()}`)
        ]);
        combinedResults = [...(movieRes.data.results || []), ...(tvRes.data.results || [])].sort(() => 0.5 - Math.random()).slice(0, 20);
      } catch (err) {
        console.error("Discover fetch failed:", err);
        loading = false;
        return;
      }
    } else {
      try {
        const url = `${proxy}https://api.themoviedb.org/3/discover/${currentFilter}?api_key=${apiKey}&sort_by=popularity.desc&page=${page}&include_adult=${includeAdult}&with_genres=${selectedGenre}&language=${selectedLanguage}&${bust()}`;
        const res = await axios.get(url);
        combinedResults = res.data.results || [];
      } catch (err) {
        console.error("Discover fetch failed:", err);
        loading = false;
        return;
      }
    }
  }

  if (combinedResults.length === 0) {
    loading = false;
    return;
  }

  combinedResults.forEach(item => {
    const mediaType = item.media_type || (item.title ? "movie" : "tv");
    if (currentFilter === "all" || mediaType === currentFilter) {
      const imagePath = item.poster_path || item.backdrop_path;
      const card = document.createElement("div");
      card.className = "card";
      if (imagePath) {
        card.innerHTML = `
          <img src="https://image.tmdb.org/t/p/w500${imagePath}" />
          <div class="type-badge ${mediaType === "movie" ? "movie" : "tv"}">${mediaType === "movie" ? "Movie" : "TV"}</div>
        `;
      } else {
        card.innerHTML = `
          <div class="placeholder-image"></div>
          <div class="type-badge ${mediaType === "movie" ? "movie" : "tv"}">${mediaType === "movie" ? "Movie" : "TV"}</div>
        `;
      }
      card.onclick = () => showDetails(item.id, mediaType);
      if (grid.all) grid.all.appendChild(card);
    }
  });
  grid.all.style.display = "grid";
  pages[currentFilter]++;
  loading = false;
}

async function showDetails(id, type) {
  try {
    const [res, credits, recs] = await Promise.all([
      axios.get(`${proxy}https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=${selectedLanguage}&${bust()}`),
      axios.get(`${proxy}https://api.themoviedb.org/3/${type}/${id}/credits?api_key=${apiKey}&${bust()}`),
      axios.get(`${proxy}https://api.themoviedb.org/3/${type}/${id}/recommendations?api_key=${apiKey}&language=${selectedLanguage}&page=1&${bust()}`)
    ]);
    const data = res.data;
    const cast = credits.data.cast.slice(0, 5);
    let recommendations = recs.data.results || [];
    if (!Array.isArray(recommendations)) recommendations = [];
    recommendations = recommendations.slice(0, 10).filter(r => 
      r.vote_average >= 6.0 && 
      (data.genre_ids?.length ? r.genre_ids.some(g => data.genre_ids.includes(g)) : r.genre_ids?.length)
    ) || [];
    detailPane.classList.add("open");
    sessionStorage.setItem("detailPaneOpen", "true");
    detailPane.setAttribute('aria-labelledby', 'detail-title');
    detailPane.innerHTML = `
      <span class="closeBtn" onclick="detailPane.classList.remove('open'); stopVideo(); sessionStorage.removeItem('detailPaneOpen')" aria-label="Back to main view"></span>
      <div class="detail-content">
        <div class="hero-image">
          ${data.poster_path ? `<img src="https://image.tmdb.org/t/p/w500${data.poster_path}" alt="${data.title || data.name} poster" />` : '<div class="placeholder-image" aria-label="No image available">No Image</div>'}
        </div>
        <div class="info-section">
          <h1 id="detail-title" class="title">${data.title || data.name} (${(data.release_date || data.first_air_date)?.substring(0, 4) || 'N/A'})</h1>
          <p class="description">${data.overview || "No overview available"}</p>
          <div class="metadata">
            <span><strong>Rating:</strong> ⭐ ${data.vote_average.toFixed(1)}/10</span>
            <span><strong>Runtime:</strong> ${type === "movie" ? `${data.runtime} min` : `${data.episode_run_time?.[0] || 'N/A'} min per episode`}</span>
            <span><strong>Genres:</strong> ${data.genres?.map(g => `<button class="filter-btn" onclick="filterByGenre(${g.id})">${g.name}</button>`).join(", ") || "N/A"}</span>
            <span><strong>Cast:</strong> ${cast.map(p => `<button class="filter-btn" onclick="filterByPerson('${p.name}')">${p.name}</button>`).join(", ")}</span>
          </div>
          ${type === "movie" ? `
            <div class="action-section">
              <button class="play-btn" onclick="playVideo('${type}', ${id})" aria-label="Play ${data.title || data.name}">
                <span class="play-icon"></span> Play
              </button>
            </div>
          ` : `
            <div class="action-section">
              <button class="play-btn" onclick="playVideo('${type}', ${id}, 1, 1)" aria-label="Play ${data.title || data.name} Season 1 Episode 1">
                <span class="play-icon"></span> Play First Episode
              </button>
            </div>
          `}
          <div class="branding">Powered by Playscape</div>
        </div>
      </div>
      <div class="tab-container">
        <div class="tabs">
          ${type === "tv" ? `<button class="tab-btn active" data-tab="seasons" data-id="${id}" data-type="${type}" data-data="${JSON.stringify(data)}">Seasons & Episodes</button>` : ''}
          <button class="tab-btn ${type === 'movie' ? 'active' : ''}" data-tab="recommendations" data-id="${id}" data-type="${type}" data-data="${JSON.stringify(data)}">More Like This</button>
        </div>
        <div id="tab-content" class="tab-content"></div>
      </div>
    `;
    detailPane.querySelector('.closeBtn').focus();
    if (type === "tv") initializeTabs(id, type, data);
    else initializeTabs(id, type, data);
  } catch (err) {
    console.error("Details error:", err);
  }
}

function initializeTabs(id, type, data) {
  const tabs = detailPane.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      showTab(tabId, id, type, data);
    });
  });
  showTab(type === "tv" ? "seasons" : "recommendations", id, type, data);
}

async function renderSeasons(tvId, data) {
  try {
    const res = await axios.get(`${proxy}https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}&language=${selectedLanguage}&${bust()}`);
    const seasons = res.data.seasons.filter(s => s.season_number !== 0);
    if (seasons.length === 0) return "<p>No seasons available.</p>";
    const seasonSelect = document.createElement("select");
    seasonSelect.id = "seasonSelect";
    seasonSelect.innerHTML = seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number} (${s.episode_count} Episodes)</option>`).join('');
    return `
      <div class="season-dropdown">${seasonSelect.outerHTML}</div>
      <div id="episodeList"></div>
    `;
  } catch (err) {
    console.error("Season load error:", err);
    return "<p>Could not load seasons.</p>";
  }
}

function renderRecommendations(recommendations, data) {
  recommendations = recommendations || [];
  if (!Array.isArray(recommendations)) recommendations = [];
  return `
    <div class="recommendation-grid">
      ${recommendations.slice(0, 10).filter(r => 
        r.vote_average >= 6.0 && 
        (data?.genre_ids?.length ? r.genre_ids.some(g => data.genre_ids.includes(g)) : r.genre_ids?.length)
      ).map(r => `
        <div class="recommendation-card" onclick="showDetails(${r.id}, '${r.media_type || (r.title ? 'movie' : 'tv')}')" aria-label="View ${r.title || r.name}">
          <img src="https://image.tmdb.org/t/p/w300${r.poster_path}" alt="${r.title || r.name} poster" />
        </div>
      `).join("") || "<p>No recommendations available.</p>"}
    </div>
  `;
}

async function loadEpisodes(tvId, seasonNum, data) {
  try {
    const res = await axios.get(`${proxy}https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNum}?api_key=${apiKey}&language=${selectedLanguage}&${bust()}`);
    const list = document.getElementById("episodeList");
    if (!list) {
      const tempDiv = document.createElement("div");
      tempDiv.id = "episodeList";
      tempDiv.className = "episode-grid";
      document.querySelector("#tab-content").appendChild(tempDiv);
      list = tempDiv;
    }
    if (!res.data.episodes || res.data.episodes.length === 0) {
      list.innerHTML = "<p>No episodes available for this season.</p>";
      return;
    }
    list.innerHTML = `
      <div class="episode-grid">
        ${res.data.episodes.map(ep => `
          <div class="episode-card" aria-label="Play ${ep.name}">
            <div class="episode-image">
              ${ep.still_path ? `<img src="https://image.tmdb.org/t/p/w300${ep.still_path}" alt="${ep.name} thumbnail" />` : '<div class="placeholder-image"></div>'}
            </div>
            <div class="episode-info">
              <h4 class="episode-title">${ep.episode_number}. ${ep.name}</h4>
              <p class="episode-description">${ep.overview || "No overview"}</p>
              <button class="play-btn" onclick='playVideo("tv", ${tvId}, ${seasonNum}, ${ep.episode_number})'>
                <span class="play-icon"></span> Play
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    // Set the select to the current season and attach event listener
    const select = document.getElementById("seasonSelect");
    if (select) {
      select.value = seasonNum;
      select.onchange = () => loadEpisodes(tvId, select.value, data);
    }
  } catch (err) {
    console.error("Episode load error:", err);
  }
}

async function showTab(tab, id, type, data) {
  const tabContent = document.getElementById("tab-content");
  if (tab === "seasons" && !tabContent.querySelector("#seasonSelect")) {
    const seasonsHtml = await renderSeasons(id, data);
    tabContent.innerHTML = seasonsHtml;
    loadEpisodes(id, 1, data); // Load episodes for the first season by default
  } else if (tab === "recommendations" && !tabContent.querySelector(".recommendation-grid")) {
    const recommendationsPromise = axios.get(`${proxy}https://api.themoviedb.org/3/${type}/${id}/recommendations?api_key=${apiKey}&language=${selectedLanguage}&page=1&${bust()}`);
    recommendationsPromise.then(r => {
      const recommendations = r.data.results || [];
      console.log("Recommendations data:", recommendations);
      tabContent.innerHTML = renderRecommendations(recommendations, data);
    }).catch(err => {
      console.error("Recommendation fetch error:", err);
      tabContent.innerHTML = renderRecommendations([], data);
    });
  }
  // No action if content already exists
}

async function playVideo(type, id, seasonNum = 1, episodeNum = 1) {
  let pane = document.getElementById("playerPane");
  if (!pane) {
    pane = document.createElement("div");
    pane.id = "playerPane";
    document.body.appendChild(pane);
  }
  pane.className = "player-pane open landscape"; // Add landscape class for rotation
  sessionStorage.setItem("playerPaneOpen", "true");
  pane.innerHTML = `
    <span class="closeBtn" onclick="stopVideo(); sessionStorage.removeItem('playerPaneOpen')" aria-label="Close player"></span>
    <span class="backBtn" onclick="stopVideo(); detailPane.classList.add('open'); sessionStorage.removeItem('playerPaneOpen')" aria-label="Back to details"></span>
    <button class="fullscreen-btn" onclick="toggleFullscreen()" aria-label="Toggle fullscreen">Fullscreen</button>
  `;

  let url;
  let sub_url = 'https://player.autoembed.cc/embed/';
  if (type === "movie") {
    url = `${sub_url}movie/${id}`;
  } else if (type === "tv") {
    url = `${sub_url}tv/${id}/${seasonNum}/${episodeNum}`;
  }
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const videoSrc = doc.querySelector('video source')?.getAttribute('src') || 
                     doc.querySelector('video')?.getAttribute('src');
    if (videoSrc) {
      const video = document.createElement('video');
      video.id = "videoPlayer"; // Add ID for fullscreen
      video.controls = true;
      video.style.width = '100%';
      video.style.height = '100vh';
      video.innerHTML = `<source src="${videoSrc}" type="video/mp4">`;
      pane.appendChild(video);
      console.log('Video playing from:', videoSrc);
    } else {
      console.error('No video source found in embed. Falling back to iframe.');
      pane.innerHTML += `<iframe id="videoPlayer" src="${url}" allowfullscreen title="Video player for ${type}" style="width: 100%; height: 100vh;"></iframe>`;
    }
  } catch (err) {
    console.error('Error fetching video embed:', err);
    pane.innerHTML += `<iframe id="videoPlayer" src="${url}" allowfullscreen title="Video player for ${type}" style="width: 100%; height: 100vh;"></iframe>`;
  }
}

function stopVideo() {
  const pane = document.getElementById("playerPane");
  if (pane) {
    const video = pane.querySelector('video');
    const iframe = pane.querySelector('iframe');
    if (video) {
      video.pause();
      video.src = ""; // Clear the source to stop buffering
      video.remove(); // Remove the video element
    }
    if (iframe) {
      iframe.src = ""; // Clear the iframe source
      iframe.remove(); // Remove the iframe element
    }
    pane.classList.remove('open', 'landscape'); // Revert to portrait by removing landscape class
    pane.innerHTML = ''; // Clear all content
    sessionStorage.removeItem("playerPaneOpen");
    exitFullscreen(); // Exit fullscreen on close
  }
}

function filterByGenre(id) {
  genreSelect.value = id;
  selectedGenre = id;
  detailPane.classList.remove("open");
  resetAndLoad();
}

function filterByPerson(name) {
  console.log(`Filtering by person: ${name}`); // Debug log for people search
  searchInput.value = name;
  query = name;
  detailPane.classList.remove("open");
  resetAndLoad();
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function makeIframeFullHeight() {
  let videoPlayer = document.getElementById("videoPlayer");
  setTimeout(function() {
    const iframeDocument = videoPlayer.contentDocument || videoPlayer.contentWindow.document;
    if (iframeDocument) iframeDocument.body.style.height = '100vh';
    console.log(iframeDocument);
  }, 5000);
}

const debouncedFetchContent = debounce(fetchContent, 200);

// Fullscreen functions
function toggleFullscreen() {
  const player = document.getElementById("videoPlayer");
  if (!player) return;

  if (!document.fullscreenElement) {
    if (player.requestFullscreen) {
      player.requestFullscreen().catch(err => {
        console.error("Fullscreen failed:", err);
      });
    } else if (player.webkitRequestFullscreen) { // Safari
      player.webkitRequestFullscreen();
    } else if (player.mozRequestFullScreen) { // Firefox
      player.mozRequestFullScreen();
    } else if (player.msRequestFullscreen) { // IE/Edge
      player.msRequestFullscreen();
    }
  } else {
    exitFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

// Handle orientation change to restore pane states
window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    const isDetailOpen = sessionStorage.getItem("detailPaneOpen") === "true";
    const isPlayerOpen = sessionStorage.getItem("playerPaneOpen") === "true";
    const pane = document.getElementById("playerPane");
    if (isDetailOpen && detailPane) detailPane.classList.add("open");
    if (isPlayerOpen && pane) {
      pane.classList.add("open", "landscape"); // Ensure landscape on rotation
    }
  }, 100); // Small delay to ensure DOM is updated
});

new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !loading) debouncedFetchContent();
}, { threshold: 0.1 }).observe(sentinel);

fetchGenres();
fetchContent();
