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
  window.addEventListener('online', showOnlineBanner);
});
