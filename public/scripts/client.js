import { Item } from "./components/Item.js";

// eslint-disable-next-line no-undef
var socket = io();
var state;
var redRGBLifeBar = {
    color: 230,
    delta: 3,
    activated: false
}
var pressed = {}; // remembers whether which keys are pressed
var lastInput = 0;
var callStatus = { // initialization state, then kept over games
    microphoneActivated: false,
    speakerActivated: true
};
var audioVolume = 100; // in percentage
var mouse = {
    x: 0,
    y: 0
};
var keybindings = {
    up: 'W'.charCodeAt(0),
    right: 'D'.charCodeAt(0),
    down: 'S'.charCodeAt(0),
    left: 'A'.charCodeAt(0),
    pickup: 'E'.charCodeAt(0),
    undercover: 'U'.charCodeAt(0)
};
var pickedUp = {
    id: null,
    hoveredTime: 0, // in ms
    pickupTime: 0, // in ms
    timeBetweenPickups: 200 // ms
};

function setLifeBarColor() {
    if (state != 1 || !redRGBLifeBar.activated) return;
    redRGBLifeBar.color += redRGBLifeBar.delta;
    if (redRGBLifeBar.color >= 255) {
        redRGBLifeBar.color = 255;
        redRGBLifeBar.delta *= -1;
    } else if (redRGBLifeBar.color <= 50) {
        redRGBLifeBar.color = 50;
        redRGBLifeBar.delta *= -1;
    }
    document.getElementById('lifeLevel').style.backgroundColor = 'rgb(' + redRGBLifeBar.color + ', 0, 0)';
}

function beep() {
    var audio = new Audio('audio/events/beep.mp3');
    audio.volume = audioVolume / 100;
    audio.play();
}

function setState(localState) {
    state = localState;
    switch (state) {
        case 0:
            document.getElementById('lobby').style.visibility = 'visible';
            document.getElementById('game').style.visibility = 'hidden';
            document.getElementById('scoreBoard').style.visibility = 'hidden';
            break;
        case 1:
            document.getElementById('chatInput').value = '';
            document.getElementById('shots').innerHTML = '';
            document.getElementById('elements').innerHTML = '';
            document.getElementById('chat').innerHTML = '';
            pressed = {};
            document.getElementById('lobby').style.visibility = 'hidden';
            document.getElementById('game').style.visibility = 'visible';
            document.getElementById('scoreBoard').style.visibility = 'hidden';
            break;
        case 2:
            document.getElementById('lobby').style.visibility = 'hidden';
            document.getElementById('game').style.visibility = 'hidden';
            document.getElementById('scoreBoard').style.visibility = 'visible';
            break;
    }
}

function startGameButtonPressed() {
    socket.emit('game_start_button_pressed', document.getElementById('playerNameInput').value, document.getElementById('selectMatch').value);
    setState(1);
    record();
}

function keyReact(e) {
    // if (state != 1) return;
    if (e.type == 'keydown') {
        pressed[e.keyCode] = true;
        if (e.shiftKey) {
            pressed[-1] = true;
        }
    } else {
        pressed[e.keyCode] = false;
        pressed[-1] = false;
    }
    // console.log('UNDERCOVER BINDING PRESSED: ', pressed[keybindings.undercover]);
}

function keyStatusServerCommunication() {
    var chatInput = document.getElementById('chatInput');
    if (state != 1 || document.activeElement == chatInput || document.getElementById('settings').style.visibility == 'visible') return;
    var boostActivated = false;
    if (pressed[-1]) boostActivated = true;
    var xShift = 0;
    var yShift = 0;
    if (pressed[keybindings.up]) {
        xShift -= 1;
    }
    if (pressed[keybindings.left]) {
        yShift -= 1;
    }
    if (pressed[keybindings.down]) {
        xShift += 1;
    }
    if (pressed[keybindings.right]) {
        yShift += 1;
    }
    socket.emit('player_move', xShift, yShift, boostActivated);
}

