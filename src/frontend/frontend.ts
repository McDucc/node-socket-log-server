var Alpine: {
    store(store: string, data: any): void
    store(store: string): any
};
var Chart: any;
const _global = (window || global) as any

let basicPost: any = () => {
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
    Alpine.store('data').servers = json;
}

async function updateTriggerList() {
    let response = await fetch('/triggers', basicPost());
    let json = await response.json();
    Alpine.store('data').triggers = json;
}

function editTriggerModal(id: number) {
    Alpine.store('data').triggers.forEach((element: any) => {
        if (element.id === id) {
            addTriggerModal();
            for (let property of Object.keys(element)) {
                Alpine.store('controls').trigger_edit[property] = element[property];
            }
        }
    });
}

function addTriggerModal() {
    scroll(0, 0);
    Alpine.store('controls').trigger_edit.id = 0;
    Alpine.store('controls').showTriggerModal = true;
}

function saveTrigger() {
    let data = basicPost();
    let body: any = {};
    for (let property of Object.keys(Alpine.store('controls').trigger_edit)) {
        body[property] = Alpine.store('controls').trigger_edit[property];
    }

    if (body.id === 0) {
        delete body.id;
        data.body = JSON.stringify(body);
        fetch('/triggers/update', data);
    } else {
        data.body = JSON.stringify(body);
        fetch('/triggers/create', data);
    }
}

async function deleteTrigger(id: number) {
    if (confirm(_global.trans('triggers_delete_question').replace('%s', id))) {
        let data = basicPost();
        data.body = JSON.stringify({ id });
        fetch('/triggers/delete', data);
    }
}


async function getTriggerMessages() {
    let data = basicPost();
    data.body = JSON.stringify({
        intervalStart: Math.min(getTimestamps(0), getTimestamps(1)),
        intervalEnd: Math.max(getTimestamps(0), getTimestamps(1)),
        pageSize: Alpine.store('controls').pageSize,
        page: Alpine.store('controls').pageTriggerMessages
    });

    let response = await fetch('/triggers/messages', data);
    let json = await response.json();
    Alpine.store('data').trigger_messages = json.data;
}


async function updateChannelList() {
    let response = await fetch('/channels', basicPost());
    let json = await response.json();
    Alpine.store('data').channels = json;
}

function getTimestamps(fieldIndex: number) {

    let timeframe = Alpine.store('controls').timeframeType == 'since';
    let field: string;
    if (fieldIndex == 0) {
        if (timeframe) return Date.now() - Alpine.store('controls').timeSelect;
        field = Alpine.store('controls').datetime1;
    } else {
        if (timeframe) return Date.now();
        field = Alpine.store('controls').datetime2;
    }

    return new Date(field).getTime();
}

let metricsCompiled: Dictionary<any> = {};
let metricsCompiledLabels: Dictionary<any> = {};
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
    if (typeof Alpine === 'undefined' || Alpine === undefined || updatingMetadata) return;

    if (Alpine.store('credentials').authenticated === 2) {
        try {
            updatingMetadata = true;
            await updateServerList();
            await updateTriggerList()
            await updateChannelList();
        } catch (err) {
            console.log(err);
        } finally {
            updatingMetadata = false;
        }
    }
}, 1000);


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
}, 3000);

let lastAutoUpdate = 0;
async function searchLogs(force: boolean = false) {
    if (typeof Alpine === 'undefined') return;

    let now = Date.now();

    if (force || Alpine.store('controls').autoUpdate && ((now - parseInt(Alpine.store('controls').autoUpdateSpeed)) > lastAutoUpdate)) {
        await search(Alpine.store('controls').searchTerm, 0, 10, Alpine.store('controls').pageLogs, Alpine.store('controls').pageSize);
        await getTriggerMessages();
        lastAutoUpdate = now;
    }
}

setInterval(async () => { searchLogs(false); }, 333)

document.addEventListener('alpine:init', () => {

    Alpine.store('data', {
        servers: [],
        channels: [],
        messages: [],
        trigger_messages: [],
        triggers: []
    })

    Alpine.store('controls', {
        datetime1: new Date().toISOString().substring(0, 19),
        datetime2: new Date().toISOString().substring(0, 19),
        metrics: ['cpu', 'mem_used', 'disk_used', 'io_read', 'io_write', 'net_in', 'net_out', 'error_rate', 'message_rate'],
        showAuthModal: true,
        showTriggerModal: false,
        trigger_edit: {
            id: 0,
            name: '',
            description: '',
            type: '',
            value: '',
            threshold: 0,
            time: 0,
            active: true
        },
        showPage: 0,
        autoUpdate: false,
        autoUpdateSpeed: 3000,
        serverFilter: [],
        channelFilter: [],
        timeframeType: 'since',
        timeSelect: Date.now(),
        pageLogs: 0,
        pageTriggerMessages: 0,
        pageSize: 30,
        lastPage: 0,
        minimumLevel: 1,
        maximumLevel: 10,
        searchTerm: '',
    })

    Alpine.store('credentials', {
        password: '',
        authenticated: 0
    });

    _global.trans = initializeTranslation();
});


let searchActive = false;
async function search(searchTerm: string, minimumLevel: number, maximumLevel: number, page: number, pageSize: number) {
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

        Alpine.store('data').messages = json.data;
        Alpine.store('controls').lastPage = Math.ceil(json.entryCount / Alpine.store('controls').pageSize);
    } catch (err) {
        console.log(err);
    } finally {
        searchActive = false;
    }
}

function getTrigger(id: number) {
    for (let trigger of Alpine.store('data').triggers) {
        if (trigger.id == id) return trigger;
    }
}

let charts: Dictionary<any> = {};
async function syncCharts() {
    try {
        let servers = Object.keys(metricsCompiled);

        for (let server of servers) {
            for (let metric of Object.keys(metricsCompiled[server])) {
                let element = <HTMLCanvasElement>document.getElementById(server + ':' + metric);
                let chartName = server + ' - ' + _global.trans('metrics_' + metric, 'en');
                let chartTitle = server + ' - ' + _global.trans('metrics_' + metric, 'en');
                if (element)
                    makeOrUpdateChart(metricsCompiled[server][metric], chartName, chartTitle, metricsCompiledLabels[server][metric], element);
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

function makeOrUpdateChart(chartData: number[], chartName: string, chartTitle: string, chartLabels: string[], element: HTMLCanvasElement) {

    if (charts[chartName] == undefined) {
        let context = element.getContext('2d');
        let chart = new Chart(context, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: chartTitle,
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
        charts[chartName] = chart;
    } else {
        charts[chartName].data.datasets[0].data = chartData;
        charts[chartName].data.labels = chartLabels;
        charts[chartName].update();
    }
}

function prettifyJson(json: string) {
    //Remove critical characters
    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    let regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

    return json.replace(regex, function (match) {
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

function collapse(id: string) {
    let element = document.getElementById(id);

    if (!element) return;

    if (element.classList.contains("show")) {
        element.classList.remove("show")
    }
    else {
        element.classList.add("show")
    }
}

function renderTriggerValue(property: string, trigger: any) {
    if (property === 'value') {
        return _global.trans('metrics_' + trigger[property]);
    } else if (property === 'type') {
        return _global.trans('triggers_type_' + trigger[property]);
    } else {
        return trigger[property];
    }
}

type Dictionary<T> = { [key: string]: T }
