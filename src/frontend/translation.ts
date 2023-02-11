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
            auto_update_deactivated: 'Auto Update deactivated',
            auth_credentials_incorrect: 'Supplied credentials seem to be incorrect',
            auth_successful: 'Authenticated successfully.',
            timeframe_type: 'Timeframe-Type:',
            timeframe_type_timeframe: 'Messages within timeframe',
            timeframe_type_since: 'Messages since',
            search_term: 'Search Term:',
            search: 'Search',
            filter_by_channel: 'Filter by Channel:',
            filter_by_server: 'Filter by Server:',
            time: 'Time:',
            message: 'Message:',
            level: 'Level:',
            server: 'Server:',
            data: 'Data:',
            password: 'Password:',
            text: 'Close',
            authenticate: 'Authenticate'
        },
    });

    return (index: string) => {
        return Alpine.store('lang')[Alpine.store('lang').current][index] ?? index;
    }
}