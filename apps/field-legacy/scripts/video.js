//Gets a safe URL (dfeinitely from the proper DB) instead of a user-provided value (could be malicious) which trips up GitHub's security check
function getSafeVideoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
        console.warn("[Video] Missing media URL");
        return null;
    }

    try {
        const url = new URL(rawUrl.trim());

        const allowedHosts = new Set(
            API_CONFIG.SUPABASE_VIDEO_HOSTS || [API_CONFIG.SUPABASE_HOST]
        );

        const allowedPaths = API_CONFIG.SUPABASE_VIDEO_PATHS || [
            "/storage/v1/object/public/species_videos/",
        ];

        if (url.protocol !== "https:") {
            console.warn("[Video] Rejected non-HTTPS media URL");
            return null;
        }

        if (!allowedHosts.has(url.hostname)) {
            console.warn("[Video] Rejected media host:", url.hostname);
            return null;
        }

        if (!allowedPaths.some(path => url.pathname.startsWith(path))) {
            console.warn("[Video] Rejected media path:", url.pathname);
            return null;
        }

        const validVideoFile = /\.(mp4|webm|mov)$/i.test(url.pathname);

        if (!validVideoFile) {
            console.warn("[Video] Rejected media file type:", url.pathname);
            return null;
        }

        return url.href;
    } catch (error) {
        console.warn("[Video] Invalid media URL", error);
        return null;
    }
}


// ------------------------------
// CONFIG
// ------------------------------
const params = new URLSearchParams(window.location.search);

const rawVideoUrl = params.get("media");
const speciesId = params.get("species_id");
const VIDEO_SRC = getSafeVideoUrl(rawVideoUrl);

const STORAGE_KEY = `video_downloaded_species_${speciesId}`
const FILE_NAME =`videos/species_${speciesId}.mp4`

const Filesystem = window.Capacitor?.Plugins?.Filesystem
const Directory = Filesystem?.Directory
// ------------------------------
// ELEMENT REFERENCES
// ------------------------------
const videoContainer = document.getElementById("videoContainer");
const playOverlay = document.getElementById("playOverlay");
const videoPrev = document.getElementById("videoPreview"); //Video preview thumbnail

const downloadBtn = document.getElementById("downloadBtn");
const downloadStatus = document.getElementById("downloadStatus");

if(!VIDEO_SRC || !speciesId)
{
    console.error("missing media URL or species id")
    downloadStatus.textContent ="Video Unavailable"
    downloadBtn.disabled = true
    playOverlay?.remove()
}


//Chcek if online -> if not online and video hasnt cached show video is unavailable
async function checkIfOnline() {
    if (!VIDEO_SRC) {
        return false;
    }

    try {
        const response = await fetch(VIDEO_SRC, {
            method: "HEAD",
            cache: "no-store"
        });

        if (response.ok) {
            return true;
        }

        // Some storage services reject HEAD even when GET works
        const fallback = await fetch(VIDEO_SRC, {
            method: "GET",
            headers: {
                Range: "bytes=0-0"
            },
            cache: "no-store"
        });

        return fallback.ok;
    } catch {
        return false;
    }
}

//Return a video state to update download text, button and video player
async function videoState() {
    const cached = await getCachedVideo(VIDEO_SRC);
    const online = await checkIfOnline();

    console.log("[Video State]", {
    isCached: !!cached?.blob,
    online
    });
    return {
        cached,
        isCached: !!cached?.blob,
        online
    };
}

//Data to be used on video page (title, video duration, file size)
//Title of the video
const title = params.get("title");
if (title) {document.getElementById("videoTitle").textContent =decodeURIComponent(title);}

