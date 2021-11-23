require('dotenv').config();
const fs = require('fs');
const path = require('path');

const random = require('../scripts/random.js');

function nameGenerator() {
    const firstSet = fs.readFileSync(path.join(__dirname, '/../../', process.env.DB, 'playerNames', 'first.txt'), 'utf-8').split('\n');
    for (let i = 0; i < firstSet.length; i++) firstSet[i] = firstSet[i].trimEnd();
    const secondSet = fs.readFileSync(path.join(__dirname, '/../../', process.env.DB, 'playerNames', 'second.txt'), 'utf-8').split('\n');
    for (let i = 0; i < secondSet.length; i++) secondSet[i] = secondSet[i].trimEnd();
    var randomNumberGeneratorMersenneTwister = new random.MersenneTwister(Date.now());
    return String(firstSet[randomNumberGeneratorMersenneTwister.genrand_int31()%firstSet.length]+secondSet[randomNumberGeneratorMersenneTwister.genrand_int31()%secondSet.length]);
}

module.exports = nameGenerator;