//Gets a safe URL (dfeinitely from the proper DB) instead of a user-provided value (could be malicious) which trips up GitHub's security check
function getSafeVideoUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);

        const allowedHost = "oppcngtkhywxsazeqqet.supabase.co";
        const allowedPath = "/storage/v1/object/public/media/videos/";

        if (url.protocol !== "https:") {return null;}
        if (url.hostname !== allowedHost) {return null;}
        if (!url.pathname.startsWith(allowedPath)) {return null;}
        //Make sure its a video file
        const validVideoFile = /\.(mp4|webm|mov)$/i.test(url.pathname);
        if (!validVideoFile) {return null;}

        return url.href;
    } catch {return null;}
}


// ------------------------------
// CONFIG
// ------------------------------
const params = new URLSearchParams(window.location.search)
const VIDEO_SRC = getSafeVideoUrl(params.get("media"));
const speciesId = params.get("species_id")

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
    try {
        const response= await fetch(VIDEO_SRC, {method: "HEAD",cache: "no-store"});
        return response.ok;
    }
    catch {return false;}
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

//Video preview is working by doing autoplay for 1 seconds and then paused.
async function setupVideoPreview() {
    if (!videoPrev || !VIDEO_SRC || !speciesId) {return;}

    const state = await videoState();
    //Disable play if not cached and offline
    if (!state.isCached && !state.online) {
        downloadStatus.textContent = "Offline: Video Unavailable";
        return;
    }

    videoPrev.src = await loadVideoWithCache(VIDEO_SRC,speciesId);
    videoPrev.addEventListener("loadeddata", async () => {
        try {
            await videoPrev.play();
            setTimeout(() => {videoPrev.pause();},1000);

        } catch (err) {console.warn("Autoplay blocked", err);}
    });
}

setupVideoPreview();


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
        }

    } catch (err) {
        console.error("[Video] Download failed:", err);
        downloadStatus.textContent = "Download failed";
        downloadBtn.textContent = "Not Downloaded";s
        downloadBtn.disabled = false;
    }
});

// ------------------------------
// CHECK DOWNLOAD STATE
// ------------------------------

//Checks various states (in cache, not in cache and offlien) to change message and button behaviour
async function checkDownloadState() {
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