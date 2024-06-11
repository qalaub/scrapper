const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    tienenPalabrasEnComunDinamicoT,
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        const search = await page.getByPlaceholder('Buscar').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await search.press('Enter');
        await page.waitForTimeout(2500);
        const noResult = await page.getByText('¡Nada Encontrado! Por favor, prueba con otra solicitud o ve a Live y juega!', { timeout: 5000 }).isVisible();
        return !noResult;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const tempMatch = match.split(' ')[1];
    const posibleOpcion = page.getByRole('link', { name: tempMatch })
    await posibleOpcion.first().waitFor({ state: 'visible' });
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        let home = await opcion.locator('//div/div/div').nth(1).textContent();
        let away = await opcion.locator('//div/div/div').nth(2).textContent();
        home = home.trim();
        away = away.trim();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = home + ' ' + away;
        text = quitarTildes(text).replace(/\//g, '');
        // console.log(text)
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
        console.log('BCGAME: ', match, opt.text);
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
            break;
        }
    }
    for (const term of permit2) {
        if (name.includes(term)) {
            name = name.replace(/total inferior/gi, 'menos de');
            name = name.replace(/total de juegos inferior/gi, 'menos de');
            name = name.replace(/und/gi, 'menos de');
            name = name.replace(/inferior/gi, 'menos de');
            break;
        }
    }
    return name;
}

async function getResultsBcgame(match, betTypes = ['Resultado Tiempo Completo'], n, team1) {
    match = match.replace(',', '');
    const { page, context } = await initBrowser('https://bc.game/es/', 'bcgame' + n);
    if (page) {
        try {
            const close = await page.locator('.close-icon');
            if (await close.isVisible({ timeout: 5000 })) await close.click();
            else {
                await page.goto('https://www.google.com/search?q=bc+game&oq=bc+game&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCDEzODRqMGo0qAIAsAIA&sourceid=chrome&ie=UTF-8');
                await page.getByRole('link', { name: 'Casino Home' }).click();
                if (await close.isVisible({ timeout: 5000 })) await close.click();
                await page.getByRole('link', { name: 'Deportes', exact: true }).click();
                if (await close.isVisible({ timeout: 5000 })) await close.click();
                await page.locator('div:nth-child(24) > .bt38 > svg').click();
            }
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.waitForTimeout(2500);
            await page.locator('#event-header').getByRole('link', { name: 'Cuotas' }).click();
            page.setDefaultTimeout(timeouts.bet);
            url = await page.url();
            let bcgame = {
                nombre: 'bcgame',
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
                        for (const bet of bets) {
                            let name = await bet.locator('.wol-odd__info').first().textContent();
                            const quote = await bet.locator('.wol-odd__value').last().textContent();
                            name = transformarNombre(name);
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    // console.log(betTemp)
                    bcgame.bets.push(betTemp);
                    console.log('//////// BCGAME LENGTH ', bcgame.bets.length)
                } catch (error) {
                    //console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }

            }
            console.log('//////////////////// BCGAME //////////////////')
            console.log('//////////////////// BCGAME //////////////////')
            return bcgame;
        } catch (error) {
            console.log('ERRPR BCGAME BCGAME BCGAME BCGAME ERRPR');
            console.log(error);
        }
    }
}

module.exports = {
    getResultsBcgame
}