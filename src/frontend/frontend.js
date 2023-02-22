
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

let metricsCompiled = {};
async function updateMetrics() {
    try {
        let data = basicPost();
        let resolution = 15;

        data.body = JSON.stringify({
            intervalStart: Math.min(getTimestamps(0), getTimestamps(1)),
            intervalEnd: Math.max(getTimestamps(0), getTimestamps(1)),
            resolution
        });

        let response = await fetch('/metrics', data);
        let json = await response.json();

        let intervalStart = json.intervalStart;
        let intervalEnd = json.intervalEnd;
        resolution = json.resolution;
        let timePerSlice = (intervalEnd - intervalStart) / resolution;

        if (Array.isArray(json.data)) {
            metricsCompiled = {};
            metricsCompiledLabels = {};
            for (let metricEntry of json.data) {
                metricsCompiled[metricEntry.server] ??= {};
                metricsCompiledLabels[metricEntry.server] ??= {};
                for (let metricKey of Alpine.store('controls').metrics) {
                    metricsCompiled[metricEntry.server][metricKey] ??= [];
                    metricsCompiledLabels[metricEntry.server][metricKey] ??= [];
                    metricsCompiled[metricEntry.server][metricKey][metricEntry.slice] = metricEntry[metricKey];
                    let time = new Date(intervalStart + metricEntry.slice * timePerSlice).toISOString().split('.')[0].replace('T', ' ');
                    metricsCompiledLabels[metricEntry.server][metricKey].push(time);
                }
            };
        }
    } catch (err) {
        console.log(err);
    }
}

let updatingMetadata = false;
setInterval(async () => {
    if (typeof Alpine === 'undefined' || updatingMetadata) return;

    if (Alpine.store('credentials').authenticated === 2) {
        try {
            updatingMetadata = true;
            await updateServerList();
            await updateChannelList();
        } catch (err) {
            console.log(err);
        } finally {
            updatingMetadata = false;
        }
    }
}, 2000);


let updatingMetrics = false;
setInterval(async () => {
    if (typeof Alpine === 'undefined' || updatingMetrics) return;

    if (Alpine.store('credentials').authenticated === 2) {
        try {
            updatingMetrics = true;
            await updateMetrics();
            await syncCharts();
        } catch (err) {
            console.log(err);
        } finally {
            updatingMetrics = false;
        }
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
        metrics: ['cpu', 'mem_used', 'disk_used', 'io_read', 'io_write', 'net_in', 'net_out', 'error_rate'],
        showModal: true,
        showServerMetrics: false,
        autoUpdate: false,
        autoUpdateSpeed: 3000,
        serverFilter: [],
        channelFilter: [],
        timeframeType: 'since',
        timeSelect: 2000000000000,
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
            intervalStart: Math.min(getTimestamps(0), getTimestamps(1)),
            intervalEnd: Math.max(getTimestamps(0), getTimestamps(1)),
            pageSize,
            page,
            minimumLevel,
            maximumLevel,
            servers: Object.values(Alpine.store('controls').serverFilter),
            channels: Object.values(Alpine.store('controls').channelFilter)
        });

        let response = await fetch('/search', data);
        let json = await response.json();

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
        let servers = Object.keys(metricsCompiled);

        for (let server of servers) {
            for (let metric of Object.keys(metricsCompiled[server])) {
                let element = document.getElementById(server + ':' + metric);
                let chartName = server + ' - ' + translate('metrics_' + metric);
                if (element)
                    makeOrUpdateChart(metricsCompiled[server][metric], chartName, metricsCompiledLabels[server][metric], element);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10));

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
                    borderColor: '#247bff',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let type = 'alx-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                type = 'alx-key';
            } else {
                type = 'alx-string';
            }
        } else if (/true|false/.test(match)) {
            type = 'alx-boolean';
        } else if (/null/.test(match)) {
            type = 'alx-null';
        }

        return '<span class="' + type + '">' + match + '</span>';
    });
}