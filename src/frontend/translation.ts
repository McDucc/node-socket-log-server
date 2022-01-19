function initializeTranslation(Alpine: any) {
    Alpine.store('lang', {
        current: 'en',
        en: {
            update_speed: 'Update Speed:',
            seconds: ' seconds',
            minutes: ' minutes',
            hours: ' hours',
            all_time: 'All time',
            auto_update_active: 'Auto Update active',
            auto_update_deactivated: 'Auto Update deactivated'
        },
    });

    return function (index: string) {
        return Alpine.store('lang')[Alpine.store('lang').current][index] ?? 'T-ERR: ' + index;
    }
}