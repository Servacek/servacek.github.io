
const fft_graph = document.getElementById("fft-result-graph");
const waveform_graph = document.getElementById("input-waveform-graph");

function onClick() {fft_graph.paused = !fft_graph.paused;}

fft_graph.addEventListener("click", onClick)
waveform_graph.addEventListener("click", onClick)
