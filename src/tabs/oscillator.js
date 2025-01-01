
import * as WASM from "../bindings.js";
import { plotWaveform } from "../plotter.js";


const oscillatorWaveform = document.getElementById("oscillator-waveform");

const frequencySlider = document.getElementById("frequency-slider");
const amplitudeSlider = document.getElementById("amplitude-slider");
const phaseSlider     = document.getElementById("phase-slider");


// So we can have up to 20000 Hz
const SAMPLING_RATE = 40000;


let f, a, p;
let waveform = null;


let audioContext = null, bufferSource = null;
function onWaveformUpdated() {
    if (!audioContext) {
        audioContext = new AudioContext();
    }

    if (bufferSource) {
        bufferSource.stop();
        bufferSource.disconnect();
    }

    bufferSource = audioContext.createBufferSource();
    // The sampling rate has to be at least 8000
    const buffer = audioContext.createBuffer(1, waveform.length, SAMPLING_RATE);
    buffer.getChannelData(0).set(waveform);
    bufferSource.buffer = buffer;
    bufferSource.loop = true;
    bufferSource.connect(audioContext.destination);
    bufferSource.start();
}

function onWaveformParamsChanged() {
    const samples = SAMPLING_RATE;
    // const new_waveform = new Float32Array(samples);
    // for (let i = 0; i < samples; i++) {
    //     new_waveform[i] = a * Math.sin(2 * Math.PI * f * i / samples + p);
    // }
    f = frequencySlider.value;
    a = amplitudeSlider.value / 100;
    p = phaseSlider.value * Math.PI / 180;

    WASM.EXPORTS.waveform(f, a, p, samples, WASM.OUTPUT_BUFFER_PTR);
    const new_waveform = WASM.getOutputBuffer(samples);
    waveform = new_waveform;
    plotWaveform(oscillatorWaveform, new_waveform)

    if (bufferSource) {
        onWaveformUpdated();
    }
}

for (const slider of document.getElementsByClassName("oscillator-slider")) {
    slider.addEventListener("input", () => {
        document.getElementById(slider.id + "-display").textContent = slider.value;
        onWaveformParamsChanged()
    })
}


const playButton = document.getElementById("play-oscillator-button")
playButton.addEventListener("click", () => {
    if (!waveform) {
        return;
    }

    if (bufferSource) {
        bufferSource.stop();
        bufferSource.disconnect();
        bufferSource = null;
        return;
    }

    onWaveformUpdated();
})


if (WASM.LOADED) {
    onWaveformParamsChanged()
} else {
    window.addEventListener("wasm-library-loaded", () => {
        // Initialize
        // Make sure we have WASM available.
        onWaveformParamsChanged()
    })

}
