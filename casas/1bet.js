const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    tienenPalabrasEnComunDinamicoT,
    categoryActual
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(1500);
        if (categoryActual.current == 'volleyball') {
            await page.getByText('Voleibol (').click();
        }
        if (categoryActual.current == 'baseball') {
            await page.getByText('Béisbol (').click();
        }
        if (categoryActual.current == 'cricket') {
            await page.getByText('Críquet (').click();
        }
        const noResult = await page.getByText('No se han encontrado eventos', { timeout: 5000 }).isVisible();
        return !noResult;
    } catch (error) {
        // console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('.event-participants-info');
    await posibleOpcion.first().waitFor({ state: 'visible' });
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let home = await opcion.locator('.event-participant-name').first().textContent();
        let away = await opcion.locator('.event-participant-name').last().textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = home + ' ' + away;
        text = quitarTildes(text.trim());
        const p = await tienenPalabrasEnComunDinamico(match, text, 75);
        if (p.pass) optPass.push({ opcion, similarity: p.similarity, text });
    }
    const opt = await selectMoreOption(optPass);
    if (opt) {
        matchnames.push({
            text1: match,
            text2: opt.text,
            etiqueta: 1
        });
        console.log('1BET: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'Goles Más/Menos de',
    'Goles Más/Menos de, primera mitad',
    'Total de tarjetas primera mitad',
    'Total de córneres',
    'Total de tarjetas',
    'Total de la 2.ª mitad',
    'Total',
    'Total de la 1.ª mitad',
    'Total del 1.er cuarto',
    'Total del 3.º cuarto',
    'Total del 4.º cuarto',
    'Total del 2.º cuarto',
    'Total del 3.er cuarto',
    'Total de sets del partido',
    'Puntos Más/Menos de',
    'Puntos Más/Menos de, 1.er set',
    'Dobles faltas superior / inferior',
    'Juegos, total del 1.er set',
    'Juegos, total del 2.º set',
    'Encuentro - Total de tie breaks',
    'Total de partidos',
    'Sets totales',
    'Aces superior / inferior',
    'Asaltos totales',
    '1.er inning - Total de carreras',
    'Total de carreras',
    'Más/menos goles (tiempo reglamentario)',
    '1.er periodo - Más/menos goles',
    '2.º periodo - Más/menos goles',
    '3.er periodo - Más/menos goles',
    'Más/Menos de Córneres primera mitad'
];

const permit2 = [
    'Goles Más/Menos de',
    'Goles Más/Menos de, primera mitad',
    'Total de tarjetas primera mitad',
    'Total de córneres',
    'Total de tarjetas'
];

async function getResults1bet(match, betTypes = ['Resultado Tiempo Completo'], n, team1) {
    const { page, context } = await initBrowser('https://1bet.com/es/sports/search', '1bet' + n);
    if (page) {
        try {
            let url = '';
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            let leon = {
                nombre: 'unobet',
                title: match,
                bets: [],
                url
            }
            await page.waitForTimeout(2000);
            page.setDefaultTimeout(timeouts.bet + 200);
            for (const betType of betTypes) {
                try {
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        bets: []
                    }
                    const parent = await page.locator('//div[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*');
                    const container = await parent.locator('.market-head').getAttribute('class');
                    if (container.includes('collapsed ')) {
                        await parent.click();
                        await page.waitForTimeout(700);
                    }
                    const type = await page.locator('//div[text() = "' + betType.type + '"]').first().textContent();
                    betTemp.type = type

                    let bets = await parent.locator(permit1.includes(betType.type) ? '.event-market-line' : '.market-odd').all();
                    if (bets.length >= 1) {
                        let tempName = 'mas ';
                        for (const bet of bets) {
                            let name, quote;
                            if (permit1.includes(betType.type)) {
                                const tempBets = await bet.locator('.market-line-cell').all();
                                let isThird = tempBets.length == 3;
                                if (isThird) {
                                    name = await tempBets[0].locator('.market-line-title_label').textContent();
                                }
                                for (let i = isThird ? 1 : 0; i < tempBets.length; i++) {
                                    if (!isThird) name = await tempBets[i].locator('.market-odd_info-spread').textContent();
                                    quote = await tempBets[i].locator('.market-odd_odd').textContent();
                                    betTemp.bets.push({
                                        name: tempName + name,
                                        quote
                                    });
                                    tempName = tempName == 'mas ' ? 'menos ' : 'mas ';
                                }
                                const parentMore = await page.locator('//div[text() = "Alternativo ' + betType.type + '"]/parent::*/parent::*/parent::*');
                                if (await parentMore.isVisible()) {
                                    const containerMore = await parentMore.locator('.market-head').getAttribute('class');
                                    if (containerMore.includes('collapsed ')) {
                                        await parentMore.click();
                                        await page.waitForTimeout(700);
                                    }
                                    let betsMore = await parentMore.locator('.event-market-line').all();
                                    tempName = 'mas ';
                                    for (const betM of betsMore) {
                                        const tempBets = await betM.locator('.market-line-cell').all();
                                        let isThird = tempBets.length == 3;
                                        if (isThird) {
                                            name = await tempBets[0].locator('.market-line-title_label').textContent();
                                        }
                                        for (let i = isThird ? 1 : 0; i < tempBets.length; i++) {
                                            if (!isThird) name = await tempBets[i].locator('.market-odd_info-spread').textContent();
                                            quote = await tempBets[i].locator('.market-odd_odd').textContent();
                                            betTemp.bets.push({
                                                name: tempName + name,
                                                quote
                                            });
                                            tempName = tempName == 'mas ' ? 'menos ' : 'mas ';
                                        }
                                    }
                                }

                            } else {
                                name = await bet.locator('.market-odd_info-label').first().textContent();
                                quote = await bet.locator('.market-odd_odd ').last().textContent();
                                betTemp.bets.push({
                                    name,
                                    quote
                                });
                            }
                        }
                    }
                    // if (type == ' Hándicap 3 opciones') 
                    console.log(betTemp)
                    leon.bets.push(betTemp);
                    console.log('//////// 1BET LENGTH ', leon.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }

            }
            console.log('//////////////////// 1BET //////////////////')
            console.log('//////////////////// 1BET //////////////////')
            return leon;
        } catch (error) {
            console.log('ERRPR LEON LEON LEON LEON ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResults1bet
}