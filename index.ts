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
let spectators: Array<{socket: Socket, id: string, name: string}>  = [];

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
        socket.join(streamID);
        socket.join("streamer");
        socket.emit("streamstart", streamID);

        // listen for stream data and broadcast
        socket.on("streamdata", data => {
            io.to(streamID).except("streamer").emit("streamdata", data);
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

        // generate id and push to spectators
        const streamID = "typoSpct_" + (Math.ceil(Math.random() * Date.now() / 100)).toString(16);
        spectators.push({socket: socket, id: streamID, name: data.name});

        // join broadcast rooms and emit join
        socket.join(data.id);
        socket.join("spectator");
        io.to(data.id).emit("message", {title: data.name + " joined the stream.", message: "Welcome! (:"});
    });
  });