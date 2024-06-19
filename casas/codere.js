const { groupByType, groupByTypeBasketball } = require("../logic/constantes");
const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { orderBetMoreLess } = require("./betplay");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    matchnames,
    categoryActual,
    transformString
} = require("./utils");

let page;

const buscarQ = async (page, query) => {
    try {
        let search = await page.getByPlaceholder('Buscar ...').first();
        await search.fill(query);
        await page.waitForTimeout(1500); // Espera para que se carguen los resultados
        const noResult = await page.getByText('No se han encontrado resultados').first().isVisible({ timeout: 10000 });
        return !noResult;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const opciones = await page.locator('//div[@class = "results-submenu"]/ion-list/ion-item').all();
    for (const opcion of opciones) {
        const title = await opcion.textContent();
        match = quitarTildes(match.replace(' - ', ' '));
        let text = quitarTildes(title.trim());
        const pass = tienenPalabrasEnComunDinamico(match, text, 75);
        // console.log(match, text)
        if (pass) {
            await opcion.locator('//*[@class = "title"]').click();
            console.log('CODERE: ', quitarTildes(match), title.trim());
            return true;
        }
    }
    return false;
};

async function getResultsCodere(match, betTypes = ['1X2']) {
    const { page, context } = await initBrowser('https://m.codere.com.co/deportesCol/#/HomePage', 'codere');
    const cookies = page.getByRole('button', { name: 'OK' });
    if (await cookies.isVisible()) await cookies.click();
    if (page) {
        try {
            // Realiza acciones que desencadenan la apertura de una nueva pestaña
            page.setDefaultTimeout(5000);
            await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            let codere = {
                nombre: 'codere',
                title: match,
                bets: []
            }
            for (const betType of betTypes) {
                const typeLocator = '//*[text() = "' + betType + '"]';
                let type =
                    await page.locator(typeLocator).textContent();
                type = type.trim().replace(/\n+/g, '');
                let betTemp = {
                    type,
                    bets: []
                }
                const betLocator = '//p[text() = "' + betType + '"] /parent::*/parent::*/div[2]//sb-button'
                const bets = await page.locator(betLocator).all();
                if (bets.length > 1) {
                    for (const bet of bets) {
                        let name = await bet.locator('p').first().textContent();
                        let quote = await bet.locator('p').last().textContent();
                        name = name.trim();
                        quote = quote.trim().replace(',', '.');
                        betTemp.bets.push({
                            name,
                            quote
                        });
                    }
                }
                codere.bets.push(betTemp);
            }
            // await page.close();
            return codere;
        } catch (error) {
            console.log(error);
            // await page.close();
        }
    }
}

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));
    if (categoryActual.current == 'ice_hockey' || categoryActual.current == 'american_football') {
        match = transformString(match);
    }

    const buscar = async (text) => {
        let codereSearch = await initRequest(`https://m.codere.com.co/NavigationService/Home/FreeTextSearch?text=${text}`);
        if (codereSearch.length > 0) {
            codereSearch = codereSearch.map(temp => {
                return {
                    name: temp.Name,
                    link: temp.NodeId,
                }
            });
        }

        return codereSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res.length > 0) {
            let optPass = [];
            for (const q of res) {
                const i = q.name.indexOf('UEFA Champions League');
                if (i > 0) q.name = q.name.substring(i + 24);
                // console.log(match, q.name)
                const p = await tienenPalabrasEnComunDinamico(match, q.name);
                if (p.pass) optPass.push({ opcion: q, similarity: p.similarity });
            }
            const opt = await selectMoreOption(optPass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.opcion.name,
                    etiqueta: 1
                });
                return opt.opcion.link;
            }
        }
    }
}

const permit1 = [
    'Más/Menos Total Goles',
    '2ª Parte - Más/Menos Total Goles',
    '1ª Parte - Más/Menos Total Goles',
    'Total de Córner Más/Menos',
    'Total de Tarjetas Más/Menos',
    'Más/Menos Total de Puntos 2ª Mitad',
    'Más/Menos Total de Puntos 4º Cuarto',
    'Más/Menos Total de Puntos 3º Cuarto',
    'Más/Menos Total de Puntos 1ª Mitad',
    'Más/Menos Total de Puntos 2º Cuarto',
    'Más/Menos Total de Puntos 1º Cuarto',
    'Más/Menos Puntos Totales',
    'Total de Carreras Más/Menos',
    '1ª Entrada Más/Menos Carreras',
    'Más/Menos Total de Puntos'
]

