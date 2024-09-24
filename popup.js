let favorites = [];
let globalLineData = {};

document.addEventListener('DOMContentLoaded', function () {
    loadFavorites();
    fetchData('https://data.mobilites-m.fr/api/routers/default/index/routes', initializeLineData);
  
    
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
    // populateLines(data);
    displayFavorites(); // Refresh favorites display with line styles
}

function loadFavorites() {
    chrome.storage.sync.get(['favorites'], function(result) {
        favorites = result.favorites || [];
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

function removeFavorite(clusterStopId, lineId) {
    favorites = favorites.filter(f => !(f.clusterStopId === clusterStopId && f.lineId === lineId));
    chrome.storage.sync.set({ favorites: favorites }, displayFavorites);
}

function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';

    if (favorites.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <p>Vous n'avez pas encore ajouté de favoris.</p>
            <p><a href="#" id="addFavoritesLink">Ajouter un favori maintenant</a></p>
        `;
        favoritesList.appendChild(emptyMessage);

        // Ajoute un événement pour rediriger vers la page des options
        document.getElementById('addFavoritesLink').addEventListener('click', function() {
            chrome.tabs.create({ url: 'options.html' });
        });
    }

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