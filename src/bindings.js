
// KNOWN ERRORS:
// LinkError: _assert_fail is not a Function
//      - probably caused by -s LINKABLE=1
// wasmExports.<function> is not a function
//      - Missing EMSCRIPTEN_KEEPALIVE macros above C functions.


// This cannot be outside since it would be blocked by CORS
export const LIBRARY_PATH = "libs/audio_modem.wasm";

// MEMORY:
// - Max message length is 512 characters, each one of them can have 4 bytes
//   that means we need to allocate at least 2048 bytes of memory for the input.
// Looks like constants in the memory are stored from 1024.

export let
    EXPORTS = null, MEMORY = null, MEMORY_F32 = null, MEMORY_U32 = null,
    MEMORY_STACK_START = null, INPUT_BUFFER_PTR = null, OUTPUT_BUFFER_PTR = null,
    BUFFER = null, LOADED = false, CONFIG = {};

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

    // Use instatiateStreaming instead of instantiate because it is more efficient
    // since it doesn't require converting the WASM module to ByteArray.
    const {instance} = await WebAssembly.instantiateStreaming(
        fetch(LIBRARY_PATH),
        { env: {
                _emscripten_memcpy_js: (dest, src, num) => MEMORY.copyWithin(dest, src, src + num),
            },
            // Support for printf
            wasi_snapshot_preview1: {
                fd_write: (fd, iov, iovcnt, pnum) => {
                    var num = 0;
                    let s = "";
                    for (var i = 0; i < iovcnt; i++) {
                        var ptr = MEMORY_U32[((iov)>>2)];
                        var len = MEMORY_U32[(((iov)+(4))>>2)];
                        iov += 8;
                        for (var j = 0; j < len; j++) {
                            s += String.fromCharCode(MEMORY[ptr+j]);
                        }
                        num += len;
                    }
                    MEMORY_U32[((pnum)>>2)] = num;
                    console.log(s);
                    return 0;
                }
            },
        } // Pass the memory object to the module
    );

    console.log("WASM MODULE LOADED", instance)

    EXPORTS = instance.exports;
    EXPORTS.recalc_conf() // Recalculate the configurations

    BUFFER = EXPORTS.memory.buffer;
    MEMORY = new Uint8Array(EXPORTS.memory.buffer);
    MEMORY_U32 = new Uint32Array(EXPORTS.memory.buffer);
    MEMORY_F32 = new Float32Array(EXPORTS.memory.buffer);
    MEMORY_STACK_START = MEMORY.length - EXPORTS.emscripten_stack_get_free();

    INPUT_BUFFER_PTR = MEMORY_STACK_START + 4096;
    OUTPUT_BUFFER_PTR = INPUT_BUFFER_PTR + 1024;

    // WARNING: WASM is little-endian by default.
    const MEMORY_VIEW = new DataView(EXPORTS.memory.buffer);
    print(MEMORY_VIEW.getUint8());

    // We need to know the size of the config so we can retrive it from the memory.
    for (const [name, exported] of Object.entries(EXPORTS)) {
        if (exported instanceof WebAssembly.Global) {
            CONFIG[name] = exported.value;
        }
    }

    // console.log(instance)
    // console.log(EXPORTS)

    // Array of bytes allocated by the program.
    // let memory_array = new Int8Array(ADMOD.memory.buffer);

    // memory_array[9892] = 0b01001001;

    // console.log(memory_array.length);

    // console.log(ADMOD.modulate(9892, 1, 66680));
    // console.log(new Float32Array(ADMOD.memory.buffer, 66680, 4));
}

_init().then(() => {
    LOADED = true;

    window.dispatchEvent(new CustomEvent("wasm-library-loaded"));
});
