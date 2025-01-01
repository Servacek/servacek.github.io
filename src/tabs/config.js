
import {MEMORY, EXPORTS} from "../bindings.js";

const bitsPerFrameSlider = document.getElementById("bits-per-frame");
const bitsPerFrameDisplay = document.getElementById("bits-per-frame-display");


function onConfigurationUpdated() {
    // We always have to recalculate the dynamic configurations.
    EXPORTS.recalc_conf();
}


bitsPerFrameSlider.addEventListener("input", (event) => {
    const bits = event.target.value;
    bitsPerFrameDisplay.textContent = bits;

    MEMORY[EXPORTS.BITS_PER_FRAME.value] = new Uint8Array([bits])[0];
    MEMORY[EXPORTS.CONTROL_FRAME_DURATION.value] = new Float32Array([1/bits])[0];

    onConfigurationUpdated();
});
