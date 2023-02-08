"use strict";
function initializeTranslation(Alpine) {
    Alpine.store('lang', {
        current: 'en',
        en: {
            update_speed: 'Update Speed:',
            seconds: ' seconds',
            minutes: ' minutes',
            hours: ' hours',
            all_time: 'All time',
            auto_update_active: 'Auto Update active',
            auto_update_deactivated: 'Auto Update deactivated',
            auth_credentials_incorrect: 'Supplied credentials seem to be incorrect',
            auth_successful: 'Authenticated successfully.',
            timeframe_type_timeframe: 'Messages within timeframe',
            timeframe_type_since: 'Messages since',
            search_term: 'Search Term:'
        },
    });
    return (index) => {
        var _a;
        return (_a = Alpine.store('lang')[Alpine.store('lang').current][index]) !== null && _a !== void 0 ? _a : index;
    };
}
