const { groupAndReduceBetsByType } = require("../logic/surebets");
const { initRequest } = require("../logic/utils/request");
const { getBetForBetplay } = require("./betplay");
/*
const getBetForBetplay = (betOffers, type) => {
    const tiposPermitidos = type.map(t => t.type);
    let filter = betOffers.filter(bet => tiposPermitidos.includes(bet.criterion.label));
    filter = filter.map(f => {
        const name = f.criterion.label;
        console.log(name)
        const bets = f.outcomes.map(bet => {
            return {
                name: bet.label + ((parseInt(bet.line) / 1000).toFixed(1) || ''),
                quote: (parseInt(bet.odds) / 1000).toFixed(2)
            }
        });
        return {
            id: Object.keys(obtenerObjetoPorTipo(type, name))[0],
            type: name,
            bets: bets
        }
    });
    // Agrupar las apuestas de 'Total de goles' y eliminar las múltiples entradas
    let reducedBetsArray = groupAndReduceBetsByType(filter, type[1].type, 1);
    console.log('//////////////////// UNIIBET //////////////////')
    console.log('//////////////////// UNIIBET //////////////////')
    console.log(reducedBetsArray)
    return reducedBetsArray;
}
*/

async function getUnibetApi(event, betTypes) {
    const res = await
        initRequest(`https://eu-offering-api.kambicdn.com/offering/v2018/ub/betoffer/event/${event.id}.json?lang=en_GB&market=ZZ&client_id=2&channel_id=1&includeParticipants=true`);
    if (res)
        if (res.betOffers) {
            return {
                nombre: 'unibet',
                title: event.name,
                bets: getBetForBetplay(res.betOffers, betTypes, 'UNITBET')
            }
        }

}


module.exports = {
    getUnibetApi,
}
