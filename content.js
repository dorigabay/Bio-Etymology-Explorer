// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessageAction(message);
});

// Function to handle the action based on the message
function handleMessageAction(message) {
    switch (message.action) {
        case "showOptions":
            showOptionsPopup(message.options);
            break;
        case "showMeaning":
            showMeaningPopup(message.word, message.meaning, true, false, message.cognates, message.language);
            break;
        case "noMeaning":
            showMeaningPopup(message.word, message.meaning, true, true);
            break;
        default:
            console.error("Unknown action:", message.action);
            break;
    }
}


// Variable to store the last popup position
let lastPopupPosition = { top: 0, left: 0 };

// Function to show the popup with options to choose from
function showOptionsPopup(options) {
    const popup = createPopup();

    // Create header "Choose Option"
    const header = document.createElement('div');
    header.innerText = "Choose Option";
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';  // Medium size
    header.style.color = 'black';    // Black color
    header.style.marginBottom = '10px';
    header.style.textAlign = 'left';  // Left align header
    popup.appendChild(header); // Add header to the popup

    // Add each option as a button or clickable element
    options.forEach(option => {
        const optionButton = document.createElement('div');
        optionButton.innerText = option;
        optionButton.classList.add('option');
        optionButton.style.marginBottom = '8px';
        optionButton.style.cursor = 'pointer';
        optionButton.style.textAlign = 'left'; // Left align options

        // Add click event listener for each option
        optionButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "getMeaning", word: option }, (response) => {
                showMeaningPopup(option, response.meaning, false); // Show the meaning after choosing an option
                popup.remove(); // Close the list of options
            });
        });
        popup.appendChild(optionButton);
    });

    // Position the popup next to the selected text
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        lastPopupPosition.top = rect.bottom + window.scrollY; // Save the top position
        lastPopupPosition.left = rect.left + window.scrollX; // Save the left position
	popup.style.top = `${lastPopupPosition.top}px`; // Position below the selected text
	popup.style.left = `${lastPopupPosition.left}px`; // Align left with the selected text

    }

    // Add event listener to close the popup if clicked outside
    document.addEventListener('click', (event) => {
        if (!popup.contains(event.target)) {
            popup.remove();
        }
    }, { once: true });  // Ensure the event listener only runs once
}


// Function to show the cognates popup
function showCognatesPopup(cognates) {
    const cognatesPopup = createPopup(false);

    // Create header "Cognates"
    const cognatesHeader = document.createElement('div');
    cognatesHeader.innerText = "Cognates";
    cognatesHeader.style.fontWeight = 'bold';
    cognatesHeader.style.fontSize = '16px';  // Medium size
    cognatesHeader.style.color = 'black';    // Black color
    cognatesHeader.style.marginBottom = '10px';
    cognatesHeader.style.textAlign = 'left';  // Left align header
    cognatesPopup.appendChild(cognatesHeader); // Add header to the popup

    // Split the cognates string into an array
    const cognateArray = cognates.split(',').map(word => word.trim());

    // Add each cognate as a clickable element
    cognateArray.forEach(cognate => {
        const cognateButton = document.createElement('div');
        cognateButton.innerText = cognate;
        cognateButton.classList.add('cognate');
        cognateButton.style.marginBottom = '8px';
        cognateButton.style.cursor = 'pointer';
        cognateButton.style.textAlign = 'left'; // Left align cognate options

        // Add click event listener for each cognate
        cognateButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "getMeaning", word: cognate }, (response) => {
                handleMessageAction(response);
            });
        });
        cognatesPopup.appendChild(cognateButton);
    });

    // Position the cognates popup to the right of the meaning popup
    cognatesPopup.style.position = 'fixed';
    cognatesPopup.style.top = `${lastPopupPosition.top}px`; // Align with the top of the meaning popup
    cognatesPopup.style.left = `${lastPopupPosition.left + 380}px`; // Position it to the right (considering width of meaning popup)

    // Add event listener to close the popup if clicked outside
    document.addEventListener('click', (event) => {
        if (!cognatesPopup.contains(event.target)) {
            cognatesPopup.remove();
        }
    }, { once: true });
}