function pickupItemCheck() {
    var currentPickedUpId = null;
    Array.from(document.querySelectorAll(".item")).forEach(function (i) {
        var coordinateRectangle = i.getBoundingClientRect();
        if (coordinateRectangle.top <= window.innerHeight / 2 && window.innerHeight / 2 <= coordinateRectangle.bottom && coordinateRectangle.left <= window.innerWidth / 2 && window.innerWidth / 2 <= coordinateRectangle.right) {
            currentPickedUpId = i.id;
        }
    });
    if (currentPickedUpId != pickedUp.id) {
        $('#pickupPopup').css('visibility', 'hidden');
    }
    pickedUp.id = currentPickedUpId;
    if (pickedUp.id != null && Date.now() - pickedUp.pickupTime >= pickedUp.timeBetweenPickups) {
        if (pressed[keybindings.pickup]) {
            pickedUp.pickupTime = Date.now();
            $('#pickupPopup').css('visibility', 'hidden');
            socket.emit('item_pickup', pickedUp.id);
            console.log('item_picked_up');
        }
        else {
            $('#pickupPopup').css('visibility', 'visible');
        }
    }
}

function userClicked() {
    if ($('#ui:hover').length != 0) {
        return;
    }
    var mouseX = event.clientY; // normal that width and height should be inverted (ref. project standards)
    var mouseY = event.clientX;
    var compareX = window.innerHeight / 2;
    var compareY = window.innerWidth / 2;
    if (mouseX != compareX || mouseY != compareY) { // to avoid case where coordinates are EXACTLY the same
        // calculate function formed between (mouseX, mouseY) and (compareX, compareY) as f(x) = ax+b, here we return s
        var xDiff = mouseX - compareX;
        var yDiff = mouseY - compareY;
        socket.emit('shot_fired', xDiff, yDiff);
    }
}

function percentageHeightToPixel(x) {
    return (x * window.innerHeight) / 100;
}

function percentageWidthToPixel(x) {
    return (x * window.innerWidth) / 100;
}

function getMouseRelativePosition() {
    var mouseX = mouse.x; // normal that width and height should be inverted (ref. project standards)
    var mouseY = mouse.y;
    var compareX = window.innerWidth / 2;
    var compareY = window.innerHeight / 2;
    var x = mouseX - compareX;
    var y = mouseY - compareY;
    return { x, y };
}

const updateRecordTime = 500;
function record() {
    function stopRecord() {
        return (state != 1 || !callStatus.microphoneActivated);
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        if (stopRecord()) return;
        var mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        var audioChunks = [];
        mediaRecorder.addEventListener('dataavailable', function (event) {
            if (stopRecord()) return;
            audioChunks.push(event.data);
        });
        mediaRecorder.addEventListener('stop', function () {
            if (stopRecord()) return;
            var audioBlob = new Blob(audioChunks);
            audioChunks = [];
            var fileReader = new FileReader();
            fileReader.readAsDataURL(audioBlob);
            fileReader.onloadend = function () {
                if (!callStatus.microphoneActivated) return;
                var base64String = fileReader.result;
                socket.emit('voice_message', base64String);
            };
            mediaRecorder.start();
            setTimeout(function () {
                mediaRecorder.stop();
            }, updateRecordTime);
        });

        setTimeout(function () {
            mediaRecorder.stop();
        }, updateRecordTime);
    });
}

function initChangelog() {
    fetch('/data/changelog.json')
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            appendData(data);
        })
        .catch(function (err) {
            console.log('error: ' + err);
        });
    function appendData(data) {
        data.versions.forEach(function (i) {
            var newElement = document.createElement('div');
            newElement.className = 'lobbyPopupElement'
            var boldPart = document.createElement('p');
            boldPart.className = 'changelogTitle';
            boldPart.innerHTML = 'Version ' + i.id + ' - Codename: ' + i.codeName;
            newElement.appendChild(boldPart);
            var textPart = document.createElement('p');
            textPart.className = 'changelogDescription';
            textPart.innerHTML = i.description;
            newElement.appendChild(textPart);
            document.getElementById('changelog').appendChild(newElement);
        });
    }
}

function getBarLifeID(id) {
    return id+'_bar_life';
}

var lastPress = 0;
const timeBetweenUndercoverPresses = 200;
function undercoverUpdate() {
    if (pressed[keybindings.undercover] && Date.now()-lastPress >= timeBetweenUndercoverPresses) {
        if (document.getElementById('undercover').style.visibility == 'hidden') document.getElementById('undercover').style.visibility = 'visible';
        else document.getElementById('undercover').style.visibility = 'hidden';
        lastPress = Date.now();
    }
}

