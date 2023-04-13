import test from 'node:test';
import SetupPostgresPool from './database/PostgresSetup';
import LogService from './services/LogService';


async function wait(ms: number) {
    await new Promise((resolve) => {
        setInterval(() => { resolve(true); }, ms);
    });
}

async function testSuite() {

    let pool = await SetupPostgresPool(1);

    await pool.initialize();

    test('test 1', async (t) => {
        let logService = new LogService(pool);
        await wait(3000);
        await fetch('http://' + logService.address);
    });

    test('Test 2', async (t) => {
        await t.test('test 2.1');
        await t.test('test 2.2');
        await t.test('test 2.3');
    });

}

testSuite();