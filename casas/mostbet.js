const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    obtenerObjetoPorTipo,
    matchnames,
    transformString,
    categoryActual
} = require("./utils");

const getCategory = text => {
    switch (text) {
        case 'cricket':
            return 'Cricket';
        case 'football':
            return 'Fútbol';
        case 'basketball':
            return 'Baloncesto';
        case 'tennis':
            return 'Tenis';
        case 'volleyball':
            return 'Voleibol';
        case 'baseball':
            return 'Béisbol';
        case 'ufc_mma':
            return 'Artes marciales';
        case 'ice_hockey':
            return 'Hockey sobre Hielo';
        case 'american_football':
            return 'Fútbol americano';
        default:
            return 'No match';
    }

}

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let wonderbetSearch = await initRequest(`https://mostbet.com.mx/api/v1/left-menu/search/match?teamName=${text}&limit=10`);
        wonderbetSearch = wonderbetSearch.line_categories.filter(el => el.name == getCategory(categoryActual.current));
        wonderbetSearch = wonderbetSearch[0];
        wonderbetSearch = wonderbetSearch.matches.map(el => {
            return {
                name: el.team1.name + ' - ' + el.team2.name,
                id: el.lines[0].id,
            }
        })
        return wonderbetSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            let optPass = [];
            for (const q of res) {
                const p = await tienenPalabrasEnComunDinamico(match, q.name);
                console.log(match, q.name)
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

let url = 'https://www.fullreto.co/Sport#/prelive';

const filteredArray2 = (array1, array2) => {
    return array2.filter(item2 =>
        array1.some(item1 => item1.type == item2.title)
    );
}

async function getMostbetApi(name, types, n, team1) {
    try {
        const link = await buscarApi(name);
        if (link) {
            console.log(link);
            const res = await initRequest(`https://mostbet.com.mx/api/v1/lines/${link.id}.json`, 2);
            if (res) {
                let bets = filteredArray2(types, res.outcome_groups);
                bets = bets.map(el => {
                    let betsTemp = el.outcomes.map(b => {
                        return {
                            name: b.type_title,
                            quote: b.odd,
                        }
                    })
                    console.log(betsTemp)
                    return {
                        id: Object.keys(obtenerObjetoPorTipo(types, el.title))[0],
                        type: el.title,
                        bets: betsTemp,
                    }
                });
                console.log('//////////////////// MOSTBET //////////////////')
                console.log(bets)
                console.log('//////////////////// MOSTBET //////////////////')
                return {
                    nombre: 'mostbet',
                    title: name,
                    bets,
                    url
                }
            }
        }
    } catch (error) {
        // console.log(error);
    }
}

module.exports = {
    getMostbetApi
}