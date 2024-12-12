
// import * as CONST from 'constants.js';
import * as CONST from './constants.js';


// Place to store modulated messages in a form of waveforms.
export const messageQueue = [];

///////////////////////////////////////////

/**
 * Converts a string to a binary representation.
 *
 * @param {string} string - The string to encode.
 * @param {string} [encoding=CONST.DEFAULT_STRING_ENCODING] - The encoding to use.
 * @returns {string} A string of 0s and 1s representing the binary representation of the input string.
 */
export function encodeStringToBits(string, encoding = CONST.DEFAULT_STRING_ENCODING) {
    return Array.from(new TextEncoder(encoding).encode(string))
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join('');
}

function bitsToFrame(bits) {
    return CONST.FRAME_HEADER + bits.padEnd(CONST.MAX_BITS_PER_FRAME, '0') + CONST.FRAME_TAIL;
}

function calculateToneWaveForFrequency(frequency, duration = CONST.DATA_FRAME_DURATION, shift = 0) {
    const samples = Math.floor(CONST.SAMPLING_FREQUENCY * duration);
    const t = new Array(samples).fill(0).map((_, i) => i / CONST.SAMPLING_FREQUENCY);
    return t.map(x => (CONST.AMPLITUDE * Math.sin(CONST.TWOPI * frequency * x + shift))).map(x => CONST.INTEGER_TYPE.from([x])[0]);
}

function calculateWaveformForFrequencies(frequencies, duration = CONST.DATA_FRAME_DURATION) {
    const waveform = [];
    for (let frequency of frequencies) {
        const samples = calculateToneWaveForFrequency(frequency, duration)
        for (let sample of samples) {
            waveform.push(sample / Math.max(...samples));
        }
    }

    return waveform
}

/// Modulation Protocols (MP)

export function FSK(bits) {
    const toneWaves = [calculateToneWaveForFrequency(CONST.START_TONE_FREQUENCY, CONST.CONTROL_FRAME_DURATION)];
    toneWaves.push(calculateToneWaveForFrequency(0, CONST.FRAME_SPACING_DURATION));
    for (let ibit = 0; ibit < bits.length; ibit += CONST.BITS_PER_FRAME) {
        const dataFrameDecimal = parseInt(bits.substring(ibit, ibit + CONST.BITS_PER_FRAME), 2);
        const frequency = CONST.MIN_TX_FREQUENCY + (dataFrameDecimal * CONST.FREQUENCY_DECIMAL);
        toneWaves.push(calculateToneWaveForFrequency(frequency));
        toneWaves.push(calculateToneWaveForFrequency(0, CONST.FRAME_SPACING_DURATION));
    }
    toneWaves.push(calculateToneWaveForFrequency(CONST.END_TONE_FREQUENCY, CONST.CONTROL_FRAME_DURATION));
    return toneWaves.reduce((acc, toneWave) => acc.concat(toneWave), []);
}


/// NEEDS SOME DEBUGGING
// export function MFSK(bits) {
//     var waveform = []
//     messageQueue.push(calculateToneWaveForFrequency(CONST.START_TONE_FREQUENCY, CONST.DATA_FRAME_DURATION));
//     for (let ibit = 0; ibit < bits.length; ibit += CONST.MAX_BITS_PER_FRAME) {
//         const dataFrequencies = [];
//         const frame = bitsToFrame(bits.substring(ibit, ibit + CONST.MAX_BITS_PER_FRAME));
//         for (let i = 0; i < frame.length; i++) {
//             if (frame[i] === '1') {
//                 dataFrequencies.push(CONST.MIN_TX_FREQUENCY + (1 + i) * CONST.FREQUENCY_DECIMAL);
//             }
//         }
//         console.log("FREQUENCIES:", dataFrequencies)

//         let frameWaveform = calculateWaveformForFrequencies(dataFrequencies, CONST.DATA_FRAME_DURATION);
//         waveform = waveform.map((e, i) => e + frameWaveform[i]);
//     }
//     messageQueue.push(waveform);
//     messageQueue.push(calculateToneWaveForFrequency(CONST.END_TONE_FREQUENCY, CONST.DATA_FRAME_DURATION));
// }

////////

export function modulateBitsToWaveform(bits, modulationProtocol) {
    if (!bits) {
        throw new Error('Parameter \'bits\' must not be empty.');
    }

    return modulationProtocol(bits);
}

export function modulateStringToWaveform(string, modulationProtocol) {
    return modulateBitsToWaveform(encodeStringToBits(string), modulationProtocol);
}
