const {
    evaluateSurebets,
    generarCombinacionesDeCasas2,
    initBrowser,
    categoryActual,
    quitarTildes,
    generarCombinacionesDeCasas2MoreLess
} = require("../casas/utils");
const {
    idsFootball,
    idsBasketball,
    betDescriptionsFootball,
    betDescriptionsBasketball,
    betDescriptionsTennis,
    idsTennis
} = require("./constantes");

const categories = {
    football: getBetTypeFootball,
    basketball: getBetTypeBasketball,
    tennis: getBetTypeTennis,
}

function getBetTypes(bets, category) {
    let tempBets = bets.map(bet => categories[category](bet));
    let newBet = {
        wplay: [],
        betsson: [],
        '1xbet': [],
        codere: [],
        yaJuegos: [],
        luckia: [],
        sportium: [],
        zamba: [],
        wonderbet: [],
        megapuesta: [],
        betplay: [],
        fullreto: [],
        betboro: [],
        pinnacle: [],
        dafabet: [],
        cashwin: [],
        bwin: [],
        lsbet: [],
        ggbet: [],
        marathon: [],
    };

    for (const tempBet of tempBets) {
        newBet.wplay.push(tempBet.wplay);
        newBet.betsson.push(tempBet.betsson);
        newBet['1xbet'].push(tempBet['1xbet']);
        newBet.codere.push(tempBet.codere);
        newBet.yaJuegos.push(tempBet.yaJuegos);
        newBet.luckia.push(tempBet.luckia);
        newBet.sportium.push(tempBet.sportium);
        newBet.zamba.push(tempBet.zamba);
        newBet.wonderbet.push(tempBet.wonderbet);
        newBet.megapuesta.push(tempBet.megapuesta);
        newBet.betplay.push(tempBet.betplay);
        newBet.fullreto.push(tempBet.fullreto);
        newBet.betboro.push(tempBet.betboro);
        newBet.pinnacle.push(tempBet.pinnacle);
        newBet.dafabet.push(tempBet.dafabet);
        newBet.cashwin.push(tempBet.cashwin);
        newBet.bwin.push(tempBet.bwin);
        newBet.lsbet.push(tempBet.lsbet);
        newBet.ggbet.push(tempBet.ggbet);
        newBet.marathon.push(tempBet.marathon);
    }

    // Función para eliminar elementos undefined
    function eliminarUndefined(arr) {
        return arr.filter(item => item.type !== undefined);
    }

    let data = {
        betplay: newBet.betplay,
        wplay: newBet.wplay,
        betsson: newBet.betsson,
        '1xbet': newBet['1xbet'],
        codere: newBet.codere,
        yaJuegos: newBet.yaJuegos,
        luckia: newBet.luckia,
        sportium: newBet.sportium,
        zamba: newBet.zamba,
        wonderbet: newBet.wonderbet,
        megapuesta: newBet.megapuesta,
        fullreto: newBet.fullreto,
        betboro: newBet.betboro,
        pinnacle: newBet.pinnacle,
        dafabet: newBet.dafabet,
        cashwin: newBet.cashwin,
        bwin: newBet.bwin,
        lsbet: newBet.lsbet,
        ggbet: newBet.ggbet,
        marathon: newBet.marathon,
    }
    // Eliminar elementos undefined de cada arreglo
    Object.keys(data).forEach(key => {
        data[key] = eliminarUndefined(data[key]);
    });

    return data;
}

