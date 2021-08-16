require("dotenv").config();
// const fs = require('fs');
const geometry = require('./app/scripts/geometry');
const profanatoryDetector = require('./app/scripts/profanatory.js');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
// const { type } = require('jquery');
// const jsdom = require('jsdom');
// const dom = new jsdom.JSDOM("");
// const jquery = require('jquery')(dom.window);

const Background = require('./app/models/Background');
const Player = require('./app/models/Player');

const totalHeight = process.env.TOTAL_HEIGHT;
const totalWidth = process.env.TOTAL_WIDTH;

class Match {
    constructor() {
        this.matchNumber = 0;
        this.players = [];
        this.elements = [];
        this.elements.push(new Background());
        this.activePlayerCount = 0; // players who are not dead and not disconnected
        this.lightningRadius = totalHeight; // storm radius
        this.lightningCenterX = totalHeight / 2;
        this.lightningCenterY = totalWidth / 2;
        this.activeMatch = true;
    }
    updateLightningRadius() {
        this.lightningRadius -= 10;
        this.lightningRadius = Math.max(this.lightningRadius, 1);
        console.log(this.lightningRadius);
        for (let i = 0; i < this.players.length; i++) {
            var actualHeight = Math.sqrt(this.players[i].scope / this.players[i].ratio);
            var actualWidth = actualHeight * this.players[i].ratio;
            var fromTop = (this.lightningCenterX - (this.players[i].x - actualHeight / 2)) / actualHeight * 100;
            var fromLeft = (this.lightningCenterY - (this.players[i].y - actualWidth / 2)) / actualWidth * 100;
            io.to(this.players[i].id).emit('updateLightning', fromTop, fromLeft, this.lightningRadius / Math.sqrt(this.players[i].scope) * 100);
            if (Date.now() % (100 / process.env.ACC) <= 1 /* chance of x/y of being hit */ && geometry.euclideanDistance(this.lightningCenterX, this.lightningCenterY, this.players[i].x, this.players[i].y) >= this.lightningRadius) {
                if (this.players[i].reduceLife((geometry.euclideanDistance(this.lightningCenterX, this.lightningCenterY, this.players[i].x, this.players[i].y) - this.lightningRadius) / (totalHeight + totalWidth) * process.env.ACC)) {
                    io.to(this.players[i].id).emit('addChatComment', 'LightningStorm', this.players[i].playerName + ' is destroyed.');
                    io.to(this.players[i].id).emit('gameFinishedForPlayer', false);
                    this.oneRemainingCheck();
                }
                else {
                    io.to(this.players[i].id).emit('addImportantComment', 'Stay away of the lighting storm to avoid being destroyed.');
                }
            }
        }
    }
    refreshView() {
        this.updateLightningRadius();
        this.elements.forEach(function (i) {
            if (!i.immortal && i.life == 0 && !i.removed) {
                io.emit('removeElementFromGameView', i.id);
                i.removed = true;
            }
        });
        for (var i = 0; i < this.players.length; i++) if (this.players[i].exists) {
            io.to(this.players[i].id).emit('updateLife', this.players[i].life);
            if (this.players[i] == undefined) continue; // strange bug
            io.to(this.players[i].id).emit('sendUserScreenRatio');
            var actualHeight = Math.sqrt(this.players[i].scope / this.players[i].ratio);
            var actualWidth = actualHeight * this.players[i].ratio;
            for (var j = 0; j < this.elements.length; j++) if (this.elements[j].exists) {
                var fromTop = (this.elements[j].x - (this.players[i].x - actualHeight / 2)) / actualHeight * 100;
                var fromLeft = (this.elements[j].y - (this.players[i].y - actualWidth / 2)) / actualWidth * 100;
                // console.log(i.id);
                io.to(this.players[i].id).emit('addElementToGameView', Number(fromTop), Number(fromLeft), this.elements[j].height * 100 / actualHeight, this.elements[j].width * 100 / actualWidth, this.elements[j].code(), this.elements[j].id);
            }
        }
    }
    calculateFreeCoordinates() {
        return [totalHeight - 1000, totalWidth - 1000];
    }
    addPlayer(player) {
        this.players.push(player);
        this.elements.push(player); // elements contains all elements (drones, clouds, items)
        var coordinates = this.calculateFreeCoordinates();
        player.x = coordinates[0];
        player.y = coordinates[1];
        this.activePlayerCount++;
        io.to(this.matchNumber).emit('updatePlayerCount', this.players.length);
        io.to(this.matchNumber).emit('addChatComment', 'system', player.playerName + ' joined the match.');
    }
    removePlayer(player) {
        console.log('player removed');
        var x = this.players.indexOf(player);
        if (x == -1) return; // not found
        for (let i = x; i < this.players.length; i++) this.players[i] = this.players[i + 1];
        this.players.pop();
        x = this.elements.indexOf(player);
        if (x == -1) return; // not found, let's say user lost and disconnected at a very short time interval
        for (let i = x; i < this.elements.length; i++) this.elements[i] = this.elements[i + 1];
        this.elements.pop();
        this.activePlayerCount--;
        // io.to(this.matchNumber).emit('removeElementFromGameView', player.id); // not needed any more
        io.to(this.matchNumber).emit('removeElementFromGameView', player.id);
        io.to(this.matchNumber).emit('updatePlayerCount', this.players.length);
        io.to(this.matchNumber).emit('addChatComment', 'system', player.playerName + ' left the match.');
    }
    // looks for closest element to (x1, y1) that intersect with line [(x1, y1), (x2, y2)] and takes life from it
    processShot(x1, y1, x2, y2, shooter) {
        var smallestDistance = totalHeight + totalWidth;
        var selectedElement = -1;
        this.elements.forEach(function (i) {
            // check whether diagonals intersect
            if (!i.static && i.id != shooter.id && (geometry.lineSegmentIntersect(x1, y1, x2, y2, i.x - i.height / 2, i.y - i.width / 2, i.x + i.height / 2, i.y + i.height / 2) || geometry.lineSegmentIntersect(x1, y1, x2, y2, i.x - i.height / 2, i.y + i.width / 2, i.x + i.height / 2, i.y - i.height / 2))) {
                if (geometry.euclideanDistance(i.x, i.y, x1, y1) < smallestDistance) {
                    smallestDistance = geometry.euclideanDistance(i.x, i.y, x1, y1);
                    selectedElement = i;
                }
            }
        });
        this.players.forEach(function (i) {
            var actualHeight = Math.sqrt(i.scope / i.ratio);
            var actualWidth = actualHeight * i.ratio;
            var fromTopX1 = (x1 - (i.x - actualHeight / 2)) / actualHeight * 100;
            var fromLeftY1 = (y1 - (i.y - actualWidth / 2)) / actualWidth * 100;
            var fromTopX2, fromLeftY2;
            if (selectedElement == -1) {
                fromTopX2 = (x2 - (i.x - actualHeight / 2)) / actualHeight * 100;
                fromLeftY2 = (y2 - (i.y - actualWidth / 2)) / actualWidth * 100;
            }
            else {
                var closestIntersection = null;
                var corners = [[selectedElement.x - selectedElement.height / 2, selectedElement.y - selectedElement.width / 2], [selectedElement.x - selectedElement.height / 2, selectedElement.y + selectedElement.width / 2], [selectedElement.x + selectedElement.height / 2, selectedElement.y + selectedElement.width / 2], [selectedElement.x + selectedElement.height / 2, selectedElement.y - selectedElement.width / 2]]; // in CCW
                for (var j = 0; j < 4; j++) {
                    var secondPoint = (j + 1) % 4;
                    if (geometry.lineSegmentIntersect(corners[j][0], corners[j][1], corners[secondPoint][0], corners[secondPoint][1], x1, y1, x2, y2) == true) {
                        var proposedIntersection = geometry.getLineSegmentIntersection(corners[j][0], corners[j][1], corners[secondPoint][0], corners[secondPoint][1], x1, y1, x2, y2);
                        if (proposedIntersection != null && (closestIntersection == null || geometry.euclideanDistance(x1, y1, proposedIntersection.intersectX, proposedIntersection.intersectY) < geometry.euclideanDistance(x1, y1, closestIntersection.intersectX, closestIntersection.intersectY))) {
                            closestIntersection = proposedIntersection;
                        }
                    }
                }
                fromTopX2 = (closestIntersection.intersectX - (i.x - actualHeight / 2)) / actualHeight * 100;
                fromLeftY2 = (closestIntersection.intersectY - (i.y - actualWidth / 2)) / actualWidth * 100;
            }
            io.to(i.id).emit('shotFired', fromTopX1, fromLeftY1, fromTopX2, fromLeftY2, 10000);
        });
        if (selectedElement != -1 && !selectedElement.immortal) {
            if (selectedElement.reduceLife(3 * process.env.ACC)) {
                io.to(selectedElement.id).emit('gameFinishedForPlayer', false);
                this.oneRemainingCheck();
            }
            if (selectedElement.life == 0 && selectedElement.constructor.name == 'Player') {
                shooter.destroyedCount++;
                io.to(shooter.id).emit('updateDestroyedCount', shooter.destroyedCount);
                io.to(this.matchNumber).emit('addChatComment', 'system', shooter.playerName + ' destroyed ' + selectedElement.playerName + '.');
            }
        }
    }
    oneRemainingCheck() {
        if (this.players.length <= 1) {
            io.to(this.matchNumber).emit('gameFinishedForPlayer', true);
            this.activeMatch = false;
        }
    }
}

