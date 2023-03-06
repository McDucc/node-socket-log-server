import * as fs from 'fs';
import SharedService from './SharedService';

let environmentFile = fs.readFileSync('.env').toString();

export const Environment = JSON.parse(fs.readFileSync(environmentFile).toString());

SharedService.log(`Environment file ${environmentFile} read`);