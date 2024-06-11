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
        const search = await page.locator('//input[@name= "search"]').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(1500);
        const noResult = await page.getByText('No hay resultados para está búsqueda', { timeout: 5000 }).isVisible();
        return !noResult;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('//li/a[contains(@class, "search-item")]');
    await posibleOpcion.first().waitFor({ state: 'visible' });
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let text = await opcion.locator('//div[2]/div[1]').first().textContent();
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
        console.log('LEON: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'Tiempo reglamentario',
    'Porroga incluida',
    'Cuotas del partido'
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

async function getResultsLeon(match, betTypes = ['Resultado Tiempo Completo'], n, team1) {
    const { page, context } = await initBrowser('https://leon.bet/es-pe/', 'leon' + n);
    if (page) {
        try {
            let url = '';
            await page.locator('//button[@title= "Buscar"]').click();
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            let leon = {
                nombre: 'leon',
                title: match,
                bets: [],
                url
            }
            await page.getByText('Todos los mercados').click();
            page.setDefaultTimeout(1300);
            page.setDefaultTimeout(timeouts.bet);
            for (const betType of betTypes) {
                try {
                    let parent;
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        bets: []
                    }
                    if (permit1.includes(betType.type)) {
                        betTemp.type = betType.type;
                        parent = await page.locator('(//div[contains(@class, "headline-info")])[1]');
                    } else {
                        parent = await page.locator('//span[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*');
                        const container = await parent.locator('//div[contains(@class, "header")]').getAttribute('class');
                        if (container.includes('closed')) {
                            await parent.click();
                            await page.waitForTimeout(700);
                        }
                        const type = await page.locator('//span[text() = "' + betType.type + '"]').first().textContent();
                        betTemp.type = type
                    }

                    const bets = await parent.locator('//button').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('span').first().textContent();
                            if(name.includes('Por encima de')) name = name.replace('Por encima de', 'mas de')
                            if(name.includes('Por debajo de')) name = name.replace('Por debajo de', 'menos de')
                            const quote = await bet.locator('span').last().textContent();
                            betTemp.bets.push({
                                name,
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
                    leon.bets.push(betTemp);
                    console.log('//////// LEON LENGTH ', leon.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }

            }
            console.log('//////////////////// LEON //////////////////')
            console.log('//////////////////// LEON //////////////////')
            return leon;
        } catch (error) {
            console.log('ERRPR LEON LEON LEON LEON ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsLeon
}