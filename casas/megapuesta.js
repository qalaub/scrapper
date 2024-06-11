const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const { tienenPalabrasEnComunDinamico, quitarTildes, initBrowser, matchnames, scrollToBottom, categoryActual } = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByRole('searchbox', { name: 'Buscar' }).first();
        await search.waitFor();
        await search.click();
        await search.fill(query);
        await page.waitForTimeout(1500);
        const result = await page.locator(categoryActual.isLive ? '.tabellaQuoteNew' : '.tabellaQuotePrematch').first().isVisible();
        return result;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('.tabellaQuoteSquadre');
    let opciones = await posibleOpcion.all();
    let pass = [];
    let optPass = [];
    for (const opcion of opciones) {
        const title = await opcion.textContent();
        // console.log(title);
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(title.trim());
        text = text.substring(text.indexOf('-') + 2);
        text = text.replace('-', ' ');
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
        console.log('MEGAPUESTA: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'Total Goles',
    'Total Puntos (Inc. Pró)',
    'Total Esquinas',
    'Total Tarjetas',
    '1ª M Total Goles',
    '2ª M Total Goles',
    'Total Puntos en el Mitad 1',
    'Total Puntos Cuarto 1',
    'Total Puntos Cuarto 2',
    'Total Puntos Cuarto 3',
    'Total Puntos Cuarto 4',
    'Total de Juegos',
    'Total de Juegos Set 1',
    'Total Puntos'
];

const permit2 = [
    '2ª Mitad',
];

async function getResultsMegapuesta(match, betTypes = ['Resultado Tiempo Completo'], n) {
    const { page, context } = await initBrowser(categoryActual.isLive
        ? 'https://megapuesta.co/es/live'
        : 'https://megapuesta.co/es/sport', 'megapuesta' + n);
    if (page) {
        try {
            let url = '';
            await page.getByRole('searchbox', { name: 'Cargando..' }).isVisible();
            await page.getByRole('searchbox', { name: 'Buscar' }).isVisible();
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            let betMegapuesta = {
                nombre: 'megapuesta',
                title: match,
                bets: [],
                url
            }
            await page.waitForTimeout(1000);
            let expander = await page.locator('.tabellaQuoteSquadre svg');
            if (await expander.first().isVisible({ timeout: 1500 })) await expander.first().click();
            else {
                await page.locator('.contenitoreRiga > .tabellaQuotePrematch  > .tabellaQuoteSquadre').click();
            }
            const container = await page.locator('.collapse-esiti-multipli').first();
            let locatorsBet = [
                '(//*[contains(@data-id ,"m--1")])[2]',
                '(//*[contains(@data-id ,"m--2")])[2]',
                '(//*[contains(@data-id ,"m--5")])[2]'
            ];
            await page.waitForTimeout(1000);
            if (await container.locator(locatorsBet[0]).isVisible())
                await container.locator(locatorsBet[0]).click();

            if (await container.locator(locatorsBet[1]).isVisible())
                await container.locator(locatorsBet[1]).click();

            if (await container.locator(locatorsBet[2]).isVisible())
                await container.locator(locatorsBet[2]).click();

            await page.waitForTimeout(1000);
            await scrollToBottom(page);
            page.setDefaultTimeout(timeouts.bet);
            for (const betType of betTypes) {
                try {
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: []
                    }

                    if (permit1.includes(betType.type)) {
                        const locatorBet = '//div[@role = "button"]/span[contains(text() , "' + betType.type + '")]';
                        await page.waitForSelector(locatorBet, { state: 'visible' });
                        await page.waitForTimeout(1000);
                        let types = await page.locator(locatorBet).all();
                        for (const type of types) {
                            const regexPattern = `^(${betType.type}) \\d+\\.\\d+$`;
                            const regex = new RegExp(regexPattern);
                            const text = await type.textContent();
                            if (regex.test(text)) {
                                const bets = await page.locator('(//div[@role = "button"]/span[text() = "' + text + '"]/parent::*/following-sibling::*)[1]/div').all();
                                if (bets.length > 1) {
                                    for (const bet of bets) {
                                        let name = await bet.locator('span').first().textContent();
                                        const quote = await bet.locator('span').last().textContent();
                                        betTemp.bets.push({
                                            name: name + ' ' + text,
                                            quote
                                        });
                                    }
                                }

                            }

                        }
                        // Función para extraer el número de la cadena en el campo 'name'
                        const extractNumber = name => parseFloat(name.match(/(\d+(\.\d+)?)$/)[0]);
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

                    } else {
                        const locatorBet = '//div[@role = "button"]/span[text() = "' + betType.type + '"]';
                        await page.waitForSelector(locatorBet, { state: 'visible' });
                        let type = await page.locator(locatorBet).textContent();
                        const bets = await page.locator('(//div[@role = "button"]/span[text() = "' + betType.type + '"]/parent::*/following-sibling::*)[1]/div').all();
                        if (bets.length > 1) {
                            let cont = 0;
                            for (const bet of bets) {
                                if (permit2.includes(betType.type) && cont > 2) break;
                                let name = await bet.locator('span').first().textContent();
                                const quote = await bet.locator('span').last().textContent();
                                betTemp.bets.push({
                                    name,
                                    quote
                                });
                                cont++;
                            }
                        }
                    }

                    betMegapuesta.bets.push(betTemp);
                    // console.log(betTemp)
                    console.log('//////// MEGAPUESTA LENGTH ', betMegapuesta.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// MEGAPUESTA //////////////////')
            console.log('//////////////////// MEGAPUESTA //////////////////')
            //  await page.close();
            return betMegapuesta;
        } catch (error) {
            console.log('ERRPR MEGAPUESTA MEGAPUESTA MEGAPUESTA MEGAPUESTA ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsMegapuesta
}