function getBetTypeFootbal(type) {
    switch (type) {
        case 'Total de goles':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Total de goles',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: 'Total Goles Más/Menos de'
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: 'número de goles',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: 'Total',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: 'Más/Menos Total Goles',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: 'Totales',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: 'Menos/Más',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: 'Total de goles Más/Menos',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: 'Total',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: 'Total Goles -  Mas / Menos',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: 'Total Goles',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: 'Total de goles',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Total de goles',
                },
            }
        case 'Tiempo reglamentario':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Tiempo reglamentario',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: 'Resultado Tiempo Completo'
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: 'ganador del partido',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '1x2',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '1X2',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '1X2',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '1x2',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '1X2',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '1x2',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: 'Ganador',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: 'Final',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '1x2',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Resultado del Partido',
                },
            }
        case 'Ambos Equipos Marcarán':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Ambos Equipos Marcarán',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: 'Ambos Equipos Anotan'
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: 'ambos equipos anotan',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: 'Ambos equipos anotarán',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: 'Marcan Ambos Equipos',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: 'Ambos equipos marcarán',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: 'Ambos equipos marcarán',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: 'Marcan ambos equipos',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: 'Ambos Equipos Marcan',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: 'ambos equipos anotaran',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: 'Ambos Equipos Marcarán',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: 'Ambos equipos marcan',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Ambos equipos marcan',
                },
            }
        case 'Doble Oportunidad':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad'
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: 'doble oportunidad',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: 'Doble oportunidad',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: 'Doble oportunidad',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: 'Doble oportunidad',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: 'Doble oportunidad',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Doble Oportunidad',
                },
            }
        case 'Gol en ambas mitades':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Gol en ambas mitades',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: 'Se anotarán goles en ambas mitades'
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: 'gol en ambos tiempos',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
        case 'Se clasifica para la siguiente ronda':
            return {
                betplay: {
                    [idsFootball[type]]: type,
                    type: 'Se clasifica para la siguiente ronda',
                },
                wplay: {
                    [idsFootball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsFootball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsFootball[type]]: type,
                    type: '',
                },
                betboro: {
                    [idsFootball[type]]: type,
                    type: 'Goles en ambas mitades',
                },
            }
    }
}

function getBetTypeBasketball1(type) {
    switch (type) {
        case 'Prórroga incluida':
            return {
                betplay: {
                    [idsBasketball[type]]: type,
                    type: 'Prórroga incluida',
                },
                wplay: {
                    [idsBasketball[type]]: type,
                    type: 'Lineas del Juego'
                },
                betsson: {
                    [idsBasketball[type]]: type,
                    type: 'ganador - partido',
                },
                '1xbet': {
                    [idsBasketball[type]]: type,
                    type: 'Victoria del equipo',
                },
                codere: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador del Partido',
                },
                yaJuegos: {
                    [idsBasketball[type]]: type,
                    type: 'Totales',
                },
                luckia: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador del partido (incl. prórroga)',
                },
                sportium: {
                    [idsBasketball[type]]: type,
                    type: 'Handicap de Juegos',
                },
                zamba: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador (incl. prórroga)',
                },
                wonderbet: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador del Partido',
                },
                megapuesta: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador (Inc. Pró.)',
                },
                fullreto: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador (incl. prórroga)',
                },
                betboro: {
                    [idsBasketball[type]]: type,
                    type: 'Ganador (incl. prórroga)',
                },
            }
        case 'Total de puntos - Prórroga incluida':
            return {
                betplay: {
                    [idsBasketball[type]]: type,
                    type: 'Total de puntos - Prórroga incluida',
                },
                wplay: {
                    [idsBasketball[type]]: type,
                    type: 'Total Puntos (Inc. Prórroga)'
                },
                betsson: {
                    [idsBasketball[type]]: type,
                    type: 'puntos totales',
                },
                '1xbet': {
                    [idsBasketball[type]]: type,
                    type: 'Total',
                },
                codere: {
                    [idsBasketball[type]]: type,
                    type: 'Más/Menos Puntos Totales',
                },
                yaJuegos: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsBasketball[type]]: type,
                    type: 'Menos/más (incl. prórroga)',
                },
                sportium: {
                    [idsBasketball[type]]: type,
                    type: 'Total de puntos',
                },
                zamba: {
                    [idsBasketball[type]]: type,
                    type: 'Total (incl. prórroga)',
                },
                wonderbet: {
                    [idsBasketball[type]]: type,
                    type: 'Más / Menos',
                },
                megapuesta: {
                    [idsBasketball[type]]: type,
                    type: 'Total (incl. prórroga)',
                },
                fullreto: {
                    [idsBasketball[type]]: type,
                    type: 'Totales (incl. prórroga)',
                },
                betboro: {
                    [idsBasketball[type]]: type,
                    type: 'Totales (incl. prórroga)',
                },
            }
        case '':
            return {
                betplay: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                wplay: {
                    [idsBasketball[type]]: type,
                    type: ''
                },
                betsson: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                '1xbet': {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                codere: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                yaJuegos: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                luckia: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                sportium: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                zamba: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                wonderbet: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                megapuesta: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
                fullreto: {
                    [idsBasketball[type]]: type,
                    type: '',
                },
            }
    }
}

