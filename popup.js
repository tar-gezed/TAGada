let favorites = [];
let globalLineData = {};

document.addEventListener('DOMContentLoaded', function () {
    loadFavorites();
    fetchData('https://data.mobilites-m.fr/api/routers/default/index/routes', initializeLineData);
  
    // document.getElementById('ligne').addEventListener('change', function () {
    //     const lineId = this.value;
    //     fetchData(`https://data.mobilites-m.fr/api/routers/default/index/routes/${lineId}/stops`, populateStops);
    // });
  
    document.getElementById('arret').addEventListener('change', function (event) {
        const clusterStopId = this.value;
        const selectedOption = this.options[this.selectedIndex];
        const lineId = selectedOption.getAttribute('data-line-id');
        fetchData(`https://data.mobilites-m.fr/api/routers/default/index/clusters/${clusterStopId}/stoptimes?route=${lineId}`, displayTimes);

        // Show favorite star
        document.getElementById('favoriteStar').classList.remove('hidden');
        updateFavoriteStar(clusterStopId, lineId);
    });

    document.getElementById('favoriteStar').addEventListener('click', function() {
        const select = document.getElementById('arret');
        const clusterStopId = select.value;
        const selectedOption = select.options[select.selectedIndex];
        const lineId = selectedOption.getAttribute('data-line-id');
        const stationName = selectedOption.textContent;
        
        toggleFavorite(clusterStopId, lineId, stationName);
    });
  });
  
  function fetchData(url, callback) {
    chrome.runtime.sendMessage({ action: "fetchData", url: url }, function(response) {
      callback(response);
    });
  }
  
//   function populateLines(data) {
//     const select = document.getElementById('ligne');
//     data.forEach(item => {
//       const option = document.createElement('option');
//       option.value = item.id;
//       option.textContent = `${item.shortName} - ${item.longName}`;
//       select.appendChild(option);
//     });
//   }


function initializeLineData(data) {
    data.forEach(line => {
        globalLineData[line.id] = line;
    });
    populateLines(data);
    displayFavorites(); // Refresh favorites display with line styles
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
            fetchData(`https://data.mobilites-m.fr/api/routers/default/index/routes/${lineId}/stops`, function(data) {
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
        option.value = item.cluster; // 'id' from new API format
        option.textContent = item.name; // 'name' from new API format
        option.setAttribute('data-line-id', lineId); // Store lineId in the option
        select.appendChild(option);
    });
    select.classList.remove('hidden');
}

function loadFavorites() {
    chrome.storage.sync.get(['favorites'], function(result) {
        favorites = result.favorites || [];
    });
}

function saveFavorites() {
    chrome.storage.sync.set({favorites: favorites}, function() {
        console.log('Favorites saved');
    });
}

function toggleFavorite(clusterStopId, lineId, stationName) {
    const index = favorites.findIndex(f => f.clusterStopId === clusterStopId && f.lineId === lineId);
    if (index === -1) {
        favorites.push({clusterStopId, lineId, stationName});
    } else {
        favorites.splice(index, 1);
    }
    saveFavorites();
    displayFavorites();
    updateFavoriteStar(clusterStopId, lineId);
}

function updateFavoriteStar(clusterStopId, lineId) {
    const starIcon = document.getElementById('favoriteStar');
    const isFavorite = favorites.some(f => f.clusterStopId === clusterStopId && f.lineId === lineId);
    starIcon.textContent = isFavorite ? 'star' : 'star_border';
    starIcon.classList.toggle('active', isFavorite);
}

