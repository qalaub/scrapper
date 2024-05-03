const fs = require('fs');
const { getEquals, surbetC } = require('../casas/utils');

function similarText(a, b) {
    var maxLength = Math.max(a.length, b.length);
    var minLength = Math.min(a.length, b.length);
    var match = 0;
    for (var i = 0; i < minLength; i++) {
        if (a[i] === b[i]) {
            match++;
        }
    }
    return match / maxLength;
}

function encontrarSimilitudes(apuesta1, apuesta2) {
    // Extraer los tipos de apuestas
    var tipoApuesta1 = apuesta1.type;
    var tipoApuesta2 = apuesta2.type;

    // Calcular la similitud entre los tipos de apuestas
    var similitud = similarText(tipoApuesta1, tipoApuesta2);

    return similitud;
}

function leerJSON(name) {
    return new Promise((resolve, reject) => {
        // Leer el archivo JSON
        fs.readFile('./data/' + name + '.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error al leer el archivo:', err);
                reject('Error al leer el archivo:');
                return;
            }
            try {
                const apuestas = JSON.parse(data);
                resolve(apuestas);
            } catch (error) {
                console.error('Error al analizar el archivo JSON:', error);
                reject('Error al analizar el archivo JSON:');
            }
        });
    });
}

function sonSimilares(titulo1, titulo2) {
    // Convertir los títulos en arrays de palabras individuales
    const palabrasTitulo1 = titulo1.split(/\s+|v|-/);
    const palabrasTitulo2 = titulo2.split(/\s+|v|-/);

    // Verificar si todas las palabras de titulo1 están incluidas en titulo2
    return palabrasTitulo1.some(palabra => palabrasTitulo2.includes(palabra));
}

function getTotalGoles(bets) {
    const golesCon05 = bets.filter(apuesta => apuesta.name.includes('0.5'));
    const golesCon15 = bets.filter(apuesta => apuesta.name.includes('1.5'));
    const golesCon25 = bets.filter(apuesta => apuesta.name.includes('2.5'));
    const golesCon35 = bets.filter(apuesta => apuesta.name.includes('3.5'));
    const golesCon45 = bets.filter(apuesta => apuesta.name.includes('4.5'));
    return [
        golesCon05,
        golesCon15,
        golesCon25,
        golesCon35,
        golesCon45
    ];
}

function compareTotalGoles(gol1, gol2) {
    console.log(surbetC(gol1[0].quote, gol2[1].quote, 10000));
    console.log(surbetC(gol1[1].quote, gol2[0].quote, 10000));
}

async function chargeBets() {
    const gan = 10000;
    let betplay = await leerJSON('betplay');
    const wplay = await leerJSON('wplay');
    betplay = betplay.find(item => sonSimilares(item.title, wplay.title));
    const orderBetplay = betplay.bets.sort((a, b) => a.type.localeCompare(b.type));
    const orderWplay = wplay.bets.sort((a, b) => a.type.localeCompare(b.type));
    for (let i = 0; i < orderBetplay.length; i++) {
        let apuesta1 = orderBetplay[i];
        const type = getEquals(apuesta1.type);
        if (type) {
            let tempWplay = orderWplay.find(item => item.type == type);
            const bets1 = apuesta1.bets;
            const bets2 = tempWplay.bets;
            if (bets1[0].name == "Sí") {
                console.log(surbetC(bets1[0].quote, bets2[1].quote, gan));
                console.log(surbetC(bets1[1].quote, bets2[0].quote, gan));
                continue;
            }
            if (type == "Total Goles Más/Menos de") {
                const total1 = getTotalGoles(bets1);
                const total2 = getTotalGoles(bets2);
                compareTotalGoles(total1[0], total2[0]);
                compareTotalGoles(total1[1], total2[1]);
                compareTotalGoles(total1[2], total2[2]);
                compareTotalGoles(total1[3], total2[3]);
                compareTotalGoles(total1[4], total2[4]);
            }
        }

        /*
        let similitud = encontrarSimilitudes(apuesta1, apuesta2);
        similitud = similitud.toFixed(2);
        if (similitud > 0.3) {
            console.log(apuesta1.bets);
            console.log(apuesta2.bets);
            console.log("Similitud entre '" + apuesta1.type + "' y '" + apuesta2.type + "': " + similitud);
        }
        */

    }
}

module.exports = {
    chargeBets,
    leerJSON,
    similarText
}