function settingsCheck() {
    var selectedAudioVolume = document.getElementById('settingsAudioVolumeSelection').value;
    if (audioVolume != selectedAudioVolume) {
        audioVolume = selectedAudioVolume;
        beep();
    }
    document.getElementById('settingsAudioVolumeSelection').value = audioVolume;
    document.getElementById('settingsKeyUpValue').innerHTML = String.fromCharCode(keybindings.up);
    if ($('#settingsKeyUpInput').val().length == 1) {
        let str = $('#settingsKeyUpInput').val();
        keybindings.up = str.toUpperCase().charCodeAt(0);
        $('#settingsKeyUpInput').val('');
    }
    document.getElementById('settingsKeyDownValue').innerHTML = String.fromCharCode(keybindings.down);
    if ($('#settingsKeyDownInput').val().length == 1) {
        let str = $('#settingsKeyDownInput').val();
        keybindings.down = str.toUpperCase().charCodeAt(0);
        $('#settingsKeyDownInput').val('');
    }
    document.getElementById('settingsKeyLeftValue').innerHTML = String.fromCharCode(keybindings.left);
    if ($('#settingsKeyLeftInput').val().length == 1) {
        let str = $('#settingsKeyLeftInput').val();
        keybindings.left = str.toUpperCase().charCodeAt(0);
        $('#settingsKeyLeftInput').val('');
    }
    document.getElementById('settingsKeyRightValue').innerHTML = String.fromCharCode(keybindings.right);
    if ($('#settingsKeyRightInput').val().length == 1) {
        let str = $('#settingsKeyRightInput').val();
        keybindings.right = str.toUpperCase().charCodeAt(0);
        $('#settingsKeyRightInput').val('');
    }
    document.getElementById('settingsKeyPickupValue').innerHTML = String.fromCharCode(keybindings.pickup);
    if ($('#settingsKeyPickupInput').val().length == 1) {
        let str = $('#settingsKeyPickupInput').val();
        keybindings.pickup = str.toUpperCase().charCodeAt(0);
        $('#settingsKeyPickupInput').val('');
    }
    document.getElementById('pickupKey').innerHTML = String.fromCharCode(keybindings.pickup).toLocaleLowerCase();
    document.getElementById('settingsKeyUndercoverValue').innerHTML = String.fromCharCode(keybindings.undercover);
    if ($('#settingsKeyUndercoverInput').val().length == 1) {
        let str = $('#settingsKeyUndercoverInput').val();
        keybindings.undercover = str.toUpperCase().charCodeAt(0);
        $('#settingsKeyUndercoverInput').val('');
    }
    document.getElementById('undercoverKey').innerHTML = String.fromCharCode(keybindings.undercover).toLocaleLowerCase();
}

// adds an element to the game view in terms of percentages
socket.on('addElementToGameView', (top, left, targetHeight, targetWidth, source, id, specialInfo, extraInfo) => {
    source = '/images/' + source;
    var element = document.getElementById(id);
    if (element == null) {
        console.log('added', id);
        if (specialInfo == 'Item') {
            element = Item(source);
        }
        else {
            element = document.createElement('img');
            element.setAttribute('src', source);
        }
        element.id = id;
        document.getElementById('elements').appendChild(element);
    }
    else {
        if (element.getAttribute('src') != source) {
            element.setAttribute('src', source);
        }
    }
    var proposedHeight = (targetHeight * window.innerHeight) / 100;
    var proposedWidth = (targetWidth * window.innerWidth) / 100;
    var topOffset = top - targetHeight / 2;
    var leftOffset = left - targetWidth / 2;
    var styleAssign = 'z-index: -1; object-fit: fill; position: absolute; top: ' + topOffset + '%; left: ' + leftOffset + '%;';
    element.style = styleAssign;
    element.style.height = proposedHeight + 'px';
    element.style.width = proposedWidth + 'px';
    if (specialInfo == 'Weapon') {
        element.style.zIndex = 5;
        element.style.transform = 'rotate(' + extraInfo + 'deg)';
    }
    else if (specialInfo == 'Player') {
        element.style.zIndex = 4;
    }
    else if (specialInfo == 'Item') {
        element.style.zIndex = 5;
    }
});

