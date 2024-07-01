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
    categoryActual
} = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let lsbetSearch = await initRequest(`https://www.lsbet.com/api/starbuck/steward/seeker_coupons?query=${text}`);
        lsbetSearch = lsbetSearch.events?.map(temp => {
            return {
                name: temp.description,
                link: {
                    id: temp.id,
                    sportId: temp.sportId,
                    regionId: temp.regionId,
                    leagueId: temp.leagueId,
                },
            }
        });
        return lsbetSearch;
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
                return opt.opcion.link;
            }
        }
    }
}

function translateQuotes(item) {
    const translations = {
        "Unentschieden": "Empate",
        "mehr als": "más de",
        "weniger als": "menos de",
        "Über": "Más de",
        "Unter": "Menos de",
        "Ja": "Sí",
        "Nein": "No",
        "or": "o",
        "Draw": "Empate"
    };


    let translatedName = item.description;

    // Handle full phrases and multi-word translations
    Object.keys(translations).forEach(key => {
        const regex = new RegExp(key, 'g');
        translatedName = translatedName.replace(regex, translations[key]);
    });
    translatedName = translatedName.replace(',', '.');
    return {
        name: translatedName,
        quote: item.price
    };
}

async function getLsbetApi(name, types) {
    try {
        const link = await buscarApi(name);
        console.log(link);
        if (link?.id) {
            const res = await initRequest(`https://www.lsbet.com/api/coupons/coupons?eventId=${link.id}`, 2);
            if (res) {
                const typeTemp = types.map(t => t.type);
                let filter = res.events[0].markets;
                filter = filter.filter(e => {
                    let temp = typeTemp.includes(e.description)
                    if (!temp) return false;
                    return true;
                });
                filter = filter.map(e => {
                    let index = types.findIndex(i => i.type === e.description);
                    return {
                        id: Object.keys(types[index])[0],
                        type: types[index].type,
                        bets: e.outcomes.map(l => translateQuotes(l, types[index]))
                    }
                });
                console.log('//////////////////// LSBET //////////////////')
                // console.log(filter);
                console.log('//////////////////// LSBET //////////////////')
                return {
                    nombre: 'lsbet',
                    title: name,
                    bets: filter,
                    url: `https://www.lsbet.com/sportsbook/${link.sportId}/${link.regionId}/${link.leagueId}/${link.id}`
                }
            }
        }

    } catch (error) {
        // if (error.includes('Value')) {
        console.log(error)
        // }
    }
}

function truncatePrice(price) {
    return Math.floor(price * 100) / 100;
}

module.exports = {
    getLsbetApi
}