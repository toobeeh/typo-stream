"use strict";
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
var express_1 = __importDefault(require("express"));
var socket_io_1 = require("socket.io");
var PORT = process.env.PORT || 3000;
var server = (0, express_1.default)()
    .listen(PORT, function () { return console.log("Express server listening on port " + PORT); });
var io = new socket_io_1.Server(server, {
    cors: {
        origin: "https://skribbl.io"
    }
});
// map for streaming clients
var streamers = [];
// map for lisetning clients
var spectators = [];
// map for important lobby caches
var importantCache = [];
// cache important commands for a lobby
var addImportant = function (id, data) {
    var cache = importantCache.find(function (c) { return c.streamid == id; });
    if (cache) {
        // if event contains data of lobby init state
        if (data[0] == "lobbyConnected") {
            cache.cache = [];
            cache.cache.push(data);
        }
        // if event contains current lobby state, set that to current
        else if (data[0] == "lobbyState") {
            cache.cache = cache.cache.filter(function (data) { return data[0] != "lobbyState"; });
            cache.cache.push(data);
        }
        // if event contains player connect
        else if (data[0] == "lobbyPlayerConnected" || data[0] == "lobbyPlayerDisconnected") {
            cache.cache.push(data);
        }
        // if draw comamnds are incoming
        else if (data[0] == "drawCommands") {
            cache.cache.push(data);
        }
        // if canvas cleared, remove draw commands
        else if (data[0] == "canvasClear") {
            cache.cache = cache.cache.filter(function (data) { return data[0] != "drawCommands" && data[0] != "canvasClear"; });
            cache.cache.push(data);
        }
        // lobby properties
        else if (["lobbyLanguage", "lobbyRounds", "lobbyDrawTime", "lobbyCustomWordsExclusive"].indexOf(data[0]) >= 0) {
            cache.cache.push(data);
        }
    }
};
io.on('connection', function (socket) {
    console.log('Client connected');
    // remove from maps on disconnect
    socket.on('disconnect', function () {
        streamers = streamers.filter(function (streamer) { return streamer.socket != socket; });
        spectators = spectators.filter(function (spectator) { return spectator.socket != socket; });
    });
    // listen for stream requests
    socket.on("stream", function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var settings, accessToken, user, memberResponse, _a, streamID;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    settings = data.settings;
                    accessToken = data.accessToken;
                    user = undefined;
                    if (!accessToken) return [3 /*break*/, 5];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("https://typo.rip/api/member/", {
                            headers: {
                                'Accept': '*/*',
                                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                            },
                            method: "POST",
                            body: "get&accessToken=" + accessToken
                        })];
                case 2: return [4 /*yield*/, (_b.sent()).json()];
                case 3:
                    memberResponse = _b.sent();
                    user = memberResponse;
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    socket.emit("error", "Authorization failed.");
                    socket.disconnect();
                    return [2 /*return*/];
                case 5:
                    // if socket is already streaming or someone with same ID is streaming return
                    if (streamers.some(function (streamer) { var _a; return streamer.socket == socket || accessToken && ((_a = streamer.member) === null || _a === void 0 ? void 0 : _a.UserID) == user.UserID; })) {
                        socket.emit("error", "Duplicate stream origin.");
                        socket.disconnect();
                        return [2 /*return*/];
                    }
                    // if socket is already spectating return
                    if (spectators.some(function (spectator) { return spectator.socket == socket; }))
                        return [2 /*return*/];
                    streamID = "typoStrm_" + (Math.ceil(Math.random() * Date.now() / 100)).toString(16);
                    streamers.push({ socket: socket, id: streamID, member: user, settings: settings });
                    importantCache.push({ streamid: streamID, cache: [] });
                    socket.join(streamID);
                    socket.join("streamer");
                    socket.emit("streamstart", streamID);
                    // listen for stream data and broadcast
                    socket.on("streamdata", function (data) {
                        // cache important
                        addImportant(streamID, data);
                        io.to(streamID).except("streamer").emit("streamdata", data);
                    });
                    // listen for disconnect and close all related clients
                    socket.on("disconnect", function () {
                        spectators.forEach(function (spect) {
                            if (spect.id == streamID)
                                spect.socket.disconnect();
                        });
                        // remove important cache 
                        importantCache = importantCache.filter(function (c) { return c.streamid != streamID; });
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    // listen for spectate requests
    socket.on("spectate", function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var accessToken, user, memberResponse, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    accessToken = data.accessToken;
                    user = undefined;
                    if (!accessToken) return [3 /*break*/, 5];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("https://typo.rip/api/member/", {
                            headers: {
                                'Accept': '*/*',
                                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                            },
                            method: "POST",
                            body: "get&accessToken=" + accessToken
                        })];
                case 2: return [4 /*yield*/, (_c.sent()).json()];
                case 3:
                    memberResponse = _c.sent();
                    user = memberResponse;
                    return [3 /*break*/, 5];
                case 4:
                    _a = _c.sent();
                    socket.emit("error", "Authorization failed.");
                    socket.disconnect();
                    return [2 /*return*/];
                case 5:
                    // if data is not a valid stream id
                    if (!data.id || !data.name || !streamers.some(function (streamer) { return streamer.id == data.id; }))
                        return [2 /*return*/];
                    // if socket is already streaming return
                    if (streamers.some(function (streamer) { return streamer.socket == socket; }))
                        return [2 /*return*/];
                    // if socket is already spectating or using same account return
                    if (spectators.some(function (spectator) { var _a; return spectator.socket == socket || accessToken && ((_a = spectator.member) === null || _a === void 0 ? void 0 : _a.UserID) == user.UserID; })) {
                        socket.emit("error", "Duplicate spectate origin.");
                        socket.disconnect();
                        return [2 /*return*/];
                    }
                    ;
                    // push to spectators
                    spectators.push({ socket: socket, id: data.id, name: data.name, member: user });
                    // join broadcast rooms and emit join
                    socket.join(data.id);
                    socket.join("spectator");
                    io.to(data.id).emit("message", { title: data.name + " joined the stream.", message: "Welcome! (:" });
                    // send past important cache
                    (_b = importantCache.find(function (c) { return c.streamid == data.id; })) === null || _b === void 0 ? void 0 : _b.cache.forEach(function (data) {
                        socket.emit("streamdata", data);
                    });
                    // emit leave on disconnect
                    socket.on("disconnect", function () {
                        io.to(data.id).emit("message", { title: data.name + " left the stream.", message: "" });
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