socket.on('removeElementFromGameView', (id) => {
    var toRemove = document.getElementById(id);
    if (toRemove != undefined) {
        document.getElementById('elements').removeChild(toRemove);
    }
    console.log('removed', id);
});

socket.on('updateLightning', (x, y, radius, targetHeight, targetWidth) => {
    targetHeight *= 100;
    targetWidth *= 100;
    var imageHeight = (targetHeight * window.innerHeight) / 100;
    var imageWidth = (targetWidth * window.innerWidth) / 100;
    x -= targetHeight / 2;
    y -= targetWidth / 2;
    document.getElementById('lightning').style.top = x + '%';
    document.getElementById('lightning').style.left = y + '%';
    document.getElementById('lightning').style.height = imageHeight + 'px';
    document.getElementById('lightning').style.width = imageWidth + 'px';
});

socket.on('updateBoostBar', (percentage) => {
    percentage = Math.min(100, percentage * 1.3);
    document.getElementById('boostLevel').style.width = percentage + '%';
    document.getElementById('boostText').innerHTML = 'Boost (<i>Shift</i>)';
    if (percentage >= 90) {
        document.getElementById('boostLevel').style.backgroundColor = 'red';
    } else if (percentage >= 70) {
        document.getElementById('boostLevel').style.backgroundColor = 'orange';
    } else if (percentage >= 30) {
        document.getElementById('boostLevel').style.backgroundColor = 'yellow';
    } else {
        document.getElementById('boostLevel').style.backgroundColor = 'green';
    }
});

const shotFiredRefresh = 1;
socket.on('shotFired', (x1, y1, x2, y2) => {
    var shotCanvas = document.createElement('canvas');
    shotCanvas.style.zIndex = 10;
    shotCanvas.id = x1 + y1 + x2 + y2 + Math.random(); // a good hash
    document.getElementById('shots').appendChild(shotCanvas);
    x1 = percentageHeightToPixel(x1);
    y1 = percentageWidthToPixel(y1);
    x2 = percentageHeightToPixel(x2);
    y2 = percentageWidthToPixel(y2);
    var alpha = 0;
    var delta = 0.08;
    var line = shotCanvas.getContext('2d');
    var interval = setInterval(display, shotFiredRefresh);

    function display() {
        shotCanvas.height = window.innerHeight;
        shotCanvas.width = window.innerWidth;
        alpha += delta * shotFiredRefresh;
        if (alpha >= 1) {
            delta *= -1;
            alpha = 1;
        } else if (alpha <= 0) {
            clearInterval(interval);
            document.getElementById('shots').removeChild(shotCanvas);
            return;
        }
        line.clearRect(x1, y1, x2, y2);
        line.beginPath();
        line.moveTo(y1, x1);
        line.lineTo(y2, x2);
        line.lineWidth = 3.5;
        line.globalAlpha = alpha;
        line.strokeStyle = '#ff0000';
        line.stroke();
    }
});

socket.on('updateLife', (newLife) => {
    document.getElementById('lifeLevel').style.width = newLife + '%';
    if (newLife >= 99) {
        document.getElementById('lifeText').innerHTML = 'Life: Excellent';
        document.getElementById('lifeLevel').style.backgroundColor = '#7a7a7a';
        redRGBLifeBar.activated = false;
    } else if (newLife >= 70) {
        document.getElementById('lifeText').innerHTML = 'Life: High Tier';
        document.getElementById('lifeLevel').style.backgroundColor = '#8f787a';
        redRGBLifeBar.activated = false;
    } else if (newLife >= 20) {
        document.getElementById('lifeText').innerHTML = 'Life: Low Tier';
        document.getElementById('lifeLevel').style.backgroundColor = '#8c3a3f';
        redRGBLifeBar.activated = false;
    } else {
        document.getElementById('lifeText').innerHTML = 'Life: Dangerously low';
        if (!redRGBLifeBar.activated) {
            redRGBLifeBar.activated = true;
        }
    }
});

socket.on('gameFinishedForPlayer', (win) => {
    socket.emit('game_finished_for_player');
    if (win) document.getElementById('endAnnouncement').innerHTML = 'Congrats for your win! (and your tactical skills)';
    else document.getElementById('endAnnouncement').innerHTML = 'Get to the lobby straight away to play more!';
    setState(2);
});

