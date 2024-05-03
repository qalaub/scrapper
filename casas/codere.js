const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { orderBetMoreLess } = require("./betplay");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    matchnames
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
    'Total de Tarjetas Más/Menos'
]

function agruparApuestas(apuestas, tipoDeseado) {
    let agrupadas = [];
    let otrosTipos = [];
    let id = '';

    apuestas.forEach(apuesta => {
        if (apuesta.type === tipoDeseado) {
            id = apuesta.id
            agrupadas.push(...apuesta.bets);
        } else {
            otrosTipos.push(apuesta);
        }
    });

    // Agregar el nuevo objeto agrupado si hay apuestas del tipo deseado
    if (agrupadas.length > 0) {
        otrosTipos.push({ type: tipoDeseado, bets: agrupadas, id });
    }

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

async function getCodereApi(name, types) {
    try {
        const link = await buscarApi(name);
        if (link) {
            const tiposPermitidos = types.map(t => t.type);
            const res1 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=99`);
            const res2 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=60`);
            const res3 = await initRequest(`https://m.codere.com.co/NavigationService/Game/GetGamesNoLiveByCategoryInfo?parentid=${link}&categoryInfoId=55`);
            let filter = getBets(res1, tiposPermitidos, types);
            filter = filter.concat(getBets(res2, tiposPermitidos, types));
            filter = filter.concat(getBets(res3, tiposPermitidos, types));
            if (filter.length > 0) {
                filter = agruparApuestas(filter, types[1].type || '');
                filter = agruparApuestas(filter, types[10]?.type || '');
                filter = agruparApuestas(filter, types[6]?.type || '');
                filter = agruparApuestas(filter, types[13]?.type || '');
                filter = agruparApuestas(filter, types[15]?.type) || '';
                filter = groupAndReduceBetsByType(filter, types[1].type, 1);
                filter.forEach(item => {
                    item.bets = removeDuplicates(item.bets);
                });
                console.log('//////////////////// CODERE //////////////////')
                // console.log(filter.map(f => f.bets))
                console.log('//////////////////// CODERE //////////////////')
            }
            return {
                nombre: 'codere',
                title: name,
                bets: filter
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