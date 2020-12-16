const app = require('express')();
const http = require('http').createServer(app);
const { makeRoom } = require('./utils/RoomMaker.js');
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
 * clients: [{
 *  id: socket id
 *  name: Name of player
 * }]
 */
let rooms = {};

const FULL = 10; // max room size

let count = 0; // count of connection

io.on('connection', (socket) => {
    console.log(`Connected #${count++}`);
    // creates a room for the client
    socket.emit('handshake', 'Initiate handshake');

    // create room as host
    socket.on('host handshake', data => {
        let roomCode = makeRoom(4);
        while (rooms[roomCode]) {
            roomCode = makeRoom(4);
            console.log(roomCode);
        }
        rooms[roomCode] = {};
        rooms[roomCode]['host'] = socket.id;
        rooms[roomCode]['hostName'] = data.name;
        rooms[roomCode]['clients'] = [];

        console.log(`Room ${roomCode} created`);

        socket.join(roomCode);
        socket.emit('complete handshake', { roomCode: roomCode });
    });

    // join room
    socket.on('handshake', data => {
        console.log(data);
        // if new room, create it
        if (!rooms[data.room]) {
            socket.emit('complete handshake', { type: 'fail', msg: 'Room does not exist' });
            console.log('room does not exist');
            return;
        } else if (rooms[data.room]['clients'].length === FULL) {
            socket.emit('complete handshake', { type: 'fail', msg: 'Room is full' });
            console.log(`${data.room} full, rejected`);
            return;
        } else if (rooms[data.room]['clients'].find(c => c.name === data.name)) {
            socket.emit('complete handshake', { type: 'fail', msg: 'Name is taken' });
            console.log(`${data.name} taken, rejected`);
            return;
        }

        // add client to room
        rooms[data.room]['clients'].push({ id: socket.id, name: data.name });

        socket.join(data.room); // socket joins room
        socket.emit('complete handshake', { type: 'success', msg: data.room });
        console.log('handshake completed');
    });

    socket.on('chat message', (data) => {
        console.log(`Sending ${data.message} to ${data.room}`);
        io.to(data.room).emit('chat message', {
            name: data.name,
            message: data.message,
        });
    });

    socket.on('delete', data => {
        console.log(data);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected');
        Object.keys(rooms).forEach(room => {
            rooms[room]['clients'].forEach((client, idx) => {
                if (client.id === socket.id) {
                    rooms[room]['clients'].splice(idx, 1);
                }
            });
            if (rooms[room]['clients'].length === 0) {
                delete rooms[room];
                console.log(`Room ${room} is empty, deleting room`);
            }
        });
    });
});

http.listen(port, () => {
    console.log(`listening on ${port}`);
});