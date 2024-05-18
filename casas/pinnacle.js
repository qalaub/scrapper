const { timeouts } = require("../const/timeouts");
const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    matchnames,
    initBrowser,
    scrollToBottom,
    tienenPalabrasEnComunDinamicoT
} = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let pinnacleSearch = await initRequest(`https://guest.api.arcadia.pinnacle.com/0.1/matchups/search?query=${text}`, 2, {
            'X-Api-Key': 'CmX2KcMrXuFmNg6YFbmTxE0y9CIrOi0R',
        });
        pinnacleSearch = pinnacleSearch?.map(temp => {
            let fragment = temp.league.name.toLowerCase().replace(/\s+-\s+/g, '-');
            let sport = temp.league.sport.name;
            let name = temp.participants[0].name + ' vs ' + temp.participants[1].name;
            name = name.toLowerCase().replace(/\s/g, '-');
            let name2 = temp.participants[0].name + ' vs ' + temp.participants[1].name;
            return {
                name: name2,
                link: `https://www.pinnacle.com/es/${sport}/${fragment}/${name}/${temp.id}/#all`,
            }
        });
        return pinnacleSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            let optPass = [];
            for (const q of res) {
                const p = await tienenPalabrasEnComunDinamico(match, q.name);
                if (p.pass) optPass.push({ opcion: q, similarity: p.similarity });
            }
            const opt = await selectMoreOption(optPass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.opcion.name,
                    etiqueta: 1
                });
                return opt.opcion.link;
            }
        }
    }
}

const permit1 = [
    'Total – Partido',
    'Total (Córneres) – Partido',
    'Total – 1.ª parte',
    'Total Tiros De Esquina',
    'Total – Game',
    'Total – 1.er cuarto',
    'Total – 2.º cuarto',
    'Total – 2nd Quarter',
    'Total – Partido',
    'Cuarto cuarto - total',
    'Total – 1.ª parte',
];

const permit2 = [
    'Principal',
    '2ª mitad',
    '1ª mitad',
    'Tiros esquina',
    'Tarjetas',
    '1er Cuarto',
    '2do Cuarto',
    '3er Cuarto',
    '4to Cuarto',
];

const filterData = (filter, types) => {
    const extractNumber = name => parseFloat(name.match(/(\d+(\.\d+)?)/)[0]);
    return filter.map(f => {
        let bets = [];
        bets = f.Items.map(e => {
            return {
                name: e.Name,
                quote: truncatePrice(e.Price)
            }
        });
        if (permit1.includes(f.Name)) bets.sort((a, b) => {
            const numberA = extractNumber(a.name);
            const numberB = extractNumber(b.name);
            const typeA = a.name.includes('Más') || a.name.includes('Mas');
            const typeB = b.name.includes('Más') || b.name.includes('Mas');

            if (numberA === numberB) {
                // Si los números son iguales, ordenar por tipo
                return typeA === typeB ? 0 : typeA ? -1 : 1;
            }

            // Orden principal por el número
            return numberA - numberB;
        });
        if (f.Name == 'Hándicap 1x2') {
            // Primero, extraer los handicaps únicos y su orden de aparición
            const handicaps = [...new Set(bets.map(bet => bet.name.match(/\(([^)]+)\)/)[1]))];

            // Orden de los equipos basado en su primera aparición
            const teamOrder = [...new Set(bets.map(bet => bet.name.split(' ')[0]))];

            bets.sort((a, b) => {
                const handicapA = a.name.match(/\(([^)]+)\)/)[1];
                const handicapB = b.name.match(/\(([^)]+)\)/)[1];
                const teamA = teamOrder.indexOf(a.name.split(' ')[0]);
                const teamB = teamOrder.indexOf(b.name.split(' ')[0]);

                // Primero ordenar por handicap
                if (handicapA !== handicapB) {
                    return handicaps.indexOf(handicapA) - handicaps.indexOf(handicapB);
                }
                // Si el handicap es el mismo, ordenar por el orden de aparición del equipo
                return teamA - teamB;
            });
        }
        return {
            id: Object.keys(obtenerObjetoPorTipo(types, f.Name))[0],
            type: f.Name,
            bets
        }
    });
}



async function getPinnacleApi(name, types, n, team1) {
    try {
        let url = 'https://www.pinnacle.com/es/soccer/';
        const link = await buscarApi(name);
        console.log(link);
        if (link) {
            const { page } = await initBrowser(link, 'pinnecle' + n, 3000);
            let bets = [];
            await scrollToBottom(page);
            page.setDefaultTimeout(timeouts.bet);
            url = await page.url();
            for (const type of types) {
                try {
                    let title = await page.locator('//span[text() = "' + type.type + '"]');
                    const parent = await page.locator('//span[text() = "' + type.type + '"]/parent::*/parent::*');
                    const collapse = await parent.getAttribute('data-collapsed');
                    if (collapse) await parent.click();
                    await page.waitForTimeout(500);
                    let betTemp = [];
                    if (permit1.includes(type.type)) {
                        const more = await parent.getByText('Más información');
                        if (await more.isVisible({ timeout: 1000 })) {
                            await more.click();
                            await page.waitForTimeout(500);
                        }
                    }
                    const btns = await parent.locator('//button[@title]').all();
                    for (const btn of btns) {
                        let name = await btn.locator('//span[contains(@class, "style_label__")]').textContent();
                        let quote = await btn.locator('//span[contains(@class, "style_price__")]').textContent();
                        betTemp.push({
                            name,
                            quote: quote
                        });
                    }
                    if (type.type == 'Lineas del Juego') {
                        console.log('////////////////////////////////////////')
                        if (!tienenPalabrasEnComunDinamicoT(betTemp.bets[0].name, team1)) {
                            let temp = betTemp.bets[0];
                            betTemp.bets[0] = betTemp.bets[1];
                            betTemp.bets[1] = temp;
                        }
                        console.log('////////////////////////////////////////')
                    }
                    bets.push({
                        id: Object.keys(type)[0],
                        type: type.type,
                        bets: betTemp,
                    })
                    console.log('//////// PINNACLE LENGTH ', bets.length)
                    // console.log(betTemp)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// PINNACLE //////////////////')

            console.log('//////////////////// PINNACLE //////////////////')
            return {
                nombre: 'pinnacle',
                title: name,
                bets,
                url
            }
        }
    } catch (error) {
        console.log(error);
    }
}

function truncatePrice(price) {
    return Math.floor(price * 100) / 100;
}

module.exports = {
    getPinnacleApi
}