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
    tienenPalabrasEnComunDinamicoT,
    scrollToBottom
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(2000);
        const noResult = await page.getByText('Lo sentimos, no se encontraron resultados').isVisible({ timeout: 5000 });
        return !noResult;
    } catch (error) {
        console.log(error)
        return false;
    }
};

const categoriesPermit = [
    'Baloncesto',
    'Fútbol',
    'Tenis',
    'Hockey Hielo',
];

const categories = [
    'Baloncesto',
    'Fútbol',
    'Tenis',
    'Basketball esports',
    'Hockey Hielo',
    'Fútbol americano',
];

const intentarEncontrarOpcion = async (page, match) => {
    try {
        let opciones = await page.locator('//div[@role = "tooltip"]//a');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let optPass = [];
            for (const opcion of opciones) {
                let text = await opcion.locator('//p').first().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                text = text.replace(' v ', ' ');
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
                console.log('CLOUDBET: ', quitarTildes(match), opt.name.trim());
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
    'Total',
    '2ª mitad - total de goles',
    '1ª mitad - total de goles',
    'Total de tarjetas',
    'Total de córneres',
    'Total (incluye prórroga) - Líneas alternativas',
    'Cuarto 1 - total',
    'Cuarto 2 - total',
    'Cuarto 3 - total',
    'Cuarto 4 - total',
    '2ª mitad - total (no incluye prórroga)',
    '1ª mitad - total',
    'Total de puntos',
    'Total de sets',
    'Total de juegos (el Super Tie Break cuenta como 1 juego)',
    'Total de juegos en el 1 set',
    'Total (incluye prórroga) - Líneas alternativas',
    '1 inning - Total',
    '1 periodo - total',
    '2 periodo - total',
    '3 periodo - total',
];

const permit2 = [
    'Total',
];

const permit3 = [
    '2ª mitad - total de goles',
    'Resultado al descanso',
    'Total de córneres',
    'Total de tarjetas',
    'Cuarto 1 - 1x2',
    '1ª mitad - 1x2',
    '2ª mitad - 1x2',
    'Total de sets',
    '1 inning - 1x2',
    '1 período - 1x2'
];

const getOption = el => {
    const opt = {
        '2ª mitad - total de goles': 'Segundo Tiempo',
        'Resultado al descanso': 'Primer Tiempo',
        'Total de córneres': 'Tiros de esquina',
        'Total de tarjetas': 'Bookings',
        'Cuarto 1 - 1x2': 'Cuartos',
        '1ª mitad - 1x2': 'Primer Tiempo',
        '2ª mitad - 1x2': 'Segundo Tiempo',
        'Total de sets': 'Sets',
        '1 inning - 1x2': 'Hit & Runs',
        '1 período - 1x2': 'Todas'
    }
    return opt[el];
}

async function getResultsCloudbet(match, betTypes = ['ganador del partido'], n, team1) {
    const { page, context } = await initBrowser('https://www.cloudbet.com/es/sports?s=soccer', 'mystake' + n);
    if (page) {
        try {
            let url = 'https://www.cloudbet.com/es/sports?s=soccer';
            page.setDefaultTimeout(timeouts.search);
            await page.locator('//*[@data-testid= "SearchIcon"]').click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            await page.waitForTimeout(4000);
            page.setDefaultTimeout(timeouts.bet);
            let cloudbet = {
                nombre: 'cloudbet',
                title: match,
                bets: [],
                url
            }
            for (const betType of betTypes) {
                try {
                    if (permit3.includes(betType.type)) {
                        try {
                            const all = page.locator(`//button[text() = "${getOption(betType.type)}"]`);
                            const visible = await all.isVisible();
                            for (let i = 0; i < 3; i++) {
                                if (!visible) {
                                    await page.locator('//*[@data-testid= "KeyboardArrowRightIcon"]').click();
                                } else {
                                    await page.waitForTimeout(500);
                                    await all.click();
                                    await page.waitForTimeout(500);
                                    break;
                                }
                            }
                        } catch (error) {

                        }
                    }
                    let type = await page.locator('//h6[text() = "' + betType.type + '"]').first();
                    if (!(await type.isVisible()) && betType.type == '2ª mitad - total (no incluye prórroga)') { betType.type = '2ª mitad - total (incluye prórroga)' }
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                    }
                    const parent = await page.locator('//h6[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*');
                    if (betType.type != 'Líneas de juego') {
                        let parent2;
                        if (permit2.includes(betType.type)) {
                            parent2 = await page.locator('//h6[text() = "' + betType.type + ' - Líneas alternativas"]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*');
                            if ((await parent2.isVisible())) {
                                const cl = await parent2.getAttribute('class');
                                if (!cl.includes('Mui-expanded')) {
                                    await parent2.click();
                                }
                            } else parent2 = null;

                        }
                        const cl = await parent.getAttribute('class');
                        if (!cl.includes('Mui-expanded')) {
                            await parent.click();
                        }
                        const bets = await parent.locator('//div[contains(@class, "MuiCollapse-wrapperInner")]//button').all();
                        if (bets.length > 1) {
                            let add = 'mas ';
                            for (const bet of bets) {
                                let name = await bet.locator('//div//p').first().textContent();
                                if (betType.type == 'Total') {
                                    name = await bet.locator('//div//p').nth(1).textContent();
                                }
                                if (permit1.includes(betType.type)) name = add + name;
                                let quote = await bet.locator('//div//p').last().textContent();
                                betTemp.bets.push({
                                    name,
                                    quote
                                });
                                add = add == 'mas ' ? 'menos ' : 'mas '
                            }
                            if (permit2.includes(betType.type) && parent2 != null) {
                                const bets2 = await parent2.locator('//div[contains(@class, "MuiCollapse-wrapperInner")]//button').all();
                                for (const bet of bets2) {
                                    let name = await bet.locator('//div//p').first().textContent();
                                    if (permit1.includes(betType.type)) name = add + name;
                                    let quote = await bet.locator('//div//p').last().textContent();
                                    betTemp.bets.push({
                                        name,
                                        quote
                                    });
                                    add = add == 'mas ' ? 'menos ' : 'mas '
                                }
                            }
                        }
                    } else {
                        let position = [5, 6];
                        if (categoryActual.current == 'baseball') position = [1, 2];
                        const bets = await page.locator(`(//h6[text() = "Líneas de juego"]/ancestor::*/following-sibling::*/descendant::div[contains(@class, "MuiCollapse-wrapperInner")]//div/button)[position()=${position[0]} or position()=${position[1]}]`).all();
                        const names = await page.locator('(//h6[text() = "Líneas de juego"]/ancestor::*/following-sibling::*/descendant::div[contains(@class, "MuiCollapse-wrapperInner")]//div/p)[position()=4 or position()=5]').all();
                        if (bets.length > 1) {
                            for (let i = 0; i < bets.length; i++) {
                                const quote = await bets[i].textContent();
                                const name = await names[i].textContent();
                                betTemp.bets.push({
                                    name,
                                    quote
                                });
                            }
                        }
                    }
                    // console.log(betType.type, betTemp)
                    cloudbet.bets.push(betTemp);
                    console.log('//////// CLOUDBET LENGTH', cloudbet.bets.length)
                } catch (error) {
                    //  console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// CLOUBET //////////////////')
            console.log('//////////////////// CLOUBET //////////////////')
            return cloudbet;
        } catch (error) {
            console.log(error);
            // await page.close();
        }
    }
}


module.exports = {
    getResultsCloudbet
}