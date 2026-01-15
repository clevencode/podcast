// Controles do player principal e mini-player
const PlayerControls = (() => {
  // Referências aos elementos do DOM
  const audio = document.getElementById('radio-player');
  const playBtn = document.getElementById('play-pause-btn');
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const coverArt = document.getElementById('cover-art');
  const miniPlayBtn = document.querySelector('.mini-play-btn');
  const miniPlayer = document.getElementById('mini-player');

  // Estado interno do player
  let isPlaying = false;
  let episodes = []; // Agora é lista de episódios do podcast
  let currentIndex = 0;
  let lastScrollPosition = window.pageYOffset;

  // Configura comportamento do mini-player ao rolar a página
  const setupScrollBehavior = () => {
    const handleScroll = () => {
      const currentScrollPosition = window.pageYOffset;
      if (currentScrollPosition > lastScrollPosition) {
        miniPlayer?.classList.add('sticky', 'visible');
      } else {
        miniPlayer?.classList.remove('visible');
      }
      lastScrollPosition = currentScrollPosition;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  };

  const cleanupScroll = setupScrollBehavior();

  // Define lista de episódios do podcast
  function setEpisodes(newEpisodes) {
    if (!Array.isArray(newEpisodes)) return;
    episodes = newEpisodes;
    setCurrentIndex(0); // Começa no episódio mais recente
    StationGrid.atualizarGrade(episodes);
  }

  // Define o índice do episódio atual
  function setCurrentIndex(index) {
    if (index < 0 || index >= episodes.length) return;
    currentIndex = index;
    displayEpisode(index);
    StationGrid.atualizarGrade(episodes);
  }

  // Obtém índice do episódio atual
  function getCurrentIndex() {
    return currentIndex;
  }

  // Verifica se o player está tocando
  function getIsPlaying() {
    return isPlaying;
  }

  // Atualiza ícones de play/pause
  function updatePlayIcons(icon) {
    const iconHTML = `<span class="material-icons">${icon}</span>`;
    if (playBtn) playBtn.innerHTML = iconHTML;
    if (miniPlayBtn) miniPlayBtn.innerHTML = iconHTML;
    const miniIcon = document.getElementById('mini-toggle-icon');
    if (miniIcon) miniIcon.textContent = icon;
  }

  // Inicia a reprodução do episódio atual
  function play() {
    if (!episodes[currentIndex]) return;
    audio.src = episodes[currentIndex].audioUrl || '';
    audio.play().then(() => {
      updatePlayIcons('pause');
      isPlaying = true;
      StationGrid.atualizarGrade(episodes);
      miniPlayer?.classList.add('active', 'visible', 'sticky');
    }).catch(err => {
      console.error('Erro ao reproduzir episódio:', err);
      alert('Não foi possível reproduzir este episódio. Verifique o link do RSS.');
    });
  }

  // Pausa a reprodução
  function pause() {
    audio.pause();
    updatePlayIcons('play_arrow');
    isPlaying = false;
    StationGrid.atualizarGrade(episodes);
  }

  // Exibe informações do episódio atual no player
  function displayEpisode(index) {
    const episode = episodes[index];
    if (!episode) return;

    const name = episode.title || 'Sem título';
    const desc = episode.description || 'Sem descrição';
    const icon = episode.thumbnail || 'https://via.placeholder.com/150'; // Capa padrão

    // Atualiza mini-player
    if (miniPlayer) {
      const miniName = miniPlayer.querySelector('#mini-station-name');
      const miniCountry = miniPlayer.querySelector('#mini-station-country');
      if (miniName) miniName.textContent = name;
      if (miniCountry) miniCountry.textContent = desc.substring(0, 50) + '...';
      miniPlayer.classList.add('active');
    }

    // Atualiza player principal
    const artistName = document.getElementById('artist-name');
    const songName = document.getElementById('song-name');
    if (artistName) artistName.textContent = name;
    if (songName) songName.textContent = desc.substring(0, 50) + '...';

    if (coverArt) coverArt.style.backgroundImage = `url(${icon})`;
  }

  // Eventos dos botões principais
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

  // Retorna métodos públicos
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

// Renderiza a lista de episódios e permite filtro de busca
const StationGrid = (() => {
  const grid = document.querySelector('.stations-grid');
  const searchInput = document.getElementById('search-input');

  // Atualiza a grid com episódios do podcast
  function atualizarGrade(episodes) {
    if (!grid) return;
    grid.innerHTML = '';
    episodes.forEach((episode, index) => {
      const item = document.createElement('div');
      item.classList.add('station-item');
      item.dataset.index = index;
      item.innerHTML = `
        <img src="${episode.thumbnail || 'https://via.placeholder.com/50'}" alt="${episode.title}">
        <div class="station-info">
          <span class="station-name">${episode.title}</span>
          <span class="station-country">${episode.description.substring(0, 30)}...</span>
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

  // Filtra por busca (título ou descrição)
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const search = e.target.value.toLowerCase();
      Array.from(grid.children).forEach(child => {
        const name = child.querySelector('.station-name').textContent.toLowerCase();
        const desc = child.querySelector('.station-country').textContent.toLowerCase();
        child.style.display = (name.includes(search) || desc.includes(search)) ? 'flex' : 'none';
      });
    });
  }

  return { atualizarGrade };
})();

// Fetch de episódios do RSS do podcast usando proxy próprio no Vercel
const PodcastFetcher = (() => {
  // URL do proxy que criamos na pasta api/ (Vercel cria automaticamente /api/podcast)
  const proxyUrl = '/api/podcast';

  function fetchEpisodes() {
    // Mostra loading
    const grid = document.querySelector('.stations-grid');
    if (grid) grid.innerHTML = '<p style="text-align:center; color:#aaa;">Carregando episódios do podcast...</p>';

    fetch(proxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(str => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(str, 'text/xml');

        if (xml.querySelector('parsererror')) {
          throw new Error('Formato RSS inválido ou feed não encontrado');
        }

        const items = xml.querySelectorAll('item');
        if (items.length === 0) {
          throw new Error('Nenhum episódio encontrado no RSS');
        }

        const episodes = Array.from(items).map(item => ({
          title: item.querySelector('title')?.textContent || 'Sem título',
          description: item.querySelector('description')?.textContent || 'Sem descrição',
          pubDate: item.querySelector('pubDate')?.textContent || 'Data desconhecida',
          audioUrl: item.querySelector('enclosure')?.getAttribute('url') || '',
          thumbnail: item.querySelector('itunes\\:image')?.getAttribute('href') ||
                     item.querySelector('image')?.querySelector('url')?.textContent ||
                     'https://via.placeholder.com/150'
        }));

        // Ordena por data (mais recente primeiro)
        episodes.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Envia para o player
        PlayerControls.setEpisodes(episodes);

        console.log(`Carregados ${episodes.length} episódios com sucesso!`);
      })
      .catch(err => {
        console.error('Erro ao carregar RSS via proxy:', err);
        if (grid) {
          grid.innerHTML = `
            <p style="color:#ff6b6b; text-align:center; padding: 2rem;">
              Erro ao carregar episódios.<br>
              <small>${err.message}</small><br>
              Verifique se o arquivo /api/podcast.js está correto e o RSS está válido.
            </p>
          `;
        }
      });
  }

  return { fetchEpisodes };
})();
// Inicialização do app
document.addEventListener('DOMContentLoaded', () => {
  PodcastFetcher.fetchEpisodes(); // Carrega episódios do RSS
  setupPainelAlternancia();
  setupMiniPlayerControles();
  setupMiniPlayerToggle();
});

// Mantenha as outras funções existentes (volume, alternância de painel, mini-player, etc.)
// Elas continuam funcionando normalmente com os episódios no lugar das estações