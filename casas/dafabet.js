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
        const search = await page.getByPlaceholder('Búsqueda de Equipo / Jugador').first();
        await search.fill(query.length > 2 ? query : query + " 000");
        await search.press('Enter');
        await page.waitForTimeout(2000);
        const noResult = await page.getByText('No se han encontrado resultados').isVisible({ timeout: 5000 });
        return !noResult;
    } catch (error) {
        console.log(error)
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    try {
        let opciones = await page.locator('.search-result-item');
        if (await opciones.first().isVisible({ timeout: 3000 })) {
            opciones = await opciones.all();
            let optPass = [];
            for (const opcion of opciones) {
                const text = await opcion.locator('a').first().textContent();
                match = quitarTildes(match.replace(' - ', ' '));
                const p = await tienenPalabrasEnComunDinamico(match, text);
                if (p.pass) optPass.push({
                    name: text,
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
                console.log('DATABET: ', quitarTildes(match), opt.name.trim());
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
    'Más/Menos - Tiempo Regular',
    'Más/Menos - Segundo tiempo',
    'Más/Menos - Primer tiempo',
    'Corners Más/Menos - Primer tiempo',
    'Corners Más/Menos - Tiempo Regular',
    'Bookings Más/Menos - Tiempo Regular',
];

async function getResultsDafabet(match, betTypes = ['ganador del partido'], n) {
    const { page, context } = await initBrowser('https://www.dafabet.com/es/dfgoal/sports', 'dafabet' + n);
    if (page) {
        try {
            let url = 'https://www.dafabet.com/es/dfgoal/sports';
            page.setDefaultTimeout(timeouts.search);
            await page.getByText('Buscar').click();
            const encontrado = await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            url = await page.url();
            await page.getByText('Todos (').click();
            page.setDefaultTimeout(timeouts.bet);
            let dafabet = {
                nombre: 'dafabet',
                title: match,
                bets: [],
                url
            }
            for (const betType of betTypes) {
                try {
                    let type = await page.locator('//h2[normalize-space(text()) = "' + betType.type + '"]').first();
                    await type.waitFor({ state: 'visible' });
                    let betTemp = {
                        id: Object.keys(betType)[0],
                        type: betType.type,
                        bets: [],
                        url,
                    }
                    const parent = await page.locator('//h2[normalize-space(text()) = "' + betType.type + '"]/parent::*');
                    const cl = await type.getAttribute('class');
                    if (cl.includes('collapsed')) {
                        await parent.click();
                    }
                    const bets = await page.locator('//h2[normalize-space(text()) = "' + betType.type + '"]/parent::*//td').all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('.name ').textContent();
                            let quote = await bet.locator('.price').textContent();
                            name = name.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                            quote = quote.replace(/\n+/g, ' ').trim();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    if (permit1.includes(betType.type)) {
                        betTemp.bets = betTemp.bets.filter(bet => {
                            // Expresión regular para buscar patrones como '1.5', '0.5' pero no '1,1.5', '4,2.5'
                            const decimalRegex = /^(Más|Menos) ([0-9]\.?[05])$/;

                            // Devuelve true si el nombre coincide con 'Más 0.5', 'Menos 0.5', 'Más 1.5' o 'Menos 1.5'
                            return decimalRegex.test(bet.name);
                        });
                    }
                    // console.log(betTemp)
                    dafabet.bets.push(betTemp);
                    console.log('//////// DAFABET LENGTH', dafabet.bets.length)
                } catch (error) {
                    // console.log(error)
                    console.log('ERROR AL ENCONTRAR APUESTA')
                }
            }
            console.log('//////////////////// DAFABET //////////////////')
            console.log('//////////////////// DAFABET //////////////////')
            return dafabet;
        } catch (error) {
            console.log(error);
            // await page.close();
        }
    }
}


module.exports = {
    getResultsDafabet
}