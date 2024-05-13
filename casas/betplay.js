const { groupByType, groupByTypeBasketball } = require("../logic/constantes");
const { getBetType, calculateTotalGol, groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { getResults1xBet } = require("./1xbet");
const { getResultsBetsson } = require("./betsson");
const {
    createJSON,
    initBrowser,
    evaluateSurebets,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    generarCombinacionesDeCasas3,
    obtenerObjetoPorTipo,
    agruparApuestas,
    categoryActual
} = require("./utils");
const { getResultsWPlay } = require("./wplay");

async function getResults1x2(betTypes = ['Total de goles']) {
    const { page, context } = await initBrowser('https://betplay.com.co/', 'betplay');
    await page.locator('xpath=//button[@class = "d-block text-white menu-button"]').click();
    await page.getByText('Transmisión en vivo').click();
    await page.waitForLoadState("domcontentloaded");
    // await page.getByText('En Vivo Ahora').first().click();
    await page.getByText('Comenzando').click();
    await page.getByText('4 horas', { exact: true }).click();
    await page.waitForTimeout(5000);

    const container = await page.locator('xpath=//div/div[contains(@class, "KambiBC-view-wrapper")]');
    if (container.length > 0) {
        await page.evaluate((element) => {
            console.log(element);
            element.scrollTop = element.scrollHeight;
        }, container[0]);
    } else {
        console.log('Elemento no encontrado');
    }


    await page.waitForLoadState('domcontentloaded');
    const elements = await page.locator('xpath=//a[contains(@href, "#event")]').all();

    // Filtrar los elementos para mantener solo los que tienen enlaces únicos
    const uniqueLinks = new Set();
    const uniqueElements = [];
    for (const element of elements) {
        const href = await element.getAttribute('href');
        if (!uniqueLinks.has(href)) {
            uniqueLinks.add(href);
            uniqueElements.push(element);
        }
    }
    const length = uniqueElements.length;
    console.log(length);
    const names = [];
    for (const element of uniqueElements) {
        names.push(
            await element.locator('.KambiBC-event-participants__name').first().textContent() +
            await element.locator('.KambiBC-event-participants__name').last().textContent()
        );
    }
    context.setDefaultTimeout(8000);
    let betsOrder = [];
    let arrsur = [];
    let cont = 0;
    const inicio = new Date();
    for (const name of names) {
        if (cont % 10 == 0) {
            context.setDefaultTimeout(20000);
            await page.waitForTimeout(10000);
            context.setDefaultTimeout(8000);
        }
        console.log(cont);
        try {
            await page.waitForTimeout(2000);
            await page.waitForLoadState('domcontentloaded');
            await page.getByText(name).scrollIntoViewIfNeeded();
            await page.getByText(name).click();
            await page.waitForTimeout(3000);
            let title = '';
            let titleElement = await page.locator('xpath=//span/label').first();
            if (await titleElement.isVisible()) {
                titleElement = await page.locator('xpath=//span/label').all();
                if (titleElement.length > 1) {
                    title = await page.locator('xpath=//span/label').first().textContent() + ' ' +
                        await page.locator('xpath=//span/label').last().textContent();
                } else title = await page.locator('xpath=//span/label').textContent();
            }
            else {
                const iframe = page.frame('event-info');
                const texts = iframe.locator('xpath=(//article/div)[1]');
                let text1 = await texts.locator('h4').first().textContent();
                let text2 = await texts.locator('h4').last().textContent();
                text1 += ' ' + await texts.locator('p').first().textContent();
                text2 += ' ' + await texts.locator('p').last().textContent();
                title = text1 + ' ' + text2;
            }

            // const bets = await page.locator('xpath=//ul/li[contains(@class,  "KambiBC-bet-offer-subcategory")]').all();

            const lists = await page.locator('//button[text() = "Mostrar la lista"]').all();
            for (let i = 0; i < lists.length; i++)
                await page.getByText('Mostrar la lista').first().click({ timeout: 10000 });
            let tempBet = {
                title,
                bets: []
            };
            for (const betType of betTypes) {
                const type = await page.locator('xpath=//span[text() = "' + betType + '"]').first().textContent();
                const btns = await page.locator('xpath=//span[text() = "' + betType + '"]/parent::*/parent::*/parent::*/following-sibling::*//div[contains(@class, "KambiBC-outcomes-list__column")]').all();
                let betsTemp = [];
                for (const btn of btns) {
                    if (await btn.textContent() == "Ocultar la lista") break;
                    const name = await btn.locator('xpath=//div/div').first({ timeout: 1000 }).textContent();
                    const quote = await btn.locator('xpath=//div/div').last().textContent();
                    betsTemp.push({
                        name,
                        quote
                    });
                }
                tempBet.bets.push({
                    type,
                    bets: betsTemp,
                });
                const types = getBetType(betType);
                const results = await Promise.all([
                    getResultsWPlay(title, [types.wplay]),
                    getResultsBetsson(title, [types.betsson]),
                    getResults1xBet(title, [types["1xbet"]]),
                ]);
                // results[0] corresponderá al resultado de getResultsWPlay
                // results[1] corresponderá al resultado de getResultsYaJuegos
                if (results[0] || results[1] || results[2]) {
                    let quotes = [tempBet.bets[0].bets];
                    for (const result of results) {
                        if (result) {
                            quotes.push(result.bets[0].bets)
                        }
                    }
                    if (betType == 'Total de goles') {
                        let temp = calculateTotalGol(quotes);
                        if (temp != 'No se encontraron surebets.') arrsur.push(temp);
                    }
                    console.log();
                    console.log();
                }
            }


            betsOrder.push(tempBet);
            await page.waitForLoadState('domcontentloaded');
            // await page.getByText('En vivo ahora').first().click();
            await page.getByText('Comenzando').click();
            await page.waitForTimeout(4000);

        } catch (error) {
            await page.waitForLoadState('domcontentloaded');
            await page.getByText('Comenzando').first().click();
            //await page.getByText('En vivo ahora').first().click();
            console.log(error);
        }
        cont++;
    }
    const final = new Date();
    console.log(final - inicio);
    await createJSON('betplay', arrsur);
    await page.close();
    await context.close();
    // process.exit();
}

const buscarQ = async (page, query) => {
    try {
        await page.locator('.KambiBC-header-main__terms').click();
        await page.locator('#KambiBC-term-search-overlay__input').fill(query);
        // await page.waitForLoadState('networkidle'); // Espera para que se carguen los resultados
        const noResult = await page.getByText('No se encontraron resultados para la búsqueda de', { timeout: 10000 }).isVisible();
        return !noResult;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    await page.waitForTimeout(2000);
    await page
        .locator('.KambiBC-term-search-results__list')
        .locator('li').first().click();
    await page.waitForTimeout(1000);
    const posibleOpcion = page.locator('.KambiBC-event-participants');
    let opciones = await posibleOpcion.all();
    for (const opcion of opciones) {
        const local = await opcion.locator('.KambiBC-event-participants__name').first().textContent();
        const away = await opcion.locator('.KambiBC-event-participants__name').last().textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(local + ' ' + away);
        const pass = tienenPalabrasEnComunDinamico(match, text, 75);
        if (pass) {
            console.log('BETPLAY: ', quitarTildes(match), text.trim());
            await opcion.click();
            await page.waitForTimeout(1000);
            return true;
        }
    }
    return false;
};

async function getResultsBetPlay(match, betTypes = ['Total de goles']) {
    let arrsur = [];
    const inicio = new Date();
    const { page, context } = await initBrowser('https://betplay.com.co/', 'betplay');
    await page.locator('xpath=//button[@class = "d-block text-white menu-button"]').click();
    await page.getByText('Transmisión en vivo').click();
    await page.waitForLoadState("domcontentloaded");
    try {
        page.setDefaultTimeout(10000);
        await buscar(page, match, buscarQ, intentarEncontrarOpcion);
        letOrder = [];
        let title = match;
        let titleElement = await page.locator('xpath=//span/label').first();
        if (await titleElement.isVisible()) {
            titleElement = await page.locator('xpath=//span/label').all();
            if (titleElement.length > 1) {
                title = await page.locator('xpath=//span/label').first().textContent() + ' ' +
                    await page.locator('xpath=//span/label').last().textContent();
            } else title = await page.locator('xpath=//span/label').textContent();
        }
        else {
            await page.waitForTimeout(3000);
            const iframe = page.frame('event-info');
            if (iframe) {
                const texts = iframe.locator('xpath=(//article/div)[1]');
                let text1 = await texts.locator('h4').first().textContent();
                let text2 = await texts.locator('h4').last().textContent();
                text1 += ' ' + await texts.locator('p').first().textContent();
                text2 += ' ' + await texts.locator('p').last().textContent();
                title = text1 + ' ' + text2;
            }
        }
        const timeRe = page.locator('//a[contains(text(), "Tiempo reglamentario")]');
        if (await timeRe.isVisible()) timeRe.click();
        const lists = await page.locator('//button[text() = "Mostrar la lista"]').all();
        for (let i = 0; i < lists.length; i++)
            await page.getByText('Mostrar la lista').first().click({ timeout: 10000 });
        let tempBet = {
            title,
            bets: []
        };
        for (const betType of betTypes) {
            const type = await page.locator('xpath=//span[text() = "' + betType + '"]').first().textContent();
            const btns = await page.locator('xpath=//span[text() = "' + betType + '"]/parent::*/parent::*/parent::*/following-sibling::*//div[contains(@class, "KambiBC-outcomes-list__column")]').all();
            let betsTemp = [];
            if (betType == 'Total de goles') {
                const div = await page.locator('.KambiBC-slider-wrapper').first();
                if (await div.isVisible()) {
                    const box = await div.boundingBox();
                    if (box) {
                        const input = div.locator('input');
                        const max = await input.getAttribute('max');
                        const min = await input.getAttribute('min');
                        const totalSteps = Math.floor(max) - Math.ceil(min) + 1; // Total de pasos enteros en el rango
                        let fractions = [];
                        for (let i = 0; i <= totalSteps; i++) {
                            let fraction = (i / totalSteps).toFixed(2); // Escala y ajusta la precisión decimal
                            fraction = parseFloat(fraction);
                            // Ajusta el valor si es exactamente 1
                            if (fraction === 1) {
                                fraction = 0.95;
                            }
                            fractions.push(fraction);
                        }
                        const { x, y, width, height } = box;
                        const centerY = y + height / 2; // Calcula el centro vertical para los clics

                        for (const fraction of fractions) {
                            // Calcula las coordenadas x para cada clic basado en las fracciones del ancho
                            const clickX = x + width * fraction;

                            // Realiza el clic en la posición calculada. Ajusta la posición y si es necesario.
                            await page.mouse.click(clickX, centerY);

                            // Espera un poco entre cada clic si es necesario
                            await page.waitForTimeout(1000); // Espera 500ms
                            for (const btn of btns) {
                                if (!await btn.isDisabled()) {
                                    const name = await btn.locator('xpath=//div/div').first({ timeout: 1000 }).textContent();
                                    const quote = await btn.locator('xpath=//div').last().textContent();
                                    console.log(name, quote);
                                    betsTemp.push({
                                        name,
                                        quote
                                    });
                                }

                            }
                        }

                    }
                } else {
                    const more = await btns[0].locator('//button/div').all();
                    const less = await btns[1].locator('//button/div').all();
                    for (let i = 0; i < more.length; i++) {
                        if (!await more[i].isDisabled()) {
                            let tempMoreName = await more[i].locator('div').first().textContent();
                            let tempMoreQuote = await more[i].locator('div').last().textContent();
                            betsTemp.push({
                                name: tempMoreName,
                                quote: tempMoreQuote
                            });
                        }
                        if (!await less[i].isDisabled()) {
                            let tempLessName = await less[i].locator('div').first().textContent();
                            let tempLessQuote = await less[i].locator('div').last().textContent();
                            betsTemp.push({
                                name: tempLessName,
                                quote: tempLessQuote
                            });
                        }

                    }
                }
            } else {
                for (const btn of btns) {
                    if (await btn.textContent() == "Ocultar la lista") break;
                    const name = await btn.locator('xpath=//div/div').first({ timeout: 1000 }).textContent();
                    const quote = await btn.locator('xpath=//div').last().textContent();
                    //console.log(name, quote);
                    betsTemp.push({
                        name,
                        quote
                    });
                }
            }
            tempBet.bets.push({
                type,
                bets: betsTemp,
            });

            const types = getBetType(betType);
            const results = await Promise.all([
                getResultsWPlay(title, [types.wplay], betTypes.length),
                getResultsBetsson(title, [types.betsson], betTypes.length),
                getResults1xBet(title, [types["1xbet"]], betTypes.length),
            ]);
            // results[0] corresponderá al resultado de getResultsWPlay
            // results[1] corresponderá al resultado de getResultsYaJuegos
            if (results[0] || results[1] || results[2]) {
                let quotes = [{
                    nombre: 'betplay',
                    cuotas: betsTemp
                }];
                for (const result of results) {
                    if (result) {
                        quotes.push({
                            nombre: result.nombre,
                            cuotas: result.bets[0].bets
                        })
                    }
                }
                let surebet;
                if (betType == 'Total de goles') {
                    surebet = calculateTotalGol(quotes);
                } else {
                    const combinations = generarCombinacionesDeCasas3(quotes);
                    surebet = evaluateSurebets(combinations, 1000000)
                }
                arrsur.push({
                    data: {
                        title,
                    },
                    surebet
                });
            }
        }
        const final = new Date();
        console.log(final - inicio);
    } catch (error) {
        console.log(error)
    }
    // await createJSON('betplay', arrsur);
    await page.close();
    return arrsur;
}

async function getResultsBetPlayTemp(match, betTypes = ['Total de goles']) {
    const { page, context } = await initBrowser('https://betplay.com.co/', 'betplay');
    await page.locator('xpath=//button[@class = "d-block text-white menu-button"]').click();
    await page.getByText('Transmisión en vivo').click();
    // await page.waitForLoadState("domcontentloaded");
    try {
        page.setDefaultTimeout(10000);
        await buscar(page, match, buscarQ, intentarEncontrarOpcion);
        letOrder = [];
        let title = match;
        let titleElement = await page.locator('xpath=//span/label').first();
        if (await titleElement.isVisible()) {
            titleElement = await page.locator('xpath=//span/label').all();
            if (titleElement.length > 1) {
                title = await page.locator('xpath=//span/label').first().textContent() + ' ' +
                    await page.locator('xpath=//span/label').last().textContent();
            } else title = await page.locator('xpath=//span/label').textContent();
        }
        else {
            await page.waitForTimeout(3000);
            const iframe = page.frame('event-info');
            if (iframe) {
                const texts = iframe.locator('xpath=(//article/div)[1]');
                let text1 = await texts.locator('h4').first().textContent();
                let text2 = await texts.locator('h4').last().textContent();
                text1 += ' ' + await texts.locator('p').first().textContent();
                text2 += ' ' + await texts.locator('p').last().textContent();
                title = text1 + ' ' + text2;
            }
        }
        const timeRe = page.locator('//a[contains(text(), "Tiempo reglamentario")]');
        if (await timeRe.isVisible()) await timeRe.click();
        const lists = await page.locator('//button[text() = "Mostrar la lista"]').all();
        for (let i = 0; i < lists.length; i++)
            await page.getByText('Mostrar la lista').first().click({ timeout: 10000 });
        let tempBet = {
            nombre: 'betplay',
            title,
            bets: []
        };
        await page.waitForTimeout(2000);
        for (const betType of betTypes) {

            const type = await page.locator('xpath=//span[text() = "' + betType + '"]').first().textContent();
            const btns = await page.locator('xpath=//span[text() = "' + betType + '"]/parent::*/parent::*/parent::*/following-sibling::*//div[contains(@class, "KambiBC-outcomes-list__column")]').all();
            let betsTemp = [];
            if (betType == 'Total de goles') {
                const div = await page.locator('.KambiBC-slider-wrapper').first();
                if (await div.isVisible()) {
                    const box = await div.boundingBox();
                    if (box) {
                        const input = div.locator('input');
                        const max = await input.getAttribute('max');
                        const min = await input.getAttribute('min');
                        const totalSteps = Math.floor(max) - Math.ceil(min) + 1; // Total de pasos enteros en el rango
                        let fractions = [];
                        for (let i = 0; i <= totalSteps; i++) {
                            let fraction = (i / totalSteps).toFixed(2); // Escala y ajusta la precisión decimal
                            fraction = parseFloat(fraction);
                            // Ajusta el valor si es exactamente 1
                            if (fraction === 1) {
                                fraction = 0.97;
                            }
                        }
                        const { x, y, width, height } = box;
                        const centerY = y + height / 2; // Calcula el centro vertical para los clics
                        for (const fraction of fractions) {
                            // Calcula las coordenadas x para cada clic basado en las fracciones del ancho
                            const clickX = x + width * fraction;
                            // Realiza el clic en la posición calculada. Ajusta la posición y si es necesario.
                            await page.mouse.click(clickX, centerY);

                            // Espera un poco entre cada clic si es necesario
                            await page.waitForTimeout(1000); // Espera 500ms
                            for (const btn of btns) {
                                if (!await btn.isDisabled()) {
                                    const name = await btn.locator('xpath=//div/div').first({ timeout: 1000 }).textContent();
                                    const quote = await btn.locator('xpath=//div').last().textContent();
                                    betsTemp.push({
                                        name,
                                        quote
                                    });
                                }

                            }
                            // await page.waitForTimeout(10000); // Espera 500ms
                        }

                    }
                } else {
                    const more = await btns[0].locator('//button/div').all();
                    const less = await btns[1].locator('//button/div').all();
                    for (let i = 0; i < more.length; i++) {
                        if (!await more[i].isDisabled()) {
                            let tempMoreName = await more[i].locator('div').first().textContent();
                            let tempMoreQuote = await more[i].locator('div').last().textContent();
                            betsTemp.push({
                                name: tempMoreName,
                                quote: tempMoreQuote
                            });
                        }
                        if (!await less[i].isDisabled()) {
                            let tempLessName = await less[i].locator('div').first().textContent();
                            let tempLessQuote = await less[i].locator('div').last().textContent();
                            betsTemp.push({
                                name: tempLessName,
                                quote: tempLessQuote
                            });
                        }

                    }
                }
            } else {
                for (const btn of btns) {
                    if (await btn.textContent() == "Ocultar la lista") break;
                    const name = await btn.locator('xpath=//div/div').first({ timeout: 1000 }).textContent();
                    const quote = await btn.locator('xpath=//div').last().textContent();
                    //console.log(name, quote);
                    betsTemp.push({
                        name,
                        quote
                    });
                }
            }
            tempBet.bets.push({
                type,
                bets: betsTemp,
            });

        }
        // await page.close();
        return tempBet;
    } catch (error) {
        console.log(error);
        // await page.close();
    }
}

// Función para extraer el número de la cadena en el campo 'name'
const extractNumber = name => parseFloat(name.match(/(\d+(\.\d+)?)$/)[0]);
// Ordenar primero por número y luego agrupar por "Más de" o "Menos de"
const orderBetMoreLess = bets => {
    return bets.sort((a, b) => {
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

const permit1 = [
    'Total de goles',
    'Total de Tiros de Esquina',
    'Total de goles - 1.ª parte',
    'Total de goles - 2.ª parte',
    'Total de tarjetas'
]

const getBetForBetplay = (betOffers, type, name = 'BETPLAY') => {
    const tiposPermitidos = type.map(t => t.type);
    let filter = betOffers.filter(bet => {
        return tiposPermitidos.includes(bet.criterion.label)
    });
    filter = filter.map(f => {
        const name = f.criterion.label;
        let bets = f.outcomes.map(bet => {
            const result = parseInt(bet.line);
            const formatted = isNaN(result) ? '' : (result / 1000).toFixed(1);
            return {
                name: bet.label + formatted,
                quote: (parseInt(bet.odds) / 1000).toFixed(2)
            }
        });
        if (permit1.includes(name)) bets = orderBetMoreLess(bets);
        return {
            id: Object.keys(obtenerObjetoPorTipo(type, name))[0],
            type: name,
            bets: bets
        }
    });
    // Agrupar las apuestas de 'Total de goles' y eliminar las múltiples entradas
    let reducedBetsArray = agruparApuestas(filter, type[groupByType.total].type);
    if (categoryActual.current == 'football') {
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByType.total2]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByType.total1]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByType.esquinas]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByType.tarjetas]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByType.handicap]?.type || '');
    } else if (categoryActual.current == 'basketball') {
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByTypeBasketball.total1]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByTypeBasketball.total2]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByTypeBasketball.totalCuarto1]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByTypeBasketball.totalCuarto2]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByTypeBasketball.totalCuarto3]?.type || '');
        reducedBetsArray = agruparApuestas(reducedBetsArray, type[groupByTypeBasketball.totalCuarto4]?.type || '');
    }

    console.log(`//////////////////// ${name} //////////////////`)
    console.log(`//////////////////// ${name} //////////////////`)
    return reducedBetsArray;
}

async function getBetPlayApi(event, betTypes) {
    const res = await
        initRequest(`https://na-offering-api.kambicdn.net/offering/v2018/betplay/betoffer/event/${event.id}.json?lang=es_CO&market=CO&client_id=2&channel_id=1&includeParticipants=true`);
    if (res) {
        if (res?.betOffers) {
            return {
                nombre: 'betplay',
                title: event.name,
                bets: getBetForBetplay(res.betOffers, betTypes),
                url: `https://betplay.com.co/apuestas#event/${event.id}`
            }
        }
    }

}


module.exports = {
    getResultsBetPlay,
    getResults1x2,
    getResultsBetPlayTemp,
    getBetForBetplay,
    getBetPlayApi,
    orderBetMoreLess,
}
