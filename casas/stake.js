const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.locator('#event_search_sbx').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await page.waitForTimeout(2500);
        const noResult = await page.getByText('No se han encontrado resultados', { timeout: 10000 }).isVisible();
        return !noResult;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    await page.waitForTimeout(2500);
    const posibleOpcion = page.locator('.wpt-event-info');
    await posibleOpcion.first().waitFor({ state: 'visible' });
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let home = await opcion.locator('.wpt-teams__team').first().textContent();
        let away = await opcion.locator('.wpt-teams__team').last().textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = home + ' ' + away;
        text = quitarTildes(text);
        const p = await tienenPalabrasEnComunDinamico(match, text, 75);
        if (p.pass) optPass.push({ opcion, similarity: p.similarity, text });
    }
    const opt = await selectMoreOption(optPass);
    if (opt) {
        matchnames.push({
            text1: match,
            text2: opt.text,
            etiqueta: 1
        });
        console.log('STAKE: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'total SUPERIOR',
    'Total SUPERIOR',
    'SUPERIOR'
];

const permit2 = [
    'Total INFERIOR',
    'total INFERIOR',
    'UND',
    'INFERIOR'
];

const permit3 = [
    '1X2',
    'Resultado 1er mitad',
    'Doble Oportunidad',
];

function transformarNombre(name) {
    for (const term of permit1) {
        if (name.includes(term)) {
            name = name.replace(/total superior/gi, 'mas de');
            name = name.replace(/superior/gi, 'mas de');
            name = name.replace(/total de juegos superior/gi, 'mas de');
            name = name.replace(/totales superior/gi, 'mas de');
            break;
        }
    }
    for (const term of permit2) {
        if (name.includes(term)) {
            name = name.replace(/total inferior/gi, 'menos de');
            name = name.replace(/total de juegos inferior/gi, 'menos de');
            name = name.replace(/und/gi, 'menos de');
            name = name.replace(/inferior/gi, 'menos de');
            name = name.replace(/totales inferior/gi, 'menos de');
            break;
        }
    }
    return name;
}

async function getResultsStake(match, betTypes = ['Resultado Tiempo Completo'], n, team1) {
    const { page, context } = await initBrowser('https://stake.com.co/es/deportes', 'stake' + n);
    if (page) {
        try {
            let url = '';
            await page.getByRole('link', { name: 'casino Casino' }).click();
            await page.waitForTimeout(1300);
            await page.getByRole('link', { name: 'sports Deportes' }).click();
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.locator('//a[contains(@class ,"wmf-navbar__item__link") and text() = "Todos"]').click();
            page.setDefaultTimeout(1300);
            page.setDefaultTimeout(timeouts.bet);
            url = await page.url();
            let stake = {
                nombre: 'stake',
                title: match,
                bets: [],
                url
            }
            let scroll = 400;
            const container = page.locator('.content-container');
            const size = await container.boundingBox();
            if (size.height < 3000) scroll = 0;
            for (const betType of betTypes) {
                try {
                    await page.mouse.wheel(0, scroll / 2);
                    let parent;
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        bets: []
                    }
                    parent = await page.locator('//div[@class = "wol-market__header__title" and text() = "' + betType.type + '"]/parent::*/parent::*');
                    const container = await parent.locator('//header/div[2]').getAttribute('class');
                    if (container.includes('collapsed')) {
                        await parent.click();
                        await page.waitForTimeout(700);
                    }
                    const type = await page.locator('//div[@class = "wol-market__header__title" and text() = "' + betType.type + '"]').first().textContent();
                    betTemp.type = type

                    const bets = await parent.locator('//div[contains(@id, "event_odd_id_")]').all();
                    if (bets.length > 1) {
                        let cont = 0;
                        for (const bet of bets) {
                            let name = await bet.locator('.wol-odd__info').first().textContent();
                            const quote = await bet.locator('.wol-odd__value').last().textContent();
                            name = transformarNombre(name);
                            betTemp.bets.push({
                                name,
                                quote
                            });
                            cont++;
                            if(cont == 3 && betType.type == '1X2') break;
                        }
                    }
                    // console.log(betTemp)
                    stake.bets.push(betTemp);
                    console.log('//////// STAKE LENGTH ', stake.bets.length)
                } catch (error) {
                    //console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }

            }
            console.log('//////////////////// STAKE //////////////////')
            console.log('//////////////////// STAKE //////////////////')
            return stake;
        } catch (error) {
            console.log('ERRPR STAKE STAKE STAKE STAKE ERRPR');
        }
    }
}

module.exports = {
    getResultsStake
}