socket.on('updatePlayerCount', (playerCount) => {
    document.getElementById('playerCount').innerHTML = playerCount;
});

socket.on('updateDestroyedCount', (destroyedCount) => {
    document.getElementById('destroyedCount').innerHTML = destroyedCount;
});

socket.on('launchHome', (matches) => {
    document.getElementById('selectMatch').innerHTML = '';
    matches.forEach((i) => {
        var newElement = document.createElement('option');
        newElement.className = 'selectMatchOption';
        newElement.value = i.id;
        if (i.playerCount != undefined) newElement.innerHTML = i.codeName + ' (' + i.playerCount + ' players)';
        else newElement.innerHTML = i.codeName;
        document.getElementById('selectMatch').appendChild(newElement);
    });
    setState(0);
});

socket.on('sendMouseDegree', () => {
    var mouseOffset = getMouseRelativePosition();
    var xOffset = mouseOffset.x;
    var yOffset = mouseOffset.y;
    var angle = Math.atan(xOffset / yOffset) * (180 / Math.PI);
    if (yOffset < 0) {
        angle = -angle;
    }
    else {
        angle = 180 - angle;
    }
    socket.emit('mouse_degree', angle);
})

socket.on('sendUserScreenRatio', () => {
    socket.emit('user_screen_ratio', window.innerWidth / window.innerHeight);
});

socket.on('updateWeaponInfo', (weapon) => {
    document.getElementById('weaponName').innerHTML = weapon;
    document.getElementById('weaponImage').setAttribute('src', './images/weapons/' + weapon + '_icon.svg');
});

// id is the id of the player that has to be updated
// life is the level of life out of 100 of this player
socket.on('updatePlayerLifeBar', (id, life) => {
    const rect = document.getElementById(id).getBoundingClientRect();
    const barID = getBarLifeID(id); // matching id for every life bar
    if (document.getElementById(barID) == undefined) {
        let el = document.createElement('div');
        el.id = barID;
        el.classList = 'playerLifeBar';
        document.getElementById('playerLifeBars').appendChild(el);
        let innerEl = document.createElement('div'); // this must be a div as this is used in game.css
        innerEl.id = barID+'2'; // concatenate a 2 to this id to signify the inner bar
        document.getElementById(barID).appendChild(innerEl);
    }
    var midX = rect.left+rect.width/2.0;
    var posY = rect.bottom;
    posY += 10; // px
    document.getElementById(barID).style.top = String(posY)+'px';
    document.getElementById(barID).style.left = String(midX)+'px';
    document.getElementById(barID).style.width = String(2.5*rect.width)+'px';
    document.getElementById(barID+'2').style.width = String(life)+'%';
});

// updatePlayerLifeBar must be called first imperatively !!!
socket.on('updatePlayerName', (id, name) => {
    var barID = getBarLifeID(id);
    if (document.getElementById(barID+'3') == undefined) {
        let innerText = document.createElement('p'); // this must be a p as this is used in game.css
        innerText.id = barID+'3'; // adding '3' is the convention of the name inside the panel
        document.getElementById(barID).appendChild(innerText);
    }
    document.getElementById(barID+'3').innerHTML = name;
});

const imageEventShowTime = 300; // ms
socket.on('showImageEvent', (top, left, targetHeight, targetWidth, source, id) => {
    function removeImageEvent() {
        document.getElementById('imageEvents').removeChild(newElement);
    }
    var newElement = document.createElement('img');
    newElement.setAttribute('src', 'images/events/' + source);
    newElement.id = id;
    newElement.className = 'imageEvent';
    document.getElementById('elements').appendChild(newElement);
    var proposedHeight = (targetHeight * window.innerHeight) / 100;
    var proposedWidth = (targetWidth * window.innerWidth) / 100;
    newElement.setAttribute('height', proposedHeight);
    newElement.setAttribute('width', proposedWidth);
    var topOffset = top - targetHeight / 2;
    var leftOffset = left - targetWidth / 2;
    var styleAssign = /*'background-size: cover; box-shadow: 0px 10px 20px -5px rgba(0,0,0,.8); background: linear-gradient(#004092, #020202, transparent), url(\'images/'+source+'\') no-repeat center;*/ ' z-index: -1; object-fit: fill; position: absolute; top: ' + topOffset + '%; left: ' + leftOffset + '%;';
    newElement.style = styleAssign;
    document.getElementById('imageEvents').appendChild(newElement);
    setTimeout(removeImageEvent, imageEventShowTime);
});


