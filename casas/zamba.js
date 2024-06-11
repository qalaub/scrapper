const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const { orderBetMoreLess } = require("./betplay");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    scrollToBottom
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const iframe = await page.frameLocator("#sportradarIframe");
        const search = await iframe.locator('#searchText').first();
        await search.click();
        await search.fill(query.length > 3 ? query : query + " 0");
        await page.waitForTimeout(1500);
        const noResult = await iframe.getByText('No hay ningún evento seleccionado.', { timeout: 5000 }).isVisible();
        const noResult1 = await iframe.locator('//span[text() = "Más Eventos"]', { timeout: 5000 }).first().isVisible();
        return !noResult && !noResult1;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const iframe = await page.frameLocator("#sportradarIframe");
    const posibleOpcion = iframe.locator('//div[contains(@data-test-id, "teams-container")]');
    await posibleOpcion.first().waitFor({ state: 'visible' });
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let text = await opcion.locator('p').first().textContent();
        let visit = await opcion.locator('p').last().textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        text = (text + " " + visit).trim();
        text = quitarTildes(text.replace(' - ', ' '));
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
        console.log('ZAMBA: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'Total',
    'Total (incl. prórroga)',
    'Total tarjetas',
    'Total córneres',
    '1º Mitad - total',
    '1.º cuarto - total',
    '1º Mitad - total',
    '3.º cuarto - total',
    '4.º cuarto - total',
    '2º Mitad - total',
    '2.º cuarto - total',
    'Total juegos',
    '1.º set - total juegos',
    '2.º set - total juegos',
    'Total puntos',
    '1.º set - total puntos',
    '2.º set - total puntos',
    '3.º set - total puntos',
    'Total (incl. extra innings)',
];

const permit2 = [
    '1x2',
    'Ganador',
    'Ganador (incl. extra innings)'
];

async function getResultsZamba(match, betTypes = ['Resultado Tiempo Completo'], n) {
    let url = 'https://www.zamba.co/deportes';
    const { page, context } = await initBrowser('https://www.zamba.co/deportes', 'zamba' + n);
    if (page) {
        try {
            page.setDefaultTimeout(timeouts.search);

            const iframe = await page.frameLocator("#sportradarIframe");
            const goBack = await iframe.locator('//*[@color = "dark"]');
            if (await goBack.isVisible()) await goBack.click();

            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.waitForTimeout(3000);
            url = await page.url();
            let betZamba = {
                nombre: 'zamba',
                title: match,
                bets: [],
                url
            }
            await iframe.locator('//button[contains( @data-test-id, "markets-filter-tab-All")]').click();
            await page.waitForTimeout(2000);
            page.setDefaultTimeout(timeouts.bet);
            await scrollToBottom(page);
            for (const betType of betTypes) {
                try {
                    let names, bets;
                    const moreless = permit1.includes(betType.type);
                    if (moreless) {
                        names = await iframe.locator('//h3[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*/parent::*//p[contains(@class, "styled__SelectionName")]').all();
                        bets = await iframe.locator('//h3[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*/parent::*//p[contains(@class, "styled__SelectionPriceValue")]').all();
                    } else if (permit2.includes(betType.type)) {
                        names = await iframe.locator('//h3[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*//div/p[contains(@class, "styles__MarketName")]').all();
                        bets = await iframe.locator('//h3[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*//div/p[contains(@class, "styled__SelectionPriceValue")]').all();
                    } else {
                        names = await iframe.locator('//h3[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*//div/p[contains(@class, "styled__SelectionName-sc")]').all();
                        bets = await iframe.locator('//h3[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*//div/p[contains(@class, "styled__SelectionPriceValue")]').all();
                    }

                    let type = await iframe.locator('//h3[text() = "' + betType.type + '"]').first().textContent();

                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type,
                        bets: []
                    }

                    if (bets.length > 1 && names.length > 1) {
                        for (let i = 0; i < bets.length; i++) {
                            const name = await names[i].textContent();
                            const quote = await bets[i].textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });

                        }
                    }
                    if (moreless) betTemp.bets = orderBetMoreLess(betTemp.bets);
                    // console.log(betTemp.bets);
                    betZamba.bets.push(betTemp);
                    console.log('//////// ZAMBA LENGTH ', betZamba.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }

            }
            console.log('//////////////////// ZAMBA //////////////////')
            console.log('//////////////////// ZAMBA //////////////////')
            return betZamba;
        } catch (error) {
            console.log('ERRPR ZAMBA ZAMBA ZAMBA ZAMBA ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsZamba
}