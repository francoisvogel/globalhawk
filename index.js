const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

class Match {
    constructor() {
        this.matchNumber = 0;
    }
}

var mainMatch = Match();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    var playerName, matchNumber;
    socket.on("player_name_set", (arg) => {
        console.log("player_name_set");
        playerName = arg;
    });
    socket.on("game_start_button_pressed", () => {
        matchNumber = mainMatch.matchNumber;
        matchNumber.join(matchNumber);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});