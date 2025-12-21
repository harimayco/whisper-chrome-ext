// content.js - Relay between Web Page and Extension Background

// 1. Listen for messages from the Web Page (App)
window.addEventListener('message', async (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    // Filter by our protocol source
    if (event.data.source === 'WHISPER_CLIENT') {
        const { type, payload } = event.data;

        if (type === 'PING') {
            // Check if extension is alive
            try {
                const response = await chrome.runtime.sendMessage({ type: 'PING' });
                window.postMessage({
                    source: 'WHISPER_EXTENSION',
                    type: 'PONG',
                    payload: response
                }, window.origin);
            } catch (err) {
                // Extension might be sleeping or error
                // Don't respond, let client timeout? Or send error?
                // Often better to be silent on failure during PING unless we want explicitly 'DISCONNECTED'
            }
            return;
        }

        if (type === 'TRANSCRIBE') {
            try {
                // Determine if we need to send data differently?
                // Payload.audio is DataURL
                const response = await chrome.runtime.sendMessage({
                    type: 'TRANSCRIBE',
                    payload: payload
                });

                // Send Success Response back to Page
                window.postMessage({
                    source: 'WHISPER_EXTENSION',
                    type: 'TRANSCRIBE_RESPONSE',
                    payload: response
                }, window.origin);

            } catch (err) {
                // Send Error Response back to Page
                window.postMessage({
                    source: 'WHISPER_EXTENSION',
                    type: 'TRANSCRIBE_RESPONSE',
                    error: err.message || "Extension Error"
                }, window.origin);
            }
        }
    }
});

// Notify page that extension is ready immediately on inject
window.postMessage({
    source: 'WHISPER_EXTENSION',
    type: 'EXTENSION_READY'
}, window.origin);
