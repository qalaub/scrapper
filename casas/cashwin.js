const { groupAndReduceBetsByType } = require("../logic/surebets");
const { buscar, excludes, selectMoreOption } = require("../logic/utils/buscar");
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
        let cashwinSearch = await initRequest(`https://sb2frontend-altenar2.biahosted.com/api/widget/SearchEvents?culture=en-GB&timezoneOffset=300&integration=cashwin&deviceType=1&numFormat=en-GB&countryCode=CO&searchString=${text}`);
        cashwinSearch = cashwinSearch.events?.map(temp => {
            return {
                name: temp.name,
                link: temp.id,
            }
        });
        return cashwinSearch;
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

function groupAndFilterData(data, shortNames) {
    const filteredMarkets = data.markets.filter(market =>
        shortNames.some(sn => sn.type === market.shortName)
    );

    const grouped = filteredMarkets.map(market => {
        const marketInfo = shortNames.find(sn => sn.type === market.shortName);
        const id = Object.keys(marketInfo)[0];
        const description = marketInfo[id];

        const oddsIds = new Set([...market.desktopOddIds.flat(), ...market.mobileOddIds.flat()]);
        const odds = data.odds.filter(odd => oddsIds.has(odd.id)).map(odd => ({
            name: odd.name,
            price: truncatePrice(odd.price)
        }));

        return {
            id: id,
            type: market.shortName,
            bets: odds
        };
    });

    return grouped;
}

function transformAndSortOdds(group) {
    // Verificar si hay nombres que contienen 'Over' o 'Under'
    const containsOverUnder = group.some(item => item.name.includes('Over') || item.name.includes('Under'));

    if (containsOverUnder) {
        // Reemplazar 'Over' por 'Más' y 'Under' por 'Menos'
        group = group.map(item => {
            if (item.name.includes('Over')) {
                item.name = item.name.replace('Over', 'Más');
            } else if (item.name.includes('Under')) {
                item.name = item.name.replace('Under', 'Menos');
            }
            return item;
        });

        // Ordenar por el valor numérico después de 'Más' o 'Menos'
        group.sort((a, b) => {
            const numA = parseFloat(a.name.match(/[\d.]+/)[0]);
            const numB = parseFloat(b.name.match(/[\d.]+/)[0]);
            const isAOver = a.name.startsWith('Más');
            const isBOver = b.name.startsWith('Más');
            const isAUnder = a.name.startsWith('Menos');
            const isBUnder = b.name.startsWith('Menos');

            if (numA === numB) {
                if (isAOver && isBUnder) {
                    return -1;
                } else if (isAUnder && isBOver) {
                    return 1;
                } else {
                    return 0;
                }
            } else {
                return numA - numB;
            }
        });
    }

    return group;
}

function removeDuplicates(arr) {
    return Array.from(new Map(arr.map(item => [item.name + item.price, item])).values());
}

function removeDuplicatesById(arr) {
    const uniqueItems = new Map();

    arr.forEach(item => {
        if (!uniqueItems.has(item.id)) {
            uniqueItems.set(item.id, item);
        }
    });

    return Array.from(uniqueItems.values());
}

async function getCashwinApi(name, types) {
    try {
        let url = 'https://www.cashwin.com/sports#/overview';
        const link = await buscarApi(name);
        console.log(link);
        const res = await initRequest(`https://sb2frontend-altenar2.biahosted.com/api/widget/GetEventDetails?culture=en-GB&timezoneOffset=300&integration=cashwin&deviceType=1&numFormat=en-GB&countryCode=CO&eventId=${link}`, 2);
        if (res) {
            let group = groupAndFilterData(res, types);
            group = group.map(g => {
                g.bets = removeDuplicates(g.bets);
                return g;
            });
            group = group.map(g => {
                g.bets = transformAndSortOdds(g.bets);
                return g;
            });
            group = removeDuplicatesById(group);
            console.log('//////////////////// CASHWIN //////////////////')
            // console.log(group.map(m => m.bets));
            console.log('//////////////////// CASHWIN //////////////////')
            return {
                nombre: 'cashwin',
                title: name,
                bets: group,
                url
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
    getCashwinApi
}