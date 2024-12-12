

// debugging functionality
function plotWaveform(waveform) {
    const canvas = document.getElementById('waveform');
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    if (waveform === null) {
        return; // In case we just want to clean the canvas.
    }

    const datasets = []
    const nframes = waveform.length / (44100*0.2)
    for (let i = 0; i < nframes; i++) {
        datasets.push({
            label: 'FRAME ' + (i+1),
            data: (waveform.slice(i * (44100*0.2), i * (44100*0.2) + 512)),
            borderColor: i % 2 === 0 ? 'rgb(223, 112, 33)' : 'rgb(35, 132, 242)', // Line color
            borderWidth: 1,
            pointRadius: 0, // Hide points for large datasets
            order: nframes -i,
            stack: false,
        });
    }

    const ctx = document.getElementById('waveform').getContext('2d');
    canvas.chart = new Chart(ctx, {
        type: 'line', // Line chart
        data: {
            labels: Array.from({ length: 1000 }, (_, i) => i / CONST.SAMPLING_FREQUENCY), // Time values for x-axis
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Time (s)' },
                    ticks: { maxTicksLimit: 10 } // Limit the number of x-axis labels
                },
                y: {
                    title: { display: true, text: 'Amplitude' },
                    suggestedMin: -1,
                    suggestedMax: 1
                }
            },
            elements: {
                line: { tension: 0 } // Disable smoothing
            }
        }
    });
}
