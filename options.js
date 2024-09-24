let globalLineData = {};
let favorites = [];

document.addEventListener('DOMContentLoaded', function () {
    loadFavorites();
    fetchData('https://data.mobilites-m.fr/api/routers/default/index/routes', initializeLineData);

    document.getElementById('addFavoriteButton').addEventListener('click', function() {
        const select = document.getElementById('arret');
        const clusterStopId = select.value;
        const selectedOption = select.options[select.selectedIndex];
        const lineId = selectedOption.getAttribute('data-line-id');
        const stationName = selectedOption.textContent;
        
        addFavorite(clusterStopId, lineId, stationName);
    });
});

function loadFavorites() {
    chrome.storage.sync.get(['favorites'], function(result) {
        favorites = result.favorites || [];
    });
}

function saveFavorites() {
    chrome.storage.sync.set({ favorites: favorites }, function() {
        console.log('Favoris sauvegardés.');
    });
}

function addFavorite(clusterStopId, lineId, stationName) {
    const index = favorites.findIndex(f => f.clusterStopId === clusterStopId && f.lineId === lineId);
    if (index === -1) {
        favorites.push({ clusterStopId, lineId, stationName });
        saveFavorites();
        alert('Favori ajouté !');
    } else {
        alert('Ce favori existe déjà.');
    }
}

function initializeLineData(data) {
    data.forEach(line => {
        globalLineData[line.id] = line;
    });
    populateLines(data);
}

function populateLines(data) {
    const lineSelector = document.getElementById('lineSelector');
    const lineTypes = {
        TRAM: [],
        NAVETTE: [],
        CHRONO: [],
        PROXIMO: [],
        FLEXO: []
    };

    data.forEach(line => {
        if (lineTypes.hasOwnProperty(line.type)) {
            lineTypes[line.type].push(line);
        }
    });

    for (const [type, lines] of Object.entries(lineTypes)) {
        if (lines.length > 0) {
            const section = document.createElement('div');
            section.className = 'mb-4';

            const title = {
                TRAM: "Tram",
                NAVETTE: "Navettes de travaux",
                CHRONO: "Chrono",
                PROXIMO: "Proximo",
                FLEXO: "Flexo"
            }[type];

            const icon = {
                TRAM: '<i class="material-icons" style="font-size: 1.25rem; vertical-align: text-bottom;">tram</i>',
                NAVETTE: '<i class="material-icons" style="font-size: 1.25rem; vertical-align: text-bottom;">directions_bus</i>',
                CHRONO: '<i class="material-icons" style="font-size: 1.25rem; vertical-align: text-bottom;">schedule</i>',
                PROXIMO: '<i class="material-icons" style="font-size: 1.25rem; vertical-align: text-bottom;">place</i>',
                FLEXO: '<i class="material-icons" style="font-size: 1.25rem; vertical-align: text-bottom;">directions</i>'
            }[type];

            section.innerHTML = `
                <h3 class="font-bold mb-2 flex items-center">
                    ${icon}
                    <span class="ml-2">${title}</span>
                </h3>
                <div class="flex flex-wrap gap-2">
                    ${lines.map(line => `
                        <button
                            class="line-button"
                            style="
                                background-color: #${line.color};
                                color: #${line.textColor};
                                cursor: pointer;
                                font-family: Arial, sans-serif;
                                font-size: 0.85rem;
                                font-weight: bold;
                                line-height: 0.85rem;
                                padding: 0.5rem;
                                border-radius: 0.25rem;
                                height: 2rem;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            "
                            data-line-id="${line.id}"
                            title="${line.longName}"
                        >${line.shortName}</button>
                    `).join('')}
                </div>
            `;
            lineSelector.appendChild(section);
        }
    }

    lineSelector.addEventListener('click', function(event) {
        if (event.target.matches('.line-button')) {
            const lineId = event.target.dataset.lineId;
            fetchData(`https://data.mobilites-m.fr/api/routers/default/index/routes/${lineId}/clusters`, function(data) {
            populateStops(data, lineId);
        });
        }
    });
}

function populateStops(data, lineId) {
    const select = document.getElementById('arret');
    select.innerHTML = ''; // Clear previous options
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = item.name;
        option.setAttribute('data-line-id', lineId);
        select.appendChild(option);
    });
    select.classList.remove('hidden');
}

function fetchData(url, callback) {
    chrome.runtime.sendMessage({ action: "fetchData", url: url }, function(response) {
        callback(response);
    });
}