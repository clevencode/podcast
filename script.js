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

  // ... (manter o código de scroll behavior como estava)

  function setEpisodes(newEpisodes) {
    if (!Array.isArray(newEpisodes) || newEpisodes.length === 0) {
      console.warn('Nenhum episódio válido recebido');
      return;
    }
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

  // ... (manter getCurrentIndex, getIsPlaying, updatePlayIcons, play, pause, displayEpisode)

  // Eventos dos botões (manter como estava)

  return {
    setEpisodes,
    setCurrentIndex,
    getCurrentIndex,
    getIsPlaying,
    play,
    pause,
    // cleanup: cleanupScroll
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

    if (episodes.length === 0) {
      grid.innerHTML = '<p style="text-align:center; padding:2rem;">Nenhum episódio encontrado</p>';
      return;
    }

    episodes.forEach((ep, index) => {
      const item = document.createElement('div');
      item.classList.add('station-item');
      item.dataset.index = index;

      const safeTitle = ep.title || 'Sem título';
      const safeDesc = ep.description || 'Sem descrição';
      const safeThumb = ep.thumbnail || 'https://via.placeholder.com/150';

      item.innerHTML = `
        <img src="${safeThumb}" alt="${safeTitle}" onerror="this.src='https://via.placeholder.com/150?text=?'">
        <div class="station-info">
          <span class="station-name">${safeTitle}</span>
          <span class="station-country">${safeDesc.substring(0, 40)}${safeDesc.length > 40 ? '...' : ''}</span>
        </div>
      `;

      if (index === PlayerControls.getCurrentIndex()) {
        item.classList.add('active');
      }

      item.addEventListener('click', () => {
        PlayerControls.setCurrentIndex(index);
        PlayerControls.play();
      });

      grid.appendChild(item);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const term = e.target.value.toLowerCase().trim();
      Array.from(grid.children).forEach(child => {
        const name = child.querySelector('.station-name')?.textContent?.toLowerCase() || '';
        const desc = child.querySelector('.station-country')?.textContent?.toLowerCase() || '';
        child.style.display = (name.includes(term) || desc.includes(term)) ? '' : 'none';
      });
    });
  }

  return { atualizarGrade };
})();

// ================================================
// FETCH DO RSS VIA PROXY
// ================================================
const PodcastFetcher = (() => {
  const proxyUrl = '/api/podcast';

  async function fetchEpisodes() {
    const grid = document.querySelector('.stations-grid');
    if (grid) {
      grid.innerHTML = '<p style="text-align:center; color:#666; padding:2rem;">Carregando episódios...</p>';
    }

    try {
      const res = await fetch(proxyUrl);
      
      if (!res.ok) {
        throw new Error(`Proxy retornou ${res.status} - ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('xml')) {
        console.warn('Resposta não é XML. Content-Type:', contentType);
      }

      const xmlText = await res.text();
      console.log('XML recebido (primeiros 400 chars):', xmlText.substring(0, 400));

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');

      const parseError = xml.querySelector('parsererror');
      if (parseError) {
        throw new Error(`Erro de parsing XML: ${parseError.textContent}`);
      }

      const items = xml.querySelectorAll('item');
      console.log('Episódios encontrados no feed:', items.length);

      if (items.length === 0) {
        throw new Error('Nenhum <item> encontrado no feed RSS');
      }

      const episodes = Array.from(items).map(item => {
        const enclosure = item.querySelector('enclosure');
        const itunesImage = item.querySelector('itunes\\:image');

        return {
          title: item.querySelector('title')?.textContent?.trim() || 'Sem título',
          description: item.querySelector('description')?.textContent?.trim() || 'Sem descrição',
          pubDate: item.querySelector('pubDate')?.textContent?.trim() || 'Sem data',
          audioUrl: enclosure?.getAttribute('url') || '',
          thumbnail:
            itunesImage?.getAttribute('href') ||
            item.querySelector('image url')?.textContent ||
            item.querySelector('image')?.getAttribute('href') ||
            'https://via.placeholder.com/150'
        };
      });

      // Ordenar por data (mais recente primeiro)
      episodes.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      console.log('Episódios processados com sucesso:', episodes.length);
      PlayerControls.setEpisodes(episodes);
    } catch (err) {
      console.error('Erro completo ao carregar podcast:', err);
      if (grid) {
        grid.innerHTML = `
          <p style="color:#e74c3c; text-align:center; padding:2rem;">
            Erro ao carregar episódios<br>
            <small>${err.message}</small>
          </p>
        `;
      }
    }
  }

  return { fetchEpisodes };
})();

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  PodcastFetcher.fetchEpisodes();
  // setupPainelAlternancia();
  // setupMiniPlayerControles();
  // setupMiniPlayerToggle();
});