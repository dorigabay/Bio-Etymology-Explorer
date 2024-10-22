const SHEET_ID = '1Q0RzsJxTjcYj8NVH29nzQNnh2VQLfw9xniXSmBBpkGg';
const API_KEY = 'AIzaSyDDE6kTLAqeJB2RBSZW48fH-F5JmZ-SmW8';
const RANGE = 'Sheet1!A:D'; // Adjust as needed

chrome.contextMenus.create({
    id: "findEtymology",
    title: "Find Etymology",
    contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    const selectedText = info.selectionText; // Get the selected text
    fetchEtymologyData(selectedText)
        .then(matches => {
            if (matches && matches.length > 0) {
                const options = matches.map(match => match[0]); // Get words from the matches
                if (options.length === 1) {
                    console.log("Fetched matches:", matches);

                    // If there's only one option, directly show the meaning
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "showMeaning",
                        word:  options[0],
                        meaning: matches[0][2], // Send the meaning directly
			language: matches[0][1],
                        cognates: matches[0][3],
                    });
                } else {
                    // Show options if more than one
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "showOptions", 
                        options: options 
                    });
                }
            } else {
                chrome.tabs.sendMessage(tab.id, { 
                    action: "noMeaning",
                    word: selectedText,
                    meaning: "The word does not exist in the dictionary.",
                });
            }
        })
        .catch(error => {
            console.error("Error fetching etymology data:", error);
            chrome.tabs.sendMessage(tab.id, { 
                action: "showMeaning", 
                meaning: "Error fetching etymology data.",
            });
        });
});

function fetchEtymologyData(word) {
    return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values || [];
            const matches = rows.filter(row => row[0] && row[0].toLowerCase().includes(word.toLowerCase()));
            return matches; // Return the entire matching rows
        })
        .catch(error => {
            console.error("Error in fetchEtymologyData:", error);
            throw error; // Rethrow the error for handling in the caller
        });
}

// Listen for messages from the content script to fetch meaning for a specific option
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getMeaning") {
        fetchEtymologyData(request.word)
            .then(matches => {
                if (matches && matches.length > 0) {
                    sendResponse({ meaning: matches[0][2], cognates: matches[0][3] }); // Send the meaning of the selected option
                } else {
                    sendResponse({ action: "noMeaning", word: request.word, meaning: "The word does not exist in the dictionary." });
                }
            })
            .catch(error => {
                console.error("Error fetching meaning:", error);
                sendResponse({ meaning: "Error fetching meaning." });
            });
        return true; // Indicates that we will send a response asynchronously
    }
});
