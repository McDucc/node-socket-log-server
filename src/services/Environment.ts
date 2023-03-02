import * as fs from 'fs';
import SharedService from './SharedService';

export const Environment = JSON.parse(fs.readFileSync('env.json').toString());

SharedService.log(`Environment file read`);