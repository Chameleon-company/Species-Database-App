// ------------------------------
// CONFIG
// ------------------------------
const params = new URLSearchParams(window.location.search)
const VIDEO_SRC = params.get("media")
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
    downloadStatus.textContent ="Video unavailable"
    downloadBtn.disabled = true
    playOverlay?.remove()
}

//---------------------------
// VIDEO PREVIEW THUMBNAIL
//---------------------------
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

//---------------------------
// VIDEO THUMBNAIL USING CANVAS METHOD (NOT WORKING)
//---------------------------
//setThumbnail(VIDEO_SRC, thumbnail);

// ------------------------------
// PLAY VIDEO (THUMBNAIL → VIDEO)
// ------------------------------
if (playOverlay) {
    playOverlay.addEventListener("click", () => {
        const video = document.createElement("video");
        //if vid is downloaded, play from local file
        const isDownloaded = localStorage.getItem(STORAGE_KEY) === "true"
        if(isDownloaded)
        {
            video.src =window.Capacitor.convertFileSrc(
                Directory.Data + "/" +FILE_NAME
            )
        }
        else {
            video.src = VIDEO_SRC;
        }
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
//downloads vid and saves to real file on device
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