function getBetTypeInfo(typeId, description) {
    return {
        betplay: { [typeId]: description['betplay'], type: description['betplay'] },
        wplay: { [typeId]: description['betplay'], type: description['wplay'] },
        betsson: { [typeId]: description['betplay'], type: description['betsson'] },
        '1xbet': { [typeId]: description['betplay'], type: description['1xbet'] },
        codere: { [typeId]: description['betplay'], type: description['codere'] },
        yaJuegos: { [typeId]: description['betplay'], type: description['yaJuegos'] },
        luckia: { [typeId]: description['betplay'], type: description['luckia'] },
        sportium: { [typeId]: description['betplay'], type: description['sportium'] },
        zamba: { [typeId]: description['betplay'], type: description['zamba'] },
        wonderbet: { [typeId]: description['betplay'], type: description['wonderbet'] },
        megapuesta: { [typeId]: description['betplay'], type: description['megapuesta'] },
        fullreto: { [typeId]: description['betplay'], type: description['fullreto'] },
        betboro: { [typeId]: description['betplay'], type: description['betboro'] },
        pinnacle: { [typeId]: description['betplay'], type: description['pinnacle'] },
        dafabet: { [typeId]: description['betplay'], type: description['dafabet'] },
        cashwin: { [typeId]: description['betplay'], type: description['cashwin'] },
        bwin: { [typeId]: description['betplay'], type: description['bwin'] },
        lsbet: { [typeId]: description['betplay'], type: description['lsbet'] },
        ggbet: { [typeId]: description['betplay'], type: description['ggbet'] },
        marathon: { [typeId]: description['betplay'], type: description['marathon'] },
    };
}

