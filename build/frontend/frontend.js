"use strict";
var Alpine;
var Chart;
const _global = (window || global);
let basicPost = () => {
    return {
        method: 'POST',
        cache: 'no-cache',
        headers: {
            'auth-token': Alpine.store('credentials').password
        }
    };
};
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
async function editTriggerModal(id) {
    Alpine.store('data').triggers.forEach((element) => {
        if (element.id === id) {
            addTriggerModal();
            Alpine.store('controls').trigger_edit_id = id;
            Alpine.store('controls').trigger_edit_name = element.name;
            Alpine.store('controls').trigger_edit_description = element.description;
            Alpine.store('controls').trigger_edit_type = element.type;
            Alpine.store('controls').trigger_edit_value = element.value;
            Alpine.store('controls').trigger_edit_threshold = element.threshold;
            Alpine.store('controls').trigger_edit_time = element.time;
        }
    });
}
async function addTriggerModal() {
    Alpine.store('controls').trigger_edit_id = 0;
    Alpine.store('controls').showTriggerModal = true;
}
async function saveTrigger() {
}
async function deleteTrigger(id) {
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
    let response = await fetch('/trigger_messages', data);
    let json = await response.json();
    Alpine.store('data').trigger_messages = json.data;
}
async function updateChannelList() {
    let response = await fetch('/channels', basicPost());
    let json = await response.json();
    Alpine.store('data').channels = json;
}
function getTimestamps(fieldIndex) {
    let timeframe = Alpine.store('controls').timeframeType == 'since';
    let field;
    if (fieldIndex == 0) {
        if (timeframe)
            return Date.now() - Alpine.store('controls').timeSelect;
        field = Alpine.store('controls').datetime1;
    }
    else {
        if (timeframe)
            return Date.now();
        field = Alpine.store('controls').datetime2;
    }
    return new Date(field).getTime();
}
let metricsCompiled = {};
let metricsCompiledLabels = {};
async function updateMetrics() {
    var _a, _b, _c, _d;
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
                metricsCompiled[_a = metricEntry.server] ?? (metricsCompiled[_a] = {});
                metricsCompiledLabels[_b = metricEntry.server] ?? (metricsCompiledLabels[_b] = {});
                for (let metricKey of Alpine.store('controls').metrics) {
                    (_c = metricsCompiled[metricEntry.server])[metricKey] ?? (_c[metricKey] = []);
                    (_d = metricsCompiledLabels[metricEntry.server])[metricKey] ?? (_d[metricKey] = []);
                    metricsCompiled[metricEntry.server][metricKey][metricEntry.slice] = metricEntry[metricKey];
                    let time = new Date(intervalStart + metricEntry.slice * timePerSlice).toISOString().split('.')[0].replace('T', ' ');
                    metricsCompiledLabels[metricEntry.server][metricKey].push(time);
                }
            }
            ;
        }
    }
    catch (err) {
        console.log(err);
    }
}
let updatingMetadata = false;
setInterval(async () => {
    if (typeof Alpine === 'undefined' || Alpine === undefined || updatingMetadata)
        return;
    if (Alpine.store('credentials').authenticated === 2) {
        try {
            updatingMetadata = true;
            await updateServerList();
            await updateTriggerList();
            await updateChannelList();
        }
        catch (err) {
            console.log(err);
        }
        finally {
            updatingMetadata = false;
        }
    }
}, 2000);
let updatingMetrics = false;
setInterval(async () => {
    if (typeof Alpine === 'undefined' || updatingMetrics)
        return;
    if (Alpine.store('credentials').authenticated === 2) {
        try {
            updatingMetrics = true;
            await updateMetrics();
            await syncCharts();
        }
        catch (err) {
            console.log(err);
        }
        finally {
            updatingMetrics = false;
        }
    }
}, 5000);
let lastAutoUpdate = 0;
async function searchLogs(force = false) {
    if (typeof Alpine === 'undefined')
        return;
    let now = Date.now();
    if (force || Alpine.store('controls').autoUpdate && ((now - parseInt(Alpine.store('controls').autoUpdateSpeed)) > lastAutoUpdate)) {
        await search(Alpine.store('controls').searchTerm, 0, 10, Alpine.store('controls').pageLogs, Alpine.store('controls').pageSize);
        lastAutoUpdate = now;
    }
}
setInterval(async () => { searchLogs(false); }, 333);
document.addEventListener('alpine:init', () => {
    Alpine.store('data', {
        servers: [],
        channels: [],
        messages: [],
        trigger_messages: [],
        triggers: []
    });
    Alpine.store('controls', {
        datetime1: new Date().toISOString().substring(0, 19),
        datetime2: new Date().toISOString().substring(0, 19),
        metrics: ['cpu', 'mem_used', 'disk_used', 'io_read', 'io_write', 'net_in', 'net_out', 'error_rate'],
        showAuthModal: true,
        showTriggerModal: false,
        trigger_edit_id: 0,
        trigger_edit_name: '',
        trigger_edit_description: '',
        trigger_edit_type: '',
        trigger_edit_value: '',
        trigger_edit_threshold: 0,
        trigger_edit_time: 0,
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
    });
    Alpine.store('credentials', {
        password: '',
        authenticated: 0
    });
    _global.trans = initializeTranslation(Alpine);
});
let searchActive = false;
async function search(searchTerm, minimumLevel, maximumLevel, page, pageSize) {
    if (searchActive)
        return;
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
    }
    catch (err) {
        console.log(err);
    }
    finally {
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
                let chartName = server + ' - ' + _global.trans('metrics_' + metric);
                if (element)
                    makeOrUpdateChart(metricsCompiled[server][metric], chartName, metricsCompiledLabels[server][metric], element);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    catch (err) {
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
        let chart = new Chart(context, {
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
        charts[chartName] = chart;
    }
    else {
        charts[chartName].data.datasets[0].data = chartData;
        charts[chartName].data.labels = chartLabels;
        charts[chartName].update();
    }
}
function prettifyJson(json) {
    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let type = 'alx-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                type = 'alx-key';
            }
            else {
                type = 'alx-string';
            }
        }
        else if (/true|false/.test(match)) {
            type = 'alx-boolean';
        }
        else if (/null/.test(match)) {
            type = 'alx-null';
        }
        return '<span class="' + type + '">' + match + '</span>';
    });
}
