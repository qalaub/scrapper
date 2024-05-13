const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    ordenarDinamicamenteMasMenos,
    matchnames
} = require("./utils");

let newPage;

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

async function getResults1xBetTT(match, betTypes = ['1x2']) {
    const { page, context } = await initBrowser('https://1xbet.com/es', '1xbet');
    if (page) {
        try {
            // Realiza acciones que desencadenan la apertura de una nueva pestaña
            await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            page.setDefaultTimeout(10000);
            if (newPage) {
                newPage.setDefaultTimeout(10000);
                await newPage.waitForTimeout(8000);
                let bet1xBet = {
                    nombre: '1xbet',
                    title: match,
                    bets: []
                }
                for (const betType of betTypes) {
                    const typeLocator = 'xpath=(//span[normalize-space(text()) = "' + betType + '" and contains(@class, "bet-title")])[1]'
                    let type =
                        await newPage.locator(typeLocator).textContent();
                    type = type.trim().replace(/\n+/g, '');
                    let betTemp = {
                        type,
                        bets: []
                    }
                    const betLocator = 'xpath=(//span[normalize-space(text()) = "' + betType + '" and contains(@class, "bet-title")])[1]/parent::div/following-sibling::div/div'
                    const bets = await newPage.locator(betLocator).all();
                    if (bets.length > 1) {
                        for (const bet of bets) {
                            let name = await bet.locator('.bet_type').textContent();
                            let quote = await bet.locator('.koeff').textContent();
                            name = name.trim();
                            quote = quote.trim();
                            betTemp.bets.push({
                                name,
                                quote
                            });
                        }
                    }
                    bet1xBet.bets.push(betTemp);
                    // console.log(betTemp.bets);
                }
                await newPage.close();
                return bet1xBet;
            }
        } catch (error) {
            console.log(error);
        }
    }
}

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let xbetSearch = await initRequest(`https://1xbet.com/LineFeed/Web_SearchZip?text=${text}&lng=es&country=91&mode=4&gr=70`);
        xbetSearch = xbetSearch?.Value.map(temp => {
            return {
                name: temp.O1 + ' ' + temp.O2,
                link: temp.CI,
            }
        });
        return xbetSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            let pass = [];
            for (const q of res) {
                if (await tienenPalabrasEnComunDinamico(match, q.name)) {
                    pass.push(q);
                }
            }
            if (pass?.length > 0) {
                // console.log(pass);
                matchnames.push({
                    text1: match,
                    text2: pass[0].name,
                    etiqueta: 1
                });
                return pass[0].link;
            }
        }
    }
}

function getType1xbet(input, type) {
    if (type == '2 Mitad') return secondHalf[input] || null;
    if (type == '1 Mitad') return firtsHalf[input] || null;
    if (type == 'Saques de esquina') return corners[input] || null;
    if (type == 'Tarjetas amarillas') return falls[input] || null;
    if (type == 'Tiempo reglamentario') return typeMappings[input] || null;
}

async function get1xBetApi(name, types) {
    try {
        const link = await buscarApi(name);
        console.log(link)
        const res1 = await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${link}&lng=es&isSubGames=true&GroupEvents=true&allEventsGroupSubGames=true&countevents=250&country=91&fcountry=91&marketType=1&gr=70&isNewBuilder=true`, 2);
        const res2 = await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${link}&lng=es&isSubGames=true&GroupEvents=true&countevents=1385&grMode=4&partner=152&topGroups=&country=91&marketType=1`, 2);
        if (res2) {
            const tiposPermitidos = types.map(t => getType1xbet(t.type));
            console.log(res2.Value.GE.length)
            let filter = res2.Value.GE.filter(item => {
                console.log(item.G)
                return tiposPermitidos.includes(item.G)
            });
            console.log(filter.length)
            filter = filter.map(f => {
                const type = getType1xbet(f.G);
                let bets = [];
                if (type != 'Total') {
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
                return {
                    id: Object.keys(obtenerObjetoPorTipo(types, type))[0],
                    type: type,
                    bets
                }
            });

            const reducedBetsArray = groupAndReduceBetsByType(filter, 'Total', 1);
            console.log('//////////////////// 1XBET //////////////////')
            console.log(reducedBetsArray)
            console.log('//////////////////// 1XBET //////////////////')
            return {
                nombre: '1xbet',
                title: name,
                bets: reducedBetsArray
            }
        }
    } catch (error) {
        // if (error.includes('Value')) {
        console.log(error)
        // }
    }
}

const secondHalf = {
    'Total. 2 Mitad': 17,
    17: 'Total. 2 Mitad',
    'Ambos equipos anotarán. 2 Mitad': 19,
    19: 'Ambos equipos anotarán. 2 Mitad',
    'Doble oportunidad. 2 Mitad': 8,
    8: 'Doble oportunidad. 2 Mitad',
    '1x2. 2 Mitad': 1,
    1: '1x2. 2 Mitad',
}

const firtsHalf = {
    'Total. 1 Mitad': 17,
    17: 'Total. 1 Mitad',
    'Ambos equipos anotarán. 1 Mitad': 19,
    19: 'Ambos equipos anotarán. 1 Mitad',
    'Doble oportunidad. 1 Mitad': 8,
    8: 'Doble oportunidad. 1 Mitad',
    '1x2. 1 Mitad': 1,
    1: '1x2. 1 Mitad',
}

const falls = {
    '1x2. Tarjetas amarillas': 1,
    1: '1x2. Tarjetas amarillas',
    'Total. Tarjetas amarillasa': 17,
    17: 'Total. Tarjetas amarillasa',
}

const corners = {
    '1x2. Saques de esquina': 1,
    1: '1x2. Saques de esquina',
    'Total. Saques de esquina': 17,
    17: 'Total. Saques de esquina',
}

const typeMappings = {
    'Hándicap': 27,
    27: 'Hándicap',
    'Total': 17,
    '1x2': 1,
    17: 'Total',
    1: '1x2',
    19: 'Ambos equipos anotarán',
    'Ambos equipos anotarán': 19,
    8: 'Doble oportunidad',
    'Doble oportunidad': 8,
    32: 'Goles en ambas mitades',
    'Goles en ambas mitades': 32,
    101: 'Victoria del equipo',
    'Victoria del equipo': 101,
    'Se clasificará': 100,
    100: 'Se clasificará',
};

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
                console.log('//////////////////// 1XBET //////////////////')
                console.log('//////////////////// 1XBET //////////////////')
                return {
                    nombre: '1xbet',
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
    get1xBetApi,
    getType1xbet,
}