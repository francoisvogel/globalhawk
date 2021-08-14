const fs = require('fs');
var gifyParse = require('gify-parse');
const classicFunctions = require('./server/classicFunctions');
const profanatoryDetector = require('./server/profanatory.js');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
const { type } = require('jquery');
// const jsdom = require('jsdom');
// const dom = new jsdom.JSDOM("");
// const jquery = require('jquery')(dom.window);

const totalHeight = 1000000;
const totalWidth = 1000000;

class Background {
    constructor() {
        this.height = totalHeight;
        this.width = totalWidth;
        this.exists = true;
        this.x = totalHeight/2;
        this.y = totalWidth/2;
        this.immortal = true;
        this.static = true;
    }
    code() {
        return 'backgrounds/green';
    }
}

class Player {
    constructor(localID) {
        this.id = localID;
        this.height = 500;
        this.width = 500;
        this.ratio = 1; // ratio of width = ratio*height
        this.scope = 100000000; // gives the area that can be seen;
        this.keyPressMove = 100; // move when key w-a-s-d pressed
        this.exists = true; // defines whether player exists
        this.life = 100; // defines initial life
        this.x;
        this.y;
        this.weapon = 0; // originally no weapon is equipped
        this.playerName = "BuzzDroner"; // default name
        this.immortal = false;
        this.removed = false; // indicated whether element has been removed of player view
        this.destroyedCount = 0; // nb of killed players
        this.static = false;
    }
    // string png to be used locally
    code() {
        return 'items/drone';
    }
    receiveKeyPress(key) {
        console.log('key press received');
        switch (key) {
            case 87: // up
                var xProposed = this.x;
                var yProposed = this.y;
                xProposed -= this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 68: // right
                var xProposed = this.x;
                var yProposed = this.y;
                yProposed += this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 83: // down
                var xProposed = this.x;
                var yProposed = this.y;
                xProposed += this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
            case 65: // left
                var xProposed = this.x;
                var yProposed = this.y;
                yProposed -= this.keyPressMove;
                if (0 <= xProposed-this.height/2 && 0 <= yProposed-this.width/2 && xProposed+this.height/2 < totalHeight && yProposed+this.width/2 < totalWidth) {
                    this.x = xProposed;
                    this.y = yProposed;
                }
                break;
        }
        console.log(this.x+' '+this.y);
    }
    // returns true if player is killed
    reduceLife(reducedByValue) {
        this.life = Math.max(0, this.life-reducedByValue);
        if (this.life == 0) {
            io.to(this.id).emit('gameFinishedForPlayer');
            return true;
        }
        console.log('life: '+this.life);
        return false;
    }
}

