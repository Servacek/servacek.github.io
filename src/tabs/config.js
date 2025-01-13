
import {MEMORY, EXPORTS} from "../bindings.js";

const bitsPerFrameSlider = document.getElementById("bits-per-frame");
const bitsPerFrameDisplay = document.getElementById("bits-per-frame-display");

const channelIdSelect = document.getElementById("channel-id-select");


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

window.addEventListener("wasm-library-loaded", () => {
    const MAX_USERS = MEMORY[EXPORTS.MAX_USERS.value];
    for (let i = 0; i < MAX_USERS; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = "Kanál #" + i;
        channelIdSelect.appendChild(option);
    }

    // Select the default user ID
    const CURRENT_USER_ID = MEMORY[EXPORTS.USER_ID.value];
    channelIdSelect.value = CURRENT_USER_ID;

    channelIdSelect.addEventListener("change", () => {
        MEMORY[EXPORTS.USER_ID.value] = new Uint8Array([channelIdSelect.value])[0];
        onConfigurationUpdated();
    });
})