function refreshViewAllMatches() {
    for (var i = 0; i < matches.length; i++) {
        if (matches[i].activeMatch == true) matches[i].refreshView();
    }
}

setInterval(refreshViewAllMatches, 20);
var matches = [];
matches.push(new Match());

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pages/index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

io.on('connection', (socket) => {
    socket.emit('launchHome');
    var thisPlayer = null;
    var selectedMatch;
    socket.on('player_name_set', (arg) => {
        console.log('player_name_set');
        if (arg != "") {
            thisPlayer.playerName = arg;
        }
    });
    socket.on('game_start_button_pressed', () => {
        console.log('game_start_button_pressed');
        thisPlayer = new Player(socket.id);
        selectedMatch = matches[matches.length - 1];
        socket.join(selectedMatch.matchNumber);
        selectedMatch.addPlayer(thisPlayer);
        socket.emit('updateDestroyedCount', thisPlayer.destroyedCount);
    });
    // updates thisPlayer.ratio
    socket.on('user_screen_ratio', (localRatio) => {
        thisPlayer.ratio = localRatio;
    });
    socket.on('key_pressed', (key) => {
        thisPlayer.receiveKeyPress(key);
    });
    socket.on('game_finished_for_player', () => {
        socket.leave(selectedMatch.matchNumber);
        thisPlayer.exists = false;
        selectedMatch.removePlayer(thisPlayer);
    });
    // eslint-disable-next-line no-unused-vars
    socket.on('disconnect', (key) => {
        if (thisPlayer != null) {
            thisPlayer.exists = false;
            selectedMatch.removePlayer(thisPlayer);
        }
    });
    socket.on('shot_fired', (xDir, yDir) => {
        // binarySearch the value to find two other points such that the resulting grid is still in bounds
        var k = 0;
        for (var i = (1 << 30); i > 0.001; i /= 2) {
            var proposedSecondX = thisPlayer.x + xDir * (k + i);
            var proposedSecondY = thisPlayer.y + yDir * (k + i);
            if (0 <= proposedSecondX && 0 <= proposedSecondY && proposedSecondX < totalHeight && proposedSecondY < totalWidth) {
                k += i;
            }
        }
        var secondX = thisPlayer.x + xDir * k;
        var secondY = thisPlayer.y + yDir * k;
        selectedMatch.processShot(thisPlayer.x, thisPlayer.y, secondX, secondY, thisPlayer);
    });
    socket.on('chat_message_sent', (message) => {
        if (profanatoryDetector.isProfanatory(message)) {
            io.to(thisPlayer.id).emit('addChatComment', 'system', 'Please remain respectful and polite at all times. Check the Code of Conduct for more details.');
        }
        else {
            io.to(selectedMatch.matchNumber).emit('addChatComment', thisPlayer.playerName, message);
        }
    });
});

server.listen(process.env.PORT, () => {
    console.log('listening on *:' + process.env.PORT);
});