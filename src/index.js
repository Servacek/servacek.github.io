

// import {modulateStringToWaveform, FSK, encodeStringToBits} from './modulator.js';
// import {decodeBitsToString, getPeakFrequency} from './demodulator.js';
import * as WASM from './bindings.js';
import * as CONST from './constants.js';
import {get, max, formatDate} from './utils.js';
import { plotFFT, plotFFTWaterfall, plotWaveform } from './plotter.js';

// TODO: Disable the send button when no content is available.
// Provide the send button also on mobile in some minimazed form.


////////////////////

const inputArea = document.getElementById("input-area");
const inputBar = document.getElementById("input-bar");
const messageArea = document.getElementById("message-area");
const sendMessageButton = document.getElementById("send-message-button");

////////////////////

var messagesToSend = [];
var currentlySendingMessage = null;

const textEndcoder = new TextEncoder("utf-8");

////////////////////

print = console.log

async function tryStartRecording() {
    navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
        },
        video: false,
    }).then(function(stream) {
        const context = new AudioContext();
        const mediaStream = context.createMediaStreamSource(stream);

        const SAMPLE_CHUNK_SIZE = WASM.MEMORY_U32[WASM.EXPORTS.SAMPLE_CHUNK_SIZE/4];
        // https://ciiec.buap.mx/FFT.js/
        // rounded to nearest power of 2
        const bufferSize = 2048;//Math.pow(2, Math.floor(Math.log2(SAMPLE_CHUNK_SIZE)));
        var recorder = context.createScriptProcessor
            ? context.createScriptProcessor(bufferSize, CONST.INPUT_CHANNELS, CONST.OUTPUT_CHANNELS)
            : context.createJavaScriptNode(bufferSize, CONST.INPUT_CHANNELS, CONST.OUTPUT_CHANNELS);

        const FFTCanvas = document.getElementById('fft-result-graph');
        const WaveformCanvas = document.getElementById("input-waveform-graph");

        let chunkBuffer = [];
        recorder.onaudioprocess = function (e) {
            // This seems to be already normalized which makes sense.
            // Input buffer seems to be 1024 samples long (ALWAYS).
            const inputBuffer = e.inputBuffer.getChannelData(0);

            const SAMPLING_FREQUENCY = WASM.MEMORY_U32[WASM.EXPORTS.SAMPLING_FREQUENCY/4];
            const SAMPLE_CHUNK_SIZE = WASM.MEMORY_U32[WASM.EXPORTS.SAMPLE_CHUNK_SIZE/4];

            if (chunkBuffer.length < SAMPLE_CHUNK_SIZE) {
                chunkBuffer.push(...inputBuffer);
            } else {
                for (let i = 0; i < Math.floor(chunkBuffer.length / SAMPLE_CHUNK_SIZE); i++) {
                    let chunk = chunkBuffer.slice(0, SAMPLE_CHUNK_SIZE)
                    chunkBuffer = chunkBuffer.slice(SAMPLE_CHUNK_SIZE);

                    const nearestPowerOf2 = Math.pow(2, Math.ceil(Math.log2(chunk.length)));
                    // Create a new array with the nearest power of 2 length and fill with zeros
                    var paddedWave = new Float32Array(nearestPowerOf2);
                    paddedWave.set(chunk);
                    chunk = paddedWave;
                    // chunk = wave

                    const startPtr = WASM.MEMORY_STACK_START;
                    const realPtr = startPtr;
                    const imagPtr = realPtr + chunk.length*4;
                    const bytesPtr = imagPtr + chunk.length*4;

                    WASM.MEMORY_F32.set(chunk, realPtr>>2);

                    // Make sure the imginary array is filled with zeros
                    WASM.MEMORY_F32.fill(0, imagPtr>>2, bytesPtr>>2);

                    WASM.EXPORTS.demodulate(
                        realPtr, imagPtr, chunk.length, SAMPLE_CHUNK_SIZE, bytesPtr
                    );

                    console.log("CHUNK", chunk.length, WASM.MEMORY[bytesPtr]);

                    // if (canvas.paused == true) {
                    //     continue;
                    // }

                    // // Retrieve the computed real and imaginary numbers from memory
                    // const computedReal = new Float32Array(WASM.BUFFER, realPtr, SAMPLE_CHUNK_SIZE)
                    // const computedImag = new Float32Array(WASM.BUFFER, imagPtr, SAMPLE_CHUNK_SIZE)

                    // console.log("Computed Real:", computedReal);
                    // console.log("Computed Imaginary:", computedImag);

                    // const maxFreq = 5000; // Define the maximum frequency to display
                    // const freqBinSize = SAMPLING_FREQUENCY / chunk.length; // Frequency resolution

                    // print(freqBinSize)

                    // // Generate frequencies array and calculate magnitudes
                    // const frequencies = Array.from({ length: SAMPLE_CHUNK_SIZE / 2 }, (_, i) => Math.round(i * freqBinSize));
                    // const magnitudes = computedReal.map((r, i) => Math.sqrt(r * r + computedImag[i] * computedImag[i]));

                    // // Filter frequencies and magnitudes for the desired range
                    // const filteredFrequencies = frequencies.filter((freq) => freq <= maxFreq);
                    // const filteredMagnitudes = magnitudes.slice(0, filteredFrequencies.length); // Match the filtered frequencies
                    // //const filteredMagnitudesDB = filteredMagnitudes.map((mag) => 20 * Math.log10(mag));

                    // // Plot the result
                    // plotFFT(canvas, filteredFrequencies, filteredMagnitudes, canvas.watefall);

                //     console.log("BYTE:", WASM.MEMORY[bytesPtr]);
                //     // console.log(chunk.length)
                //     // console.log(chunk.length, chunkBuffer.length)
                //     // console.log(getPeakFrequency(chunk));
                }
            }

            // Do only update the canvas when we are visible and running!
            if (FFTCanvas.paused == true || FFTCanvas.offsetParent == null) {
                return;
            }

            plotWaveform(WaveformCanvas, inputBuffer);

            const startPtr = WASM.MEMORY_STACK_START;
            const realPtr = startPtr;
            const imagPtr = realPtr + inputBuffer.length*4;
            const bytesPtr = imagPtr + inputBuffer.length*4;

            WASM.MEMORY_F32.set(inputBuffer, realPtr>>2);

            // Make sure the imginary array is filled with zeros
            WASM.MEMORY_F32.fill(0, imagPtr>>2, bytesPtr>>2);

            WASM.EXPORTS.demodulate(
                realPtr, imagPtr, inputBuffer.length, SAMPLE_CHUNK_SIZE, bytesPtr
            );

            // Retrieve the computed real and imaginary numbers from memory
            const computedReal = new Float32Array(WASM.BUFFER, realPtr, SAMPLE_CHUNK_SIZE)
            const computedImag = new Float32Array(WASM.BUFFER, imagPtr, SAMPLE_CHUNK_SIZE)

            console.log("Computed Real:", computedReal);
            console.log("Computed Imaginary:", computedImag);

            const maxFreq = 5000; // Define the maximum frequency to display
            const freqBinSize = SAMPLING_FREQUENCY / inputBuffer.length; // Frequency resolution

            print(freqBinSize)

            // Generate frequencies array and calculate magnitudes
            const frequencies = Array.from({ length: SAMPLE_CHUNK_SIZE / 2 }, (_, i) => Math.round(i * freqBinSize));
            const magnitudes = computedReal.map((r, i) => Math.sqrt(r * r + computedImag[i] * computedImag[i]));

            // Filter frequencies and magnitudes for the desired range
            const filteredFrequencies = frequencies.filter((freq) => freq <= maxFreq);
            const filteredMagnitudes = magnitudes.slice(0, filteredFrequencies.length); // Match the filtered frequencies
            //const filteredMagnitudesDB = filteredMagnitudes.map((mag) => 20 * Math.log10(mag));

            // Plot the result
            plotFFT(FFTCanvas, filteredFrequencies, filteredMagnitudes, FFTCanvas.watefall);

            //console.log(getPeakFrequency(normalizedBuffer));

            // if (res && res.length > 0) {
            //     res = new TextDecoder("utf-8").decode(res);
            //     rxData.value = res;
            // }
        }

        mediaStream.connect(recorder);
        recorder.connect(context.destination);
    }).catch(function (e) { // This should handle even the revokes and everything.
        // TODO: Handle not being allowed to record audio.
        // console.error(e);
        // console.error("WE CANNOT RECORD AUDIO, WHAT CAN WE DO???!!");
        // console.error("IMPLEMENT WRITE ONLY MODE FOR ONE DIRECTIONAL COMMUNICATION!!!");

        displayMessageAtBottom(systemMessage("Chýba oprávnenia na používanie mikrofónu, bez tohto oprávnenia nebudete môcť príjimať správy!", "warn"));
    });
}

