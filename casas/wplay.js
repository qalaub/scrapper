const { timeouts } = require("../const/timeouts");
const { buscar, selectMoreOption } = require("../logic/utils/buscar");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        await page.getByText('Buscar eventos, juegos').first().fill(query);
        await page.getByText('Buscar eventos, juegos').first().press('Enter');
        await page.waitForTimeout(1500);
        const noResult = await page.getByText('Lo sentimos, no hay resultados para tu búsqueda.', { timeout: 10000 }).isVisible();
        return !noResult;
    } catch (error) {
        console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const posibleOpcion = page.locator('xpath=//div[@class = "title"]/a');
    let opciones = await posibleOpcion.all();
    let optPass = [];
    for (const opcion of opciones) {
        const title = await opcion.textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(title.trim());
        if (text.includes("Especiales")) continue;
        const p = await tienenPalabrasEnComunDinamico(match, text);
        if (p.pass) optPass.push({ opcion, similarity: p.similarity, text });
    }
    const opt = await selectMoreOption(optPass);
    if (opt) {
        matchnames.push({
            text1: match,
            text2: opt.text,
            etiqueta: 1
        });
        console.log('WPLAY: ', quitarTildes(match), opt.text.trim());
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

const permit1 = [
    'Doble Oportunidad',
    'Ambos Equipos anotarán en la 1er Mitad',
    'Doble Oportunidad 1ª Mitad',
    'Tiros de esquina más/Menos de (9.5)',
    'Equipo con más Tiros de Esquina',
    'Total de Tarjetas (3.5)'
]

const permit2 = [
    'Se clasificará',
    'Se anotarán goles en ambas mitades',
]

async function getResultsWPlay(match, betTypes = ['Resultado Tiempo Completo'], n) {
    const { page, context } = await initBrowser('https://apuestas.wplay.co/es/', 'wplay' + n);
    if (page) {
        try {
            page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            let betWplay = {
                nombre: 'wplay',
                title: match,
                bets: []
            };
            await page.waitForTimeout(3000);
            page.setDefaultTimeout(timeouts.bet);
            for (const betType of betTypes) {
                try {
                    const locatorBet = 'xpath=(//span[normalize-space(text()) = "' + betType.type + '"])[1]';
                    await page.waitForSelector(locatorBet, { state: 'visible' });
                    let type = await page.locator(locatorBet).textContent();
                    type = type.trim().replace(/\n+/g, '').replace(/★/g, '').replace(/^Crear ApuestaRECUPERAR APUESTA DISPONIBLE/g, '');
                    if (type.includes('Cuota Mejorada')) continue;
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: []
                    }
                    const parent = await page.locator('xpath=(//span[normalize-space(text()) = "' + betType.type + '"]/parent::*)[1]/parent::div');
                    const cl = await parent.getAttribute('class');
                    if (cl.includes('expander-collapsed')) {
                        page.setDefaultTimeout(5000);
                        await parent.scrollIntoViewIfNeeded();
                        await parent.scrollIntoViewIfNeeded();
                        await parent.click();
                        await page.waitForTimeout(1700);
                        page.setDefaultTimeout(timeouts.bet);
                    }
                    let bets = await parent.locator('td').all();
                    if (permit1.includes(betType.type)) bets = await page.locator('(//span[normalize-space(text()) = "' + betType.type + '"]/parent::*)[1]/parent::div//li').all();
                    if (betType.type == 'Lineas del Juego') bets = await page.locator('(//span[normalize-space(text()) = "' + betType.type + '"]/parent::*)[1]/parent::div//td[last()]').all();
                    if (permit2.includes(betType.type)) bets = await page.locator('(//span[normalize-space(text()) = "' + betType.type + '"]/parent::*)[1]/parent::div//td').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            // await bet.scrollIntoViewIfNeeded();
                            let name = await bet.locator('.seln-label').textContent();
                            const quote = await bet.locator('.price.dec').textContent();
                            name = name.replace(/\n+/g, ' ').trim();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    betWplay.bets.push(betTemp);
                    console.log('//////// WPLAY LENGTH', betWplay.bets.length)
                } catch (error) {
                    // console.log(error)
                }
            }
            console.log('//////////////////// WPLAY //////////////////')
            console.log('//////////////////// WPLAY //////////////////')
            return betWplay;
        } catch (error) {
            console.log('ERRPR WPLAY WPLAY WPLAY WPALY ERRPR');
            console.log(error);
            // await page.close();
        }
    }
}

module.exports = {
    getResultsWPlay
}