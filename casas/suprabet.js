const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { orderBetMoreLess } = require("./betplay");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    categoryActual,
    tienenPalabrasEnComunDinamicoT
} = require("./utils");

const getCategory = t => {
    switch (categoryActual.current) {
        case 'basketball': return t.includes('Basket');
        case 'football': return t.includes('Fútbol');
        case 'volleyball': return t.includes('Voleibol');
        case 'baseball': return t.includes('Béisbol');
        case 'ice_hockey': return t.includes('Hockey sobre hielo');
        case 'ufc_mma': return t.includes('Artes Marciales Mixtas');
        case 'american_football': return t.includes('Fútbol americano');
        case 'tennis': return t.includes('Tenis');
        case 'cricket': return t.includes('Críquet');
        case 'table_tennis': return t.includes('Tenis de Mesa');
        case 'snooker': return t.includes('Snooker');
    }
}

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar juego').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(2000);
        const category = await page.locator('.searchSportMenu__item');
        if (await category.first().isVisible()) {
            const allCategory = await page.locator('.searchSportMenu__item').all();
            if (allCategory.length > 0) {
                for (const all of allCategory) {
                    await all.click();
                    await page.waitForTimeout(1000);
                    const t = await all.textContent();
                    const c = getCategory(t);
                    if (c) return c;
                }
            }
        }
        const noResult = await page.getByText("results have been found").isVisible({ timeout: 5000 });
        return !noResult;
    } catch (error) {
        // console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    try {
        let opciones = await page.locator('.gl-wrapper--gameTitle');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let optPass = [];
            for (const opcion of opciones) {
                let text = await opcion.textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                text = match.replace(' VS ', ' ');
                console.log(text, match)
                const p = await tienenPalabrasEnComunDinamico(match, text);
                if (p.pass) optPass.push({
                    name: text,
                    opcion
                })
            }
            const opt = await selectMoreOption(optPass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.text,
                    etiqueta: 1
                });
                console.log('SUPARBET: ', quitarTildes(match), opt.name.trim());
                await opt.opcion.waitFor({ state: 'visible' });
                await opt.opcion.click();
                let keywords = opt.name.replace(/,/g, '').split(/\s+/).map(keyword => keyword.trim());

                // Crear la parte dinámica del XPath
                let dynamicXpathPart = keywords.map(keyword => `contains(., '${keyword}')`).join(' and ');
            
                // Construir el XPath completo
                let xpath = `//div[contains(@class, "match-card__container")]//*[${dynamicXpathPart}]`;
                // console.log(xpath)
                await page.locator(xpath).click();
                return true;
            }
            return false;
        }
    } catch (error) {
        // console.log(error);
    }
    return false;
};

const permit1 = [
    '2da mitad Total de goles',
    'Córneres: Resultado de la 1ra mitad',
    'Tarjetas Amarillas: Total',
    'Primer equipo en anotar (tiempo regular)',
    '1ra Periodo resultado'
];

const getTypes = el => {
    let loca = {
        '2da mitad Total de goles': 'Mitades',
        'Córneres: Resultado de la 1ra mitad': 'Tiros de esquina',
        'Tarjetas Amarillas: Total': 'Tarjetas',
        'Primer equipo en anotar (tiempo regular)': 'Partido',
        '1ra Periodo resultado': 'Periodos',

    }
    return `//div[contains(@class, "betsMenu__menu-item") and text() = "${loca[el]}"]`
}


async function getResultsSuprabet(match, betTypes = ['ganador del partido'], n, team1) {
    // if (categoryActual.current == 'tennis') return;
    const { page, context } = await initBrowser('https://www.suprabets.com/es/classic-sports/match/', 'suprabet' + n);
    if (page) {
        try {
            let url = 'https://www.suprabets.com/es/classic-sports/match/';
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            await page.waitForTimeout(5000);
            page.setDefaultTimeout(timeouts.bet);
            let suprabet = {
                nombre: 'suprabet',
                title: match,
                bets: [],
                url
            }
            for (const betType of betTypes) {
                try {
                    if (permit1.includes(betType.type)) {
                        page.setDefaultTimeout(2000);
                        await page.locator(getTypes(betType.type)).scrollIntoViewIfNeeded();
                        await page.locator(getTypes(betType.type)).click();
                        page.setDefaultTimeout(timeouts.bet);
                    }

                    let type = await page.locator('//div[text() = "' + betType.type + '"]').first();
                    await type.waitFor({ state: 'visible' });
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                    }
                    const parent = await page.locator('//div[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*');
                    // const cl = await parent.locator('//div/div').first().getAttribute('class');
                    // if (cl.includes('mb-0')) {
                    //     await parent.click();
                    // }
                    const bets = await parent.locator('//div[text() = "' + betType.type + '"]/parent::*/parent::*/following-sibling::*[1]/div/button').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('span').first().textContent();
                            let quote = await bet.locator('span').last().textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    // console.log(betType.type, betTemp)
                    suprabet.bets.push(betTemp.bets);
                    console.log('//////// SUPARBET LENGTH', suprabet.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// SUPARBET //////////////////')
            console.log('//////////////////// SUPARBET //////////////////')
            return suprabet;
        } catch (error) {
            // console.log(error);
            // await page.close();
        }
    }
}


module.exports = {
    getResultsSuprabet
}