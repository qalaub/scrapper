const { timeouts } = require("../const/timeouts");
const { excludes, buscar, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { tienenPalabrasEnComunDinamico, quitarTildes, initBrowser, matchnames, scrollToBottom } = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let wonderBetSearch = await initRequest('https://sports-core.betalfa.co/rest/FEWHome/SearchEventsByName?Culture=es&searchTerm=' + text);
        wonderBetSearch = wonderBetSearch.Events.map(temp => {
            return {
                name: temp.hn + ' ' + temp.an,
                link: temp.mid,
            }
        });
        return wonderBetSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            const pass = res.filter(q => tienenPalabrasEnComunDinamico(match, q.name, 75));
            if (pass?.length > 0) return pass[0].link;
        }
    }
}

async function getWonderBet(name, types) {
    try {
        const link = await buscarApi(name);
        const res = await initRequest(`https://sports-core.betalfa.co/rest/FEWMatches/MatchOdds?MatchID=${link}&Culture=es`);
        let bets = [];
        let filter = res.t.map(f => f.o);
        for (const type of types) {
            let filterTemp = filter[0].filter(f => f.n == type);
            bets.push({
                type: filterTemp[0].n,
                bets: filterTemp[0].m.map(e => {
                    return {
                        name: e.n + ' ' + e.sbv || '',
                        quote: e.o
                    }
                })
            })
        }
        // console.log(bets[0].bets)
        // console.log(bets[1].bets)

        return {
            nombre: 'wonderbet',
            title: name,
            bets
        }
    } catch (error) {
        console.log(error)
    }
}

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar').first();
        await search.waitFor();
        await search.fill(query);
        await page.waitForTimeout(1500);
        const result = await page.locator('.bto-sb-search-time').first().isVisible();
        return result;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('.bto-sb-search-time');
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        const title = await opcion.textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(title.trim());
        // console.log(match, text)
        const p = await tienenPalabrasEnComunDinamico(match, text);
        if (p.pass) optPass.push({ opcion, similarity: p.similarity, text });

    }
    const opt = await selectMoreOption(optPass);
    if (opt) {
        matchnames.push({
            text1: match,
            text2: opt.text,
            etiqueta: 1
        });
        console.log('WONDER: ', quitarTildes(match), opt.text.trim());
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const cleanText = text => text.replace(/\s+/g, ' ').trim();

const permit1 = [
    'Total Goles - Más / Menos',
    'Más / Menos',
    '2° Tiempo - Más de/Menos de',
    '1° Tiempo - Más de/Menos de',
    'Total tiros de esquina',
    'Total de tarjetas en el partido',
];

async function getResultsWonder(match, betTypes = ['Resultado Tiempo Completo'], n) {
    const { page, context } = await initBrowser('https://www.wonderbet.co/apuestas/#/', 'wonder' + n);
    if (page) {
        try {
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            let betWonder = {
                nombre: 'wonder',
                title: match,
                bets: []
            }
            await page.getByText('Todos los mercados').click();
            await page.waitForTimeout(1000);
            // Usar la función
            await scrollToBottom(page);
            page.setDefaultTimeout(timeouts.bet);
            for (const betType of betTypes) {
                try {

                    const locatorBet = 'xpath=(//h4[text() = "' + betType.type + '"])[1]';
                    let type = await page.locator(locatorBet).textContent();
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: cleanText(betType.type),
                        bets: []
                    }
                    page.setDefaultTimeout(timeouts.bet);
                    const bets = await page.locator('xpath=(//h4[text() = "' + betType.type + '"])[1]/parent::*/parent::*/div/span/a').all();

                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('i').first().textContent();
                            const quote = await bet.locator('i').last().textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                        if (permit1.includes(betType.type)) {
                            // Función para extraer el número de la cadena en el campo 'name'
                            const extractNumber = name => parseFloat(name.match(/(\d+(\.\d+)?)/)[0]);

                            // Ordenar primero por número y luego agrupar por "Más de" o "Menos de"
                            betTemp.bets.sort((a, b) => {
                                const numberA = extractNumber(a.name);
                                const numberB = extractNumber(b.name);
                                const typeA = a.name.includes('Más');
                                const typeB = b.name.includes('Más');

                                if (numberA === numberB) {
                                    // Si los números son iguales, ordenar por tipo
                                    return typeA === typeB ? 0 : typeA ? -1 : 1;
                                }

                                // Orden principal por el número
                                return numberA - numberB;
                            });
                        }
                    }
                    betWonder.bets.push(betTemp);
                    console.log('//////// WONDER LENGTH', betWonder.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// WONDER //////////////////')
            console.log('//////////////////// WONDER //////////////////')
            //  await page.close();
            return betWonder;
        } catch (error) {
            console.log('ERRPR WONDER WONDER WONDER WPALY ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getWonderBet,
    getResultsWonder
}