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

const buscarQ = async (page, query) => {
    try {
        const search = await page.locator('//div[@id = "modal"]//input').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(1500);
        const noResult = await page.getByText('No se han encontrado resultados').isVisible({ timeout: 5000 });
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
        let opciones = await page.locator('//a[contains(@class, "hover:bg-surface-light")]');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let optPass = [];
            let currentCat = '';
            for (const opcion of opciones) {
                let category = await opcion.locator('//parent::*/div');
                if (await category.first().isVisible()) {
                    let temp = await category.first().textContent();
                    if(categories.includes(temp)) {
                        currentCat = temp;
                    }
                }
                if(!categoriesPermit.includes(currentCat)) continue;
                const local = await opcion.locator('//div[@class = "truncate"]').first().textContent();
                const away = await opcion.locator('//div[@class = "truncate"]').last().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                let text = local + ' - ' + away;
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
                console.log('GGBET: ', quitarTildes(match), opt.name.trim());
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

let permit1 = [
    'Total',
    '2nd half - 1x2',
    '1st Mitad - total',
    'Córneres - Total',
    'Tarjetas amarillas - Total',
    '1 tiempo - Tarjetas amarillas - Total',
];

const permit2 = [
    '1x2',
];

async function getResultsGgbet(match, betTypes = ['ganador del partido'], n, team1) {
    if (categoryActual.current == 'tennis') return;
    const { page, context } = await initBrowser('https://gg.bet/es', 'ggbet' + n);
    if (page) {
        try {
            let url = 'https://gg.bet/es';
            page.setDefaultTimeout(timeouts.search);
            await page.getByText('Buscar').click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.locator('//*[@data-tab = "All"]').click();
            await page.waitForTimeout(2000);
            if((await page.getByText('NBA 2k24').isVisible())) return [];
            url = await page.url();
            page.setDefaultTimeout(timeouts.bet);
            let ggbet = {
                nombre: 'ggbet',
                title: match,
                bets: [],
                url
            }
            let scroll = 600;
            let cont = 1;
            const container = page.locator('body');
            const size = await container.boundingBox();
            if (size.height < 3000) scroll = 0;
            for (const betType of betTypes) {
                try {
                    await page.mouse.wheel(0, scroll / 2);
                    if (cont == 6 && size.height > 3000) scroll = 700;
                    if (cont == 8 && size.height > 3000) scroll = 900;
                    let type = await page.locator('//div[text() = "' + betType.type + '"]').first();
                    await type.waitFor({ state: 'visible' });
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                    }
                    const parent = await page.locator('//div[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*');
                    const cl = await parent.locator('//div/div').first().getAttribute('class');
                    if (cl.includes('mb-0')) {
                        await parent.click();
                    }
                    const bets = await parent.locator('//div[@data-action="Select odd"]').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('//div/div').first().textContent();
                            let quote = await bet.locator('//div/div').nth(1).textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    if (permit2.includes(betType.type)) {
                        console.log('////////////////////////////////////////')
                        if (!tienenPalabrasEnComunDinamicoT(betTemp.bets[0].name, team1)) {
                            if (betTemp.bets.length == 2) {
                                let temp = betTemp.bets[0];
                                betTemp.bets[0] = betTemp.bets[1];
                                betTemp.bets[1] = temp;
                            } else if (betTemp.bets.length == 3) {
                                let temp = betTemp.bets[0];
                                betTemp.bets[0] = betTemp.bets[2];
                                betTemp.bets[2] = temp;
                            }
                        }
                        console.log('////////////////////////////////////////')
                    }
                    if (permit1.includes(betType.type)) {
                        betTemp.bets = orderBetMoreLess(betTemp.bets);
                    }
                    // console.log(betType.type, betTemp)
                    ggbet.bets.push(betTemp);
                    await page.mouse.wheel(0, scroll / 2);
                    console.log('//////// GGBET LENGTH', ggbet.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// GGBET //////////////////')
            console.log('//////////////////// GGBET //////////////////')
            return ggbet;
        } catch (error) {
            console.log(error);
            // await page.close();
        }
    }
}


module.exports = {
    getResultsGgbet
}