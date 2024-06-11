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
    tienenPalabrasEnComunDinamicoT
} = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let fullretoSearch = await initRequest(`https://sb2frontend-altenar2.biahosted.com/api/SportsBook/SearchEvents?timezoneOffset=300&langId=4&skinName=fullreto&configId=12&culture=es-ES&countryCode=CO&deviceType=Desktop&numformat=en&integration=fullreto&str=${text}`);
        fullretoSearch = fullretoSearch.Result.EventItems?.map(temp => {
            return {
                name: temp.Name,
                link: temp.Id,
                sport: temp.SportId,
            }
        });
        return fullretoSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            let optPass = [];
            for (const q of res) {
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

const filterData = (filter, types, team1) => {
    const extractNumber = name => parseFloat(name.match(/(\d+(\.\d+)?)/)[0]);
    return filter.map(f => {
        let bets = [];
        bets = f.Items.map(e => {
            return {
                name: e.Name,
                quote: truncatePrice(e.Price)
            }
        });
        if (permit1.includes(f.Name)) bets.sort((a, b) => {
            const numberA = extractNumber(a.name);
            const numberB = extractNumber(b.name);
            const typeA = a.name.includes('Más') || a.name.includes('Mas');
            const typeB = b.name.includes('Más') || b.name.includes('Mas');

            if (numberA === numberB) {
                // Si los números son iguales, ordenar por tipo
                return typeA === typeB ? 0 : typeA ? -1 : 1;
            }

            // Orden principal por el número
            return numberA - numberB;
        });
        if (f.Name == 'Hándicap 1x2') {
            // Primero, extraer los handicaps únicos y su orden de aparición
            const handicaps = [...new Set(bets.map(bet => bet.name.match(/\(([^)]+)\)/)[1]))];

            // Orden de los equipos basado en su primera aparición
            const teamOrder = [...new Set(bets.map(bet => bet.name.split(' ')[0]))];

            bets.sort((a, b) => {
                const handicapA = a.name.match(/\(([^)]+)\)/)[1];
                const handicapB = b.name.match(/\(([^)]+)\)/)[1];
                const teamA = teamOrder.indexOf(a.name.split(' ')[0]);
                const teamB = teamOrder.indexOf(b.name.split(' ')[0]);

                // Primero ordenar por handicap
                if (handicapA !== handicapB) {
                    return handicaps.indexOf(handicapA) - handicaps.indexOf(handicapB);
                }
                // Si el handicap es el mismo, ordenar por el orden de aparición del equipo
                return teamA - teamB;
            });
        }
        return {
            id: Object.keys(obtenerObjetoPorTipo(types, f.Name))[0],
            type: f.Name,
            bets
        }
    });
}

const removeDuplicate = (data) => {
    let seen = new Set();
    let uniqueData = data.filter(item => {
        if (seen.has(item.id)) {
            return false;
        } else {
            seen.add(item.id);
            return true;
        }
    });
    return Array.from(uniqueData);
}

let url = 'https://www.fullreto.co/Sport#/prelive';

async function getFullretoApi(name, types, n, team1) {
    try {
        const link = await buscarApi(name);
        if (link) {
            const res = await initRequest(`https://sb2frontend-altenar2.biahosted.com/api/Sportsbook/GetEventDetails?timezoneOffset=300&langId=4&skinName=fullreto&configId=12&culture=es-ES&countryCode=CO&deviceType=Desktop&numformat=en&integration=fullreto&eventId=${link.link}&sportId=${link.sport}`, 2);
            if (res) {
                const typeTemp = types.map(t => t.type);
                const principal = res.Result.MarketGroups.filter(m => {
                    return permit2.includes(m.Name);
                });
                let filter = [];
                for (const p of principal) {
                    let t = filterData(p.Items.filter(i => typeTemp.includes(i.Name)), types, team1);
                    filter = filter.concat(t); // Reasigna el resultado a `filter`
                }
                let reducedBetsArray = groupAndReduceBetsByType(filter, types[1].type, 1);
                reducedBetsArray = removeDuplicate(reducedBetsArray);
                console.log('//////////////////// FULLRETO //////////////////')
                // console.log(reducedBetsArray)
                console.log('//////////////////// FULLRETO //////////////////')
                return {
                    nombre: 'fullreto',
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
    getFullretoApi
}