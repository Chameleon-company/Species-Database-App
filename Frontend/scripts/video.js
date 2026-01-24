// ------------------------------
// CONFIG
// ------------------------------
const params = new URLSearchParams(window.location.search)
const VIDEO_SRC = params.get("media")
const speciesId = params.get("species_id")

const STORAGE_KEY = `video_downloaded_species_${speciesId}`

// ------------------------------
// ELEMENT REFERENCES
// ------------------------------
const videoContainer = document.getElementById("videoContainer");
const playOverlay = document.getElementById("playOverlay");
const thumbnail = document.getElementById("videoThumbnail");

const downloadBtn = document.getElementById("downloadBtn");
const downloadStatus = document.getElementById("downloadStatus");

if(!VIDEO_SRC || !speciesId)
{
    console.error("missing media URL or species id")
    downloadStatus.textContent ="Video unavailable"
    downloadBtn.disabled = true
    playOverlay?.remove()
}

// ------------------------------
// PLAY VIDEO (THUMBNAIL → VIDEO)
// ------------------------------
if (playOverlay) {
    playOverlay.addEventListener("click", () => {
        const video = document.createElement("video");
        video.src = VIDEO_SRC;
        video.controls = true;
        video.autoplay = true;
        video.setAttribute("playsinline", "" )
        video.style.width = "100%";
        video.style.height = "380px";
        video.style.objectFit = "cover";

        // Replace thumbnail with video
        videoContainer.innerHTML = "";
        videoContainer.appendChild(video);
    });
}

// ------------------------------
// CHECK DOWNLOAD STATE
// ------------------------------
function checkDownloadState() {
    const isDownloaded = localStorage.getItem(STORAGE_KEY);

    if (isDownloaded === "true") {
        downloadStatus.textContent = "Downloaded";
        downloadBtn.textContent = "Downloaded";
        downloadBtn.disabled = true;
    }
}

checkDownloadState();

// ------------------------------
// DOWNLOAD HANDLER
// ------------------------------

//listen for progress adn completion messages from service worker
//IMPORTANT: UI only says doownloaded adter media_cahce_done
if(navigator.serviceWorker)
{
    //ask sw to cache video URL
    navigator.serviceWorker.addEventListener("message", (event) =>{
        const data = event.data

        if(!data) return

        if(data.type === "MEDIA_CACHE_DONE")
        {
            localStorage.setItem(STORAGE_KEY, "true")

            downloadStatus.textContent = "Downloaded"
            downloadBtn.textContent = "Downloaded"
            downloadBtn.disabled = true
        }
    })
}

downloadBtn?.addEventListener("click", () => {
    if(!navigator.serviceWorker?.controller)
    {
        console.warn("service worker not ready")
        return
    }

    downloadStatus.textContent = "Downloading..."
    downloadBtn.disabled = true;

    navigator.serviceWorker.controller.postMessage({
        type: "CACHE_MEDIA",
        urls: [VIDEO_SRC],
    })
})