// here the map global map to be displayed in the corner is created

socket.on('startAddingElementsToMap', () => {
    document.getElementById('map').innerHTML = '<svg version="1.1" id="mapInside" xmlns="http://www.w3.org/2000/svg" height="100%" width="100%" fill="green"></svg>';
    document.getElementById('mapInside').innerHTML = '<rect width="100%" height="100%" fill="green" />'
    document.getElementById('mapInside').innerHTML += '<circle id="mapPlayerPosition" r="1%" fill="black" />';
});

// x is a percentage, y is a percentage and r is a percentage
socket.on('addElementToMap', (x, y, r, color) => {
    var circle = '<circle cx='+x+'% cy='+y+'% r='+r+'% fill="'+color+'" fill-opacity="1" />';
    document.getElementById('mapInside').innerHTML += circle;
});

socket.on('allElementsAddedToMap', () => {
    console.log('map generated successfully');
});

// x and y given in percentage
socket.on('updatePlayerPosition', (x, y) => {
    document.getElementById('mapPlayerPosition').setAttribute('cx', x+'%');
    document.getElementById('mapPlayerPosition').setAttribute('cy', y+'%');
})


const addChatCommentRefresh = 10; // ms
socket.on('addChatComment', (author, content) => {
    function remove() {
        var opacity = 1;

        function realRemove() {
            opacity -= 0.001 * addChatCommentRefresh;
            newElement.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(interval);
                document.getElementById('chat').removeChild(newElement);
            }
        }
        var interval = setInterval(realRemove, addChatCommentRefresh);
    }
    var newElement = document.createElement('div');
    newElement.style = 'margin-top: 5px; font-size: 15px;';
    var boldPart = document.createElement('b');
    boldPart.innerHTML = author + ': ';
    newElement.appendChild(boldPart);
    var normalPart = document.createElement('span');
    normalPart.innerHTML = content;
    newElement.appendChild(normalPart);
    document.getElementById('chat').insertBefore(newElement, document.getElementById('chat').firstChild);
    setTimeout(remove, 10000);
    while (document.getElementById('chat').clientHeight >= 300) {
        document.getElementById('chat').removeChild(document.getElementById('chat').lastChild);
    }
});

var importantCommentLastContent;
var importantCommentLastSetAt = 0;
const importantCommentRefresh = 10; // ms
socket.on('addImportantComment', (content) => {
    function remove() {
        function realRemove() {
            document.getElementById('importantComment').style.opacity -= 0.01 * importantCommentRefresh;
            if (document.getElementById('importantComment').style.opacity <= 0) {
                document.getElementById('importantComment').innerHTML = '';
                clearInterval(interval);
            }
        }
        var interval = setInterval(realRemove, importantCommentRefresh);
    }
    if (Date.now() - importantCommentLastSetAt <= 2000 || content == importantCommentLastContent) return;
    importantCommentLastSetAt = Date.now();
    importantCommentLastContent = content;
    beep();
    document.getElementById('importantComment').innerHTML = content;
    document.getElementById('importantComment').style.opacity = 1;
    setTimeout(remove, 10000);
});

socket.on('voiceMessage', (data) => {
    var audio = new Audio(data);
    audio.volume = audioVolume / 100;
    audio.play();
});

