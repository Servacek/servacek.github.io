

// import {modulateStringToWaveform, FSK, encodeStringToBits} from './modulator.js';
// import {decodeBitsToString, getPeakFrequency} from './demodulator.js';
import * as WASM from './bindings.js';
import * as CONST from './constants.js';

const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerChat = get(".msger-chat");
if (!window.matchMedia("(max-width: 512px)").matches && !CONST.DEBUG_MODE) {
    msgerInput.focus(); // Default focus
}
const msgerSendButton = get(".msger-send-btn");

const ALIGMENT_RIGHT = "right"
const ALIGMENT_LEFT  = "left";

// const MODULATION_PROTOCOL = FSK;

////////////////////

var messagesToSend = [];
var currentlySendingMessage = null;

const textEndcoder = new TextEncoder("utf-8");

////////////////////

async function startRecording() {
    // const audioContext = new AudioContext();
    // const source = audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));
    // const destination = audioContext.createMediaStreamDestination();

    // source.connect(destination);

    // const processor = audioContext.createScriptProcessor(16384, 1, 1);
    // processor.onaudioprocess = ({ inputBuffer }) => {
    //     console.log("RECORDED")
    //     const audioBuffer = audioContext.createBuffer(inputBuffer.numberOfChannels, inputBuffer.length, inputBuffer.sampleRate);
    //     for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
    //         const float32Array = inputBuffer.getChannelData(channel);
    //         audioBuffer.getChannelData(channel).set(float32Array);
    //     }

    //     // TODO: Process the audio buffer
    // };

    // source.connect(processor);
    // processor.connect(destination);

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    var recorder = null;
    let context = new AudioContext();
    let constraints = {
        audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
        },
        video: false,
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        // console.log(e)
        let mediaStream = context.createMediaStreamSource(stream);
        // const mediaRecorder = new MediaRecorder(stream, { sampleRate: 44100 });

        // const sampleDurationMilis = (CONST.SAMPLING_PERIOD * CONST.SAMPLE_BLOCK_SIZE) * 1000;
        // mediaRecorder.start(2000);
        // mediaRecorder.ondataavailable = function (e) {
        //     const reader = new FileReader();
        //     reader.onload = function() {
        //         const arrayBuffer = this.result;
        //         const intArray = new Int16Array(arrayBuffer);
        //         console.log(intArray);
        //     };
        //     reader.readAsArrayBuffer(e.data);
        // }

        // https://ciiec.buap.mx/FFT.js/
        // rounded to nearest power of 2
        const bufferSize = 1024;
        if (context.createScriptProcessor) {
            recorder = context.createScriptProcessor(
                    bufferSize,
                    CONST.INPUT_CHANNELS,
                    CONST.OUTPUT_CHANNELS);
        } else {
            recorder = context.createJavaScriptNode(
                    bufferSize,
                    CONST.INPUT_CHANNELS,
                    CONST.OUTPUT_CHANNELS);
        }

        let chunkBuffer = [];
        recorder.onaudioprocess = function (e) {
            const inputBuffer = e.inputBuffer.getChannelData(0);
            const bufferAbsMax = Math.abs(Math.max(...inputBuffer));
            const normalizedBuffer = inputBuffer.map(x => x / bufferAbsMax);
            if (chunkBuffer.length < CONST.SAMPLE_CHUNK_SIZE) {
                chunkBuffer.push(...normalizedBuffer);
                console.log("PUSH")
            }

            if (chunkBuffer.length >= CONST.SAMPLE_CHUNK_SIZE) {
                console.log("PROCESS", CONST.SAMPLE_CHUNK_SIZE, chunkBuffer.length)
                for (let i = 0; i < Math.floor(chunkBuffer.length / CONST.SAMPLE_CHUNK_SIZE); i++) {
                    const chunk = chunkBuffer.slice(0, CONST.SAMPLE_CHUNK_SIZE)
                    chunkBuffer = chunkBuffer.slice(CONST.SAMPLE_CHUNK_SIZE);
                    console.log(chunkBuffer.length)
                    console.log(chunk.length, chunkBuffer.length)
                    console.log(getPeakFrequency(chunk));
                }
            }

            //console.log(getPeakFrequency(normalizedBuffer));

            // if (res && res.length > 0) {
            //     res = new TextDecoder("utf-8").decode(res);
            //     rxData.value = res;
            // }
        }

        mediaStream.connect(recorder);
        recorder.connect(context.destination);
    }).catch(function (e) {
        console.error(e);
    });
}

