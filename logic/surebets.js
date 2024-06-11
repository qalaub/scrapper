const {
    evaluateSurebets,
    generarCombinacionesDeCasas2,
    initBrowser,
    categoryActual,
    quitarTildes,
    generarCombinacionesDeCasas2MoreLess
} = require("../casas/utils");
const {
    idsFootball,
    idsBasketball,
    betDescriptionsFootball,
    betDescriptionsBasketball,
    betDescriptionsTennis,
    idsTennis,
    betDescriptionsVolleyball,
    idsVolleyball,
    idsBaseball,
    betDescriptionsBaseball,
    idsMMA,
    betDescriptionsMMA
} = require("./constantes");

const categories = {
    football: getBetTypeFootball,
    basketball: getBetTypeBasketball,
    tennis: getBetTypeTennis,
    'ufc_mma': getBetTypeMMA,
    volleyball: getBetTypeVolleyball,
    baseball: getBetTypeBaseball,
}

function getBetTypes(bets, category) {
    let tempBets = bets.map(bet => categories[category](bet));
    let newBet = {
        wplay: [],
        betsson: [],
        '1xbet': [],
        codere: [],
        yaJuegos: [],
        luckia: [],
        sportium: [],
        zamba: [],
        wonderbet: [],
        megapuesta: [],
        betplay: [],
        fullreto: [],
        betboro: [],
        pinnacle: [],
        dafabet: [],
        cashwin: [],
        bwin: [],
        lsbet: [],
        ggbet: [],
        marathon: [],
        sportbet: [],
        leon: [],
        stake: [],
        unobet: [],
    };

    for (const tempBet of tempBets) {
        newBet.wplay.push(tempBet.wplay);
        newBet.betsson.push(tempBet.betsson);
        newBet['1xbet'].push(tempBet['1xbet']);
        newBet.codere.push(tempBet.codere);
        newBet.yaJuegos.push(tempBet.yaJuegos);
        newBet.luckia.push(tempBet.luckia);
        newBet.sportium.push(tempBet.sportium);
        newBet.zamba.push(tempBet.zamba);
        newBet.wonderbet.push(tempBet.wonderbet);
        newBet.megapuesta.push(tempBet.megapuesta);
        newBet.betplay.push(tempBet.betplay);
        newBet.fullreto.push(tempBet.fullreto);
        newBet.betboro.push(tempBet.betboro);
        newBet.pinnacle.push(tempBet.pinnacle);
        newBet.dafabet.push(tempBet.dafabet);
        newBet.cashwin.push(tempBet.cashwin);
        newBet.bwin.push(tempBet.bwin);
        newBet.lsbet.push(tempBet.lsbet);
        newBet.ggbet.push(tempBet.ggbet);
        newBet.marathon.push(tempBet.marathon);
        newBet.sportbet.push(tempBet.sportbet);
        newBet.leon.push(tempBet.leon);
        newBet.stake.push(tempBet.stake);
        newBet.unobet.push(tempBet.unobet);
    }

    // Función para eliminar elementos undefined
    function eliminarUndefined(arr) {
        return arr.filter(item => item.type !== undefined);
    }

    let data = {
        betplay: newBet.betplay,
        wplay: newBet.wplay,
        betsson: newBet.betsson,
        '1xbet': newBet['1xbet'],
        codere: newBet.codere,
        yaJuegos: newBet.yaJuegos,
        luckia: newBet.luckia,
        sportium: newBet.sportium,
        zamba: newBet.zamba,
        wonderbet: newBet.wonderbet,
        megapuesta: newBet.megapuesta,
        fullreto: newBet.fullreto,
        betboro: newBet.betboro,
        pinnacle: newBet.pinnacle,
        dafabet: newBet.dafabet,
        cashwin: newBet.cashwin,
        bwin: newBet.bwin,
        lsbet: newBet.lsbet,
        ggbet: newBet.ggbet,
        marathon: newBet.marathon,
        sportbet: newBet.sportbet,
        leon: newBet.leon,
        stake: newBet.stake,
        unobet: newBet.unobet,
    }
    // Eliminar elementos undefined de cada arreglo
    Object.keys(data).forEach(key => {
        data[key] = eliminarUndefined(data[key]);
    });

    return data;
}

