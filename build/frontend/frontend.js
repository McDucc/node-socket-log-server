
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
    Alpine.store('log').servers = json;
}

async function updateChannelList() {
    let response = await fetch('/channels', basicPost());
    let json = await response.json();
    Alpine.store('log').channels = json;
}

const cpu_load = 'cpu';
const ram_used = 'ru';
const disk_read = 'dr';
const disk_write = 'dw'
const disk_used = 'du';
const traffic_in = 'tin';
const traffic_out = 'tout';
const metrics = [cpu_load, ram_used, disk_read, disk_write, disk_used, traffic_in, traffic_out];

function getTimestamps(fieldIndex) {

    let timeframe = Alpine.store('controls').timeframeType == 'since';

    if (fieldIndex == 0) {
        if (timeframe) return Date.now() - Alpine.store('controls').timeSelect;
        field = Alpine.store('controls').datetime1;
    } else {
        if (timeframe) return Date.now();
        field = Alpine.store('controls').datetime2;
    }

    return new Date(field).getTime();
}

let updatingMetrics = false;
let metricsCompiled = {};
async function updateMetrics() {
    if (updatingMetrics) return;
    updatingMetrics = true;
    try {
        let data = basicPost();
        data.body = JSON.stringify({
            intervalStart: getTimestamps(0),
            intervalEnd: getTimestamps(1),
        });

        let response = await fetch('/metrics', data);
        let json = await response.json();
        let resolution = 20;

        if (Array.isArray(response.data)) {
            metricsCompiled = {};
            let index = 0;
            json.data.forEach(metricEntry => {
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
    } catch (err) {
        console.log(err);
    } finally {
        updatingMetrics = false;
    }
}

setInterval(async () => {
    if (typeof Alpine === 'undefined') return;

    if (Alpine.store('credentials').authenticated === 2)
        try {
            await updateServerList();
            await updateChannelList();
            await updateMetrics();
            await syncCharts();
        } catch (err) {
            console.log(err);
        }
}, 5000);

let lastAutoUpdate = 0;
setInterval(async () => {
    if (typeof Alpine === 'undefined') return;

    let now = Date.now();

    if (Alpine.store('controls').autoUpdate && ((now - parseInt(Alpine.store('controls').autoUpdateSpeed)) > lastAutoUpdate)) {
        search(Alpine.store('controls').searchTerm, 0, 10, Alpine.store('controls').page, Alpine.store('controls').pageSize);
        lastAutoUpdate = now;
    }
}, 333)

document.addEventListener('alpine:init', () => {

    Alpine.store('log', {
        servers: [],
        channels: [],
        messages: []
    })

    //Need to refactor into class document id value calls
    Alpine.store('controls', {
        datetime1: new Date().toISOString().split('.')[0],
        datetime2: new Date().toISOString().split('.')[0],
        showModal: true,
        showServerMetrics: false,
        autoUpdate: false,
        autoUpdateSpeed: 3000,
        datetime1: new Date().toISOString().substring(0, 10),
        datetime2: new Date().toISOString().substring(0, 10),
        serverFilter: [],
        channelFilter: [],
        timeframeType: 'since',
        timeSelect: 60000,
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
    searchTerm = searchTerm.trim();
    if (searchActive || !searchTerm) return;

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
            servers: Object.values(Alpine.store('controls').serverFilter),
            channels: Object.values(Alpine.store('controls').channelFilter)
        });

        console.log(data.body);

        let response = await fetch('/search', data);
        let json = await response.json();

        console.log(json);

        Alpine.store('log').messages = json.data;
        Alpine.store('controls').pageSize = json.pageSize;
        Alpine.store('controls').lastPage = Math.ceil(json.entryCount / json.pageSize);
    } catch (err) {
        console.log(err);
    } finally {
        searchActive = false;
    }
}

let charts = {};
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

function prettifyJson(json) {
    //Remove critical characters
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let type = 'alx-number';
        if (/^"/.test(match)) {
            type = /:$/.test(match) ? 'alx-key' : 'alx-string';
        } else if (/true|false/.test(match)) {
            type = 'alx-boolean';
        } else if (/null/.test(match)) {
            type = 'alx-null';
        }
        return '<span class="' + type + '">' + match + '</span>';
    });
}