// ------------------------------
// CONFIG
// ------------------------------
const VIDEO_SRC = "./Assets/Videos/tree-identification.mp4";
const STORAGE_KEY = "tree_video_downloaded";

// ------------------------------
// ELEMENT REFERENCES
// ------------------------------
const videoContainer = document.getElementById("videoContainer");
const playOverlay = document.getElementById("playOverlay");
const thumbnail = document.getElementById("videoThumbnail");

const downloadBtn = document.getElementById("downloadBtn");
const downloadStatus = document.getElementById("downloadStatus");

// ------------------------------
// PLAY VIDEO (THUMBNAIL → VIDEO)
// ------------------------------
if (playOverlay) {
    playOverlay.addEventListener("click", () => {
        const video = document.createElement("video");
        video.src = VIDEO_SRC;
        video.controls = true;
        video.autoplay = true;
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
// MANUAL DOWNLOAD HANDLER
// ------------------------------
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        downloadStatus.textContent = "Downloading...";
        downloadBtn.disabled = true;

        // Simulate download delay (UX-friendly)
        setTimeout(() => {
            const link = document.createElement("a");
            link.href = VIDEO_SRC;
            link.download = "tree-identification.mp4";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Persist download state
            localStorage.setItem(STORAGE_KEY, "true");

            downloadStatus.textContent = "Downloaded";
            downloadBtn.textContent = "Downloaded";
        }, 1200);
    });
}