function init() {
    setInterval(undercoverUpdate, 20);
    onkeydown = onkeyup = keyReact;
    setState(0);
    document.getElementById('game').addEventListener('click', userClicked);
    document.getElementById('startGameButton').onclick = function () { startGameButtonPressed() };
    document.getElementById('chatInput').addEventListener('keyup', function (e) {
        if (Date.now() - lastInput > 3000 && state == 1 && e.keyCode == 13) {
            lastInput = Date.now();
            socket.emit('chat_message_sent', $('#chatInput').val());
            $('#chatInput').val('');
        }
    });
    document.getElementById('microphoneActivation').addEventListener('click', () => {
        beep();
        callStatus.microphoneActivated = !callStatus.microphoneActivated;
        if (callStatus.microphoneActivated) document.getElementById('microphoneActivationImage').src = 'images/icons/microphone_on.svg';
        else document.getElementById('microphoneActivationImage').src = 'images/icons/microphone_off.svg';
        if (callStatus.microphoneActivated) record();
    });
    document.getElementById('speakerActivation').addEventListener('click', () => {
        beep();
        callStatus.speakerActivated = !callStatus.speakerActivated;
        if (callStatus.speakerActivated) document.getElementById('speakerActivationImage').src = 'images/icons/speaker_on.svg';
        else document.getElementById('speakerActivationImage').src = 'images/icons/speaker_off.svg';
        if (!callStatus.speakerActivated && callStatus.microphoneActivated) {
            callStatus.microphoneActivated = false;
            document.getElementById('microphoneActivationImage').src = 'images/icons/microphone_off.svg';
        }
    });
    document.getElementById('backToHomeButton').addEventListener('click', () => {
        setState(0);
    });
    initChangelog();
    document.getElementById('lobbyDarkOverlay').style.visibility = 'hidden';
    document.getElementById('lobbyDarkOverlay').addEventListener('click', () => {
        document.getElementById('changelog').style.visibility = 'hidden';
        document.getElementById('bugBounty').style.visibility = 'hidden';
        document.getElementById('ourTeam').style.visibility = 'hidden';
        document.getElementById('privacyPolicy').style.visibility = 'hidden';
        document.getElementById('lobbyDarkOverlay').style.visibility = 'hidden';
    });
    document.getElementById('changelogButton').addEventListener('click', () => {
        document.getElementById('changelog').style.visibility = 'visible';
        document.getElementById('bugBounty').style.visibility = 'hidden';
        document.getElementById('ourTeam').style.visibility = 'hidden';
        document.getElementById('privacyPolicy').style.visibility = 'hidden';
        document.getElementById('lobbyDarkOverlay').style.visibility = 'visible';
    });
    document.getElementById('bugBountyButton').addEventListener('click', () => {
        document.getElementById('changelog').style.visibility = 'hidden';
        document.getElementById('bugBounty').style.visibility = 'visible';
        document.getElementById('ourTeam').style.visibility = 'hidden';
        document.getElementById('privacyPolicy').style.visibility = 'hidden';
        document.getElementById('lobbyDarkOverlay').style.visibility = 'visible';
    });
    document.getElementById('ourTeamButton').addEventListener('click', () => {
        document.getElementById('changelog').style.visibility = 'hidden';
        document.getElementById('bugBounty').style.visibility = 'hidden';
        document.getElementById('ourTeam').style.visibility = 'visible';
        document.getElementById('privacyPolicy').style.visibility = 'hidden';
        document.getElementById('lobbyDarkOverlay').style.visibility = 'visible';
    });
    document.getElementById('privacyPolicyButton').addEventListener('click', () => {
        document.getElementById('changelog').style.visibility = 'hidden';
        document.getElementById('bugBounty').style.visibility = 'hidden';
        document.getElementById('ourTeam').style.visibility = 'hidden';
        document.getElementById('privacyPolicy').style.visibility = 'visible';
        document.getElementById('lobbyDarkOverlay').style.visibility = 'visible';
    });
    document.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });
    setInterval(setLifeBarColor, 10);
    setInterval(keyStatusServerCommunication, 30);
    // eslint-disable-next-line no-unused-vars
    $('body').on('contextmenu', function (e) {
        return false;
    });
    document.getElementById('settingsButton').addEventListener('click', () => {
        document.getElementById('settings').style.visibility = 'visible';
        document.getElementById('staticElements').style.pointerEvents = 'none';
    });
    document.addEventListener('click', function(event) {
        if ((!document.getElementById('settings').contains(event.target) && !document.getElementById('settingsButton').contains(event.target)) || document.getElementById('settingsHideButton').contains(event.target)) {
            document.getElementById('settings').style.visibility = 'hidden';
            document.getElementById('staticElements').style.pointerEvents = 'auto';
        }
    });
    document.getElementById('settingsAudioVolumeSelection').value = audioVolume;
    setInterval(settingsCheck, 500);
    setInterval(pickupItemCheck, 50);
}

setTimeout(init, 2);