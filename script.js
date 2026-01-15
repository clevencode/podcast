// ================================================
// CONTROLES DO PLAYER PRINCIPAL E MINI-PLAYER
// ================================================
const PlayerControls = (() => {
  const audio = document.getElementById('radio-player');
  const playBtn = document.getElementById('play-pause-btn');
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const coverArt = document.getElementById('cover-art');
  const miniPlayBtn = document.querySelector('.mini-play-btn');
  const miniPlayer = document.getElementById('mini-player');

  let isPlaying = false;
  let episodes = [];
  let currentIndex = 0;
  let lastScrollPosition = window.pageYOffset;

  // Mini-player scroll behavior
  const setupScrollBehavior = () => {
    const handleScroll = () => {
      const current = window.pageYOffset;
      if (current > lastScrollPosition && current > 100) {
        miniPlayer?.classList.add('sticky', 'visible');
      } else {
        miniPlayer?.classList.remove('visible');
      }
      lastScrollPosition = current;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  };
  const cleanupScroll = setupScrollBehavior();

  function setEpisodes(newEpisodes) {
    if (!Array.isArray(newEpisodes) || newEpisodes.length === 0) return;
    episodes = newEpisodes;
    setCurrentIndex(0);
    StationGrid.atualizarGrade(episodes);
  }

  function setCurrentIndex(index) {
    if (index < 0 || index >= episodes.length) return;
    currentIndex = index;
    displayEpisode(index);
    StationGrid.atualizarGrade(episodes);
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function getIsPlaying() {
    return isPlaying;
  }

  function updatePlayIcons(icon) {
    const html = `<span class="material-icons">${icon}</span>`;
    if (playBtn) playBtn.innerHTML = html;
    if (miniPlayBtn) miniPlayBtn.innerHTML = html;
    const miniIcon = document.getElementById('mini-toggle-icon');
    if (miniIcon) miniIcon.textContent = icon;
  }

  function play() {
    if (!episodes[currentIndex]?.audioUrl) {
      alert('Nenhum áudio disponível para este episódio.');
      return;
    }
    audio.src = episodes[currentIndex].audioUrl;
    audio.play()
      .then(() => {
        updatePlayIcons('pause');
        isPlaying = true;
        StationGrid.atualizarGrade(episodes);
        miniPlayer?.classList.add('active', 'visible', 'sticky');
      })
      .catch(err => {
        console.error('Erro ao reproduzir:', err);
        alert('Falha ao tocar o episódio. Verifique o console para detalhes.');
      });
  }

  function pause() {
    audio.pause();
    updatePlayIcons('play_arrow');
    isPlaying = false;
    StationGrid.atualizarGrade(episodes);
  }

  function displayEpisode(index) {
    const ep = episodes[index];
    if (!ep) return;

    const title = ep.title || 'Sem título';
    const desc = ep.description || 'Sem descrição';
    const thumb = ep.thumbnail || 'https://via.placeholder.com/150';

    if (miniPlayer) {
      const miniName = miniPlayer.querySelector('#mini-station-name');
      const miniDesc = miniPlayer.querySelector('#mini-station-country');
      if (miniName) miniName.textContent = title;
      if (miniDesc) miniDesc.textContent = desc.substring(0, 50) + (desc.length > 50 ? '...' : '');
      miniPlayer.classList.add('active');
    }

    document.getElementById('artist-name')?.textContent = title;
    document.getElementById('song-name')?.textContent = desc.substring(0, 50) + (desc.length > 50 ? '...' : '');

    if (coverArt) coverArt.style.backgroundImage = `url(${thumb})`;
  }

  if (playBtn) playBtn.addEventListener('click', () => isPlaying ? pause() : play());
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (!episodes.length) return;
    setCurrentIndex((currentIndex + 1) % episodes.length);
    if (isPlaying) play();
  });
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (!episodes.length) return;
    setCurrentIndex((currentIndex - 1 + episodes.length) % episodes.length);
    if (isPlaying) play();
  });

  return {
    setEpisodes,
    setCurrentIndex,
    getCurrentIndex,
    getIsPlaying,
    play,
    pause,
    cleanup: cleanupScroll
  };
})();