function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';

    favorites.forEach(favorite => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        
        const lineData = globalLineData[favorite.lineId] || {};
        const lineStyle = `background-color: #${lineData.color}; color: #${lineData.textColor};`;
        
        favoriteItem.innerHTML = `
            <div class="favorite-columns">
                <div>
                    <span class="line-name" style="${lineStyle}">${lineData.shortName || favorite.lineId}</span>
                    <span class="station-name">${favorite.stationName}</span>
                    <span class="material-icons delete-icon" style="font-size: 1rem; vertical-align: text-bottom;">delete</span>
                </div>
            </div>
            <div class="favorite-times favorite-columns"></div>
        `;

        favoriteItem.setAttribute('data-cluster-stop-id', favorite.clusterStopId);
        favoriteItem.setAttribute('data-line-id', favorite.lineId);
        favoritesList.appendChild(favoriteItem);

        fetchData(`https://data.mobilites-m.fr/api/routers/default/index/clusters/${favorite.clusterStopId}/stoptimes?route=${favorite.lineId}`, function(data) {
            const timesDiv = favoriteItem.querySelector('.favorite-times');
            timesDiv.innerHTML = ''; // Clear existing content

            const groupedTimes = {};

            data.forEach(item => {
                const direction = item.pattern.dir;
                if (!groupedTimes[direction]) {
                    groupedTimes[direction] = [];
                }
                // Ajoute les informations du pattern à chaque élément de times
                item.times.forEach(time => {
                    time.pattern = item.pattern;
                });
                groupedTimes[direction].push(...item.times); // Ajoute tous les horaires
            });

            // TODO: sort by scheduledDeparture 

            for (const [direction, group] of Object.entries(groupedTimes)) {
                const directionDiv = document.createElement('div');
                directionDiv.className = 'direction-info';
                
                const timesList = document.createElement('div');
                timesList.className = 'times-list';

                const currentTime = Date.now() / 1000; // Current time in seconds
                
                group.slice(0, 3).forEach(time => { // Limite le nombre total d'horaires affichés à 3
                    const serviceDayStart = time.serviceDay;
                    const departureInSeconds = time.realtime ? (serviceDayStart + time.realtimeDeparture) : (serviceDayStart + time.scheduledDeparture);
                    const minutesLeft = Math.floor((departureInSeconds - currentTime) / 60);

                    const formattedTime = new Date(departureInSeconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    const timeString = minutesLeft >= 0 && minutesLeft < 30 
                        ? `${formattedTime} (${minutesLeft} min)` 
                        : formattedTime;

                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'time-item';
                    
                    // Ajoute l'icône pour le temps réel si applicable
                    let timeContent = `
                        <div class="time-item-lastStopName">${time.pattern.desc}</div>
                        <div class="time-item-timeString">${timeString}`;
                    
                    if (time.realtime) {
                        timeContent += `<span class="material-icons" title="En temps réel" style="font-size: 1rem; vertical-align: middle; margin-left: 4px;">rss_feed</span>`;
                    }
                    
                    timeContent += `</div>`;
                    
                    timeDiv.innerHTML = timeContent;
                    timesList.appendChild(timeDiv);
                });

                directionDiv.appendChild(timesList);
                timesDiv.appendChild(directionDiv);
            }
        });
    });

    // Add event listeners for delete icons
    const deleteIcons = document.querySelectorAll('.delete-icon');
    deleteIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const favoriteItem = this.closest('.favorite-item');
            const clusterStopId = favoriteItem.getAttribute('data-cluster-stop-id');
            const lineId = favoriteItem.getAttribute('data-line-id');
            removeFavorite(clusterStopId, lineId);
        });
    });
}

function displayTimes(data) {
    const horairesDiv = document.getElementById('horaires');
    horairesDiv.innerHTML = '';

    const secondsToTime = seconds => {
        const date = new Date(seconds * 1000);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    data.forEach(item => {
        const directionTitle = document.createElement('h4');
        directionTitle.textContent = `Direction: ${item.pattern.lastStopName}`;
        horairesDiv.appendChild(directionTitle);

        const timesList = document.createElement('ul');
        item.times.slice(0, 5).forEach(time => {
            const listItem = document.createElement('li');

            // Departure time
            const departure = secondsToTime(time.scheduledDeparture);
            listItem.textContent = `Prochain passage à ${departure}`;

            // Real-time icon
            if (time.realtime) {
                const icon = document.createElement('span');
                icon.className = 'material-icons';
                icon.textContent = 'rss_feed';
                icon.title = 'En temps réel';
                listItem.appendChild(icon);
            }

            timesList.appendChild(listItem);
        });
        horairesDiv.appendChild(timesList);
    });
}