function sendNextMessage() {
    if (currentlySendingMessage) {
        return // We are already sending something
    }

    const nextMessage = messagesToSend.shift();
    if (nextMessage && nextMessage.waveform) {
        // Check if the data are normalized, if not normalize it
        // since some browsers require them normalized.
        const messageWaveformMax = max(nextMessage.waveform);
        if (messageWaveformMax > 1) {
            nextMessage.waveform = nextMessage.waveform.map(x => x / messageWaveformMax);
        }

        const nextMessageWaveform = nextMessage.waveform;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, nextMessageWaveform.length, CONST.SAMPLING_FREQUENCY);
        const channelData = buffer.getChannelData(0); // Get the first (and only) channel
        channelData.set(nextMessageWaveform); // Copy the sine wave data into the buffer

        // 4. Create a source and play the buffer
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        // Start playback
        source.start();
        currentlySendingMessage = nextMessage;
        source.onended = () => {
            currentlySendingMessage.dispatchEvent(new Event("sent"));
            currentlySendingMessage = null;
            sendNextMessage(nextMessage);
        };
    }
}

function sendMessage(message) {
    messagesToSend.push(message)
    sendNextMessage();

    message.addEventListener("sent", () => {
        message.bubble.classList.remove("sending");
    })
}

inputBar.oninput = function() {
    //this.style.height = 'auto'; // Reset height to calculate scrollHeight
    //this.style.height = `${Math.min(this.scrollHeight, 200)}px`; // Adjust 200 to match max-height

    sendMessageButton.disabled = !this.value.trim();
}

