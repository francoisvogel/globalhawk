var data;

fetch('/data/typewriter.json')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        init(data);
    })
    .catch(function (err) {
        console.log('error: ' + err);
    });

function update() {
    document.getElementById('lobbyTypeWriter').innerHTML = data[Math.floor(Math.random()*1e9)%data.length];
    setTimeout(update, 12000);
}

function init(ldata) {
    data = ldata;
    update();
}