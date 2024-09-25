
// import * as CONST from 'constants.js';
import * as CONST from './constants.js';

export const txBuffer = [];

function encodeStringToBits(string, encoding = CONST.DEFAULT_STRING_ENCODING) {
    return Array.from({length: string.length}).map((_, i) => string.charCodeAt(i).toString(2).padStart(8, '0')).join('');
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
    const waveform = frequencies.reduce((acc, frequency) => acc + calculateToneWaveForFrequency(frequency, duration), new CONST.INTEGER_TYPE(0));
    return waveform / Math.max(frequencies.length, 1);
}

export function encoderFSK(bits) {
    const toneWaves = [calculateToneWaveForFrequency(CONST.START_TONE_FREQUENCY, CONST.CONTROL_FRAME_DURATION)];
    toneWaves.push(calculateToneWaveForFrequency(0, CONST.FRAME_SPACING_DURATION));
    for (let ibit = 0; ibit < bits.length; ibit += CONST.BITS_PER_FRAME) {
        console.info("FRAME", ibit, bits, bits.length, bits.length, CONST.BITS_PER_FRAME)
        const dataFrameDecimal = parseInt(bits.substring(ibit, ibit + CONST.BITS_PER_FRAME), 2);
        const frequency = CONST.MIN_TX_FREQUENCY + (dataFrameDecimal * CONST.FREQUENCY_DECIMAL);
        toneWaves.push(calculateToneWaveForFrequency(frequency));
        toneWaves.push(calculateToneWaveForFrequency(0, CONST.FRAME_SPACING_DURATION));
    }
    toneWaves.push(calculateToneWaveForFrequency(CONST.END_TONE_FREQUENCY, CONST.CONTROL_FRAME_DURATION));
    const waveform = toneWaves.reduce((acc, toneWave) => acc.concat(toneWave), []);
    txBuffer.push(waveform);
}

export function encoderMFSK(bits) {
    txBuffer.push(calculateToneWaveForFrequency(CONST.START_TONE_FREQUENCY, CONST.DATA_FRAME_DURATION));
    for (let ibit = 0; ibit < bits.length; ibit += CONST.MAX_BITS_PER_FRAME) {
        const dataFrequencies = [];
        const frame = bitsToFrame(bits.substring(ibit, ibit + CONST.MAX_BITS_PER_FRAME));
        for (let i = 0; i < frame.length; i++) {
            if (frame[i] === '1') {
                dataFrequencies.push(CONST.MIN_TX_FREQUENCY + (1 + i) * CONST.FREQUENCY_DECIMAL);
            }
        }
        txBuffer.push(calculateWaveformForFrequencies(dataFrequencies, CONST.DATA_FRAME_DURATION));
    }
    txBuffer.push(calculateToneWaveForFrequency(CONST.END_TONE_FREQUENCY, CONST.DATA_FRAME_DURATION));
}

export function write(bits, audioEncoder) {
    if (!bits) {
        throw new Error('Parameter \'bits\' must not be empty.');
    }
    return audioEncoder(bits);
}

export function writeString(string, audioEncoder, encoding = CONST.DEFAULT_STRING_ENCODING) {
    return write(encodeStringToBits(string, encoding), audioEncoder);
}
