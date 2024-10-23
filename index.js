

import {writeString, txBuffer, encoderFSK, encoderMFSK} from './modulator.js';
import * as CONST from './constants.js';

const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerChat = get(".msger-chat");


// Icons made by Freepik from www.flaticon.com
const BOT_NAME = "BOT";
const PERSON_NAME = "Ja";

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
        if (txBuffer.length > 0) {
            console.info("PLAYING AUDIO")
            const buffer = txBuffer.shift();
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

        setInterval(() => {
            if (txBuffer.length > 0) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // Assuming `waveformArray` is the array containing your sine waveform data
                // For example, it should be a Float32Array of sample values between -1 and 1
                let waveformArray = txBuffer.shift();
                console.info(Array.isArray(waveformArray));
                console.info(waveformArray);
                let max = -Infinity;
                for(let i = 0; i < waveformArray.length; i++ ) {
                    if (waveformArray[i] > max) {
                        max = waveformArray[i];
                    }
                }
                waveformArray = waveformArray.map(x => x / max);

                console.log(waveformArray, JSON.stringify(waveformArray))

                const buffer = audioContext.createBuffer(1, waveformArray.length, CONST.SAMPLING_FREQUENCY);
                const channelData = buffer.getChannelData(0); // Get the first (and only) channel
                channelData.set(waveformArray); // Copy the sine wave data into the buffer

                // 4. Create a source and play the buffer
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);

                // Start playback
                source.start();
            }
        }, 100);
    // });

msgerForm.addEventListener("submit", event => {
    event.preventDefault();

    const msgText = msgerInput.value;
    if (!msgText) return;

    writeString(msgText, encoderFSK);

    appendMessage(PERSON_NAME, "right", msgText);
    msgerInput.value = "";
});

function appendMessage(name, side, text) {
  //   Simple solution for small apps
  const msgHTML = `
    <div class="msg ${side}-msg">
      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${formatDate(new Date())}</div>
        </div>

        <div class="msg-text">${text}</div>
      </div>
    </div>
  `;

  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += 500;
}

// Utils
function get(selector, root = document) {
  return document.querySelector(".msger").querySelector(selector);
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();

  return `${h.slice(-2)}:${m.slice(-2)}`;
}
