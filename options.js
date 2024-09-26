let globalLineData = {};
let favorites = [];

document.addEventListener('DOMContentLoaded', function () {
    loadFavorites();
    fetchData('https://data.mobilites-m.fr/api/routers/default/index/routes', initializeLineData);
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
        // alert('Favori ajouté !');
    } else {
        alert('Ce favori existe déjà.');
    }
}

function removeFavorite(clusterStopId, lineId) {
    const index = favorites.findIndex(f => f.clusterStopId === clusterStopId && f.lineId === lineId);
    if (index !== -1) {
        favorites.splice(index, 1);
        saveFavorites();
        alert('Favori supprimé.');
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
                            data-line-long-name="${line.longName}"
                            data-line-short-name="${line.shortName}"
                            data-line-text-color="${line.textColor}"
                            data-line-color="${line.color}"
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
            const longName = event.target.dataset.lineLongName;
            const shortName = event.target.dataset.lineShortName;
            const color = event.target.dataset.lineColor;
            const textColor = event.target.dataset.lineTextColor;

            // Afficher le bloc de droite
            const stopListContainer = document.getElementById('stopListContainer');
            stopListContainer.classList.remove('hidden');

            // Mettre à jour le sous-titre avec le nom long de la ligne et son symbole
            const stopListSubtitle = document.getElementById('stop-list-subtitle');
            stopListSubtitle.innerHTML = `
            <div class="stop-list-subtitle-container">
                <span class="line-circle-large" style="background-color: #${color}; color: #${textColor};">
                    ${shortName}
                </span>
                <span>${longName}</span>
            </div>
            `;

            fetchData(`https://data.mobilites-m.fr/api/routers/default/index/routes/${lineId}/clusters`, function(data) {
                populateStops(data, lineId, longName, shortName, color, textColor);
            });
        }
    });
}

function populateStops(data, lineId, longName, shortName, color, textColor) {
    const stopList = document.getElementById('stopList');
    stopList.innerHTML = ''; // Clear previous stops

    data.forEach(stop => {
        let isFavorite = favorites.some(f => f.clusterStopId === stop.code && f.lineId === lineId);
        const favoriteIcon = isFavorite ? 'star' : 'star_border';
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.innerHTML = `
            <div class="stop-info">
                <div style="background-color: #${color}; color: #${textColor};" class="line-circle" title="${longName}">${shortName}</div>
                <div>
                    <div class="stop-name">${stop.name}</div>
                </div>
            </div>
            <span class="material-icons favorite-icon" data-stop-id="${stop.code}" data-line-id="${lineId}">
                ${favoriteIcon}
            </span>
        `;

        stopItem.querySelector('.favorite-icon').addEventListener('click', function () {
            if (isFavorite) {
                removeFavorite(stop.code, lineId);
                this.textContent = 'star_border'; // Update to empty star
            } else {
                addFavorite(stop.code, lineId, stop.name);
                this.textContent = 'star'; // Update to filled star
            }
            isFavorite = !isFavorite; // Toggle the state
        });

        stopList.appendChild(stopItem);
    });
}

function fetchData(url, callback) {
    chrome.runtime.sendMessage({ action: "fetchData", url: url }, function(response) {
        callback(response);
    });
}