// Handle submit button being pressed
sendMessageButton.addEventListener("click", () => inputArea.submit());

// Handle enter key, when SHIFT is pressed do not send the message.
inputArea.addEventListener("keydown", event => {
    if (event.keyCode === 13 && !event.shiftKey) {
        event.preventDefault();
        inputArea.submit();
    }
})

inputArea.submit = () => {
    const msgText = inputBar.value.trim();
    if (!msgText) return; // Ignore pressing blank enters

    /// @TODO: Add option to change the username.
    // Display the message first.
    const newMessage = createSelfMessage(msgText);
    clearInputBar();
    displayMessageAtBottom(newMessage);

    // This is for the future when we will want to debug the waves.
    // if (CONST.DEBUG_MODE) {
    //     plotWaveform(newMessage.waveform);
    // }

    sendMessage(newMessage);
}


//startRecording();

function clearInputBar() {
    inputBar.value = "";
    inputBar.oninput();
}

function createMessageBase() {
    const date = new Date();
    const msg = document.createElement("div");
    msg.date = date;

    return msg;
}

function createUserMessage(author, alignment, content) {
    const msg = createMessageBase();
    msg.classList.add("user-msg", `${alignment}-user-msg`);

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble");
    bubble.classList.add("sending");
    bubble.addEventListener("dblclick", (e) => {
        // Double clicking the text bubble will copy the message.
        navigator.clipboard.writeText(msg.content);
    });

    const info = document.createElement("div");
    info.classList.add("msg-info");

    const name = document.createElement("div");
    name.classList.add("msg-info-name");
    name.textContent = author;

    const time = document.createElement("div");
    time.classList.add("msg-info-time");
    time.textContent = formatDate(msg.date);

    info.append(name, time);

    const text = document.createElement("pre");
    text.classList.add("msg-text");
    text.textContent = content;

    msg.bubble = bubble;
    msg.content = content;
    // TODO: So the javascript version is quite slow,
    // the C version is much faster but still javascript's garbage
    // collector is killing it.

    // OLD WAY
    // msg.waveform = modulateStringToWaveform(content, FSK);

    const contentByteArray = textEndcoder.encode(content)
    WASM.fillInputBuffer(contentByteArray);
    //console.log(WASM.INPUT_BUFFER_PTR, contentByteArray.length, WASM.OUTPUT_BUFFER_PTR);
    //const wf_length = WASM.ADMOD.modulate(WASM.INPUT_BUFFER_PTR, contentByteArray.length, WASM.OUTPUT_BUFFER_PTR);
    //console.log("C-cko nam vratilo svoje pole!!! DLZKA VLNY:", wf_length);
    msg.waveform = WASM.getOutputBuffer(WASM.EXPORTS.modulate(WASM.INPUT_BUFFER_PTR, contentByteArray.length, WASM.OUTPUT_BUFFER_PTR));
    //console.log(new Float32Array(WASM.ADMOD.memory.buffer, 441000, 1));
    // *4 because we need to account for the float size. One pointer every 4 bytes.
    //console.log(new Float32Array(WASM.ADMOD.memory.buffer, 4096 + 441000 * 4, 1));

    bubble.text = text
    bubble.append(info, text);
    msg.append(bubble);

    return msg;
}

function getUsername() {
    const usernameConfigInput = document.getElementById("username-config-input");
    return usernameConfigInput.value || localStorage.getItem("username");
}

function createSelfMessage(text, image=null) {
    const username = getUsername();
    const message = createUserMessage(username, CONST.ALIGMENT_RIGHT, text);

    if (image != null) {
        addImageToMessage(message, image);
    }

    return message;
}

