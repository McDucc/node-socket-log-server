import test from 'node:test';
import LogService from './services/LogService';

async function wait(ms: number) {
    await new Promise((resolve) => {
        setInterval(() => { resolve(true); }, ms);
    });
}

test('test 1', async (t) => {
    let logService = new LogService();
    await wait(3000);
    await fetch('http://' + logService.address);
});

test('Test 2', async (t) => {
    await t.test('test 2.1');
    await t.test('test 2.2');
    await t.test('test 2.3');
});