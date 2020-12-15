const app = require('express')();
const http = require('http').createServer(app);
const makeRoom = require('./utils/RoomMaker.js');
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    },
});

const port = 4001;

/**
 * rooms object
 * contains a list of room keys
 * clients: current socket connections
 */
let rooms = {};

const FULL = 10; // max room size

let count = 0; // count of connection

io.on('connection', (socket) => {
    console.log(`Connected #${count++}`);
    // creates a room for the client
    socket.emit('handshake', 'Initiate handshake');

    // create or join room
    socket.on('handshake', room => {
        // if new room, create it
        if (!rooms[room]) {
            rooms[room] = {
                'clients': [],
            };
        } else if (rooms[room]['clients'].length === FULL) {
            socket.emit('room status', 'This room is full');
            return;
        } 

        // add client to room
        rooms[room]['clients'].push(socket.id);

        socket.join(room); // socket joins room
        socket.emit('room status', room);
    });

    socket.on('chat message', (data) => {
        io.to(data['room']).emit('chat message', data['message']);
    });
});

http.listen(port, () => {
    console.log(`listening on ${port}`);
});