const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    ordenarDinamicamenteMasMenos,
    matchnames,
    tienenPalabrasEnComunDinamicoT,
    transformString,
    categoryActual
} = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));
    if (categoryActual.current == 'ice_hockey' || categoryActual.current == 'american_football') {
        match = transformString(match);
    }

    const buscar = async (text) => {
        let ivibetSearch = await initRequest(`https://platform.ivibet.com/api/v4/v1/search/?search=${text}&status_in%5B%5D=2&status_in%5B%5D=0&status_in%5B%5D=1&relations%5B%5D=odds&relations%5B%5D=league&relations%5B%5D=result&relations%5B%5D=competitors&relations%5B%5D=sportCategories&relations%5B%5D=broadcasts&relations%5B%5D=statistics&relations%5B%5D=additionalInfo&relations%5B%5D=withMarketsCount&relations%5B%5D=tips&relations%5B%5D=players&lang=es`);
        ivibetSearch = ivibetSearch.data.items?.events?.map(temp => {
            return {
                name: temp.translationSlug,
                link: temp.id,
            }
        });
        return ivibetSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            let optPass = [];
            for (const q of res) {
                let text = q.name.replace(/[-]/g, ' ');
                const p = await tienenPalabrasEnComunDinamico(match, text);
                console.log(p, text, match)
                if (p.pass) optPass.push({ opcion: q, similarity: p.similarity });
            }
            const opt = await selectMoreOption(optPass);
            if (opt) {
                matchnames.push({
                    text1: match,
                    text2: opt.opcion.name,
                    etiqueta: 1
                });
                return opt.opcion;
            }
        }
    }
}

const permit1 = [
    'Total de goles',
    'Totales (incl. prórroga)',
    'Total tarjetas',
    'Total Tiros De Esquina',
    '2ª Mitad - total',
    '1ª Mitad - total',
    'Cuarto segundo - total',
    'Cuarto primer - total',
    'Cuarto tercer - total',
    'Cuarto cuarto - total',
    'Total juegos',
    'Primer set - total juegos',

];

const permit2 = [
    'Principal',
    '2ª mitad',
    '1ª mitad',
    'Tiros esquina',
    'Tarjetas',
    '1er Cuarto',
    '2do Cuarto',
    '3er Cuarto',
    '4to Cuarto',
    'Mercados por Set',
    'Innings',
    'Pitcher Lines'
];

const permit3 = [
    '1x2',
    'Doble oportunidad',
    'Se clasifica',
    'Tarjetas 1x2',
    'Córner 1x2',
    '1ª Mitad - doble oportunidad',
    '1ª Mitad - 1x2',
    '2ª Mitad - 1x2',
    '2ª Mitad - doble oportunidad',
    'Se clasifica',
];

function groupByVendorMarketId(data) {
    return data.reduce((acc, item) => {
        const { vendorMarketId, outcomes } = item;
        if (!acc[vendorMarketId]) {
            acc[vendorMarketId] = { vendorMarketId, outcomes: [] };
        }
        acc[vendorMarketId].outcomes = acc[vendorMarketId].outcomes.concat(outcomes);
        return acc;
    }, {});
}

let url = 'https://ivibet.com/es';

async function getIvibetApi(name, types, n, team1) {
    try {
        const link = await buscarApi(name);
        console.log(link)
        if (link) {
            const res = await initRequest(`https://platform.ivibet.com/api/event/list?relations%5B%5D=odds&relations%5B%5D=league&relations%5B%5D=result&relations%5B%5D=competitors&relations%5B%5D=sportCategories&relations%5B%5D=broadcasts&relations%5B%5D=additionalInfo&relations%5B%5D=withMarketsCount&relations%5B%5D=tips&relations%5B%5D=players&lang=es&eventId_eq=${link.link}&main=0&relations%5B%5D=sport`, 2);
            if (res) {
                const principal = res.data.relations;
                let reducedBetsArray = principal.odds[link.link];
                let groupedData = groupByVendorMarketId(reducedBetsArray);
                let array = [];
                for (const type of types) {
                    array.push(groupedData[type.type]);
                }
                for (const a of array) {
                    const bets = a.outcomes.map(el => {
                        return {
                            name: el.vendorOutcomeId,
                            quote: el.odds,
                        }
                    });

                    console.log({
                        id: Object.keys(obtenerObjetoPorTipo(types, a.vendorMarketId))[0],
                        type: a.vendorMarketId,
                        bets
                    })
                }
                // console.log(array)
                console.log('//////////////////// IVIBEt //////////////////')
                //console.log(reducedBetsArray)
                console.log('//////////////////// IVIBEt //////////////////')
                return {
                    nombre: 'ivibet',
                    title: name,
                    bets: reducedBetsArray,
                    url
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}

function truncatePrice(price) {
    return Math.floor(price * 100) / 100;
}

module.exports = {
    getIvibetApi
}