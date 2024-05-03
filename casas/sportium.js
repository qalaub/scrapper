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
        const search = await page.getByPlaceholder('Buscar').first();
        await search.click();
        await search.fill(query);
        await page.waitForTimeout(3000);
        const noResult = await page.getByText('No se ha encontrado ningún resultado para', { timeout: 10000 }).isVisible();
        return !noResult;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('//div[@id = "resultsContainer"]//a');
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let text = await opcion.locator('.ta-FlexPane').first();
        text = await text.locator('div').last().textContent();
        match = quitarTildes(match.replace(' - ', ' '));
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
        console.log('SPORTIUM: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const cleanText = text => text.replace(/\s+/g, ' ').trim();

async function getResultsSportium(match, betTypes = ['Resultado Tiempo Completo'], n) {
    const { page, context } = await initBrowser('https://sports.sportium.com.co/', 'sportium' + n);
    if (page) {
        try {
            page.setDefaultTimeout(timeouts.search);
            await page.waitForTimeout(5000);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.waitForTimeout(3000);
            let betRivalo = {
                nombre: 'sportium',
                title: match,
                bets: []
            }
            page.setDefaultTimeout(timeouts.bet);
            await page.locator('(//*[text() = "Más"])[1]').click();
            for (const betType of betTypes) {
                try {
                    if (betType.type == 'Ambos marcan ambas partes') {
                        await page.locator('//div[@class= "ta-FlexPane"]/div/div[contains(text(), "Goles (")]').click();
                        await page.waitForTimeout(500);
                    }
                    if (betType.type == '2ª Mitad - Total de Goles') {
                        await page.locator('//div[@class= "ta-FlexPane"]/div/div[contains(text(), "2ª Mitad (")]').click();
                        await page.waitForTimeout(500);
                    }
                    if (betType.type == '1ª Mitad - Total de Goles') {
                        await page.locator('//div[@class= "ta-FlexPane"]/div/div[contains(text(), "1ª Mitad (")]').click();
                        await page.waitForTimeout(500);
                    }
                    if (betType.type == 'Total de córners') {
                        await page.locator('//div[@class= "ta-FlexPane"]/div/div[contains(text(), "Córners (")]').click();
                        await page.waitForTimeout(500);
                    }
                    if (betType.type == 'Total de tarjetas') {
                        await page.locator('//div[@class= "ta-FlexPane"]/div/div[contains(text(), "Tarjetas (")]').click();
                        await page.waitForTimeout(500);
                    }
                    let type = await page.locator('(//*[text() = "' + betType.type + '"])[1]');
                    page.setDefaultTimeout(1000);
                    await type.waitFor();
                    await type.textContent();
                    page.setDefaultTimeout(timeouts.bet);
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: cleanText(betType.type),
                        bets: []
                    }

                    if (betType.type == 'Handicap de Juegos') {
                        const names = await page.locator('(//*[text() = "Handicap de Juegos"])[1]/parent::*/parent::*/parent::*//*[contains(@class, "ta-participantName")]').all();
                        const bets = await page.locator('(//*[text() = "Handicap de Juegos"])[1]/parent::*/parent::*/parent::*//*[contains(@class, "ta-SelectionButtonView")]').all();
                        for (let i = 0; i < names.length; i++) {
                            betTemp.bets.push({
                                name: await names[i].textContent(),
                                quote: await bets[i].textContent()
                            });
                        }
                    } else {
                        const parent = await page.locator('(//*[text() = "' + betType.type + '"])[1]/parent::*/parent::*/parent::div/div').all();
                        if (parent.length < 2) {
                            page.setDefaultTimeout(1500);
                            await parent[0].scrollIntoViewIfNeeded();
                            await parent[0].click();
                            await page.waitForTimeout(1000);
                            page.setDefaultTimeout(timeouts.bet);
                        }
                        const bets = await page.locator('(//*[text() = "' + betType.type + '"])[1]/parent::*/parent::*/parent::*//*[contains(@class, "ta-SelectionButtonView")]').all();
                        if (bets.length > 1) {
                            for (const bet of bets) {
                                let name = await bet.locator('//div/div').first().textContent();
                                const quote = await bet.locator('//div/div').last().textContent();
                                betTemp.bets.push({
                                    name,
                                    quote
                                });
                            }
                        }
                    }
                    betRivalo.bets.push(betTemp);
                    console.log('//////// SPORTIUM LENGTH', betRivalo.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// SPORTIUM //////////////////')
            console.log('//////////////////// SPORTIUM //////////////////')
            return betRivalo;
        } catch (error) {
            console.log('ERRPR SPORTIUM SPORTIUM SPORTIUM SPORTIUM ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsSportium
}