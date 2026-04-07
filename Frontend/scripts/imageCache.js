async function loadSpeciesImages(scientificName) {
    console.log(scientificName);
    try{
        const res = await fetch("/data/images.json");
        const imagesMap = await res.json();

        const id = scientificName.toLowerCase().replace(/\s+/g,'-');
        const imageUrls = imagesMap[id] || [];

        const gallery = document.getElementById("image-gallery");
        gallery.innerHTML = "";

        if(imageUrls.length !== 0){
            imageUrls.forEach(url => {
                
                const img = document.createElement("img");
                img.src = url;
                img.loading = "lazy";

                gallery.appendChild(img);
            });
        }
        console.log(gallery);
    } catch (e) {
        console.warn("images.json not available");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("selected_species");
    if(!stored) return;

    const species = JSON.parse(stored);

    loadSpeciesImages(species.scientific_name);
});