const { timeouts } = require("../const/timeouts");
const { buscar } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(1000);
        const noResult = await page.getByText('No se han encontrado eventos').isVisible({ timeout: 5000 });
        return !noResult;

    } catch (error) {
        console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    try {
        let opciones = await page.locator('.event-container');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let pass = [];
            for (const opcion of opciones) {
                const local = await opcion.locator('.event-participant-name').first().textContent();
                const away = await opcion.locator('.event-participant-name').last().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                let text = quitarTildes(local + ' ' + away);
                console.log(text);
                const p = await tienenPalabrasEnComunDinamico(match, text);
                if (p.pass) pass.push({
                    name: text,
                    opcion
                })
            }
            for (const p of pass) {
                if (p) {
                    matchnames.push({
                        text1: match,
                        text2: p.name,
                        etiqueta: 1
                    });
                    console.log('BETOBET: ', match, p.name, pass.length);
                    await p.opcion.click();
                    return true;
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
    return false;
};

let url = '';

async function getResultsBetobet(match, betTypes = ['ganador del partido'], n) {
    const { page, context } = await initBrowser('https://betobet.one/es/', 'betobet' + n);
    if (page) {
        try {
            page.setDefaultTimeout(timeouts.search);
            await page.locator('(//div[text() = "Register" ])[1]').waitFor();
            await page.locator('(//div[text() = "Register" ])[1]').click();
            await page.getByText('Buscar equipo').click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.waitForLoadState('networkidle');
            let cont = 1;
            await page.locator('(//span[@test-id= "event-page.resize"])[1]').click();
            await page.waitForTimeout(700);
            await page.waitForTimeout(700);
            const all = page.locator('//span[text() = "Todos"]');
            await all.click();
            await page.waitForTimeout(700);
            page.setDefaultTimeout(timeouts.bet);
            let scroll = 400;
            const container = page.locator('//*[@test-id = "event.market-tabs"]');
            const size = await container.boundingBox();
            if (size.height < 3000) scroll = 0;
            url = await page.url();
            let betobet = {
                nombre: 'betobet',
                title: match,
                bets: [],
                url
            }
            for (const betType of betTypes) {
                try {
                    await page.mouse.wheel(0, scroll / 2);
                    if (cont == 6 && size.height > 3000) scroll = 600;
                    if (cont == 8 && size.height > 3000) scroll = 850;
                    // if (betType.type == 'resultado del 2do tiempo') await page.getByText('Tiempos', { exact: true }).click();
                    let type = await page.locator('xpath=(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "' + betType.type + '"])[1]').first();
                    await type.waitFor({ state: 'visible' });
                    type = await type.textContent();
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                        url,
                    }
                    const parent = await page.locator('(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "' + betType.type + '"])[1]/parent::*');
                    const cl = await parent.getAttribute('class');
                    if (!cl.includes('expanded')) {
                        page.setDefaultTimeout(5000);
                        await page.waitForLoadState('domcontentloaded')
                        await parent.scrollIntoViewIfNeeded();
                        await parent.click();
                        await page.waitForTimeout(1700);
                        page.setDefaultTimeout(timeouts.bet);
                    }
                    const bets = await page.locator('xpath=(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "' + betType.type + '"])[1]/parent::*/parent::*//div[contains(@class, "group-selection-table")]/*').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            if (betType.type != 'número de goles') {
                                const name = await bet.locator('.obg-selection-base-label').textContent();
                                const quote = await bet.locator('.obg-selection-base-odds').textContent();
                                betTemp.bets.push({
                                    name,
                                    quote
                                });
                            } else {
                                const active = await page.locator('//*[@test-id="sub-tab.football.first-half"]');
                                if (await active.count() > 0) {
                                    const isDisabled = await active.first()
                                        .evaluate(el => el.classList.contains("active"));
                                    if (!isDisabled) {
                                        const name = await bet.locator('.obg-selection-base-label').textContent();
                                        const quote = await bet.locator('.obg-selection-base-odds').textContent();
                                        betTemp.bets.push({
                                            name,
                                            quote
                                        });
                                    }
                                }
                            }
                        }
                    }
                    betobet.bets.push(betTemp);
                    await page.mouse.wheel(0, scroll / 2);
                    console.log('//////// BETOBET LENGTH', betobet.bets.length)
                } catch (error) {
                    console.log(error)
                    console.log('ERRO AL ENCONTRAR APUESTA')
                }
                cont++;
            }
            console.log('//////////////////// BETOBET //////////////////')
            console.log('//////////////////// BETOBET //////////////////')
            return betobet;
        } catch (error) {
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsBetobet
}