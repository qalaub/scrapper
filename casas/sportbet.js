const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    tienenPalabrasEnComunDinamicoT
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar').first();
        await search.fill(query.length > 2 ? query : query + "  ");
        await page.waitForTimeout(1500);
        const noResult = await page.getByText('No hay resultados', { timeout: 10000 }).isVisible();
        return !noResult;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('.sport-search-result-item-bc');
    await posibleOpcion.first().waitFor({ state: 'visible' });
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let text = await opcion.locator('p').nth(1).textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        text = quitarTildes(text.replace(' - ', ' '));
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
        console.log('BETBORO: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'Total de goles',
    'Total (incl. prórroga)',
    'Tarjetas Amarillas: Total',
    'Córneres: Total',
    'Total de Goles de la 1ra mitad',
    '2da mitad Total de  goles',
    ' Hándicap 3 opciones',
    '1ra Cuarto Total de puntos',
    '1ra Mitad Total de Puntos',
    '3er Cuarto Total de puntos',
    '2do Mitad Total de Puntos',
    '4to Cuarto Total de puntos',
    '2do Cuarto Total de puntos',
    'Total de puntos',
    'Total de Juegos',
    'Total de Sets',
    '1er Set total de juegos',
    '2er Set total de juegos',
];

const permit2 = [
    'Ganador del Partido',
    '1ra Cuarto Resultado (3 vías)',
    '1ra Cuarto Ganador (2 vías)',
    '2do Cuarto Resultado (3 vías)',
    '2do Cuarto Ganador (2 vías)',
    '1ra Mitad: Resultado (3 vías)',
    '1ra Mitad: Ganador (2 vías)',
    '3er Cuarto Resultado (3 vías)',
    '3er Cuarto Ganador (2 vías)',
    '4to Cuarto Resultado (3 vías)',
    '4to Cuarto Ganador (2 vías)',
    '2do Mitad: Ganador (2 vías)',
];

let url = '';
async function getResultsSportbet(match, betTypes = ['Resultado Tiempo Completo'], n, team1) {
    const { page, context } = await initBrowser('https://sportsbet.io/es/sports', 'sportbet' + n);
    if (page) {
        try {
            await page.getByPlaceholder('Buscar').click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            let betBoro = {
                nombre: 'betboro',
                title: match,
                bets: [],
                url
            }
            await page.locator('.ss-icon-holder-bc').click();
            const input = await page.locator('.ss-input-bc');
            for (const betType of betTypes) {
                try {
                    let names, bets;
                    page.setDefaultTimeout(1300);
                    await input.fill(betType.type);
                    await page.waitForTimeout(1200);
                    page.setDefaultTimeout(timeouts.bet);
                    const totalList = permit1.includes(betType.type);
                    if (totalList) {
                        bets = await page.locator('//p[text()= "' + betType.type + '"]/parent::*/parent::*/parent::*//div[contains(@class, "market-bc")]').all();
                        bets = bets.slice(betType.type == ' Hándicap 3 opciones' ? 3 : 2);
                    } else {
                        bets = await page.locator('//p[text()= "' + betType.type + '"]/parent::*/parent::*/parent::*//div[contains(@class, "market-bc")]').all();
                    }

                    let type = await page.locator('//p[text()= "' + betType.type + '"]').first().textContent();

                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type,
                        bets: []
                    }

                    if (bets.length > 1) {
                        let temp = true;
                        for (const bet of bets) {
                            const name = await bet.locator('span').first().textContent();
                            const quote = await bet.locator('.market-odd-bc').textContent();
                            if (totalList) {
                                names = temp ? 'Mas' : 'Menos';
                                temp = !temp;
                            }
                            betTemp.bets.push({
                                name: (names || '') + name,
                                quote
                            });
                        }
                    }
                    if (permit2.includes(betType.type)) {
                        console.log('////////////////////////////////////////')
                        if (!tienenPalabrasEnComunDinamicoT(betTemp.bets[0].name, team1)) {
                            if (betTemp.bets.length == 2) {
                                let temp = betTemp.bets[0];
                                betTemp.bets[0] = betTemp.bets[1];
                                betTemp.bets[1] = temp;
                            } else if (betTemp.bets.length == 3) {
                                let temp = betTemp.bets[0];
                                betTemp.bets[0] = betTemp.bets[2];
                                betTemp.bets[2] = temp;
                            }
                        }
                        console.log('////////////////////////////////////////')
                    }
                    // if (type == ' Hándicap 3 opciones') console.log(betTemp)
                    // console.log(betTemp)
                    betBoro.bets.push(betTemp);
                    console.log('//////// BETBORO LENGTH ', betBoro.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }

            }
            console.log('//////////////////// BETBORO //////////////////')
            console.log('//////////////////// BETBORO //////////////////')
            return betBoro;
        } catch (error) {
            console.log('ERRPR BETBORO BETBORO BETBORO BETBORO ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsSportbet
}