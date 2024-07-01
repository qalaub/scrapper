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
    }
}

const buscarQ = async (page, query) => {
    try {
        const search = await page.locator('.search-modal_searchInput__IbdoN').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(5000);
        const noResult = await page.getByText("No results").isVisible({ timeout: 5000 });
        return !noResult;
    } catch (error) {
        console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    try {
        let opciones = await page.locator('//div[contains(@class, "search-results_searchEventsContainer")]//div[contains(@class, "event-teams_teams")]');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let optPass = [];
            for (const opcion of opciones) {
                let away = await opcion.locator('//div[contains(@data-test, "teamName")]').first().textContent();
                let home = await opcion.locator('//div[contains(@data-test, "teamName")]').last().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                text = away + " " + home;
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
                console.log('IVIBET: ', quitarTildes(match), opt.name.trim());
                await opt.opcion.waitFor({ state: 'visible' });
                await opt.opcion.click();
                return true;
            }
            return false;
        }
    } catch (error) {
        console.log(error);
    }
    return false;
};

const permit1 = [
    '2º Mitad - total',
    '1º Mitad - 1x2',
    'Total córneres',
    '2º Mitad - 1x2',
    '1º cuarto - 1x2',
    '1º set - ganador',
    '2º set - total puntos',
    '1º inning - 1x2',
    'La pelea se durará hasta',
    '1 periodo - 1x2',
    'Ambos equipos marcan',
    'Más seises'
];

const getTypes = el => {
    let loca = {
        '2º Mitad - total': '2ª mitad',
        '1º Mitad - 1x2': '1ª mitad',
        'Total córneres': 'saques de esquina',
        '2º Mitad - 1x2': '2ª mitad',
        '1º cuarto - 1x2': 'Cuartos',
        '1º set - ganador': 'Sets',
        '2º set - total puntos': 'Sets',
        '1º inning - 1x2': 'Entrada',
        'La pelea se durará hasta': 'Otros',
        'Más seises': 'Otros',
        '1 frame - ganador': 'Frames'
    }
    if(categoryActual.current == 'ice_hockey') {
        loca['Ambos equipos marcan'] = 'Goles';
        loca['1 periodo - 1x2'] = 'Periodos';
    }
    return `//button[text() = "${loca[el]}"]`;
}


async function getResultsIvibet(match, betTypes = ['ganador del partido'], n, team1) {
    // if (categoryActual.current == 'tennis') return;
    const { page, context } = await initBrowser('https://ivibet.com/es', 'ivibet' + n, 7000);
    if (page) {
        try {
            let url = 'https://ivibet.com/es';
            page.setDefaultTimeout(timeouts.search);
            const search = await page.getByPlaceholder('Buscar').first();
            await search.click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            await page.waitForTimeout(3000);
            page.setDefaultTimeout(timeouts.bet);
            let ivibet = {
                nombre: 'ivibet',
                title: match,
                bets: [],
                url
            }
            for (const betType of betTypes) {
                try {
                    if (permit1.includes(betType.type)) {
                        page.setDefaultTimeout(2000);
                        const opt = await page.locator(getTypes(betType.type))
                        if(await opt.isVisible()) await opt.click();
                        page.setDefaultTimeout(timeouts.bet);
                    }
                    let type = await page.locator('//span[text() = "' + betType.type + '"]').first();
                    await type.waitFor({ state: 'visible' });
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                    }
                    const parent = await page.locator('//span[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*');
                    const bets = await parent.locator('//span[text() = "' + betType.type + '"]/parent::*/parent::*/parent::div//div[contains(@data-test, "sport-event-table-additional-market")]').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('//div/div').first().textContent();
                            let quote = await bet.locator('//div/span').last().textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    // console.log(betType.type, betTemp)
                    ivibet.bets.push(betTemp);
                    console.log('//////// SUPARBET LENGTH', ivibet.bets.length)
                } catch (error) {
                    console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// SUPARBET //////////////////')
            console.log('//////////////////// SUPARBET //////////////////')
            return ivibet;
        } catch (error) {
            // console.log(error);
            // await page.close();
        }
    }
}


module.exports = {
    getResultsIvibet
}