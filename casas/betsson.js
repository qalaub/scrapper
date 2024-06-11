const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const ignore = await page.getByText('Ignore');
        if (await ignore.first().isVisible()) await ignore.first().click();
        const close = page.locator('(//span[@obg-icon="close-gen2"])[1]');
        if (await close.isHidden()) await close.click({ timeout: 2000 });
        const searchB = await page.locator('xpath=//button[@test-id ="sportsbook-search.button"]').first();
        await searchB.click();
        const search = await page.locator('xpath=//*[@id="mat-input-0"]').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await search.press('Space');
        await page.waitForTimeout(2000);
        const noResultLocator = await page.getByText('No se encontraron resultados coincidentes para');
        const noResult = await noResultLocator.isVisible({ timeout: 5000 });
        if (noResult) {
            await search.fill('');
            if (close) await close.click({ timeout: 2000 });
        }
        return !noResult;

    } catch (error) {
        // console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    try {
        await page.waitForTimeout(1000);
        await page.locator('//mat-option').first().click();
        await page.waitForTimeout(1000);
        let opciones = await page.locator('//div[@test-id = "event.row"]');
        if (await opciones.first().isVisible({ timeout: 2000 })) {
            opciones = await opciones.all();
            let pass = [];
            for (const opcion of opciones) {
                const local = await opcion.locator('.obg-event-info-participants-name').first().textContent();
                const away = await opcion.locator('.obg-event-info-participants-name').last().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                let text = quitarTildes(local + ' ' + away);
                const p = await tienenPalabrasEnComunDinamico(match, text);
                // console.log(text)
                if (p.pass) pass.push({
                    similarity: p.similarity, 
                    name: text,
                    opcion
                })
            }
            const opt = await selectMoreOption(pass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.name,
                    etiqueta: 1
                });
                console.log('BETSON: ', match, opt.name);
                await opt.opcion.locator('xpath=//div/a').first().click();
                return true;
            }
            return false;
        }
    } catch (error) {
        // console.log(error);
    }
    return false;
};

async function getResultsBetsson(match, betTypes = ['ganador del partido'], n) {
    const { page, context } = await initBrowser('https://www.betsson.co/apuestas-deportivas', 'betsson' + n);
    if (page) {
        try {
            let url = '';
            page.setDefaultTimeout(timeouts.search);
            const ignore = await page.getByText('Ignorar');
            if (await ignore.first().isVisible({ timeout: 10000 })) await ignore.first().click();
            // const updateBrowser = await page.getByText('Actualizar navegador');
            // if (await updateBrowser.first().isVisible()) await updateBrowser.first().click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;;
            let cont = 1;
            await page.locator('(//span[@test-id= "event-page.resize"])[1]').click();
            await page.waitForTimeout(700);
            await page.waitForTimeout(700);
            const all = page.locator('//span[text() = "Todos"]');
            await all.click();
            await page.waitForTimeout(700);
            url = await page.url();
            page.setDefaultTimeout(timeouts.bet);
            let scroll = 400;
            const container = page.locator('//*[@test-id = "event.market-tabs"]');
            const size = await container.boundingBox();
            // console.log(size.height)
            if (size.height < 1700) scroll = 0;
            let betsson = {
                nombre: 'betsson',
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
                    }
                    let parent = await page.locator('(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "' + betType.type + '"])[1]/parent::*/parent::*/parent::*/parent::*');
                    if (betType.type == 'número de goles') {
                        parent = await page.locator('(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "' + betType.type + '"])[1]/parent::*/parent::*/parent::*');
                    }
                    const cl = await parent.getAttribute('class');
                    if (cl.includes('item-closed')) {
                        page.setDefaultTimeout(5000);
                        await page.waitForLoadState('domcontentloaded')
                        await parent.scrollIntoViewIfNeeded();
                        await parent.click();
                        await page.waitForTimeout(1700);
                        page.setDefaultTimeout(timeouts.bet);
                    }
                    let bets = await page.locator('(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "' + betType.type + '"])[1]/parent::*/parent::*/parent::*/parent::*//div[contains(@class, "group-selection-table")  or contains(@class, "obg-selections-group")]//obg-selection-base').all();
                    if (betType.type == 'número de goles') {
                        let tempBets = await page.locator('(//div[@test-id = "event-markets.content"]//span[translate(normalize-space(text()), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") = "total de goles"])[1]/parent::*/parent::*/parent::*/parent::*//div[contains(@class, "group-selection-table")  or contains(@class, "obg-selections-group")]//obg-selection-base').all();
                        if (bets.length > 0) bets = tempBets;
                    }
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            if (betType.type != 'número de goles') {
                                const name = await bet.locator('.obg-selection-v2-label').textContent();
                                const quote = await bet.locator('.obg-numeric-change-container-odds-value').textContent();
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
                                        const name = await bet.locator('.obg-selection-v2-label').textContent();
                                        const quote = await bet.locator('.obg-numeric-change-container-odds-value').textContent();
                                        betTemp.bets.push({
                                            name,
                                            quote
                                        });
                                    }
                                }
                            }
                        }
                    }
                    betsson.bets.push(betTemp);
                    // console.log(betTemp)
                    await page.mouse.wheel(0, scroll / 2);
                    console.log('//////// BETSON LENGTH', betsson.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERRO AL ENCONTRAR APUESTA')
                }
                cont++;
            }
            console.log('//////////////////// BETSSON //////////////////')
            console.log('//////////////////// BETSSON //////////////////')
            return betsson;
        } catch (error) {
            // console.log(error);
            // await page.close();
        }
    }
}

const excludes = ["deportivo", "club", "FC", "Al", "(KSA)", "IF", 'atletico'];

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let betssonSearch = await initRequest(`https://www.betsson.co/api/sb/v2/search/suggestions?searchText=${text}`);
        return betssonSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            const pass = res.filter(q => tienenPalabrasEnComunDinamico(match, q.name, 75));
            if (pass) return pass[0].link;
        }
    }
}

async function getBetssonApi(name, types) {
    try {
        const link = await buscarApi(name);
        console.log(link)
        const res = await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${link}&lng=es&isSubGames=true&GroupEvents=true&allEventsGroupSubGames=true&countevents=250&country=91&fcountry=91&marketType=1&gr=70&isNewBuilder=true`);
        types = types.map(type => getType(type));
        return {
            nombre: '1xbet',
            title: name,
            bets: filter
        }
    } catch (error) {
    }
}

module.exports = {
    getResultsBetsson,
    getBetssonApi
}