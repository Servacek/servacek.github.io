
// KNOWN ERRORS:
// LinkError: _assert_fail is not a Function
//      - probably caused by -s LINKABLE=1
// wasmExports.<function> is not a function
//      - Missing EMSCRIPTEN_KEEPALIVE macros above C functions.


export const LIBRARY_PATH = "libs/audio_modem.wasm";

// MEMORY:
// - Max message length is 512 characters, each one of them can have 4 bytes
//   that means we need to allocate at least 2048 bytes of memory for the input.
// Looks like constants in the memory are stored from 1024.
export const INPUT_BUFFER_PTR = 0; // can go up to 2047 if needed
export const OUTPUT_BUFFER_PTR = 4096; // Up to 2^16

export let EXPORTS = null, MEMORY = null;

///////////////////////////////////////

// Fills the input memory buffer with the provided bytes from the byte array
export function fillInputBuffer(byteArray) {
    let i = 0;
    for (const byte of byteArray) {
        MEMORY[INPUT_BUFFER_PTR + i] = byte;
        i++;
    }
}

// Returns the bytearray of the output buffer
export function getOutputBuffer(length) {
    // console.log("getOutputBuffer");
    // console.log("AVAILABLE MEMORY", EXPORTS.memory.buffer.byteLength);
    // console.log("BYTES NEEDED", OUTPUT_BUFFER_PTR + length*4);
    // console.log("MAX FLOATS IN OUTPUT", EXPORTS.memory.buffer.byteLength / 4)
    return new Float32Array(EXPORTS.memory.buffer, OUTPUT_BUFFER_PTR, length);
}

////////////////////////////////////

async function _init() {
    //
    /// TODO: Figure out how to change the size of the memory.
    // Increase the memory size by updating the `memory` property with a larger initial value and/or maximum value.
    // const memory = new WebAssembly.Memory({
    //     initial: 8096, // 256 pages (each page is 64KiB)
    //     maximum: 8096,  // optional, can set a limit (512 pages in this case)
    // });

    const {instance} = await WebAssembly.instantiateStreaming(
        fetch(LIBRARY_PATH),
        //{ env: { memory } } // Pass the memory object to the module
    );

    EXPORTS = instance.exports;
    MEMORY = new Uint8Array(EXPORTS.memory.buffer);

    // Array of bytes allocated by the program.
    // let memory_array = new Int8Array(ADMOD.memory.buffer);

    // memory_array[9892] = 0b01001001;

    // console.log(memory_array.length);

    // console.log(ADMOD.modulate(9892, 1, 66680));
    // console.log(new Float32Array(ADMOD.memory.buffer, 66680, 4));
}

_init();
