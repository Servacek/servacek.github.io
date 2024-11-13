

import {modulateStringToWaveform, messageQueue, FSK} from './modulator.js';
import * as CONST from './constants.js';

const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerChat = get(".msger-chat");

const ALIGMENT_RIGHT = "right"
const ALIGMENT_LEFT  = "left";

const MODULATION_PROTOCOL = FSK;

////////////////////

var messagesToSend = [];
var currentlySendingMessage = null;

////////////////////

async function startRecording() {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));
    const destination = audioContext.createMediaStreamDestination();

    source.connect(destination);

    const processor = audioContext.createScriptProcessor(16384, 1, 1);
    processor.onaudioprocess = ({ inputBuffer }) => {
        const audioBuffer = audioContext.createBuffer(inputBuffer.numberOfChannels, inputBuffer.length, inputBuffer.sampleRate);
        for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
            const float32Array = inputBuffer.getChannelData(channel);
            audioBuffer.getChannelData(channel).set(float32Array);
        }

        // TODO: Process the audio buffer
    };

    source.connect(processor);
    processor.connect(destination);

    const audioBufferSource = audioContext.createBufferSource();
    audioBufferSource.connect(audioContext.destination);

    // // Function to start the tone
    //     // Create an oscillator
    // let oscillator = audioContext.createOscillator();

    // // Set the oscillator frequency to the middle C note (261.63 Hz)
    // oscillator.frequency.setValueAtTime(400.63, audioContext.currentTime);

    // // Set waveform type (sine wave gives a smooth sound, but you can try others like "square", "triangle", etc.)
    // oscillator.type = 'sine';

    // // Connect the oscillator to the audio context's destination (speakers)
    // oscillator.connect(audioContext.destination);

    // // Start the oscillator
    // oscillator.start();

    const playBuffer = () => {
        console.info("BUFFER PLAYED");
        if (messageQueue.length > 0) {
            console.info("PLAYING AUDIO")
            const buffer = messageQueue.shift();
            const max = Math.max(...buffer);
            const min = Math.min(...buffer);
            const range = max - min;
            const normalizedBuffer = buffer.map(x => (x - min) / range * 2 - 1);
            const audioBuffer = audioContext.createBuffer(1, buffer.length, audioContext.sampleRate);
            audioBuffer.getChannelData(0).set(normalizedBuffer);
            audioBufferSource.buffer = audioBuffer
            audioBufferSource.start();
            audioBufferSource.connect(audioContext.destination);
            audioBufferSource.onended = playBuffer;
        }
    };

    setInterval(playBuffer, 1000);
}

function sendNextMessage() {
    if (currentlySendingMessage) {
        return // We are already sending something
    }

    const nextMessage = messagesToSend.shift();
    if (nextMessage) {
        // normalize our message waveform
        const nextMessageWaveformMax = max(nextMessage.waveform);
        const nextMessageWaveform = nextMessage.waveform.map(x => x / nextMessageWaveformMax);

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
}

get(".msger-config-btn").addEventListener("click", () => {
    document.documentElement.classList.toggle('dark-scheme');
});

msgerForm.addEventListener("submit", event => {
    event.preventDefault();

    const msgText = msgerInput.value.trim();
    if (!msgText) return; // Ignore pressing blank enters

    /// @TODO: Add option to change the username.
    // Display the message first.
    const newMessage = createMessage("Ja", ALIGMENT_RIGHT, msgText)
    clearInputBar();
    displayMessageAtBottom(newMessage);

    sendMessage(newMessage);
    newMessage.addEventListener("sent", () => {
        newMessage.bubble.classList.remove("sending");
        //newMessage.bubble.style.backgroundColor = "#579ffb"; // Blue, indicating success.
    })
});

function clearInputBar() {
    msgerInput.value = "";
}


function createMessage(author, alignment, content) {
    const date = new Date();
    const msg = document.createElement("div");
    msg.classList.add("msg", `${alignment}-msg`);

    const bubble = document.createElement("div");
    bubble.classList.add("msg-bubble");
    //bubble.style.backgroundColor = "#d3d3d3";
    bubble.classList.add("sending");

    const info = document.createElement("div");
    info.classList.add("msg-info");

    const name = document.createElement("div");
    name.classList.add("msg-info-name");
    name.textContent = author;

    const time = document.createElement("div");
    time.classList.add("msg-info-time");
    time.textContent = formatDate(date);

    info.append(name, time);

    const text = document.createElement("div");
    text.classList.add("msg-text");
    text.textContent = content;

    msg.bubble = bubble;
    msg.content = content;
    msg.waveform = modulateStringToWaveform(content, MODULATION_PROTOCOL);
    bubble.append(info, text);
    msg.append(bubble);

    return msg;
}


function displayMessageAtBottom(msg) {
  msgerChat.appendChild(msg);
  scrollToBottom();
}


function scrollToBottom() {
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
