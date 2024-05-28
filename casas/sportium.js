const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    categoryActual
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

async function extractGoalOptions(page, type) {
    const goalTexts = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.headerText'));
        return elements
            .filter(el => {
                const text = el.textContent.trim();
                return text.includes("1X2 Handicap")
            })
            .map(el => el.textContent);
    });
    const uniqueNumbers = new Set();
    goalTexts.forEach(text => {
        let matches = text.match(/\d+:\d+/g);
        if (matches) {
            matches.forEach(match => uniqueNumbers.add(match));
        }
    });
    return Array.from(uniqueNumbers); // Retorna un arreglo de números únicos encontrados
}

function buildXPathsFromNumbers(numbers, bet) {
    let goalXpath = '';
    switch (bet) {
        case '1X2 Handicap':
            goalXpath = numbers.map(n => `text() = '1X2 Handicap ${n} '`).join(' or ');
            break;
        default:
            // Opcionalmente manejar casos no esperados o un valor por defecto
            console.log('Tipo de apuesta no reconocida.');
            break;
    }

    const titlesXPath = `//*[${goalXpath}]`;
    const buttonsXPath = `${titlesXPath}/parent::*/parent::*/parent::*//div[contains(@class, "ta-SelectionButtonView")]`;

    return { titlesXPath, buttonsXPath };
}

let url = '';

const betTypeActions = {
    football: {
        'Ambos marcan ambas partes': 'Goles (',
        '2ª Mitad - Total de Goles': '2ª Mitad (',
        '1ª Mitad - Total de Goles': '1ª Mitad (',
        'Total de córners': 'Córners (',
        'Total de tarjetas': 'Tarjetas (',
        '1X2 Handicap': 'Hándicap (',
    },
    basketball: {
        'Resultado 2ª Mitad': '2ª Mitad (',
        '1X2 1ª Mitad': '1ª Mitad (',
        '1º Cuarto -  Resultado': '1º Cuarto (',
        '2º Cuarto - Resultado': '2º Cuarto (',
        '3º Cuarto - Resultado': '3º Cuarto (',
        '4º Cuarto - Resultado': '4º Cuarto (',
    },
    tennis: {
        'Ganador Set 1': 'Mercados de sets (',
    }
};

async function getResultsSportium(match, betTypes = ['Resultado Tiempo Completo'], n) {
    const { page, context } = await initBrowser('https://sports.sportium.com.co/', 'sportium' + n);
    if (page) {
        try {
            page.setDefaultTimeout(timeouts.search);
            await page.waitForTimeout(5000);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.waitForTimeout(3000);
            url = await page.url();
            let betRivalo = {
                nombre: 'sportium',
                title: match,
                bets: [],
                url
            }
            page.setDefaultTimeout(timeouts.bet);
            if (await page.locator('(//*[text() = "Más"])[1]').isVisible()) await page.locator('(//*[text() = "Más"])[1]').click();
            for (const betType of betTypes) {
                try {
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: cleanText(betType.type),
                        bets: []
                    };
                    const temp = betTypeActions[categoryActual.current];
                    if (betType.type in temp) {
                        const selector = `//div[@class="ta-FlexPane"]/div/div[contains(text(), "${temp[betType.type]}")]`;
                        await page.locator(selector).click();
                        await page.waitForTimeout(700); // Espera para asegurar que la acción se complete antes de continuar
                    }
                    let type = await page.locator('(//*[text() = "' + betType.type + '"])[1]');
                    if (betType.type == '1X2 Handicap') {
                        const numbers = await extractGoalOptions(page, betType.type);
                        const { titlesXPath, buttonsXPath } = buildXPathsFromNumbers(numbers, betType.type);
                        type = await page.locator(titlesXPath).all();
                        let btns = await page.locator(buttonsXPath).all();
                        for (const btn of btns) {
                            let name = await btn.locator('//div/div').first().textContent();
                            const quote = await btn.locator('//div/div').last().textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    } else {
                        page.setDefaultTimeout(1000);
                        await type.waitFor();
                        await type.textContent();
                        // console.log(await type.textContent());
                        page.setDefaultTimeout(timeouts.bet);
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
                                    if (name.includes('Más') || name.includes('más')) name = name.slice(0, 3) + " " + name.slice(3);
                                    if (name.includes('Menos') || name.includes('menos')) name = name.slice(0, 5) + " " + name.slice(5);
                                    betTemp.bets.push({
                                        name,
                                        quote
                                    });
                                }
                            }
                        }
                    }
                    betRivalo.bets.push(betTemp);
                    // console.log(betTemp)
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