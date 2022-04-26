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
        var streamID = "typoStrm" + (Math.random() * Math.ceil(Date.now() / 1000)).toString(16);
        streamers.push({ socket: socket, id: streamID });
        socket.join(streamID);
        socket.join("streamer");
        io.to(streamID).emit("message", "Lobby stream has been started for id: " + streamID);
        // listen for stream data and broadcast
        socket.on("streamdata", function (data) {
            io.to(streamID).except("streamer").emit("streamdata", data);
        });
    });
    // listen for spectate requests
    socket.on("spectate", function (data) {
        // if data is not a valid stream id
        if (!data.id || !data.name || !streamers.some(function (streamer) { return streamer.id == data.id; }))
            return;
        // if socket is already streaming return
        if (streamers.some(function (streamer) { return streamer.socket == socket; }))
            return;
        // if socket is already spectating return
        if (spectators.some(function (spectator) { return spectator.socket == socket; }))
            return;
        // generate id and push to spectators
        var streamID = "typoSpct" + (Math.random() * Math.ceil(Date.now() / 1000)).toString(16);
        spectators.push({ socket: socket, id: streamID, name: data.name });
        // join broadcast rooms and emit join
        socket.join(data.id);
        socket.join("spectator");
        io.to(data.id).emit("message", data.name + " joined the stream.");
    });
});
