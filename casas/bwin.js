const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    scrollToBottom,
    categoryActual
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.locator('//*[@type = "search"]').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await search.press('Enter');
        await page.waitForTimeout(2000);
        const noResult = await page.getByText('SIN RESULTADOS').isVisible({ timeout: 5000 });
        return !noResult;
    } catch (error) {
        console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    try {
        let opciones = await page.locator('//ms-grid-search-result-card//*[contains(@class, "grid-event-wrapper")]');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let optPass = [];
            for (const opcion of opciones) {
                const local = await opcion.locator('.participant').first().textContent();
                const away = await opcion.locator('.participant').last().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                let text = local + away;
                const p = await tienenPalabrasEnComunDinamico(match, text);
                if (p.pass) optPass.push({
                    name: text,
                    similarity: p.similarity,
                    opcion: await opcion.locator('a').first()
                })
            }
            const opt = await selectMoreOption(optPass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.text,
                    etiqueta: 1
                });
                console.log('BWIN: ', quitarTildes(match), opt.name.trim());
                let link = await opt.opcion.getAttribute('href');
                link = 'https://sports.bwin.co' + link;
                await page.goto(link);
                await page.waitForTimeout(1000);
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
    'Total de goles-2º tiempo',
    'Ambos equipos marcan-2º tiempo',
    'Doble oportunidad-2º tiempo',
    'Resultado del partido-2º tiempo',
    'Total de goles-1º tiempo',
    'Ambos equipos marcan-1º tiempo',
    'Doble oportunidad-1º tiempo',
    'Resultado del partido-1º tiempo',
    'Número de córners-1º tiempo'
];

let permit2 = [
    'Total de goles',
    'Número de córners',
    'Número total de tarjetas amarillas'
]

async function getResultsBwin(match, betTypes = ['ganador del partido'], n) {
    if(categoryActual.current == 'tennis') return;
    const { page, context } = await initBrowser('https://sports.bwin.co/es/sports?popup=betfinder', 'bwin' + n);
    if (page) {
        try {
            let url = 'https://sports.bwin.co/es/sports?popup=betfinder';
            page.setDefaultTimeout(timeouts.search);
            const close = page.locator('//span[contains(@class, "theme-ex")]');
            if (await close.isVisible({ timeout: 5000 })) await close.click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            let all = await page.locator('li').filter({ hasText: 'Todo' }).locator('a');
            if (await all.isVisible()) await all.click();
            page.setDefaultTimeout(timeouts.bet);
            let bwin = {
                nombre: 'bwin',
                title: match,
                bets: [],
                url
            }
            const allBets = page.getByText('Todas las apuestas');
            if (await allBets.isVisible()) await allBets.click();
            await scrollToBottom(page);
            for (const betType of betTypes) {
                try {
                    if (betType.type == 'Número de córners') {
                        await page.waitForTimeout(500);
                        await page.locator('//ms-dropdown/div/span[normalize-space(text()) = "Más"]').click();
                        await page.locator('//div[normalize-space(text()) = "Córners"]').click();
                        await page.waitForTimeout(500);
                        await page.waitForTimeout(200);
                    }
                    if (betType.type == 'Número total de tarjetas amarillas') {
                        await page.waitForTimeout(500);
                        await page.locator('//ms-dropdown/div/span[normalize-space(text()) = "Córners"]').click();
                        await page.locator('//div[normalize-space(text()) = "Tarjetas/penaltis"]').click();
                        await page.waitForTimeout(500);
                        await page.waitForTimeout(200);
                    }
                    let typeTemp = '';
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                    }
                    if (permit1.includes(betType.type)) {
                        let sub = betType.type.split('-');
                        betType.type = sub[0];
                        typeTemp = sub[1];
                    }
                    let type = await page.locator('//span[text() = "' + betType.type + '"]').first();
                    await type.waitFor({ state: 'visible' });
                    const parent = await page.locator('(//span[text() = "' + betType.type + '"]/parent::*/parent::*/parent::*/parent::*/parent::*/parent::*)[1]');
                    const cl = await parent.locator('.option-group-header-title').getAttribute('class');
                    if (!cl.includes('expanded')) {
                        await parent.click();
                    }
                    let change = false;
                    if (typeTemp != '') {
                        let loca = parent.locator('xpath=/div/ms-period-option-group/ms-tab-bar//*[text() = "' + typeTemp + '"]');
                        if (await loca.isVisible({ timeout: 2000 })) {
                            // console.log('///////fesfsgsges/gsgsegsgeseg/se/gs/eg/sg/ese/gseges' + betType.type + typeTemp)
                            let bets = await parent.locator('.option-indicator').all();
                            let temp = [];
                            if (bets.length > 1) {
                                for (const bet of bets) {
                                    let name = await bet.locator('.name').textContent();
                                    let quote = await bet.locator('.value').textContent();
                                    temp.push({
                                        name,
                                        quote
                                    });
                                }
                                console.log(temp)
                            }
                            await loca.click();
                            await page.waitForTimeout(700);
                            bets = await parent.locator('.option-indicator').all();
                            let temp2 = [];
                            if (bets.length > 1) {
                                for (const bet of bets) {
                                    let name = await bet.locator('.name').textContent();
                                    let quote = await bet.locator('.value').textContent();
                                    temp2.push({
                                        name,
                                        quote
                                    });
                                }
                                console.log(temp2)
                            }
                            change = false;
                            for (let i = 0; i < temp.length; i++) {
                                if (temp[i] != temp2[i]) {
                                    change = true;
                                    break;
                                }
                            }
                            if (change) {
                                bwin.bets.push(temp2);
                                change = false;
                            }
                        } else change = false;
                    }
                    if (permit2.includes(betType.type)) {
                        const more = await parent.getByText('Mostrar más');
                        if (await more.isVisible()) await more.click();
                    }
                    const bets = await parent.locator('.option-indicator').all();
                    if (bets.length > 1 && change) {
                        for (const bet of bets) {
                            let name = await bet.locator('.name').textContent();
                            let quote = await bet.locator('.value').textContent();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                        // console.log(betTemp)
                        bwin.bets.push(betTemp);
                        console.log('//////// BWIN LENGTH', bwin.bets.length)
                    }

                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// BWIN //////////////////')
            console.log('//////////////////// BWIN //////////////////')
            return bwin;
        } catch (error) {
            console.log(error);
            // await page.close();
        }
    }
}


module.exports = {
    getResultsBwin
}