function getBetTypeInfo(typeId, description) {
    return {
        betplay: { [typeId]: description['betplay'], type: description['betplay'] },
        wplay: { [typeId]: description['betplay'], type: description['wplay'] },
        betsson: { [typeId]: description['betplay'], type: description['betsson'] },
        '1xbet': { [typeId]: description['betplay'], type: description['1xbet'] },
        codere: { [typeId]: description['betplay'], type: description['codere'] },
        yaJuegos: { [typeId]: description['betplay'], type: description['yaJuegos'] },
        luckia: { [typeId]: description['betplay'], type: description['luckia'] },
        sportium: { [typeId]: description['betplay'], type: description['sportium'] },
        zamba: { [typeId]: description['betplay'], type: description['zamba'] },
        wonderbet: { [typeId]: description['betplay'], type: description['wonderbet'] },
        megapuesta: { [typeId]: description['betplay'], type: description['megapuesta'] },
        fullreto: { [typeId]: description['betplay'], type: description['fullreto'] },
        betboro: { [typeId]: description['betplay'], type: description['betboro'] },
        pinnacle: { [typeId]: description['betplay'], type: description['pinnacle'] },
        dafabet: { [typeId]: description['betplay'], type: description['dafabet'] },
        cashwin: { [typeId]: description['betplay'], type: description['cashwin'] },
        bwin: { [typeId]: description['betplay'], type: description['bwin'] },
        lsbet: { [typeId]: description['betplay'], type: description['lsbet'] },
        ggbet: { [typeId]: description['betplay'], type: description['ggbet'] },
        marathon: { [typeId]: description['betplay'], type: description['marathon'] },
        sportbet: { [typeId]: description['betplay'], type: description['sportbet'] },
        leon: { [typeId]: description['betplay'], type: description['leon'] },
        stake: { [typeId]: description['betplay'], type: description['stake'] },
        unobet: { [typeId]: description['betplay'], type: description['unobet'] },
    };
}