// ================================================
// GRADE DE EPISÓDIOS
// ================================================
const StationGrid = (() => {
  const grid = document.querySelector('.stations-grid');
  const searchInput = document.getElementById('search-input');

  function atualizarGrade(episodes) {
    if (!grid) return;
    grid.innerHTML = '';

    episodes.forEach((ep, index) => {
      const item = document.createElement('div');
      item.classList.add('station-item');
      item.dataset.index = index;
      item.innerHTML = `
        <img src="${ep.thumbnail}" alt="${ep.title}">
        <div class="station-info">
          <span class="station-name">${ep.title}</span>
          <span class="station-country">${ep.description.substring(0, 30)}${ep.description.length > 30 ? '...' : ''}</span>
        </div>
      `;
      if (index === PlayerControls.getCurrentIndex()) item.classList.add('active');
      item.addEventListener('click', () => {
        PlayerControls.setCurrentIndex(index);
        PlayerControls.play();
      });
      grid.appendChild(item);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const term = e.target.value.toLowerCase();
      Array.from(grid.children).forEach(child => {
        const name = child.querySelector('.station-name')?.textContent.toLowerCase() || '';
        const desc = child.querySelector('.station-country')?.textContent.toLowerCase() || '';
        child.style.display = (name.includes(term) || desc.includes(term)) ? 'flex' : 'none';
      });
    });
  }

  return { atualizarGrade };
})();

// ================================================
// FETCH DO RSS VIA PROXY VERCEL (/api/podcast)
// ================================================
const PodcastFetcher = (() => {
  const proxyUrl = '/api/podcast'; // Seu proxy serverless (Vercel)

  function fetchEpisodes() {
    const grid = document.querySelector('.stations-grid');
    if (grid) grid.innerHTML = '<p style="text-align:center; color:#aaa; padding:2rem;">Carregando episódios do podcast...</p>';

    fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/xml' }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.text();
      })
      .then(xmlText => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');

        const parseError = xml.querySelector('parsererror');
        if (parseError) throw new Error(`Erro no XML: ${parseError.textContent || 'Formato inválido'}`);

        const items = xml.querySelectorAll('item');
        if (items.length === 0) throw new Error('Nenhum episódio encontrado no feed RSS');

        const episodes = Array.from(items).map(item => {
          const enclosure = item.querySelector('enclosure');
          const itunesImage = item.querySelector('itunes\\:image') || item.querySelector('image');
          return {
            title: item.querySelector('title')?.textContent?.trim() || 'Sem título',
            description: item.querySelector('description')?.textContent?.trim() || 'Sem descrição',
            pubDate: item.querySelector('pubDate')?.textContent?.trim() || 'Sem data',
            audioUrl: enclosure?.getAttribute('url') || '',
            thumbnail: itunesImage?.getAttribute('href') ||
                       itunesImage?.querySelector('url')?.textContent ||
                       'https://via.placeholder.com/150'
          };
        });

        // Ordenação por data descendente (mais recente primeiro)
        episodes.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        PlayerControls.setEpisodes(episodes);
        console.log(`Sucesso: ${episodes.length} episódios carregados do RSS`);
      })
      .catch(err => {
        console.error('Falha completa no fetch RSS via proxy:', err);
        if (grid) {
          grid.innerHTML = `
            <p style="color:#ff6b6b; text-align:center; padding:2rem;">
              Falha ao carregar episódios do podcast.<br>
              <small>${err.message}</small><br>
              Verifique:
              <ul style="text-align:left; margin:1rem auto; max-width:600px;">
                <li>O arquivo /api/podcast.js existe na raiz?</li>
                <li>O RSS está correto em api/podcast.js?</li>
                <li>O deploy no Vercel foi atualizado?</li>
              </ul>
            </p>
          `;
        }
      });
  }

  return { fetchEpisodes };
})();

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  PodcastFetcher.fetchEpisodes();
  setupPainelAlternancia();
  setupMiniPlayerControles();
  setupMiniPlayerToggle();
});

// Mantenha as outras funções (volume, alternância, mini-player, etc.) intactas
// Elas continuam funcionando com os episódios carregados