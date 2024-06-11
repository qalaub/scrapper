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

async function get1xBetApi(name, types) {
    try {
        const link = await buscarApi(name);
        const res1 = await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${link}&lng=es&isSubGames=true&GroupEvents=true&allEventsGroupSubGames=true&countevents=250&country=91&fcountry=91&marketType=1&gr=70&isNewBuilder=true`, 2);
        const res2 = await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${link}&lng=es&isSubGames=true&GroupEvents=true&countevents=1385&grMode=4&partner=152&topGroups=&country=91&marketType=1`, 2);
        if (res2) {
            const tiposPermitidos = types.map(t => getType1xbet(t.type));
            let filter = res2.Value.GE.filter(item => {
                return tiposPermitidos.includes(item.G)
            });
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
            console.log('//////////////////// 1XBET //////////////////')
            return {
                nombre: '1xbet',
                title: name,
                bets: reducedBetsArray
            }
        }
    } catch (error) {
    }
}

function getType1xbet(input, type) {

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

    if (type == '2 Mitad') return secondHalf[input] || null;
    if (type == '1 Mitad') return firtsHalf[input] || null;
    if (type == 'Saques de esquina') return corners[input] || null;
    if (type == 'Tarjetas amarillas') return falls[input] || null;
    if (type == 'Tiempo reglamentario') return typeMappings[input] || null;
}

function getType1xbetBasketball(input, type) {

    const typeMappings = {
        'Victoria del equipo': 101,
        101: 'Victoria del equipo',
        'Total': 17,
        17: 'Total',
    }

    const quarter1 = {
        '1X2. 1 Cuarto': 1,
        1: '1X2. 1 Cuarto',
        'Total. 1 Cuarto': 17,
        17: 'Total. 1 Cuarto',
    }

    const quarter2 = {
        '1X2. 2 Cuarto': 1,
        1: '1X2. 2 Cuarto',
        'Total. 2 Cuarto': 17,
        17: 'Total. 2 Cuarto',
    }

    const quarter3 = {
        '1X2. 3 Cuarto': 1,
        1: '1X2. 3 Cuarto',
        'Total. 3 Cuarto': 17,
        17: 'Total. 3 Cuarto',
    }

    const quarter4 = {
        '1X2. 4 Cuarto': 1,
        1: '1X2. 4 Cuarto',
        'Total. 4 Cuarto': 17,
        17: 'Total. 4 Cuarto',
    }

    const firtsHalf = {
        '1X2. 1 Mitad': 1,
        1: '1X2. 1 Mitad',
        'Total. 1 Mitad': 17,
        17: 'Total. 1 Mitad',
    }

    const secondHalf = {
        '1X2. 2 Mitad': 1,
        1: '1X2. 2 Mitad',
        'Total. 2 Mitad': 17,
        17: 'Total. 2 Mitad',
    }


    if (type == '1 Cuarto') return quarter1[input] || null;
    if (type == '2 Cuarto') return quarter2[input] || null;
    if (type == '3 Cuarto') return quarter3[input] || null;
    if (type == '4 Cuarto') return quarter4[input] || null;
    if (type == '2 Mitad') return secondHalf[input] || null;
    if (type == '1 Mitad') return firtsHalf[input] || null;
    if (type == 'Tiempo reglamentario') return typeMappings[input] || null;
}

function getType1xbetTennis(input, type) {

    const typeMappings = {
        '1X2': 1,
        1: '1X2',
        'Total': 17,
        17: 'Total',
        'Total de sets': 182,
        182: 'Total de sets',
    }

    const set1 = {
        '1X2. 1 Set': 1,
        1: '1X2. 1 Set',
        'Total. 1 Set': 17,
        17: 'Total. 1 Set',
    }

    const set2 = {
        '1X2. 2 Set': 1,
        1: '1X2. 2 Set',
        'Total. 2 Set': 17,
        17: 'Total. 2 Set',
    }

    if (type == '1 Set') return set1[input] || null;
    if (type == '2 Set') return set2[input] || null;
    if (type == 'Tiempo reglamentario') return typeMappings[input] || null;
}

function getType1xbetVolleyball(input, type) {

    const typeMappings = {
        '1X2': 1,
        1: '1X2',
        'Total': 17,
        17: 'Total',
        'Total de sets': 182,
        182: 'Total de sets',
    }

    const set1 = {
        '1X2. 1 Set': 1,
        1: '1X2. 1 Set',
        'Total. 1 Set': 17,
        17: 'Total. 1 Set',
    }

    const set2 = {
        '1X2. 2 Set': 1,
        1: '1X2. 2 Set',
        'Total. 2 Set': 17,
        17: 'Total. 2 Set',
    }

    const set3 = {
        '1X2. 3 Set': 1,
        1: '1X2. 3 Set',
        'Total. 3 Set': 17,
        17: 'Total. 3 Set',
    }

    if (type == '1 Set') return set1[input] || null;
    if (type == '2 Set') return set2[input] || null;
    if (type == '3 Set') return set3[input] || null;
    if (type == 'Tiempo reglamentario') return typeMappings[input] || null;
}

function getType1xbetBaseball(input, type) {
    const typeMappings = {
        '1x2': 1,
        1: '1x2',
        'Total': 17,
        17: 'Total',
        'Primera carrera': 779,
        779: 'Primera carrera',
        'Anotación de los hits': 968,
        968: 'Anotación de los hits',
    }

    const entrada1 = {
        '1x2. 1 Entrada': 1,
        1: '1x2. 1 Entrada',
        'Total. 1 Entrada': 17,
        17: 'Total. 1 Entrada',
    }

    if (type == '1 Entrada') return entrada1[input] || null;
    if (type == 'Tiempo reglamentario') return typeMappings[input] || null;
}

module.exports = {
    get1xBetApi,
    getType1xbet,
    getType1xbetBasketball,
    getType1xbetTennis,
    getType1xbetVolleyball,
    getType1xbetBaseball
}