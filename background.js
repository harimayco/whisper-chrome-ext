// background.js
let offscreenCreating = null; // Promise to track offscreen creation

async function hasOffscreenDocument() {
    const matchedClients = await clients.matchAll();
    for (const client of matchedClients) {
        if (client.url.endsWith('offscreen.html')) {
            return true;
        }
    }
    if (chrome.offscreen) {
        // Chrome Extension API way
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });
        return contexts.length > 0;
    }
    return false;
}

async function setupOffscreenDocument(path) {
    if (await hasOffscreenDocument()) {
        return;
    }

    // Create offscreen document
    if (offscreenCreating) {
        await offscreenCreating;
    } else {
        offscreenCreating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['WORKERS'],
            justification: 'To run WASM transcription in background',
        });
        await offscreenCreating;
        offscreenCreating = null;
    }
}

async function closeOffscreenDocument() {
    if (!(await hasOffscreenDocument())) {
        return;
    }
    await chrome.offscreen.closeDocument();
}

// Check connection heartbeats
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Return true to indicate async response
    if (message.type === 'PING') {
        sendResponse({ type: 'PONG' });
        return false;
    }

    if (message.type === 'TRANSCRIBE' || message.type === 'INIT_MODEL') {
        handleTranscription(message, sendResponse);
        return true; // Keep channel open
    }
});

async function handleTranscription(message, sendResponse) {
    try {
        await setupOffscreenDocument('offscreen.html');

        // Forward to Offscreen
        const response = await chrome.runtime.sendMessage({
            ...message,
            target: 'OFFSCREEN'
        });

        sendResponse(response);
    } catch (err) {
        console.error("Transcription Error:", err);
        sendResponse({ error: err.message });
    }
}
