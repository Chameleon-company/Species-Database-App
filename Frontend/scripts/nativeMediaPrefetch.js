// sync.js (or native-media.js)
async function prefetchVidMedia(mediaList = []) {
  if (!window.Capacitor?.isNativePlatform()) return;

  const Filesystem = window.Capacitor.Plugins.Filesystem;

  const videos = mediaList.filter(m => m.media_type === "video");
  if (!videos.length) return;

  await Filesystem.mkdir({
    path: "videos",
    directory: "DATA",
    recursive: true,
  }).catch(() => {});

  for (const video of videos) {
    const { species_id, download_link } = video;
    if (!species_id || !download_link) continue;

    const ext = download_link.split("?")[0].split(".").pop().toLowerCase();
    const path = `videos/species_${species_id}.${ext}`;

    try {
      await Filesystem.stat({ directory: "DATA", path });
      continue; // already downloaded
    } catch {}

    try {
      await Filesystem.downloadFile({
        url: download_link,
        path,
        directory: "DATA",
      });
    } catch (err) {
      console.warn("Video download failed:", path, err);
    }
  }
}

window.prefetchVidMedia = prefetchVidMedia;
