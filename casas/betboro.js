const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.locator('#root > div.layout-content-holder-bc > div.filter-sports-bc > div.sport-search-bc.active > input').first();
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
];

async function getResultsBetboro(match, betTypes = ['Resultado Tiempo Completo'], n) {
    const { page, context } = await initBrowser('https://m.betboro.com/es/sports/pre-match/event-view/Soccer', 'betboro' + n);
    if (page) {
        try {
            await page.locator('#root > div.layout-content-holder-bc > div.filter-sports-bc > div.sport-search-bc > div').click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            let betBoro = {
                nombre: 'betboro',
                title: match,
                bets: []
            }
            await page.locator('.ss-icon-holder-bc').click();
            const input = await page.locator('.ss-input-bc');
            for (const betType of betTypes) {
                try {
                    let names, bets;
                    page.setDefaultTimeout(1000);
                    await input.fill(betType.type);
                    await page.waitForTimeout(1000);
                    page.setDefaultTimeout(timeouts.bet);
                    if (permit1.includes(betType.type)) {
                        bets = await page.locator('//p[text()= "' + betType.type + '"]/parent::*/parent::*/parent::*//div[contains(@class, "market-bc")]').all();
                        bets = bets.slice(2);
                    } else {
                        bets = await page.locator('//p[text()= "' + betType.type + '"]/parent::*/parent::*/parent::*//div[contains(@class, "market-bc")]').all();
                    }

                    let type = await page.locator('//p[text()= "' + betType.type + '"]').first().textContent();

                    let betTemp = {
                        type,
                        bets: []
                    }

                    if (bets.length > 1) {
                        for (const bet of bets) {
                            const name = await bet.locator('.market-name-bc').textContent();
                            const quote = await bet.locator('.market-odd-bc').textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
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
    getResultsBetboro
}