function sendNextMessage() {
    if (currentlySendingMessage) {
        return // We are already sending something
    }

    const nextMessage = messagesToSend.shift();
    if (nextMessage) {
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

// startRecording();

// let rxBuffer;
// navigator.mediaDevices.getUserMedia({ audio: false, video: false })
//     .then(stream => {
//         const audioContext = new AudioContext();
//         const source = audioContext.createBufferSource(stream);
//         const processor = audioContext.createScriptProcessor(CONST.SAMPLE_BLOCK_SIZE, CONST.INPUT_CHANNELS, CONST.OUTPUT_CHANNELS);

//         source.connect(processor);

//         processor.onaudioprocess = e => {
//             const inputBuffer = e.inputBuffer.getChannelData(0);
//             if (!rxBuffer) {
//                 rxBuffer = audioContext.createBuffer(CONST.INPUT_CHANNELS, 16384, CONST.SAMPLING_FREQUENCY);
//             }
//             rxBuffer.copyToChannel(inputBuffer, 0);
//         };

        // setInterval(() => {
        //     if (messageQueue.length > 0) {
        //         const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        //         // Assuming `waveformArray` is the array containing your sine waveform data
        //         // For example, it should be a Float32Array of sample values between -1 and 1
        //         let waveformArray = messageQueue.shift();
        //         console.info(Array.isArray(waveformArray));
        //         console.info(waveformArray);

        //         waveformArray = waveformArray.map(x => x / max(waveformArray));

        //         console.log(waveformArray, JSON.stringify(waveformArray))

        //         const buffer = audioContext.createBuffer(1, waveformArray.length, CONST.SAMPLING_FREQUENCY);
        //         const channelData = buffer.getChannelData(0); // Get the first (and only) channel
        //         channelData.set(waveformArray); // Copy the sine wave data into the buffer

        //         // 4. Create a source and play the buffer
        //         const source = audioContext.createBufferSource();
        //         source.buffer = buffer;
        //         source.connect(audioContext.destination);


        //         console.log("START");
        //         // Start playback
        //         source.start();

        //         // let currentColorIndex = 0;
        //         // const colorInterval = setInterval(() => {
        //         //     currentColorIndex = (currentColorIndex + 1) % 360;
        //         //     const bubble = document.querySelectorAll(".msg-bubble:last-child");
        //         //     const color = `hsl(${Math.floor(120 * currentColorIndex / 360)}, 100%, 50%)`;
        //         //     bubble.style.backgroundColor = color;
        //         // }, 1000);
        //         source.onended = () => {
        //             window.dispatchEvent(new Event("messageSent"));
        //         };

        //         currentlySendingMessage.EventEmitter

        //         //clearInterval(playBuffer);
        //     }
        // }, 100);
    // });

function sendMessage(message) {
    messagesToSend.push(message)
    sendNextMessage();

    message.addEventListener("sent", () => {
        message.bubble.classList.remove("sending");
    })
}

get(".msger-input").oninput = function() {
    this.style.height = 'auto'; // Reset height to calculate scrollHeight
    this.style.height = `${Math.min(this.scrollHeight, 200)}px`; // Adjust 200 to match max-height
}

get(".msger-config-btn").addEventListener("click", () => {
    document.documentElement.classList.toggle('dark-scheme');
});

const attachmentInput = document.getElementById('attachment-input');
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const imageLabel = document.getElementById('image-label');
const sendButton = document.getElementById('send-button');

function closeImageUploadModal() {
    modal.style.display = "none";
    imageLabel.value = "";
    msgerInput.focus();
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

    const message = createMessage("Ja", ALIGMENT_RIGHT, labelText);
    addImageToMessage(message, imgElement);
    displayMessageAtBottom(message);
    sendMessage(message);

    // Close the modal
    closeImageUploadModal();

    setTimeout(() => {
        // Clear the input since we have used it for the modal
        clearInputBar();
    }, 0);
});

// Close the modal when clicking outside the content
modal.addEventListener('click', (event) => {
    if (event.target === modal) { // This has to be here!!!
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

            imageLabel.value = msgerInput.value;

            // Show the modal
            modal.style.display = 'flex';
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
imageLabel.addEventListener("keydown", (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendButton.click();
    }
});

// Handle submit button being pressed
get(".msger-send-btn").addEventListener("click", () => msgerForm.submit());

// Handle enter key, when SHIFT is pressed do not send the message.
msgerForm.addEventListener("keydown", event => {
    if (event.keyCode === 13 && !event.shiftKey) {
        event.preventDefault();
        msgerForm.submit();
    }
})

msgerForm.submit = () => {
    const msgText = msgerInput.value.trim();
    if (!msgText) return; // Ignore pressing blank enters

    /// @TODO: Add option to change the username.
    // Display the message first.
    const newMessage = createMessage("Ja", ALIGMENT_RIGHT, msgText)
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
    msgerInput.value = "";
    msgerInput.oninput();
}

function createMessage(author, alignment, content) {
    const date = new Date();
    const msg = document.createElement("div");
    msg.classList.add("msg", `${alignment}-msg`);

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
    time.textContent = formatDate(date);

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

function addImageToMessage(message, image) {
    const imgModal = document.createElement('div');
    imgModal.classList.add('img-modal');

    const imgModalImg = document.createElement('img');
    imgModalImg.src = image.src;
    imageLabel.style.display = 'none';
    sendButton.style.display = 'none';
    image.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = 'flex';
        modalImage.src = image.src;
    });

    message.bubble.text.style.paddingBottom = "10px";
    message.bubble.append(image);
    imgModal.append(imgModalImg);
}


function displayMessageAtBottom(msg) {
  msgerChat.appendChild(msg);
  scrollToBottom();
}


function scrollToBottom() {
    // Probably fine, but it could scroll a bit more...
    msgerChat.scrollTop = msgerChat.scrollHeight;
}

// Utils
function get(selector) {
  return document.querySelector(".msger").querySelector(selector);
}

function max(array) {
    let max = -Infinity;
    for(let i = 0; i < array.length; i++ ) {
        if (array[i] > max) {
            max = array[i];
        }
    }

    return max;
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();

  return `${h.slice(-2)}:${m.slice(-2)}`;
}
