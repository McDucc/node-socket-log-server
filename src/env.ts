import * as fs from 'fs';
export const env = JSON.parse(fs.readFileSync('env.json').toString());
console.log(`[${new Date().toISOString()}] Environment file read`);