const { timeouts } = require("../const/timeouts");
const { excludes, selectMoreOption } = require("../logic/utils/buscar");
const { postFormData, postUrlEncoded, initRequest } = require("../logic/utils/request");
const { tienenPalabrasEnComunDinamico, quitarTildes, initBrowser, matchnames } = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let luckiaSearch = await postUrlEncoded('https://www.luckia.co/OfferSearch/EventSearch', {
            query: text
        });
        return luckiaSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            let optPass = [];
            for (const q of res) {
                if (q.Name.indexOf('-') > 0) {
                    const p = await tienenPalabrasEnComunDinamico(match, q.Name);
                    console.log((match, q.Name))
                    if (p.pass) optPass.push({ opcion: q, similarity: p.similarity });
                }
            }
            const opt = await selectMoreOption(optPass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.opcion.Name.replace(/\s+/g, '').toLowerCase(),
                    etiqueta: 1
                });
                return `https://www.luckia.co/apuestas/eventos/${opt.opcion.ContestName.replace(/\s+/g, '-').replace(/ñ/g, 'n').toLowerCase()}-${opt.opcion.Name.replace(/\s+/g, '').toLowerCase()}/${opt.opcion.EventId}/`;
            }

        }
    }
}

const cleanText = text => text.replace(/\s+/g, ' ').trim();

async function extractGoalOptions(page) {
    const goalTexts = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.lp-offer__heading-title'));
        return elements
            .filter(el => el.textContent.trim().startsWith("Menos/más") || el.textContent.trim().startsWith("Menos/Más"))
            .map(el => el.textContent);
    });
    const uniqueNumbers = new Set();
    goalTexts.forEach(text => {
        const matches = text.match(/\d+(\.\d+)?/g); // Captura números, incluyendo decimales
        if (matches) {
            matches.forEach(match => uniqueNumbers.add(match));
        }
    });

    return Array.from(uniqueNumbers); // Retorna un arreglo de números únicos encontrados
}
function buildXPathsFromNumbers(numbers, bet) {
    let goalXpath = '';
    switch (bet) {
        case 'Menos/Más':
            goalXpath = numbers.map(n => `normalize-space(text()) = 'Menos/Más ${n} goles'`).join(' or ');
            break;
        case 'Menos/más (incl. prórroga)':
            goalXpath = numbers.map(n => `normalize-space(text()) = 'Menos/más ${n} puntos (incl. prórroga)'`).join(' or ');
            break;
        case '2ª mitad - Menos/Más':
            goalXpath = numbers.map(n => `normalize-space(text()) = '2ª mitad - Menos/Más ${n} goles'`).join(' or ');
            break;
        case '1ª mitad - Menos/Más':
            goalXpath = numbers.map(n => `normalize-space(text()) = '1ª mitad - Menos/Más ${n} goles'`).join(' or ');
            break;
        case 'Menos/Más tarjetas (jugadores en juego)':
            goalXpath = numbers.map(n => `normalize-space(text()) = 'Menos/Más ${n} tarjetas (jugadores en juego)'`).join(' or ');
            break;
        case 'Menos/Más corners':
            goalXpath = numbers.map(n => `normalize-space(text()) = 'Menos/Más ${n} corners'`).join(' or ');
            break;
        default:
            // Opcionalmente manejar casos no esperados o un valor por defecto
            console.log('Tipo de apuesta no reconocida.');
            break;
    }

    const titlesXPath = `//*[contains(@class, 'lp-offer__heading-title') and (${goalXpath})]`;
    const buttonsXPath = `${titlesXPath}/parent::*/parent::*/div[contains(@class, 'lp-offer__content')]`;

    return { titlesXPath, buttonsXPath };
}

const permit1 = [
    'Menos/Más',
    'Menos/más (incl. prórroga)',
    '1ª mitad - Menos/Más',
    '2ª mitad - Menos/Más',
    'Menos/Más tarjetas (jugadores en juego)',
    'Menos/Más corners',
    '2º Mitad - total'
];

async function getLuckiaApi(name, types, n) {
    try {
        const link = await buscarApi(name);
        if (!link) return null;
        const { page, context } = await initBrowser(link, 'luckia' + n);
        let bets = [];
        page.setDefaultTimeout(timeouts.bet);
        let scroll = 600;
        for (const type of types) {
            try {
                let title = '';
                await page.mouse.wheel(0, scroll);
                if (permit1.includes(type.type)) {
                    const numbers = await extractGoalOptions(page); // Asume que 'page' es una instancia de Page de Playwright
                    const { titlesXPath, buttonsXPath } = buildXPathsFromNumbers(numbers, type.type);
                    let titles = await page.locator(titlesXPath).all();
                    let btns = await page.locator(buttonsXPath).all();
                    let betTemp = [];
                    for (let i = 0; i < titles.length / 2; i++) {
                        let text = await btns[i].textContent();
                        text = text.split('\n').map(linea => linea.trim()).filter(linea => linea !== '');
                        betTemp.push({
                            name: text[2],
                            quote: text[3].replace(',', '.'),
                        });
                        betTemp.push({
                            name: text[0],
                            quote: text[1].replace(',', '.'),
                        });
                    }
                    bets.push({
                        id: Object.keys(type)[0],
                        type: cleanText(type.type),
                        bets: betTemp,
                    });
                }
                else {
                    title = await
                        page.locator('(//*[contains(@class , "lp-offer__heading-title") and normalize-space(text()) = "' + type.type + '"])[1]')
                    await title.waitFor();
                    title = await title.textContent();
                    const btns = await page.locator('(//*[contains(@class , "lp-offer__heading-title") and normalize-space(text()) = "' + type.type + '"])[1]/parent::*/parent::*/div[contains(@class, "lp-offer__content")]/div/div').all();
                    let betTemp = [];
                    for (const btn of btns) {
                        let name = await btn.locator('.pick-title').textContent();
                        let quote = await btn.locator('.pick-value').textContent();
                        name = cleanText(name);
                        quote = cleanText(quote);
                        betTemp.push({
                            name,
                            quote: quote.replace(',', '.')
                        });
                    }
                    bets.push({
                        id: Object.keys(type)[0],
                        type: cleanText(type.type),
                        bets: betTemp,
                    })
                    console.log('//////// LUCKIAA LENGTH ', bets.length)
                }
            } catch (error) {
                // console.log(error)
                console.log('ERROR AL ENCONTRAR APUESTA')
            }
        }
        console.log('//////////////////// LUCKIA //////////////////')
        console.log('//////////////////// LUCKIA //////////////////')
        return {
            nombre: 'luckia',
            title: name,
            bets
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    getLuckiaApi
}