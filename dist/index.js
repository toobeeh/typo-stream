"use strict";
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
    socket.on("stream", function () {
        // if socket is already streaming return
        if (streamers.some(function (streamer) { return streamer.socket == socket; }))
            return;
        // if socket is already spectating return
        if (spectators.some(function (spectator) { return spectator.socket == socket; }))
            return;
        // generate id and push to streamers
        var streamID = "typoStrm_" + (Math.ceil(Math.random() * Date.now() / 100)).toString(16);
        streamers.push({ socket: socket, id: streamID });
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
    });
    // listen for spectate requests
    socket.on("spectate", function (data) {
        var _a;
        // if data is not a valid stream id
        if (!data.id || !data.name || !streamers.some(function (streamer) { return streamer.id == data.id; }))
            return;
        // if socket is already streaming return
        if (streamers.some(function (streamer) { return streamer.socket == socket; }))
            return;
        // if socket is already spectating return
        if (spectators.some(function (spectator) { return spectator.socket == socket; }))
            return;
        // push to spectators
        spectators.push({ socket: socket, id: data.id, name: data.name });
        // join broadcast rooms and emit join
        socket.join(data.id);
        socket.join("spectator");
        io.to(data.id).emit("message", { title: data.name + " joined the stream.", message: "Welcome! (:" });
        // send past important cache
        (_a = importantCache.find(function (c) { return c.streamid == data.id; })) === null || _a === void 0 ? void 0 : _a.cache.forEach(function (data) {
            socket.emit("streamdata", data);
        });
        // emit leave on disconnect
        socket.on("disconnect", function () {
            io.to(data.id).emit("message", { title: data.name + " left the stream.", message: "" });
        });
    });
});
