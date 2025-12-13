//JSON dummy data
const dummyData = [
    {
        "id": "001",
        "scientific_name": "Albizia-lebbeck",
        "common_name": "Ai-Samatuku",
        "etymology": "Albizia honors Filippo degli Albizzi, who introduced an Albizia to Europe, and lebbeck comes from the local Arabic/Indic name “lebbek/labakh",
        "habitat": "The species grows along hilly roadsides at low to mid elevations.",
        "phenology": "Flowering: September–November; Fruiting: May–July",
        "identification_characters": "A medium–large, deciduous tree; bark grey, fissured and corky, leaves double pinnate with 2–4 pairs of pinnae, each bearing many small obliquely oblong leaflets (~1.5–6.5 × 0.5–3.5 cm); flowers in large, fragrant, fluffy, yellow-green spherical heads on long stalks; fruit is long, flat, papery-leathery pods , pale straw to light brown, swollen over the seeds and not constricted.",
        "leaf_type": "Pinnately compound (double)",
        "fruit_type": "Pod",
        "seed_germination": "Collect pods when they’re dry, light brown, and before they split; sun-dry a few days so they open, then clean and store seeds dry. Pre-treat by pouring just-boiled water over the seeds and soak 12–24 hours to soften the hard coat. Fill germination bed  with Soil : Sand : Compost in a 1:1:1 mix. Sow ~1 cm deep; in beds space seeds ~5 cm apart in rows, germination usually starts in about 1–2 weeks with fresh, pre-treated seed.",
        "image_url": "./Assets/Images/albizia-lebbeck/01.png"
    },
    {
        "id": "002",
        "scientific_name": "Azadirachta-indica",
        "common_name": "Sumaer Malae",
        "etymology": "Albizia honors Filippo degli Albizzi, who introduced an Albizia to Europe, and lebbeck comes from the local Arabic/Indic name “lebbek/labakh",
        "habitat": "The species grows along hilly roadsides at low to mid elevations.",
        "phenology": "Flowering: September–November; Fruiting: May–July",
        "identification_characters": "A medium–large, deciduous tree; bark grey, fissured and corky, leaves double pinnate with 2–4 pairs of pinnae, each bearing many small obliquely oblong leaflets (~1.5–6.5 × 0.5–3.5 cm); flowers in large, fragrant, fluffy, yellow-green spherical heads on long stalks; fruit is long, flat, papery-leathery pods , pale straw to light brown, swollen over the seeds and not constricted.",
        "leaf_type": "Pinnately compound (double)",
        "fruit_type": "Pod",
        "seed_germination": "Collect pods when they’re dry, light brown, and before they split; sun-dry a few days so they open, then clean and store seeds dry. Pre-treat by pouring just-boiled water over the seeds and soak 12–24 hours to soften the hard coat. Fill germination bed  with Soil : Sand : Compost in a 1:1:1 mix. Sow ~1 cm deep; in beds space seeds ~5 cm apart in rows, germination usually starts in about 1–2 weeks with fresh, pre-treated seed.",
        "image_url": "./Assets/Images/azadirachta-indica/01.png"
    }
]

//Render the Species list 
function renderSpecies(data){
    const speciesList = document.getElementById("species-list");
    speciesList.innerHTML = "";

    //loop for creating each element of species inside the list container
    data.forEach(species => {
        speciesList.innerHTML += `
        <div id="${species.id}" style="display:flex; align-items:flex-start; margin-bottom:15px; border: 1px solid #ccc; border-radius: 8px; padding: 10px; height:80px;" 
            onclick="goToDetail('${species.id}')">
            
            <img src="${species.image_url}" width="90" style="border-radius:8px; margin-right:15px;">
            
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:flex-start;">
                <h3 style="margin:0; font-weight:500;">${species.scientific_name}</h3>
                <p style="margin:0; color:grey;">${species.common_name}</p>
            </div>
        </div>`;
    });
}

//set global JSON data for species read from excel
let loadedSpeciesData = [];

//Species xlsx path source
const excelFileUrl = './data/species.xlsx';

//Load excel data
async function loadExcelData(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Read workbook xlsx
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert data to JSON format
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map(row => ({
        //id: row["Scientific name"].replace(/\s+/g, "-").toLowerCase(),
        id: row["Scientific name"],
        scientific_name: row["Scientific name"] || "",
        common_name: row["Common name"] || "",
        etymology: row["Etymology"] || "",
        habitat: row["Habitat"] || "",
        phenology: row["Phenology"] || "",
        identification_characters: row["Identification Characters"] || "",
        leaf_type: row["Leaf type"] || "",
        fruit_type: row["Fruit Type"] || "",
        seed_germination: row["Seed Germination"] || "",
        pest: row["Pest"] || "",
        image_url: `./Assets/Images/${row["Scientific name"].replace(/\s+/g, "-").toLowerCase()}/${row["Scientific name"].replace(/\s+/g, "_").toLowerCase()}_seed_01.png`
    }));

    return jsonData;
}

function goToDetail(id){
    //Set the local storage to store the selected species data
    const species = loadedSpeciesData.find(s => s.id === id);
    localStorage.setItem("selected_species", JSON.stringify(species));

    //open the specific species detail page for the selected one
    window.location.href = `specie.html?id=${id}`;
    //window.location.href = "specie.html";
}

if (document.getElementById("species-list")) {
    //Load excel file
    loadExcelData(excelFileUrl).then((data) => {
        loadedSpeciesData = data;
        renderSpecies(data);
        console.log("Loaded Excel data:", data);
    }).catch(err => {
        console.error("Error loading Excel:", err);
        //renderSpecies(dummyData);
    });
}