//Returned video length is in seconds, format it to mins
function formatDuration(dur) {
    const mins = Math.floor(dur / 60);
    const secs = Math.floor(dur %60);
    return `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

//Get video length from video metadata and format to min:sec
videoPrev.addEventListener("loadedmetadata", () => {
    document.getElementById("videoDuration").textContent = formatDuration(videoPrev.duration);
});

//File size needs to be converted to kb/mb
function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
    if (bytes < 1024 * 1024 * 1024) {return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;}
}

//Check the cached video for file size and format it (don't have permission for online ver in DB)
//Can update this later on to include online BUT it might require modifying DB schema - not going to disrupt this atm
async function displayVideoSize() {
    const videoSizeElement = document.getElementById("fileSize");
    if (!videoSizeElement || !VIDEO_SRC) {return;}

    try {
        //Use cached video if available
        const cachedVideo = await getCachedVideo(VIDEO_SRC);

        if (cachedVideo?.blob instanceof Blob)
        {
            videoSizeElement.textContent = formatFileSize(cachedVideo.blob.size);
            return;
        }
        else {videoSizeElement.textContent = "Available on Download"; return;}
        //unknown if failed for w/e reason
        videoSizeElement.textContent = "Unknown";
    } catch (error) {
        videoSizeElement.textContent = "Unknown";
        console.warn("Unknown video size:",error);
    }
}

//Video preview is working by doing autoplay for 1 seconds and then paused.
async function setupVideoPreview() {
    if (!videoPrev || !VIDEO_SRC || !speciesId) {return;}

    const state = await videoState();

    //placeholder test
    //state.isCached = false;
    //state.online = false;
    //Disable play and download if not cached and offline. Set placeholder icon for unavailable video
    if (!state.isCached && !state.online) {
        downloadStatus.textContent = "Offline: Video Unavailable";
        downloadBtn.disabled = true
        videoPrev.poster = "Assets/icons/videoPlaceholder.jpg";
        playOverlay.style.display = "none";
        return;
    }

    videoPrev.src = await loadVideoWithCache(VIDEO_SRC,speciesId);
    videoPrev.addEventListener("loadeddata", async () => {
        //get duration from metadata
        document.getElementById("videoDuration").textContent = formatDuration(videoPrev.duration);

        try {
            await videoPrev.play();
            setTimeout(() => {videoPrev.pause();},1000);

        } catch (err) {console.warn("Autoplay blocked", err);}
    });
}

setupVideoPreview();
displayVideoSize();

// ------------------------------
// PLAY VIDEO (THUMBNAIL → VIDEO)
// ------------------------------
if (playOverlay) {
    playOverlay.addEventListener("click", async () => {
        const video = document.createElement("video");
        
        const state = await videoState();
        //Disable play if not cached and offline
        if (!state.isCached && !state.online) {
            downloadStatus.textContent = "Offline: Video Unavailable";
            downloadBtn.textContent = "Offline";
            downloadBtn.disabled = true;
            return;
        }

        //if vid is downloaded, play from local file
        video.src = await loadVideoWithCache(VIDEO_SRC,speciesId);

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

//Download the video and save to cache (if not already donwloaded and online) 
downloadBtn?.addEventListener("click", async () => {
    //If video is not cached or available
    if (!VIDEO_SRC || !speciesId) {
        downloadStatus.textContent = "Video Unavailable";
        return;
    }
    const state = await videoState();
    //if already cached -> disable
    if (state.isCached) {
        downloadStatus.textContent = "Video already downloaded";
        downloadBtn.textContent = "Downloaded";
        downloadBtn.disabled = true;
        return;
    }
    //If offlien and not cached (already checked) -> disable
    if (!state.online) {
        downloadStatus.textContent = "Offline: Video Unavailable";
        downloadBtn.textContent = "Offline";
        downloadBtn.disabled = true;
        return;
    }

    //Notify the user video is dling and prevent further preses of dl button
    downloadStatus.textContent = "Downloading...";
    downloadBtn.disabled = true;
    try {
        const blob = await cacheVideo(VIDEO_SRC,speciesId);

        downloadStatus.textContent = "Video downloaded";
        downloadBtn.textContent = "Downloaded";
        downloadBtn.disabled = true;
        
        if (videoPrev && blob) {
            videoPrev.src = URL.createObjectURL(blob);
            downloadBtn.disabled = true;
            await displayVideoSize();
        }

    } catch (err) {
        console.error("[Video] Download failed:", err);
        downloadStatus.textContent = "Download failed";
        downloadBtn.textContent = "Not Downloaded";
        downloadBtn.disabled = false;
    }
});

// ------------------------------
// CHECK DOWNLOAD STATE
// ------------------------------

//Checks various states (in cache, not in cache and offlien) to change message and button behaviour
async function checkDownloadState() {
    if (!VIDEO_SRC || !speciesId) {
        downloadStatus.textContent = "Video Unavailable";
        downloadBtn.disabled = true;
        return;
    }

    const cached = await getCachedVideo(VIDEO_SRC);
    const state = await videoState();
    //if already cached -> disable
    if (state.isCached) {
        downloadStatus.textContent = "Video already downloaded";
        downloadBtn.textContent = "Downloaded";
        downloadBtn.disabled = true;
        return;
    }
    //If offlien and not cached (already checked) -> disable
    if (!state.online) {
        downloadStatus.textContent = "Offline: Download Unavailable"; //only if offline and not cached
        downloadBtn.textContent = "Offline";
        downloadBtn.disabled = true;
        return;
    }

    //Online and not cached -> can download
    downloadStatus.textContent = "Not Downloaded";
    downloadBtn.textContent = "Download";
    downloadBtn.disabled = false;

}

checkDownloadState();

//Back button
document.getElementById("backButton").addEventListener("click", () => {history.back();});


/*******************************************************
//This is some of the code that is depreciated from previous
//iteration where the implementation was only partially implemented
//
/***************************************************** */

//---------------------------
// VIDEO PREVIEW THUMBNAIL
//---------------------------
/*
//Video preview is working by doing autoplay for 1 seconds and then paused.
if (videoPrev) {
        videoPrev.src = VIDEO_SRC;
        videoPrev.addEventListener("loadeddata", async () => {
            try {
                await videoPrev.play();

                setTimeout(() => {
                    videoPrev.pause();
                }, 1000);

            } catch (err) {
                console.warn("Autoplay blocked", err);
            }
        });
}
*/

//---------------------------
// VIDEO THUMBNAIL USING CANVAS METHOD (NOT WORKING)
//---------------------------
//setThumbnail(VIDEO_SRC, thumbnail);

// ------------------------------
// CANVAS THUMBNAIL FOR VIDEO BEFFORE PLAYED (NOT WORKING)
// ------------------------------

/*
//This function sets the Thumbnail with the video frame taken from the video
//But it is not working because it is blocked by the CORS, It needs access to S3 server to allow the permission
function setThumbnail(videoUrl, thumbnailElement){
    if(!videoUrl || !thumbnailElement) return;

    const video = document.createElement("video");

    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.addEventListener("loadedmetadata", async () => {
        try{
            await video.play();
            video.pause();
            video.currentTime = 0.1;
        } catch (err) {
            console.warn("Autoplay blocked", err)
        }
        
    });

    video.addEventListener("seeked", () =>{
        const canvas = document.createElement("canvas");
        canvas.width =  video.videoWidth;
        canvas.height = video.videoHeight;

        const ctxt = canvas.getContext("2d");
        ctxt.drawImage(video, 0, 0, canvas.width, canvas.height);

        thumbnailElement.src = canvas.toDataURL("image/jpeg", 0.85);

        //clean the source after all is set
        video.src = "";
    });

}
*/



// ------------------------------
// DOWNLOAD HANDLER
// ------------------------------
//downloads vid and saves to real file on device

/*
downloadBtn?.addEventListener("click", async () => {
    if(!Filesystem)
    {
        console.error("filesystem plugin not available")
        return
    }
    downloadStatus.textContent = "Downloading..."
    downloadBtn.disabled = true

    try{
        //fetch viids from backend
        const response =await fetch(VIDEO_SRC)
        const blob = await response.blob()

        //convert blobto base64
        const reader = new FileReader()
        reader.readAsDataURL(blob)

        reader.onload= async()=> {
            if (localStorage.getItem(STORAGE_KEY) === "true") return;
            const b64Data = reader.result.split(",")[1]
            //save vids to device storage
            await Filesystem.writeFile({
                path:FILE_NAME,
                data: b64Data,
                directory: Directory.Data,
            })

            //marking vid as downloaded
            localStorage.setItem(STORAGE_KEY, "true")
            downloadStatus.textContent = "Downloaded"
            downloadBtn.textContent ="Downloaded"
            downloadBtn.disabled = true
        }
    }
    catch (err)
    {
        console.error(err)
        downloadStatus.textContent = "Download failed"
        downloadBtn.disabled =false
    }
})
*/

//listen for progress adn completion messages from service worker
//IMPORTANT: UI only says doownloaded adter media_cahce_done
// if(navigator.serviceWorker)
// {
//     //ask sw to cache video URL
//     navigator.serviceWorker.addEventListener("message", (event) =>{
//         const data = event.data

//         if(!data) return

//         if(data.type === "MEDIA_CACHE_DONE")
//         {
//             localStorage.setItem(STORAGE_KEY, "true")

//             downloadStatus.textContent = "Downloaded"
//             downloadBtn.textContent = "Downloaded"
//             downloadBtn.disabled = true
//         }
//     })
// }

// downloadBtn?.addEventListener("click", () => {
//     if(!navigator.serviceWorker?.controller)
//     {
//         console.warn("service worker not ready")
//         return
//     }

//     downloadStatus.textContent = "Downloading..."
//     downloadBtn.disabled = true;

//     navigator.serviceWorker.controller.postMessage({
//         type: "CACHE_MEDIA",
//         urls: [VIDEO_SRC],
//     })
// })