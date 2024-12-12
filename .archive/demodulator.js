
import * as CONST from './constants.js';
import { FFT } from './fft.js';

// function get_all_frequencies(chunk) {
//     return Array.from({length: chunk.length / 2}, (_, i) => i / SAMPLING_PERIOD);
// }

// function calculate_threshold(frequencies, yf) {
//     return Math.max(...yf) / 1.5;//250
// }

// function get_main_frequencies(frequencies, yf) {
//     const threshold = calculate_threshold(frequencies, yf);
//     const above_threshold = frequencies.filter((f, i) => yf[i] > threshold);
//     const filtered = above_threshold.filter(f => (f - MIN_TX_FREQUENCY) % FREQUENCY_DECIMAL === 0 && f <= MAX_TX_FREQUENCY && f >= MIN_TX_FREQUENCY || CONTROL_FREQUENCIES.includes(f));
//     const sorted_frequencies = filtered.sort((a, b) => (CONTROL_FREQUENCIES.includes(a) ? 0 : 1) - (CONTROL_FREQUENCIES.includes(b) ? 0 : 1) || yf[frequencies.indexOf(a)] - yf[frequencies.indexOf(b)]);
//     return [sorted_frequencies[0], sorted_frequencies[1]];
// }

export function decodeBitsToString(bits) {
    const byte_array = [];
    for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.substring(i, i + 8);
        if (byte.length < 8 && !byte.includes("1")) {
            break;
        }

        byte_array.push(parseInt(byte, 2));
    }

    return new TextDecoder(CONST.DEFAULT_STRING_ENCODING).decode(new Uint8Array(byte_array));
}

export function getPeakFrequency(chunk) {
    const numSamples = chunk.length;
    const fft = new FFT(numSamples);
    const complexArray = fft.createComplexArray();
    fft.realTransform(complexArray, chunk);
    fft.completeSpectrum(complexArray);

    const N = Math.floor(numSamples / 2) + 1;
    // Numbers from 1 to N * CHUNKING_FREQUENCY
    const frequencies = Array.from({ length: N }, (_, i) => i * CONST.CHUNKING_FREQUENCY);

    console.log("MAX", Math.max(...frequencies))

    const yf = complexArray.map((r, i) => Math.sqrt(r * r + i * i));
    const idx = Math.floor(yf.indexOf(Math.max(...yf))/4);

    console.log(idx);
    return frequencies[idx];


    // const frequencies = Array.from({length: chunk.length / 2}, (_, i) => i / CONST.SAMPLING_PERIOD);

    // console.log(frequencies)

    // // Transform the complex array to an array of frequency and amplitude
    // const yf = complexArray.map((r, i) => Math.sqrt(r * r + i * i));
    // const idx = yf.indexOf(Math.max(...yf));

    // return frequencies[idx];
}

function decode_FSK(peak_frequency) {
    const data_frequency = peak_frequency - MIN_TX_FREQUENCY;

    if (data_frequency % CONST.FREQUENCY_DECIMAL !== 0 || CONST.MIN_TX_FREQUENCY > peak_frequency || CONST.MAX_TX_FREQUENCY < peak_frequency) return;

    return (data_frequency / FREQUENCY_DECIMAL).toString(2).padStart(CONST.BITS_PER_FRAME, "0");
}