class Match {
    constructor() {
        this.matchNumber = 0;
        this.players = [];
        this.elements = [];
        this.elements.push(new Background());
        this.activePlayerCount = 0; // players who are not dead and not disconnected
    }
    refreshView() {
        this.elements.forEach(function(i) {
            if (!i.immortal && i.life == 0 && !i.removed) {
                io.emit('removeElementFromGameView', i.id);
                i.removed = true;
            }
        });
        for (var i = 0; i < this.players.length; i++) if (this.players[i].exists) {
            io.to(this.players[i].id).emit('updateLife', this.players[i].life);
            if (this.players[i] == undefined) continue; // strange bug
            io.to(this.players[i].id).emit('sendUserScreenRatio');
            var actualHeight = Math.sqrt(this.players[i].scope/this.players[i].ratio);
            var actualWidth = actualHeight*this.players[i].ratio;
            for (var j = 0; j < this.elements.length; j++) if (this.elements[j].exists) {
                var fromTop = (this.elements[j].x-(this.players[i].x-actualHeight/2))/actualHeight*100;
                var fromLeft = (this.elements[j].y-(this.players[i].y-actualWidth/2))/actualWidth*100;
                // console.log(i.id);
                io.to(this.players[i].id).emit('addElementToGameView', Number(fromTop), Number(fromLeft), this.elements[j].height/actualHeight*100, this.elements[j].width/actualWidth*100, this.elements[j].code(), this.elements[j].id);
            }
        }
    }
    calculateFreeCoordinates() {
        return [1000, 1000];
    }
    addPlayer(player) {
        this.players.push(player);
        this.elements.push(player); // elements contains all elements (drones, clouds, items)
        var coordinates = this.calculateFreeCoordinates();
        player.x = coordinates[0];
        player.y = coordinates[1];
        this.activePlayerCount++;
        io.to(this.matchNumber).emit('updatePlayerCount', this.players.length);
        io.to(this.matchNumber).emit('addChatComment', 'system', player.playerName+' joined the match.');
    }
    removePlayer(player) {
        console.log('player removed');
        var x = this.players.indexOf(player);
        if (x == -1) return; // not found
        for (var i = x; i < this.players.length; i++) this.players[i] = this.players[i+1];
        this.players.pop();
        x = this.elements.indexOf(player);
        if (x == -1) return; // not found, let's say user lost and disconnected at a very short time interval
        for (var i = x; i < this.elements.length; i++) this.elements[i] = this.elements[i+1];
        this.elements.pop();
        this.activePlayerCount--;
        // io.to(this.matchNumber).emit('removeElementFromGameView', player.id); // not needed any more
        io.to(this.matchNumber).emit('updatePlayerCount', this.players.length);
        io.to(this.matchNumber).emit('addChatComment', 'system', player.playerName+' left the match.');
    }
    // looks for closest element to (x1, y1) that intersect with line [(x1, y1), (x2, y2)] and takes life from it
    processShot(x1, y1, x2, y2, shooter) {
        var smallestDistance = totalHeight+totalWidth;
        var selectedElement = -1;
        this.elements.forEach(function(i) {
            // check whether diagonals intersect
            if (!i.static && i.id != shooter.id && (classicFunctions.lineSegmentIntersect(x1, y1, x2, y2, i.x-i.height/2, i.y-i.width/2, i.x+i.height/2, i.y+i.height/2) || classicFunctions.lineSegmentIntersect(x1, y1, x2, y2, i.x-i.height/2, i.y+i.width/2, i.x+i.height/2, i.y-i.height/2))) {
                if (classicFunctions.pointDistance(i.x, i.y, x1, y1) < smallestDistance) {
                    smallestDistance = classicFunctions.pointDistance(i.x, i.y, x1, y1);
                    selectedElement = i;
                }
            }
        });
        this.players.forEach(function(i) {
            var actualHeight = Math.sqrt(i.scope/i.ratio);
            var actualWidth = actualHeight*i.ratio;
            var fromTopX1 = (x1-(i.x-actualHeight/2))/actualHeight*100;
            var fromLeftY1 = (y1-(i.y-actualWidth/2))/actualWidth*100;
            if (selectedElement == -1) {
                var fromTopX2 = (x2-(i.x-actualHeight/2))/actualHeight*100;
                var fromLeftY2 = (y2-(i.y-actualWidth/2))/actualWidth*100;
            }
            else {
                var fromTopX2 = (selectedElement.x-(i.x-actualHeight/2))/actualHeight*100;
                var fromLeftY2 = (selectedElement.y-(i.y-actualWidth/2))/actualWidth*100;
            }
            io.to(i.id).emit('shotFired', fromTopX1, fromLeftY1, fromTopX2, fromLeftY2, 10000);
        });
        if (selectedElement != -1 && !selectedElement.immortal) {
            selectedElement.reduceLife(10);
            if (selectedElement.life == 0 && selectedElement.constructor.name == 'Player') {
                shooter.destroyedCount++;
                io.to(shooter.id).emit('updateDestroyedCount', shooter.destroyedCount);
                io.to(this.matchNumber).emit('addChatComment', 'system', shooter.playerName+' destroyed '+selectedElement.playerName+'.');
            }
        }
    }
}

function refreshViewAllMatches() {
    for (var i = 0; i < matches.length; i++) {
        matches[i].refreshView();
    }
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/pages/index.html');
});

app.use(express.static(path.join(__dirname, 'public')));

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
        selectedMatch = matches[0];
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
    socket.on('disconnect', (key) => {
        if (thisPlayer != null) {
            thisPlayer.exists = false;
            selectedMatch.removePlayer(thisPlayer);
        }
    });
    socket.on('shot_fired', (xDir, yDir) => {
        // binarySearch the value to find two other points such that the resulting grid is still in bounds
        var k = 0;
        for (var i = (1<<30); i; i /= 2) {
            var proposedSecondX = thisPlayer.x+xDir*(k+i);
            var proposedSecondY = thisPlayer.y+yDir*(k+i);
            if (0 <= proposedSecondX && 0 <= proposedSecondY && proposedSecondX < totalHeight && proposedSecondY < totalWidth) {
                k += i;
            }
        }
        var secondX = thisPlayer.x+xDir*k;
        var secondY = thisPlayer.y+yDir*k;
        selectedMatch.processShot(thisPlayer.x, thisPlayer.y, secondX, secondY, thisPlayer);
    });
    socket.on('chat_message_sent', (message) => {
        if (profanatoryDetector.isProfanatory(message)) {
            io.to(thisPlayer.id).emit('addChatComment', 'system', 'Please remain respectful and polite at all times. Check the Code of Conduct for more details.');
        }
        io.to(selectedMatch.matchNumber).emit('addChatComment', thisPlayer.playerName, message);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

setInterval(refreshViewAllMatches, 10);
var matches = [];
matches.push(new Match());