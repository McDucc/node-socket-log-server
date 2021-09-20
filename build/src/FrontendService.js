"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var RequestData_1 = __importDefault(require("./RequestData"));
var HasApp_1 = __importDefault(require("./HasApp"));
var CleanUpService_1 = __importDefault(require("./CleanUpService"));
var Redis_1 = __importDefault(require("./Redis"));
var fs = __importStar(require("fs"));
var FrontEndcontroller = /** @class */ (function (_super) {
    __extends(FrontEndcontroller, _super);
    function FrontEndcontroller() {
        var _this = _super.call(this) || this;
        new CleanUpService_1.default();
        _this.bind('post', '/search', _this.search);
        _this.bind('get', '/app', _this.loadApp);
        _this.startListening();
        _this.redis = Redis_1.default();
        return _this;
    }
    FrontEndcontroller.prototype.bind = function (method, routePattern, handler) {
        var _this = this;
        this.app[method](routePattern, function (response, request) {
            response.onAborted(function () { });
            var headers = {};
            request.forEach(function (headerKey, headerValue) {
                headers[headerKey] = headerValue;
            });
            var body = '';
            response.onData(function (data, isLast) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    body += data;
                    if (isLast) {
                        handler(new RequestData_1.default(headers, body), response);
                    }
                    return [2 /*return*/];
                });
            }); });
        });
    };
    FrontEndcontroller.prototype.loadApp = function (request, response) {
        fs.readFile('./frontend/app.html', function (err, data) {
            if (err) {
                response.end('Sorry, something went wrong while loading the app.');
                console.log(err);
            }
            else {
                response.end(data);
            }
        });
    };
    FrontEndcontroller.prototype.search = function (request, response) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            var parameters = JSON.parse(request.data);
            var searchTerm_1 = (_a = parameters.searchTerm) !== null && _a !== void 0 ? _a : '';
            var intervalStart_1 = (_b = parameters.intervalStart) !== null && _b !== void 0 ? _b : 0;
            var intervalEnd_1 = (_c = parameters.intervalEnd) !== null && _c !== void 0 ? _c : 0;
            var pageSize = (_d = parameters.pageSize) !== null && _d !== void 0 ? _d : 0;
            var page = (_e = parameters.page) !== null && _e !== void 0 ? _e : 0;
            var minimumSeverity_1 = (_f = parameters.page) !== null && _f !== void 0 ? _f : 0;
            var maximumSeverity_1 = (_g = parameters.page) !== null && _g !== void 0 ? _g : 10;
            if (searchTerm_1 === '' || (intervalStart_1 == 0 && intervalEnd_1 == 0) || intervalStart_1 < intervalEnd_1
                || page < 0 || pageSize < 0 || pageSize > 250 || minimumSeverity_1 > maximumSeverity_1) {
                response.writeStatus('400 Bad Request');
                response.end('Parameters are not within acceptable ranges: ' + JSON.stringify({
                    searchTerm: searchTerm_1,
                    intervalStart: intervalStart_1,
                    intervalEnd: intervalEnd_1,
                    pageSize: pageSize,
                    page: page,
                    minimumSeverity: minimumSeverity_1,
                    maximumSeverity: maximumSeverity_1
                }));
            }
            else {
                var entryCount_1 = 0;
                var data_1 = [];
                var pageStart_1 = page * pageSize;
                var pageEnd_1 = pageStart_1 + pageSize;
                this.redis.keys('log:*', function (err, reply) {
                    if (!err) {
                        reply.sort().reverse();
                        reply.some(function (setKey) {
                            var time = Number.parseInt(setKey.substr(4, 13));
                            if (time < Date.now() - intervalEnd_1 * 60000 && time > Date.now() - intervalStart_1 * 60000) {
                                _this.redis.smembers(setKey, function (err, reply) {
                                    if (!err) {
                                        reply.some(function (message) {
                                            if (message.includes(searchTerm_1)) {
                                                var info = JSON.parse(message);
                                                if (info.severity >= minimumSeverity_1 && info.severity <= maximumSeverity_1) {
                                                    if (entryCount_1 >= pageStart_1 && entryCount_1 < pageEnd_1) {
                                                        data_1.push(message);
                                                    }
                                                    entryCount_1++;
                                                }
                                            }
                                            return entryCount_1 >= pageEnd_1;
                                        });
                                    }
                                });
                            }
                            return entryCount_1 >= pageEnd_1;
                        });
                    }
                    else {
                        console.log(err);
                    }
                    response.writeStatus('200 OK');
                    response.end(JSON.stringify(data_1));
                });
            }
        }
        catch (err) {
            response.writeStatus('500 Internal Server Error');
            response.end(JSON.stringify(err));
        }
    };
    return FrontEndcontroller;
}(HasApp_1.default));
exports.default = FrontEndcontroller;
