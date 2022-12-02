
    let basicPost = () => {
        return {
            method: 'POST',
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
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
    const cpu_load = 'cpu_load';
    const ram_used = 'ram_used';
    const disk_read = 'disk_read_iops';
    const disk_write = 'disk_write_iops';
    const disk_wait = 'disk_wait_percent';
    const disk_used = 'disk_used';
    const traffic_in = 'traffic_in_kb';
    const traffic_out = 'traffic_out_kb';
    const metrics = [cpu_load, ram_used, disk_read, disk_write, disk_wait, disk_used, traffic_in, traffic_out];

    function getTimestamps(timestamp) {
        if (timestamp == 0)
            return Alpine.store('controls').timeframeType == 'since' ? Alpine.store('controls').timeSelect : (Date.now() - new Date(Alpine.store('controls').datetime1).getTime()) / millisecondToMinute;
        else
            return Alpine.store('controls').timeframeType == 'since' ? 0 : (Date.now() - new Date(Alpine.store('controls').datetime2).getTime()) / millisecondToMinute;
    }

    async function updateMetrics() {
        let data = basicPost();
        data.body = JSON.stringify({
            parameters: {
                searchTerms: ['channel: "metrics"'],
                intervalStart: getTimestamps(0),
                intervalEnd: getTimestamps(1),
                pageSize: 20000,
                page: 0,
                minimumLevel: 0,
                maximumLevel: 0,
                servers: Alpine.store('log').servers
            }
        });
        let response = await (await fetch('/search', data)).json();
        let resolution = 20;
        if (Array.isArray(response.data)) {
            metricsCompiled = {};
            let index = 0;
            response.data.forEach(metricEntry => {
                let realIndex = Math.floor(index / resolution);
                if(metricsCompiled[metricEntry.server] == undefined) metricsCompiled[metricEntry.server] = {};
                for(let metricKey of Object.keys(metricEntry.data)){
                    if( metricsCompiled[metricEntry.server][metricKey] == undefined){
                        metricsCompiled[metricEntry.server][metricKey] = [];
                        for(let i = 0; i < resolution; i++)  metricsCompiled[metricEntry.server][metricKey][i] = 0;
                    }
                    metricsCompiled[metricEntry.server][metricKey][realIndex] += metricEntry.data[metricKey] / resolution;
                }
                index++;
            });
        }
    }

    setInterval(async () => {
        if (Alpine.store('credentials').authenticated === 2)
            try {
                await updateServerList();
                await updateMetrics();
            } catch (err) {
                console.log(err)
            }
    }, 5000);

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
            metrics,
            timeframeType: 'since',
            currentPage: 0,
            searchTerm: '',
        })

        Alpine.store('credentials', {
            password: '',
            authenticated: 0
        })

        this.translate = initializeTranslation(Alpine);
    });

    async function search(searchTerm, minimumLevel, maximumLevel, page, pageSize) {
        let data = basicPost();

        data.body = JSON.stringify({
            parameters: {
                searchTerms: [searchTerm],
                intervalStart: getTimestamps(0),
                intervalEnd: getTimestamps(1),
                pageSize,
                page,
                minimumLevel,
                maximumLevel,
                servers: Alpine.store('log').servers
            }
        });
        let response = await fetch('/search', data);
        let json = await response.json();
        Alpine.store('log').messages = json.data;
    }

    var charts = {};

    document.addEventListener("DOMContentLoaded", function () {
        setInterval(() => {
            syncCharts();
        }, 2500);
    });

    function syncCharts() {
        try {
            Array.prototype.forEach.call(document.getElementsByClassName('metric-canvas'), (element => {
                let chartName = element.id
                makeOrUpdateChart(metricsCompiled[chartName], chartName, metricsCompiledLabels[chartName], element);
            }));
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
            console.log('Creating chart ' + chartName);
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
            console.log('Updating chart ' + chartName);
            charts[chartName].data.datasets[0].data = chartData;
            charts[chartName].data.labels = chartLabels;
            charts[chartName].update();
        }
    }