const { timeouts } = require("../const/timeouts");
const { groupAndReduceBetsByType } = require("../logic/surebets");
const { excludes, buscar, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { getType1xbet } = require("./1xbet");
const {
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    ordenarDinamicamenteMasMenos,
    matchnames,
    initBrowser
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        let search = page.locator('#search-in-popup');
        if (!await search.isVisible()) search = await page.getByPlaceholder('Búsqueda por partido').first();
        await search.fill(query);
        await search.first().press('Enter');
        await page.waitForTimeout(1500); // Espera para que se carguen los resultados
        const noResult = await page.getByText('No hay resultados').first().isVisible({ timeout: 10000 });
        return !noResult;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    await page.waitForTimeout(1000);
    const opciones = await page.locator('.games-search-modal-card-info__main').all();
    let optPass = [];
    for (const opcion of opciones) {
        const title = await opcion.textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(title.trim());
        const p = await tienenPalabrasEnComunDinamico(match, text);
        const result = await page.locator(`//span[contains(text(), "${title}")]/parent::*/parent::*/parent::*`);
        if (p.pass) optPass.push({ opcion: result, similarity: p.similarity, text });
    }
    const opt = await selectMoreOption(optPass);
    if (opt) {
        matchnames.push({
            text1: match,
            text2: opt.text,
            etiqueta: 1
        });
        console.log('BETWINNER: ', match, opt.text);
        await opt.opcion.waitFor({ state: 'visible' });
        await opt.opcion.click();
        return true;
    }
    return false;
};

async function getResultsBetwinner(match, betTypes = ['1x2'], n) {
    const { page, context } = await initBrowser('https://betwinner-792777.top/es', 'betwinner', n);
    if (page) {
        try {
            const matchTemp = match.replace(/\b(Club|Atletico)\b/gi, "").replace(/\s{2,}/g, ' ').trim();
            const encontrado = await buscar(page, matchTemp, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            let ids = [];
            let type = '';
            page.on('request', request => {
                let url = request.url();
                if (url.includes('Zip') && url.includes('id=')) {
                    let temp = url.substring(url.indexOf('id=') + 3);
                    ids.push({
                        id: temp.substring(0, temp.indexOf('&lng')),
                        type
                    });
                }
            });
            await page.waitForTimeout(3000);
            page.setDefaultTimeout(1000);
            await page.locator('div').filter({ hasText: /^Tiempo reglamentario$/ }).nth(3).click();
            if (await page.getByRole('button', { name: '1 Mitad', exact: true }).isVisible()) {
                type = "1 Mitad"
                await page.getByRole('button', { name: '1 Mitad', exact: true }).click();
                await page.locator('#game_toolbar').getByText('Mitad').click();
            }
            type = "2 Mitad";
            await page.getByRole('button', { name: '2 Mitad', exact: true }).click();
            await page.locator('#game_toolbar span').filter({ hasText: 'Mitad' }).nth(1).click();
            type = "Saques de esquina";
            await page.getByRole('button', { name: 'Saques de esquina', exact: true }).click();
            await page.getByText('Saques de esquina').click();
            type = "Tarjetas amarillas";
            await page.getByRole('button', { name: 'Tarjetas amarillas', exact: true }).click();
            await page.getByText('Tarjetas amarillas').click();
            type = "Tiempo reglamentario";
            await page.getByRole('button', { name: 'Tiempo reglamentario' }).click();
            await page.close();
            await getBetwinnerApi(match, betTypes, ids);
        } catch (error) {
            // console.log(error);
        }
    }
}

const permit1 = [
    'Total',
    'Total. 2 Mitad',
    'Total. 1 Mitad',
    'Total. Tarjetas amarillas',
    'Total. Saques de esquina',
];

async function getBetwinnerApi(name, types, ids) {
    try {
        const res = [];
        if (ids.length > 0) {
            for (const id of ids) {
                res.push({
                    res: await initRequest(`https://betwinner-792777.top/service-api/LiveFeed/GetGameZip?id=${id.id}&lng=es&isSubGames=true&GroupEvents=true&countevents=250&grMode=4&partner=152&topGroups=&country=91&marketType=1`),
                    type: id.type
                });
            }
            if (res.length > 0) {
                let filter = [];
                for (const r of res) {
                    const tiposPermitidos = types.map(t => getType1xbet(t.type, r.type));
                    let temFilter = r.res.Value.GE.filter(item => tiposPermitidos.includes(item.G));
                    temFilter = temFilter.map(f => {
                        const type = getType1xbet(f.G, r.type);
                        let bets = [];
                        if (!permit1.includes(type)) {
                            bets = f.E.map(e => {
                                if (e[0].P != 2) return {
                                    name: e[0].T,
                                    quote: e[0].C
                                }
                            })
                        } else {
                            const arr = f.E;
                            arr[0].map(a => bets.push({
                                name: 'Mas ' + a.P,
                                quote: a.C
                            }));
                            arr[1].map(a => bets.push({
                                name: 'Menos ' + a.P,
                                quote: a.C
                            }));
                            bets = ordenarDinamicamenteMasMenos(bets);
                        }
                        console.log({
                            id: Object.keys(obtenerObjetoPorTipo(types, type))[0],
                            type: type,
                            bets
                        });
                        return {
                            id: Object.keys(obtenerObjetoPorTipo(types, type))[0],
                            type: type,
                            bets
                        }
                    });
                    filter = filter.concat(temFilter);
                }
                const reducedBetsArray = groupAndReduceBetsByType(filter, 'Total', 1);
                console.log('//////////////////// BETWINNER //////////////////')
                console.log('//////////////////// BETWINNER //////////////////')
                return {
                    nombre: 'betwinner',
                    title: name,
                    bets: reducedBetsArray
                }
            }
        }

    } catch (error) {
        // if (error.includes('Value')) {
        console.log(error)
        // }
    }
}

module.exports = {
    getBetwinnerApi,
    getResultsBetwinner
}