chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installée.");
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchData") {
      fetch(request.url, {
        headers: {
            'Origin': 'mon_appli' // Needed to get the right information from metromobilité api
        }
    })
        .then(response => response.json())
        .then(data => sendResponse(data))
        .catch(error => console.error(error));
      return true; // Will respond asynchronously.
    }
  });