function getBetTypeFootball(type) {
    const typeId = idsFootball[type];
    const description = betDescriptionsFootball[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeBasketball(type) {
    const typeId = idsBasketball[type];
    const description = betDescriptionsBasketball[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function getBetTypeTennis(type) {
    const typeId = idsTennis[type];
    const description = betDescriptionsTennis[type] || type; // Default a usar el propio tipo si no está definida una descripción
    return getBetTypeInfo(typeId, description);
}

function calculateTotalGol(quotes, data, url, type) {
    // Función para extraer todos los números únicos de las cuotas
    const uniqueVariants = new Set();
    quotes.forEach(quote => {
        quote.cuotas.forEach(cuota => {
            let match = cuota.name.match(/\b(\d+(\.0|\.5)?)\b/); // Regex ajustado para extraer números terminados en .0, .5 o enteros
            if (categoryActual.current == "basketball") match = cuota.name.match(/\b\d+(\.\d+)?\b/);
            if (match) {
                uniqueVariants.add(match[0]);
            }
        });
    });

    const totalVariant = Array.from(uniqueVariants).sort((a, b) => parseFloat(a) - parseFloat(b)); // Convertimos el Set a Array y ordenamos los números
    let results = [];
    for (const variant of totalVariant) {
        let extract = [];
        let extract2 = [];
        for (const quote of quotes) {
            const result = getByGol(quote, variant);
            const result2 = getByGolT(quote, variant);

            if (result && result.cuotas.length > 0) { // Asegúrate de solo añadir resultados con cuotas
                extract.push(result);
            }
            if (result2 && result2.cuotas.length > 0) { // Asegúrate de solo añadir resultados con cuotas
                if (result2.cuotas.length == 4) {
                    const filter1 = result2.cuotas.filter(el => el.name.includes('más') || el.name.includes('mas'));
                    const filter2 = result2.cuotas.filter(el => el.name.includes('menos'));

                    const extractNumber = name => parseFloat(name.match(/[\d\.]+/)[0]);

                    const minObjMas = filter1.reduce((min, el) => extractNumber(el.name) < extractNumber(min.name) ? el : min, filter1[0]);
                    const maxObjMenos = filter2.reduce((max, el) => extractNumber(el.name) > extractNumber(max.name) ? el : max, filter2[0]);
                    result2.cuotas = [
                        minObjMas,
                        maxObjMenos
                    ]
                }
                extract2.push(result2);
            }
        }

        if (extract.length > 0) {
            const combinations = generarCombinacionesDeCasas2(extract);
            results.push(evaluateSurebets(combinations, 1000000, data, url, type));
        }
        if (extract.length > 0) {
            const combinations = generarCombinacionesDeCasas2MoreLess(extract);
            results.push(evaluateSurebets(combinations, 1000000, data, url, type));
        }
    }
    return results;
}

function getByGol(casa, n) {
    if (casa.cuotas) {
        // Asegurar que coincida con el número exacto, sin incluir decimales no deseados
        const regex = new RegExp(`(^|\\s)${n}(\\s|$|[^.\\d])`);
        return {
            nombre: casa.nombre,
            cuotas: casa.cuotas.filter(cuota => regex.test(cuota.name)),
            url: casa.url
        };
    }
    return null;
}

function calculateTotalGolT(quotes, data, url, type) {
    // Función para extraer todos los números únicos de las cuotas
    const uniqueVariants = new Set();
    quotes.forEach(quote => {
        quote.cuotas.forEach(cuota => {
            let match = cuota.name.match(/\b(\d+(\.0|\.5)?)\b/); // Regex ajustado para extraer números terminados en .0, .5 o enteros
            if (categoryActual.current == "basketball") match = cuota.name.match(/\b\d+(\.\d+)?\b/);
            if (match) {
                uniqueVariants.add(match[0]);
            }
        });
    });
    const totalVariant = Array.from(uniqueVariants).sort((a, b) => parseFloat(a) - parseFloat(b)); // Convertimos el Set a Array y ordenamos los números
    let results = [];
    console.log(totalVariant)
    for (const variant of totalVariant) {
        let extract = [];
        // console.log('///////////////////////////')
        for (const quote of quotes) {
            const result = getByGol(quote, variant);
            // console.log(variant, result);
            if (result && result.cuotas.length > 0) { // Asegúrate de solo añadir resultados con cuotas
                if (result.cuotas.length == 4) {
                    const filter1 = result.cuotas.filter(el => el.name.includes('más') || el.name.includes('mas'));
                    const filter2 = result.cuotas.filter(el => el.name.includes('menos'));

                    const extractNumber = name => parseFloat(name.match(/[\d\.]+/)[0]);

                    const minObjMas = filter1.reduce((min, el) => extractNumber(el.name) < extractNumber(min.name) ? el : min, filter1[0]);
                    const maxObjMenos = filter2.reduce((max, el) => extractNumber(el.name) > extractNumber(max.name) ? el : max, filter2[0]);
                    result.cuotas = [
                        minObjMas,
                        maxObjMenos
                    ]
                    //  console.log(result.cuotas)
                }
                extract.push(result);
            }
        }
        //  console.log('///////////////////////////')
        if (extract.length > 0) {
            // console.log(extract)
            const combinations = generarCombinacionesDeCasas2MoreLess(extract);
            console.log(combinations)
            results.push(evaluateSurebets(combinations, 1000000, data, url, type));
        }
    }
    return results;
}

function getByGolT(casa, n) {
    if (casa.cuotas) {
        const nPlusOne = (parseFloat(n) + 1).toFixed(1); // Calcula el número con .5 más
        const regex = new RegExp(`(^|\\s)${n.replace('.', '\\.')}($|\\s)|(^|\\s)${nPlusOne.replace('.', '\\.')}($|\\s)`);

        const filteredCuotas = casa.cuotas.filter(cuota => {
            let nameMatch = cuota.name.match(/\d+(\.5)?/); // Captura números enteros y .5
            const match = nameMatch && (nameMatch[0] === n || nameMatch[0] === nPlusOne) && regex.test(` ${cuota.name} `);
            cuota.name = quitarTildes(cuota.name);
            cuota.name = cuota.name.toLowerCase();
            return match// Coincide exactamente con n o nPlusOne
        });

        return {
            nombre: casa.nombre,
            cuotas: filteredCuotas,
            url: casa.url
        };
    }
    return null;
}

function groupAndReduceBetsByType(bets, targetType, insertIndex) {
    const grouped = { type: targetType, bets: [] };

    // Recorre las apuestas para agrupar las del tipo deseado
    bets.forEach(bet => {
        if (bet.type === targetType) {
            grouped.id = bet.id;
            grouped.bets = grouped.bets.concat(bet.bets);
        }
    });

    // Filtrar los objetos que no son del tipo objetivo
    const result = bets.filter(bet => bet.type !== targetType);

    // Si no se especifica un índice o el índice es inválido, usar la posición predeterminada al final
    if (insertIndex === undefined || insertIndex < 0 || insertIndex > result.length) {
        insertIndex = result.length;
    }

    // Insertar el objeto agrupado en el índice especificado
    result.splice(insertIndex, 0, grouped);

    return result;
}

async function getUrlsTeams(team1, team2, n) {
    let pageT, contextT;
    try {
        console.log('INICIO')
        const { page, context } = await initBrowser('https://www.google.com/?hl=es', 'google' + n);
        pageT = page;
        contextT = context;

        page.setDefaultTimeout(2000);
        const search = page.locator('*[name = "q"]');
        await search.fill(team1 + ' FC logo');
        await search.press('Enter');
        await page.getByText('Imágenes').first().waitFor();
        await page.getByText('Imágenes').first().click();
        let img, url1, url2;
        await page.waitForTimeout(1000);
        if (await page.locator('(//td/a/div/img)[1]').isVisible()) {
            img = page.locator('(//td/a/div/img)[1]');
            url1 = await img.getAttribute('src');
            await search.first().fill(team2 + ' FC logo');
            await search.first().press('Enter');
            url2 = await img.getAttribute('src');
        } else {
            if (await page.locator('(//h3/a)[1]').isVisible()) img = page.locator('(//h3/a)[1]');
            else if (await page.locator('(//td/a/div)[1]').isVisible()) img = page.locator('(//td/a/div)[1]');
            else img = await page.locator('(//h3/parent::*/a)[1]');
            await img.click();
            // page.setDefaultTimeout(20000);
            // await page.waitForTimeout(20000);
            let link = page.locator('//c-wiz//a/img[@aria-hidden = "false"]');
            if (!(await link.isVisible())) link = page.locator('//div/a/img[2]');
            url1 = await link.getAttribute('src');
            await search.first().fill(team2 + ' FC logo');
            await search.first().press('Enter');
            await img.click();
            url2 = await link.getAttribute('src');
        }
        if (url1.includes('data:image/')) return ['', ''];
        // console.log(url1, url2)
        // const url2 = await link.getAttribute('src');
        return [url1, url2];
    } catch (error) {
        // if (pageT) await pageT.close();
        console.log(error);
        return ['', ''];
    }
}

module.exports = {
    getBetTypeFootbal,
    calculateTotalGol,
    getBetTypes,
    groupAndReduceBetsByType,
    getUrlsTeams,
}