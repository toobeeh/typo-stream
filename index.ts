import express from "express";
import { Server, Socket } from "socket.io";

const PORT = process.env.PORT || 3000;

const server = express()
    .listen(
    PORT, 
    () => console.log(`Express server listening on port ${PORT}`)
);

const io = new Server(server, {
    cors: {
      origin: "https://skribbl.io"
    }
  });

// map for streaming clients
let streamers: Array<{socket: Socket, id: string}>  = [];

// map for lisetning clients
let spectators: Array<{socket: Socket, id: string, name: string}> = [];

// map for important lobby caches
let importantCache: Array<{streamid: string, cache: Array<any>}> = [];

// cache important commands for a lobby
const addImportant = (id: string, data: any) => {
    const cache = importantCache.find(c => c.streamid == id);
    if(cache){

        // if event contains data of lobby init state
        if(data[0] == "lobbyConnected") {
            cache.cache = [];
            cache.cache.push(data);
        }

        // if event contains current lobby state, set that to current
        else if(data[0] == "lobbyState") {
            cache.cache = cache.cache.filter(data => data[0] != "lobbyState");
            cache.cache.push(data);
        }

        // if event contains player connect
        else if(data[0] == "lobbyPlayerConnected" || data[0] == "lobbyPlayerDisconnected") {
            cache.cache.push(data);
        }

        // if draw comamnds are incoming
        else if(data[0] == "drawCommands") {
            cache.cache.push(data);
        }

        // if canvas cleared, remove draw commands
        else if(data[0] == "canvasClear") {
            cache.cache = cache.cache.filter(data => data[0] != "drawCommands" && data[0] != "canvasClear");
            cache.cache.push(data);
        }
    }
}

io.on('connection', (socket) => {

    console.log('Client connected');

    // remove from maps on disconnect
    socket.on('disconnect', () => {
        streamers = streamers.filter(streamer => streamer.socket != socket);
        spectators = spectators.filter(spectator => spectator.socket != socket);
    });

    // listen for stream requests
    socket.on("stream", () => {

        // if socket is already streaming return
        if(streamers.some(streamer => streamer.socket == socket)) return;

        // if socket is already spectating return
        if(spectators.some(spectator => spectator.socket == socket)) return;

        // generate id and push to streamers
        const streamID = "typoStrm_" + (Math.ceil(Math.random() * Date.now() / 100)).toString(16);
        streamers.push({socket: socket, id: streamID});
        importantCache.push({streamid: streamID, cache: []});
        socket.join(streamID);
        socket.join("streamer");
        socket.emit("streamstart", streamID);

        // listen for stream data and broadcast
        socket.on("streamdata", data => {

            // cache important
            addImportant(streamID, data);
            io.to(streamID).except("streamer").emit("streamdata", data);
        });

        // listen for disconnect and close all related clients
        socket.on("disconnect", () => {
            spectators.forEach(spect => {
                if(spect.id == streamID) spect.socket.disconnect();
            });

            // remove important cache 
            importantCache = importantCache.filter(c => c.streamid != streamID);
        });
    });

    // listen for spectate requests
    socket.on("spectate", (data) => {

        // if data is not a valid stream id
        if(!data.id || !data.name || !streamers.some(streamer => streamer.id == data.id)) return;

        // if socket is already streaming return
        if(streamers.some(streamer => streamer.socket == socket)) return;

        // if socket is already spectating return
        if(spectators.some(spectator => spectator.socket == socket)) return;

        // push to spectators
        spectators.push({socket: socket, id: data.id, name: data.name});

        // join broadcast rooms and emit join
        socket.join(data.id);
        socket.join("spectator");
        io.to(data.id).emit("message", {title: data.name + " joined the stream.", message: "Welcome! (:"});

        // send past important cache
        importantCache.find(c => c.streamid == data.id)?.cache.forEach(data => {
            socket.emit("streamdata", data);
        });

        // emit leave on disconnect
        socket.on("disconnect", () => {
            io.to(data.id).emit("message", {title: data.name + " left the stream.", message: ""});
        });
    });
  });