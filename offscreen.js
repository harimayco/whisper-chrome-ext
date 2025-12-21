import createModule from './lib/shout/shout.wasm.js';
import { FileTranscriber } from './lib/transcriber/FileTranscriber.js';

let transcriber = null; // Singleton instance

console.log("Offscreen script loaded");

async function initTranscriber() {
    if (transcriber) return transcriber;

    try {
        console.log("Initializing Transcriber...");

        // Define model URL. chrome.runtime.getURL handles the path correctly.
        // User provided model: "ggml-model-tiny-id-q5_1.bin"
        const modelUrl = chrome.runtime.getURL('ggml-model-tiny-id-q5_1.bin');

        transcriber = new FileTranscriber({
            createModule: createModule,
            model: modelUrl,
        });

        await transcriber.init();
        console.log("Transcriber initialized!");
        return transcriber;
    } catch (err) {
        console.error("Failed to initialize transcriber:", err);
        throw err;
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Only handle messages targeted to OFFSCREEN
    if (msg.target !== 'OFFSCREEN') return;

    console.log("Offscreen received message:", msg.type);

    if (msg.type === 'TRANSCRIBE') {
        handleTranscribe(msg.payload)
            .then(result => {
                console.log("Transcription complete:", result);
                sendResponse({ payload: result });
            })
            .catch(err => {
                console.error("Transcription failed:", err);
                sendResponse({ error: err.message });
            });
        return true; // Keep channel open
    }
});

async function handleTranscribe(payload) {
    const ts = await initTranscriber();

    // payload.audio is the Data URL of the file
    // "transcribe.js" FileTranscriber handles fetch(url) internally.
    // Data URLs are valid for fetch.

    // Use Indonesian language as requested
    // "ggml-model-tiny-id-q5_1.bin" is likely specific to ID, but passing lang='id' helps context.

    const result = await ts.transcribe(payload.audio, {
        lang: 'id',
        threads: 4, // WASM threads
        token_timestamps: true
    });

    return result;
}
