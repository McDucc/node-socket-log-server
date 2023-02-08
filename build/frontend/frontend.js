
let basicPost = () => {
    return {
        method: 'POST',
        cache: 'no-cache',
        headers: {
            'auth-token': Alpine.store('credentials').password
        }
    };
}

async function authenticate() {
    let response = await fetch('/auth', basicPost());
    Alpine.store('credentials').authenticated = await response.text() === 'Authenticated' ? 2 : 1;
}

async function updateServerList() {
    let response = await fetch('/servers', basicPost());
    let json = await response.json();
    Alpine.store('log').servers = json.data;
}

const millisecondToMinute = 60000.0;
const cpu_load = 'cpu';
const ram_used = 'ru';
const disk_read = 'dr';
const disk_write = 'dw'
const disk_used = 'du';
const traffic_in = 'tin';
const traffic_out = 'tout';
const metrics = [cpu_load, ram_used, disk_read, disk_write, disk_used, traffic_in, traffic_out];

function getTimestamps(timestamp) {
    if (timestamp == 0) {
        timestamp = Alpine.store('controls').timeSelect;
        timefield = Alpine.store('controls').datetime1;
    } else {
        timefield = Alpine.store('controls').datetime2;
    }

    if (Alpine.store('controls').timeframeType == 'since') {
        return timestamp;
    } else {
        (Date.now() - new Date(timefield).getTime()) / millisecondToMinute;
    }
}

let updatingMetrics = false;
async function updateMetrics() {
    if (updatingMetrics) return;
    updatingMetrics = true;
    try {
        let data = basicPost();
        data.body = JSON.stringify({
            intervalStart: getTimestamps(0),
            intervalEnd: getTimestamps(1),
        });

        let response = await (await fetch('/metrics', data)).json();
        let resolution = 20;

        if (Array.isArray(response.data)) {
            metricsCompiled = {};
            let index = 0;
            response.data.forEach(metricEntry => {
                let realIndex = Math.floor(index / resolution);
                if (metricsCompiled[metricEntry.server] == undefined) metricsCompiled[metricEntry.server] = {};
                for (let metricKey of Object.keys(metricEntry.data)) {
                    if (metricsCompiled[metricEntry.server][metricKey] == undefined) {
                        metricsCompiled[metricEntry.server][metricKey] = [];
                        for (let i = 0; i < resolution; i++)  metricsCompiled[metricEntry.server][metricKey][i] = 0;
                    }
                    metricsCompiled[metricEntry.server][metricKey][realIndex] += metricEntry.data[metricKey] / resolution;
                }
                index++;
            });
        }
    } catch { }
    updatingMetrics = false;
}

setInterval(async () => {
    if (Alpine.store('credentials').authenticated === 2)
        try {
            await updateServerList();
            await updateMetrics();
            await syncCharts();
        } catch (err) {
            console.log(err)
        }
}, 5000);

setInterval(async () => {
    let nowInSeconds = Math.floor(Date.now() / 1000);

    if (Alpine.store('controls').autoUpdate && nowInSeconds % Alpine.store('controls').autoUpdateSpeed === 0) {
        search(Alpine.store('controls').searchTerm, 0, 10, Alpine.store('controls').page, 50);
    }
})

document.addEventListener('alpine:init', () => {

    Alpine.store('log', {
        servers: [],
        messages: [],
        metricsCompiled: {}
    })

    Alpine.store('controls', {
        datetime1: new Date().toISOString().split('.')[0],
        datetime2: new Date().toISOString().split('.')[0],
        timeSelect: '2',
        showModal: true,
        showServerMetrics: false,
        autoUpdate: false,
        autoUpdateSpeed: 3,
        metrics,
        timeframeType: 'since',
        page: 0,
        pageSize: 50,
        lastPage: 0,
        minimumLevel: 1,
        maximumLevel: 10,
        searchTerm: '',
    })

    Alpine.store('credentials', {
        password: '',
        authenticated: 0
    })

    //it is used in the app view
    this.translate = initializeTranslation(Alpine);
});

let searchActive = false;
async function search(searchTerm, minimumLevel, maximumLevel, page, pageSize) {
    if (searchActive) return;

    try {
        searchActive = true;
        let data = basicPost();

        data.body = JSON.stringify({
            searchTerm,
            intervalStart: getTimestamps(0),
            intervalEnd: getTimestamps(1),
            pageSize,
            page,
            minimumLevel,
            maximumLevel,
            servers: Alpine.store('log').servers
        });

        let response = await fetch('/search', data);
        let json = await response.json();

        Alpine.store('log').messages = json.data;
        Alpine.store('controls').page = json.page;
        Alpine.store('controls').pageSize = json.pageSize;
        Alpine.store('controls').lastPage = Math.ceil(json.entryCount / json.pageSize);
    } catch (err) {
        console.log(err);
    }
    searchActive = false;
}

var charts = {};
async function syncCharts() {
    try {
        let charts = document.getElementsByClassName('metric-canvas');
        for (let element of charts) {
            let chartName = element.id;
            makeOrUpdateChart(metricsCompiled[chartName], chartName, metricsCompiledLabels[chartName], element);
            await new Promise(resolve => setTimeout(resolve, 5));
        };
    } catch (err) {
        console.log(err);
    }
}

let chartScaleLayout = {
    ticks: {
        color: "white"
    },
    grid: {
        color: '#888'
    }
};

function makeOrUpdateChart(chartData, chartName, chartLabels, element) {

    if (charts[chartName] == undefined) {
        let context = element.getContext('2d');
        let myChart = new Chart(context, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: chartName,
                    data: chartData,
                    fill: true,
                    backgroundColor: '#07429b',
                    borderColor: '#002468',
                    tension: 0.1
                }]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: "white"
                        }
                    }
                },
                scales: {
                    y: chartScaleLayout,
                    x: chartScaleLayout
                }
            }
        });
        charts[chartName] = myChart;
    } else {
        charts[chartName].data.datasets[0].data = chartData;
        charts[chartName].data.labels = chartLabels;
        charts[chartName].update();
    }
}