const { timeouts } = require("../const/timeouts");
const { groupAndReduceBetsByType } = require("../logic/surebets");
const { excludes, buscar, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { getType1xbet, getType1xbetBasketball } = require("./1xbet");
const {
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    ordenarDinamicamenteMasMenos,
    matchnames,
    initBrowser,
    categoryActual
} = require("./utils");

const buscarQ = async (page, query) => {
    try {
        let search = await page.locator('//input[contains(@class, "ui-input__field")]').first();
        if (!await search.isVisible()) search = await page.getByPlaceholder('Búsqueda por partido').first();
        await search.fill(query);
        await search.first().press('Enter');
        await page.waitForTimeout(1000); // Espera para que se carguen los resultados
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
        let title = await opcion.textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(title.trim());
        const p = await tienenPalabrasEnComunDinamico(match, text);
        title = title.replace(/\s+/g, ' ');
        const result = await page.locator(`//span[contains(text(), "${title.trim()}")]/parent::*/parent::*/parent::*`).first();
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

// Función modificada para seleccionar tipo de apuestas en la página
const selectType = async (page, type, previus = 'Tiempo reglamentario') => {
    try {
        const cont = page.locator(`(//span[text() = "${previus}"])[1]`);
        if (await cont.isVisible({ timeout: 5000 })) {
            await cont.click();
            await page.waitForTimeout(700);
        }
        const btn = page.locator(`(//*[text() = "${type}"])[1]`);
        if (await btn.isVisible({ timeout: 5000 })) {
            await btn.click();
            await page.waitForTimeout(1000);
            return type;
        }
    } catch (error) {
        console.log(error);
    }
    return previus;
};

// Función auxiliar para procesar categorías de apuestas
async function processCategory(page, category, typeUpdate) {
    const selections = {
        'football': ['1 Mitad', '2 Mitad', 'Saques de esquina', 'Tarjetas amarillas'],
        'basketball': ['1 Cuarto', '2 Cuarto', '3 Cuarto', '4 Cuarto', '1 Mitad', '2 Mitad']
    };

    let previus = 'Tiempo reglamentario';
    for (const type of selections[category]) {
        typeUpdate.type = type;
        previus = await selectType(page, type, previus);
    }
}

async function getResultsBetwinner(match, betTypes = ['1x2'], n, name = 'betwinner') {
    const { page, context } = await initBrowser('https://betwinner.com.co/', name + n);
    if (page) {
        let url = '';
        try {
            let type = { type: '' };
            await page.waitForTimeout(2000);
            await page.getByText('Registro Betwinner').click();
            await page.getByText('Deportes').first().click();
            const matchTemp = match.replace(/\b(Club|Atletico)\b/gi, "").replace(/\s{2,}/g, ' ').trim();
            await page.setDefaultTimeout(timeouts.search);
            const encontrado = await buscar(page, matchTemp, buscarQ, intentarEncontrarOpcion);
            if (encontrado == 'no hay resultados') return;
            await page.waitForTimeout(2000);
            let tempUrl = await page.url();
            const idTemp = tempUrl.match(/(\d+)-[^\/]*$/);
            let ids = [];
            if (idTemp) {
                tempUrl = { id: idTemp[1], type: 'Tiempo reglamentario' };
                ids.push(tempUrl);
            }
            page.on('request', request => {
                let url = request.url();
                if (url.includes('Zip') && url.includes('id=')) {
                    let temp = url.substring(url.indexOf('id=') + 3);
                    // console.log(temp.substring(0, temp.indexOf('&lng')))
                    ids.push({
                        id: temp.substring(0, temp.indexOf('&lng')),
                        type: type.type
                    });
                }
            });
            page.setDefaultTimeout(3000);
            await processCategory(page, categoryActual.current, type);
            url = await page.url();
            return await getBetwinnerApi(match, betTypes, ids, name, url);
        } catch (error) {
            console.log(error);
        }
    }
}

const permit1 = [
    'Total',
    'Total. 2 Mitad',
    'Total. 1 Mitad',
    'Total. Tarjetas amarillas',
    'Total. Saques de esquina',
    'Hándicap',
    'Total. 1 Cuarto',
    'Total. 2 Cuarto',
    'Total. 3 Cuarto',
    'Total. 4 Cuarto',
];

async function getBetwinnerApi(name, types, ids, house, url) {
    try {
        const res = [];
        if (ids.length > 0) {
            for (const id of ids) {
                res.push({
                    res: await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${id.id}&lng=es&isSubGames=true&GroupEvents=true&countevents=1385&grMode=4&partner=152&topGroups=&country=91&marketType=1`),
                    type: id.type
                });
            }
            if (res.length > 0) {
                let filter = [];
                for (const r of res) {
                    let tiposPermitidos = types.map(t => getType1xbet(t.type, r.type));
                    if (categoryActual.current == 'basketball')
                        tiposPermitidos = types.map(t => getType1xbetBasketball(t.type, r.type));

                    if (r.res && r.res.Value?.GE) {
                        let temFilter = r.res.Value.GE.filter(item => tiposPermitidos.includes(item.G));
                        temFilter = temFilter.map(f => {
                            let type = getType1xbet(f.G, r.type);
                            if (categoryActual.current == 'basketball')
                                type = getType1xbetBasketball(f.G, r.type);

                            let bets = [];
                            if (!permit1.includes(type)) {
                                bets = f.E.map(e => {
                                    if (e[0].P != 2) return {
                                        name: e[0].T,
                                        quote: e[0].C
                                    }
                                })
                            } else if (type == 'Hándicap') {
                                const arr = f.E;
                                arr[0].map(a => bets.push({
                                    name: 'G1 ' + a.P,
                                    quote: a.C
                                }));
                                arr[1].map(a => bets.push({
                                    name: 'X ' + a.P,
                                    quote: a.C
                                }));
                                arr[2].map(a => bets.push({
                                    name: 'G2 ' + a.P,
                                    quote: a.C
                                }));

                                bets = orderHandicap(bets);
                            }
                            else {
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
                            return {
                                id: Object.keys(obtenerObjetoPorTipo(types, type))[0],
                                type: type,
                                bets
                            }
                        });
                        filter = filter.concat(temFilter);
                    }
                }
                const reducedBetsArray = groupAndReduceBetsByType(filter, 'Total', 1);

                console.log('//////////////////// ' + house.toUpperCase() + ' //////////////////')
                console.log('//////////////////// ' + house.toUpperCase() + ' //////////////////')
                if (house == '1xbet') {
                    const urlObject = new URL(url);
                    urlObject.hostname = '1xbet.com';
                    url = urlObject.href;
                }
                return {
                    nombre: house,
                    title: name,
                    bets: reducedBetsArray,
                    url
                }
            }
        }

    } catch (error) {
        // if (error.includes('Value')) {
        console.log(error)
        // }
    }
}

function orderHandicap(bets) {
    // Extraer los handicaps únicos y su orden de aparición
    const handicaps = [...new Set(bets.map(bet => bet.name.split(' ')[1]))].sort((a, b) => parseInt(a) - parseInt(b));

    // Orden de los equipos basado en su primera aparición
    const teamOrder = [...new Set(bets.map(bet => bet.name.split(' ')[0]))];

    return bets.sort((a, b) => {
        const handicapA = a.name.split(' ')[1];
        const handicapB = b.name.split(' ')[1];
        const teamA = teamOrder.indexOf(a.name.split(' ')[0]);
        const teamB = teamOrder.indexOf(b.name.split(' ')[0]);

        // Primero ordenar por handicap
        if (handicapA !== handicapB) {
            return parseInt(handicapA) - parseInt(handicapB);
        }
        // Si el handicap es el mismo, ordenar por el orden de aparición del equipo
        return teamA - teamB;
    });

}

module.exports = {
    getBetwinnerApi,
    getResultsBetwinner
}