function agruparApuestas(apuestas, tipoDeseado) {
    let agrupadas = new Map();
    let otrosTipos = [];
    // Procesar todas las apuestas
    apuestas.forEach(apuesta => {
        if (apuesta.type === tipoDeseado) {
            if (!agrupadas.has(apuesta.id)) {
                agrupadas.set(apuesta.id, {
                    id: apuesta.id,
                    type: apuesta.type,
                    bets: [...apuesta.bets]
                });
            } else {
                let current = agrupadas.get(apuesta.id);
                current.bets.push(...apuesta.bets);
            }
        } else {
            otrosTipos.push(apuesta);
        }
    });

    agrupadas.forEach(value => {
        otrosTipos.push(value);
    });
    return otrosTipos;
}

const getBets = (res, tiposPermitidos, types) => {
    let filter = res.filter(item => {
        return tiposPermitidos.includes(item.Name)
    });
    filter = filter.map(f => {
        let bets = [];
        const type = f.Name;
        bets = f.Results.map(e => {
            return {
                name: e.Name,
                quote: e.Odd,
            }
        })
        if (permit1.includes(type)) {
            bets = orderBetMoreLess(bets);
        }
        return {
            id: Object.keys(obtenerObjetoPorTipo(types, type))[0],
            type: type,
            bets
        }

    });
    return filter;
}

function removeDuplicates(bets) {
    const uniqueBets = new Map(bets.map(bet => [`${bet.name}-${bet.quote}`, bet]));
    return Array.from(uniqueBets.values());
}

let urlG = 'https://m.codere.com.co/deportesCol/#/HomePage';

async function getCodereApi(name, types) {
    try {
        const link = await buscarApi(name);
        if (link) {
            const tiposPermitidos = types.map(t => t.type);
            let url = `https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=99`;
            if (categoryActual.isLive) url = `https://m.codere.com.co/NavigationService/Game/GetGamesLive?parentid=${link}`;
            const res1 = await initRequest(url);
            let res2 = [], res3 = [], res4 = [];
            if (!categoryActual.isLive) {
                if (categoryActual.current == 'football') {
                    res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=60`);
                    res3 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=55`);
                    res4 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=50`);
                }
                if (categoryActual.current == 'basketball') {
                    res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=80`);
                    res3 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=91`);
                }

                if (categoryActual.current == 'tennis') {
                    res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=90`);
                    res3 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=1`);
                }

                if (categoryActual.current == 'volleyball') {
                    res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=91`);
                }
                if (categoryActual.current == 'baseball') {
                    res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=91`);
                }
                if (categoryActual.current == 'ice_hockey') {
                    res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=75`);
                }
            }

            let filter = getBets(res1, tiposPermitidos, types);
            filter = filter.concat(getBets(res2, tiposPermitidos, types));
            filter = filter.concat(getBets(res3, tiposPermitidos, types));
            filter = filter.concat(getBets(res4, tiposPermitidos, types));
            if (filter.length > 0) {
                filter = agruparApuestas(filter, types[groupByType.total].type || '');
                if (categoryActual.current == 'football') {
                    filter = agruparApuestas(filter, types[groupByType.total2]?.type || '');
                    filter = agruparApuestas(filter, types[groupByType.total1]?.type || '');
                    filter = agruparApuestas(filter, types[groupByType.esquinas]?.type || '');
                    filter = agruparApuestas(filter, types[groupByType.tarjetas]?.type || '');
                    filter = agruparApuestas(filter, types[groupByType.handicap]?.type || '');
                } else if (categoryActual.current == 'basketball') {
                    filter = agruparApuestas(filter, types[groupByTypeBasketball.total1 - 2]?.type || '');
                    filter = agruparApuestas(filter, types[groupByTypeBasketball.total2 - 2]?.type || '');
                    filter = agruparApuestas(filter, types[groupByTypeBasketball.totalCuarto1 - 3]?.type || '');
                    filter = agruparApuestas(filter, types[groupByTypeBasketball.totalCuarto2 - 4]?.type || '');
                    filter = agruparApuestas(filter, types[groupByTypeBasketball.totalCuarto3 - 5]?.type || '');
                    filter = agruparApuestas(filter, types[groupByTypeBasketball.totalCuarto4 - 6]?.type || '');
                }
                filter = filter.map(item => {
                    item.bets = removeDuplicates(item.bets);
                    return item;
                });
                filter = Array.from(new Map(filter.map(item => [item.type, item])).values());
                console.log('//////////////////// CODERE //////////////////')
                // console.log(filter.map(el => el.bets))
                console.log('//////////////////// CODERE //////////////////')
            }
            return {
                nombre: 'codere',
                title: name,
                bets: filter,
                url: urlG,
            }
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getResultsCodere,
    getCodereApi
}