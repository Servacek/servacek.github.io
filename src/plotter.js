

// debugging functionality
// export function plotWaveform(canvas, waveform) {
//     if (canvas.chart) {
//         canvas.chart.destroy();
//     }

//     if (waveform === null) {
//         return; // In case we just want to clean the canvas.
//     }

//     const datasets = []
//     const nframes = waveform.length / (44100*0.2)
//     for (let i = 0; i < nframes; i++) {
//         datasets.push({
//             label: 'FRAME ' + (i+1),
//             data: (waveform.slice(i * (44100*0.2), i * (44100*0.2) + 512)),
//             borderColor: i % 2 === 0 ? 'rgb(223, 112, 33)' : 'rgb(35, 132, 242)', // Line color
//             borderWidth: 1,
//             pointRadius: 0, // Hide points for large datasets
//             order: nframes -i,
//             stack: false,
//         });
//     }

//     canvas.chart = new Chart(canvas.getContext("2d"), {
//         type: 'line', // Line chart
//         data: {
//             labels: Array.from({ length: 1000 }, (_, i) => i / CONST.SAMPLING_FREQUENCY), // Time values for x-axis
//             datasets: datasets,
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             scales: {
//                 x: {
//                     type: 'linear',
//                     title: { display: true, text: 'Time (s)' },
//                     ticks: { maxTicksLimit: 10 } // Limit the number of x-axis labels
//                 },
//                 y: {
//                     title: { display: true, text: 'Amplitude' },
//                     suggestedMin: -1,
//                     suggestedMax: 1
//                 }
//             },
//             elements: {
//                 line: { tension: 0 } // Disable smoothing
//             }
//         }
//     });
// }

export function plotWaveform(canvas, waveform) {
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Clear previous waveform
    ctx.clearRect(0, 0, width, height);

    const bufferLength = waveform.length;
    const sliceWidth = width / bufferLength;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < bufferLength; i++) {
        const x = i * sliceWidth;
        const y = centerY + waveform[i] * centerY; // Normalize the data to fit within canvas height
        ctx.lineTo(x, y);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'blue';
    ctx.stroke();
}


export function plotFFT(canvas, frequencies, magnitudes, waterfall) {
    const ctx = canvas.getContext('2d');
    if (canvas.chart) {
        canvas.chart.data.labels = frequencies.map(f => f.toFixed(0)); // Format frequencies
        canvas.chart.data.datasets[0].data = magnitudes;
        canvas.chart.update({
            duration: 2000,
            //easing: 'easeOutBounce'
        });
        return;
    }

    canvas.chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: frequencies.map(f => f.toFixed(2)), // Format frequencies
            datasets: [
                {
                    label: 'FFT Magnitude',
                    data: magnitudes,
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 1)',
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Frekvencia [Hz]',
                    },
                },
                yAxes: [{
                    title: {
                        display: true,
                        text: 'Magnitúda [dB]',
                    },
                    min: 0, // Set minimum magnitude (adjust as needed)
                    max: 100,    // Set maximum magnitude (adjust as needed)
                    callback: function(value, index, values) {
                        return '$' + value;
                    }
                }],
            },
        },
    });
}


export function plotFFTWaterfall(canvas, frequencies, magnitudes, options = {}) {
    const ctx = canvas.getContext('2d');

    // Configuration options
    const {
        maxRows = 100, // Maximum number of rows in the waterfall
        colorScale = (value) => `rgba(0, 0, 255, ${value})`, // Function to map magnitude to color
    } = options;

    if (!canvas.waterfallData) {
        canvas.waterfallData = [];
        canvas.height = maxRows; // Adjust canvas height for rows
    }

    // Add the new FFT data to the waterfall
    canvas.waterfallData.push(magnitudes);
    if (canvas.waterfallData.length > maxRows) {
        canvas.waterfallData.shift(); // Remove oldest data to maintain maxRows
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate the width of each frequency bin
    const binWidth = canvas.width / frequencies.length;
    const rowHeight = canvas.height / maxRows;

    // Render the waterfall
    canvas.waterfallData.forEach((row, rowIndex) => {
        row.forEach((magnitude, binIndex) => {
            const color = colorScale(magnitude); // Map magnitude to color
            ctx.fillStyle = color;
            ctx.fillRect(
                binIndex * binWidth,         // X position
                rowIndex * rowHeight,        // Y position
                binWidth,                    // Width
                rowHeight                    // Height
            );
        });
    });
}
