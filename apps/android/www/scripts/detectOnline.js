let flagTimer; //Timer element

//create Online Banner element
function createOnlineBanner() {
  const main = document.querySelector("main.app-shell");
  if (!main) return null;

  let banner = document.getElementById('online-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'online-banner';
    banner.className = 'banner hidden';

    const textSpan = document.createElement('span'); // text
    textSpan.textContent = 'You\'re back online!';
    banner.appendChild(textSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-banner';
    closeBtn.textContent = '✖';
    closeBtn.addEventListener('click', () => {
      banner.classList.add('hidden');      // hide banner
      if (flagTimer) clearTimeout(flagTimer); // stop timer
    });

    banner.appendChild(closeBtn);
    main.appendChild(banner);
  }

  return banner;
}

function showOnlineBanner() {
  const banner = createOnlineBanner();
  if (!banner) return;

  banner.classList.remove('hidden');

  if (flagTimer) clearTimeout(flagTimer);
  
  //Set timer for automatically hidden the banner after 5 seconds
  flagTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, 5000); // 5 seconds
}

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('online', async() =>{
    showOnlineBanner();

    // Retry any broken <img> tags (e.g. local icons that failed while offline)
    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.src) {
        const originalSrc = img.src;
        img.src = '';
        img.src = originalSrc;
      }
    });
    
     if (typeof syncManager === 'undefined') return;

    try {
      const res = await syncManager.checkAndSync({ forceBundle: false });

      // Re-render so thumbnails that failed while offline get retried
      if (typeof dataService !== 'undefined' && typeof window.setSpeciesData === 'function') {
        const langCode = (document.querySelector('.lang-btn')?.textContent || 'EN')
          .trim()
          .toLowerCase();
        const lang = langCode === 'tet' ? 'tet' : 'en';

        const species = await dataService.getAllSpecies(lang);
        window.setSpeciesData(species);
      }
    } catch (err) {
      console.warn('[detectOnline] Sync retry failed:', err);
    }
  });
});