function addImageToMessage(message, image) {
    const imgModal = document.createElement('div');
    imgModal.classList.add('img-modal');

    const imgModalImg = document.createElement('img');
    imgModalImg.src = image.src;
    imageLabel.style.display = 'none';
    sendButton.style.display = 'none';
    image.addEventListener('click', (e) => {
        e.stopPropagation();
        imageModal.style.display = 'flex';
        modalImage.src = image.src;
    });

    message.bubble.text.style.paddingBottom = "10px";
    message.bubble.append(image);
    imgModal.append(imgModalImg);
}

function displayMessageAtBottom(msg) {
    const lastMessage = messageArea.lastElementChild;
    const currentDate = new Date().toISOString().split('T')[0];
    const lastMessageDate = lastMessage ? new Date(lastMessage.date) : null;
    const currentDateObject = new Date(currentDate);
    const dayDiffers = lastMessageDate ? (
        lastMessageDate.getDate() !== currentDateObject.getDate() &&
        lastMessageDate.getMonth() !== currentDateObject.getMonth() &&
        lastMessageDate.getFullYear() !== currentDateObject.getFullYear()
    ) : null;

    if (!lastMessage || dayDiffers) {
        const separator = document.createElement('div');
        separator.className = 'separator unselectable';
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = currentDateObject.toLocaleDateString(document.documentElement.lang, dateOptions);
        separator.textContent = formattedDate;
        messageArea.appendChild(separator);
    }

    messageArea.appendChild(msg);
    scrollToBottom();
}


function scrollToBottom() {
    // Probably fine, but it could scroll a bit more...
    messageArea.scrollTop = messageArea.scrollHeight;
}


//// MODALS


const attachmentInput = document.getElementById('attachment-input');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const imageLabel = document.getElementById('image-label');
const sendButton = document.getElementById('send-image-button');

function closeImageUploadModal() {
    imageModal.style.display = "none";
    imageLabel.value = "";
    inputBar.focus();
}

// Handle Send Button Click
sendButton.addEventListener('click', () => {
    const labelText = imageLabel.value || "";

    // Log data or process the image and label
    console.log('Image sent with label:', labelText);

    // Optionally append the image to the chat area
    const imgElement = document.createElement('img');
    imgElement.src = modalImage.src;
    imgElement.alt = labelText;
    imgElement.style.maxHeight = '200px';
    imgElement.style.marginRight = '10px';
    imgElement.style.borderRadius = '8px';

    const labelElement = document.createElement('span');
    labelElement.textContent = labelText;
    labelElement.style.marginLeft = '5px';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.appendChild(imgElement);
    container.appendChild(labelElement);

    const message = createSelfMessage(message, imgElement);
    displayMessageAtBottom(message);
    sendMessage(message);

    // Close the modal
    closeImageUploadModal();

    setTimeout(() => {
        // Clear the input since we have used it for the modal
        clearInputBar();
    }, 0);
});

function systemMessage(text, type, icon=null) {
    const msg = createMessageBase();
    const content = document.createElement("span");
    msg.className = "system-message system-message-" + type || "info";
    content.textContent = text;

    const iconElement = document.createElement("i");
    iconElement.className = icon || CONST.SYSTEM_MESSAGE_ICONS[type];
    content.insertBefore(iconElement, content.firstChild);

    content.style.color = CONST.SYSTEM_MESSAGE_COLORS[type];

    msg.appendChild(content);
    return msg;
}

// Close the modal when clicking outside the content
imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal) { // This has to be here!!!
        closeImageUploadModal();
    }
})

// Handle file selection
attachmentInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;

            // Set the modal image source
            modalImage.src = imageUrl;

            imageLabel.value = inputBar.value;

            // Show the modal
            imageModal.style.display = 'flex';
            imageLabel.style.display = "flex";
            sendButton.style.display = "absolute";
            // Focus the label input
            imageLabel.focus();
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file.');
    }
});

// Handle pressing enter at the modal
imageModal.addEventListener("keydown", (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendButton.click();
    }
});

/// AFTER LOGIN

let userLoggedIn = false;
let wasmLoaded = false;

const initStateUpdate = () => {
    if (userLoggedIn && wasmLoaded) {
        tryStartRecording();
    }
}

window.addEventListener("user-logged", () => {
    userLoggedIn = true;
    if (!window.matchMedia("(max-width: 512px)").matches) {
        inputBar.focus(); // Default focus
    }
    displayMessageAtBottom(systemMessage("Vitaj " + getUsername() + "! Svoju prezývku si môžeš kedykoľvek zmeniť v nastaveniach.", "welcome"));
    initStateUpdate();
});

window.addEventListener("wasm-library-loaded", () => {
    wasmLoaded = true;
    initStateUpdate();
});