function getBetTypeFootball(type) {
    const typeId = idsFootball[type];
    const description = betDescriptionsFootball[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeBasketball(type) {
    const typeId = idsBasketball[type];
    const description = betDescriptionsBasketball[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeTennis(type) {
    const typeId = idsTennis[type];
    const description = betDescriptionsTennis[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeVolleyball(type) {
    const typeId = idsVolleyball[type];
    const description = betDescriptionsVolleyball[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeBaseball(type) {
    const typeId = idsBaseball[type];
    const description = betDescriptionsBaseball[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeMMA(type) {
    const typeId = idsMMA[type];
    const description = betDescriptionsMMA[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}


function calculateTotalGol(quotes, data, url, type) {
    // Función para extraer todos los números únicos de las cuotas
    const uniqueVariants = new Set();
    quotes.forEach(quote => {
        quote.cuotas.forEach(cuota => {
            let match = cuota.name.match(/\b(\d+(\.0|\.5)?)\b/); // Regex ajustado para extraer números terminados en .0, .5 o enteros
            if (categoryActual.current == "basketball") match = cuota.name.match(/\b\d+(\.\d+)?\b/);
            if (match) {
                uniqueVariants.add(match[0]);
            }
        });
    });

    const totalVariant = Array.from(uniqueVariants).sort((a, b) => parseFloat(a) - parseFloat(b)); // Convertimos el Set a Array y ordenamos los números
    let results = [];
    for (const variant of totalVariant) {
        let extract = [];
        let extract2 = [];
        for (const quote of quotes) {
            // console.log(variant)
            const result = getByGol(quote, variant);
            const result2 = getByGolT(quote, variant);

            if (result && result.cuotas.length > 0) { // Asegúrate de solo añadir resultados con cuotas
                extract.push(result);
            }
            if (result2 && result2.cuotas.length > 0) { // Asegúrate de solo añadir resultados con cuotas
                if (result2.cuotas.length == 4) {
                    const filter1 = result2.cuotas.filter(el => el.name.includes('más') || el.name.includes('mas'));
                    const filter2 = result2.cuotas.filter(el => el.name.includes('menos'));

                    const extractNumber = name => parseFloat(name.match(/[\d\.]+/)[0]);

                    const minObjMas = filter1.reduce((min, el) => extractNumber(el.name) < extractNumber(min.name) ? el : min, filter1[0]);
                    const maxObjMenos = filter2.reduce((max, el) => extractNumber(el.name) > extractNumber(max.name) ? el : max, filter2[0]);
                    if (categoryActual.current != 'football') {
                        result2.cuotas = [
                            maxObjMenos,
                            minObjMas,
                        ]
                        extract2.push(result2);
                    }
                    result2.cuotas = [
                        minObjMas,
                        maxObjMenos
                    ];
                }
                extract2.push(result2);
            }
        }

        if (extract.length > 0) {
            const combinations = generarCombinacionesDeCasas2(extract);
            results.push(evaluateSurebets(combinations, 1000000, data, url, type));
        }
        if (extract2.length > 0) {
            const combinations = generarCombinacionesDeCasas2MoreLess(extract2);
            results.push(evaluateSurebets(combinations, 1000000, data, url, type));
        }
    }
    return results;
}

function getByGol(casa, n) {
    if (casa.cuotas) {
        let regex;
        if (n.includes('.')) {
            // Expresión regular para números decimales
            regex = new RegExp(`(^|\\s)${n}($|\\s|[^\\d])`);
        } else {
            regex = new RegExp(`(^|\\s)${n}($|\\s|$)`);
        }
        return {
            nombre: casa.nombre,
            cuotas: casa.cuotas.filter(cuota => regex.test(cuota.name)),
            url: casa.url
        };
    }
    return null;
}

function getByGolT(casa, n) {
    if (casa.cuotas) {
        const nPlusOne = (parseFloat(n) + 1).toFixed(1); // Calcula el número con .5 más
        const regex = new RegExp(`(^|\\s)${n.replace('.', '\\.')}($|\\s)|(^|\\s)${nPlusOne.replace('.', '\\.')}($|\\s)`);

        const filteredCuotas = casa.cuotas.filter(cuota => {
            let nameMatch = cuota.name.match(/\d+(\.5)?/); // Captura números enteros y .5
            const match = nameMatch && (nameMatch[0] === n || nameMatch[0] === nPlusOne) && regex.test(` ${cuota.name} `);
            cuota.name = quitarTildes(cuota.name);
            cuota.name = cuota.name.toLowerCase();
            return match// Coincide exactamente con n o nPlusOne
        });

        return {
            nombre: casa.nombre,
            cuotas: filteredCuotas,
            url: casa.url
        };
    }
    return null;
}

function groupAndReduceBetsByType(bets, targetType, insertIndex) {
    const grouped = { type: targetType, bets: [] };

    // Recorre las apuestas para agrupar las del tipo deseado
    bets.forEach(bet => {
        if (bet.type === targetType) {
            grouped.id = bet.id;
            grouped.bets = grouped.bets.concat(bet.bets);
        }
    });

    // Filtrar los objetos que no son del tipo objetivo
    const result = bets.filter(bet => bet.type !== targetType);

    // Si no se especifica un índice o el índice es inválido, usar la posición predeterminada al final
    if (insertIndex === undefined || insertIndex < 0 || insertIndex > result.length) {
        insertIndex = result.length;
    }

    // Insertar el objeto agrupado en el índice especificado
    result.splice(insertIndex, 0, grouped);

    return result;
}

async function getUrlsTeams(team1, team2, n) {
    let pageT, contextT;
    try {
        console.log('INICIO')
        const { page, context } = await initBrowser('https://www.google.com/?hl=es', 'google' + n);
        pageT = page;
        contextT = context;

        page.setDefaultTimeout(2000);
        const search = page.locator('*[name = "q"]');
        await search.fill(team1 + ' FC logo');
        await search.press('Enter');
        await page.getByText('Imágenes').first().waitFor();
        await page.getByText('Imágenes').first().click();
        let img, url1, url2;
        await page.waitForTimeout(1000);
        if (await page.locator('(//td/a/div/img)[1]').isVisible()) {
            img = page.locator('(//td/a/div/img)[1]');
            url1 = await img.getAttribute('src');
            await search.first().fill(team2 + ' FC logo');
            await search.first().press('Enter');
            url2 = await img.getAttribute('src');
        } else {
            if (await page.locator('(//h3/a)[1]').isVisible()) img = page.locator('(//h3/a)[1]');
            else if (await page.locator('(//td/a/div)[1]').isVisible()) img = page.locator('(//td/a/div)[1]');
            else img = await page.locator('(//h3/parent::*/a)[1]');
            await img.click();
            // page.setDefaultTimeout(20000);
            // await page.waitForTimeout(20000);
            let link = page.locator('//c-wiz//a/img[@aria-hidden = "false"]');
            if (!(await link.isVisible())) link = page.locator('//div/a/img[2]');
            url1 = await link.getAttribute('src');
            await search.first().fill(team2 + ' FC logo');
            await search.first().press('Enter');
            await img.click();
            url2 = await link.getAttribute('src');
        }
        if (url1.includes('data:image/')) return ['', ''];
        // console.log(url1, url2)
        // const url2 = await link.getAttribute('src');
        return [url1, url2];
    } catch (error) {
        // if (pageT) await pageT.close();
        console.log(error);
        return ['', ''];
    }
}

module.exports = {
    calculateTotalGol,
    getBetTypes,
    groupAndReduceBetsByType,
    getUrlsTeams,
}