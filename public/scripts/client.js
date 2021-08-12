var socket = io();
const generalStatesStyle = 'background-color: white; height: 100%; width: 100%; position:fixed; top: 0;'
var removedGameChildCount; // number of children that have to be removed
var state;

function setScoreBoard() {
    
}

function setState(localState) {
    state = localState;
    switch (state) {
        case 0:
            document.getElementById('home').style = generalStatesStyle+' visibility: visible;';
            document.getElementById('game').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('scoreBoard').style = generalStatesStyle+' visibility: hidden;';
            break;
        case 1:
            document.getElementById('home').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('game').style = generalStatesStyle+' visibility: visible;';
            document.getElementById('scoreBoard').style = generalStatesStyle+' visibility: hidden;';
            break;
        case 2:
            document.getElementById('home').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('game').style = generalStatesStyle+' visibility: hidden;';
            document.getElementById('scoreBoard').style = generalStatesStyle+' visibility: visible;';
            break;
    }
    console.log('state set to '+state);
}

function startGameButtonPressed() {
    socket.emit('game_start_button_pressed');
    socket.emit('player_name_set', document.getElementById('playerNameInput').value);
    setState(1);
}

function keyPressed(e) {
    if (state != 1) return;
    console.log(e.keyCode);
    socket.emit('key_pressed', e.keyCode)
}

function userClicked() {
    var mouseX = event.clientY; // normal that width and height should be inverted (ref. project standards)
    var mouseY = event.clientX;
    var compareX = window.innerHeight/2;
    var compareY = window.innerWidth/2;
    if (mouseX != compareX || mouseY != compareY)  { // to avoid case where coordinates are EXACTLY the same
        // calculate function formed between (mouseX, mouseY) and (compareX, compareY) as f(x) = ax+b, here we return a
        var xDiff = mouseX-compareX;
        var yDiff = mouseY-compareY;
        socket.emit('shot_fired', xDiff, yDiff);
    }
}

function percentageHeightToPixel(x) {
    return (x*window.innerHeight)/100;
}

function percentageWidthToPixel(x) {
    return (x*window.innerWidth)/100;
}

// adds an element to the game view in terms of percentages
socket.on('addElementToGameView', (top, left, targetHeight, targetWidth, source, id) => {
    // console.log('E');
    var element = document.getElementById(id);
    if (element == null) {
        element = document.createElement('img');
        element.id = id;
        element.setAttribute('src', '/images/'+source+'.png');
        document.getElementById('elements').appendChild(element);
    }
    var proposedHeight = (targetHeight*window.innerHeight)/100;
    var proposedWidth = (targetWidth*window.innerWidth)/100;
    element.setAttribute('height', proposedHeight);
    element.setAttribute('width', proposedWidth);
    var topOffset = top-targetHeight/2;
    var leftOffset = left-targetWidth/2;
    var styleAssign = 'z-index: -1; object-fit:fill; position: absolute; top: '+topOffset+'%; left: '+leftOffset+'%;';
    element.style = styleAssign;
});

socket.on('shotFired', (x1, y1, x2, y2) => {
    var shotCanvas = document.createElement('canvas');
    shotCanvas.style.zIndex = 50;
    shotCanvas.id = x1+y1+x2+y2+Math.random(); // a good hash
    document.getElementById('shots').appendChild(shotCanvas);
    x1 = percentageHeightToPixel(x1);
    y1 = percentageWidthToPixel(y1);
    x2 = percentageHeightToPixel(x2);
    y2 = percentageWidthToPixel(y2);
    var alpha = 0;
    var delta = 0.08;
    var line = shotCanvas.getContext('2d');
    var interval = setInterval(display, 1);
    function display() {
        shotCanvas.height = window.innerHeight;
        shotCanvas.width = window.innerWidth;
        alpha += delta;
        if (alpha >= 1) {
            delta *= -1;
            alpha = 1;
        }
        else if (alpha <= 0) {
            clearInterval(interval);
            document.getElementById('shots').removeChild(shotCanvas);
            return;
        }
        line.clearRect(x1, y1, x2, y2);
        line.beginPath();
        line.moveTo(y1, x1);
        line.lineTo(y2, x2);
        line.lineWidth = 2;
        line.globalAlpha = alpha;
        line.strokeStyle = '#ff0000';
        line.stroke();
    }
});

socket.on('updateLife', (newLife) => {
    document.getElementById('lifeLevel').style.width = newLife+'%';
    document.getElementById('lifeText').innerHTML = 'Life: '+newLife;
});

socket.on('gameFinishedForPlayer', () => {
    socket.emit('game_finished_for_player');
    setScoreBoard();
    setState(2);
});

socket.on('launchHome', () => {
    setState(0);
});

socket.on('sendUserScreenRatio', () => {
    socket.emit('user_screen_ratio', window.innerWidth/window.innerHeight);
});

document.getElementById('startGameButton').onclick = function () { startGameButtonPressed() };
document.getElementById('game').addEventListener('click', userClicked);
document.onkeypress = keyPressed;