// Function to show the popup with the meaning
function showMeaningPopup(word, meaning, afterListSelection = false, noMeaning = false, cognates = "", language = "") {
    const popup = createPopup();

    // Create a mapping for language codes to full names
    const languageMap = {
        'E': 'English',
        'L': 'Latin',
        'G': 'Greek',
        'A': 'Arabic'
    };

    // Get the full language name from the languageMap
    const fullLanguage = languageMap[language] || language; // Use the code itself if not found

    // Add the word as the header with the specified color
    const header = document.createElement('div');
    header.style.fontSize = '24px';
    header.style.color = '#e78753'; // Color you specified for the header
    header.style.fontWeight = 'bold';
    header.style.textAlign = 'left'; // Left align header

    // Add the word text
    const wordText = document.createElement('span');
    wordText.innerText = word;

    // Add the full language name in small black letters, inside parentheses
    const languageText = document.createElement('span');
    languageText.innerText = fullLanguage ? ` (${fullLanguage})` : '';
    languageText.style.fontSize = '12px';  // Smaller font size for the language
    languageText.style.color = 'black';    // Black color for language text

    // Append both the word and language to the header
    header.appendChild(wordText);
    header.appendChild(languageText);
    popup.appendChild(header);

    // Add a spacer for better readability
    const spacer = document.createElement('div');
    spacer.style.marginTop = '10px'; // Space between the header and meaning text
    popup.appendChild(spacer);

    // Add meaning text
    const meaningText = document.createElement('div');

    if (noMeaning === true) {
        // If noMeaning is true, display the message directly
        const noMeaningText = document.createElement('div');
        noMeaningText.innerText = "The word does not exist in the dictionary."; // Direct message
        noMeaningText.style.textAlign = 'left'; // Left align text
        noMeaningText.style.direction = 'ltr'; // Ensure text direction is left-to-right
        meaningText.appendChild(noMeaningText);
    } else {
        // Split the meaning string to extract parts
        const firstQuoteIndex = meaning.indexOf('"');
        const secondQuoteIndex = meaning.indexOf('"', firstQuoteIndex + 1);

        let firstPart = "";
        let restOfString = meaning;

        if (firstQuoteIndex !== -1 && secondQuoteIndex !== -1) {
            firstPart = meaning.substring(firstQuoteIndex + 1, secondQuoteIndex); // Content between the first two quotation marks
            restOfString = meaning.slice(secondQuoteIndex + 1).trim(); // The rest of the string after the second quotation mark
        }

        // Add meaning header
        const meaningHeader = document.createElement('div');
        meaningHeader.innerText = "Meaning";
        meaningHeader.style.fontWeight = 'bold';
        meaningHeader.style.textAlign = 'left'; // Left align meaning header
        meaningHeader.style.direction = 'ltr'; // Ensure text direction is left-to-right
        meaningText.appendChild(meaningHeader);

        // Add the first part
        const firstPartText = document.createElement('div');
        firstPartText.innerText = firstPart;
        firstPartText.style.textAlign = 'left'; // Left align first part text
        firstPartText.style.direction = 'ltr'; // Ensure text direction is left-to-right
        meaningText.appendChild(firstPartText);

        // Add a spacer for better readability between meaning and etymology
        const meaningSpacer = document.createElement('div');
        meaningSpacer.style.marginTop = '10px'; // One line gap
        meaningText.appendChild(meaningSpacer);

        // Add etymology header
        const etymologyHeader = document.createElement('div');
        etymologyHeader.innerText = "Etymology";
        etymologyHeader.style.fontWeight = 'bold';
        etymologyHeader.style.textAlign = 'left'; // Left align etymology header
        etymologyHeader.style.direction = 'ltr'; // Ensure text direction is left-to-right
        meaningText.appendChild(etymologyHeader);

        // Add the rest of the string
        const restOfStringText = document.createElement('div');
        restOfStringText.innerText = restOfString;
        restOfStringText.style.textAlign = 'left'; // Left align rest of string text
        restOfStringText.style.direction = 'ltr'; // Ensure text direction is left-to-right
        meaningText.appendChild(restOfStringText);
    }

    meaningText.style.marginTop = '10px'; // Space above the text
    meaningText.style.maxHeight = '200px'; // Limiting height for scrolling if long
    meaningText.style.overflowY = 'auto';
    meaningText.style.textAlign = 'left'; // Ensure all text is left aligned
    meaningText.style.direction = 'ltr'; // Ensure text direction is left-to-right
    meaningText.style.display = 'block'; // Ensure block display for alignment
    meaningText.style.whiteSpace = 'pre-wrap'; // Preserve white space
    meaningText.style.wordWrap = 'break-word'; // Wrap long words
    popup.appendChild(meaningText);

    if (afterListSelection === true) {
        // Position the popup next to the selected text
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            lastPopupPosition.top = rect.bottom + window.scrollY; // Save the top position
            lastPopupPosition.left = rect.left + window.scrollX; // Save the left position
            popup.style.top = `${lastPopupPosition.top}px`; // Position below the selected text
            popup.style.left = `${lastPopupPosition.left}px`; // Align left with the selected text
        }
    } else {
        // Position the popup using the last saved position
        popup.style.top = `${lastPopupPosition.top}px`; // Position below the selected text
        popup.style.left = `${lastPopupPosition.left}px`; // Align left with the selected text
    }
    

    if (cognates) {
        showCognatesPopup(cognates); // Call the function to show cognates popup
    }


    // Add event listener to close the popup if clicked outside
    document.addEventListener('click', (event) => {
        if (!popup.contains(event.target)) {
            popup.remove();
        }
    }, { once: true });
}





// Helper function to create and show a popup
function createPopup(remove = true) {
    let popup = document.querySelector('.etymology-popup');
    if (popup && remove) {
        popup.remove(); // Remove any existing popup
    }

    // Create a new popup element
    popup = document.createElement('div');
    popup.classList.add('etymology-popup');
    popup.style.position = 'fixed';
    popup.style.zIndex = '9999';
    popup.style.width = '350px'; // Fixed width for the popup
    popup.style.height = 'auto';
    popup.style.padding = '10px';
    popup.style.backgroundColor = '#fff';
    popup.style.border = '2px solid black';
    popup.style.borderRadius = '5px';
    popup.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
    popup.style.textAlign = 'left'; // Left align the entire popup

    document.body.appendChild(popup);
    
    return popup;
}

