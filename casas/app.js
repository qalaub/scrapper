const { getBetTypes, getUrlsTeams } = require("../logic/surebets");
const { getBetPlayApi } = require("./betplay");
const { getResultsBetsson } = require("./betsson");
const { getResultsBetwinner } = require("./betwinner");
const { getCodereApi } = require("./codere");
const { getFullretoApi } = require("./fullreto");
const { getLuckiaApi } = require("./luckia");
const { getResultsMegapuesta } = require("./megapuesta");
const { getResultsSportium } = require("./sportium");
const {
    createJSON,
    getResponse,
    closeBrowser,
    dividirArregloEnDosSubarreglos,
    matchnames,
    categoryActual, } = require("./utils");
const { getResultsWonder } = require("./wonderbet");
const { getResultsWPlay } = require("./wplay");
const { getResultsYaJuegos } = require("./yajuegos");
const { getResultsZamba } = require("./zamba");
const { getResultsBetboro } = require("./betboro");
const {
    betTypesFootball,
    categories,
    betTypesBaketball,
    idsFootball,
    idsBasketball,
    betTypesTennis,
    idsTennis,
    idsVolleyball,
    betTypesVolleyball,
    betTypesBaseball,
    idsBaseball,
    betTypesMMA,
    idsMMA,
    idsIceHokey,
    betTypesIceHockey,
    betTypesAmericanFootball,
    idsAmericanFootball,
    betTypesCricket,
    idsCricket,
    betTypesSnooker,
    idsSnooker,
    betTypesTableTennis,
    idsTableTennis,
} = require("../logic/constantes");
const { QuoteManager } = require("../logic/utils/QuoteManage");
const { getPinnacleApi } = require("./pinnacle");
const { getResultsDafabet } = require("./dafabet");
const { getCashwinApi } = require("./cashwin");
const { getResultsBwin } = require("./bwin");
const { getLsbetApi } = require("./lsbet");
const { getResultsGgbet } = require("./ggbet");
const { getMarathonApi } = require("./marathonbet");
const { getResultsStake } = require("./stake");
const { getResults1bet } = require("./1bet");
const { getResultsCloudbet } = require("./cloudbet");
const { getResultsSuprabet } = require("./suprabet");
const { getResultsIvibet } = require("./ivibet");
const { getMostbetApi } = require("./mostbet");
const types = {
    football: {
        types: betTypesFootball,
        ids: idsFootball,
    },
    basketball: {
        types: betTypesBaketball,
        ids: idsBasketball,
    },
    tennis: {
        types: betTypesTennis,
        ids: idsTennis,
    },
    volleyball: {
        types: betTypesVolleyball,
        ids: idsVolleyball,
    },
    'ufc_mma': {
        types: betTypesMMA,
        ids: idsMMA,
    },
    baseball: {
        types: betTypesBaseball,
        ids: idsBaseball,
    },
    cricket: {
        types: betTypesCricket,
        ids: idsCricket,
    },
    'ice_hockey': {
        types: betTypesIceHockey,
        ids: idsIceHokey,
    },
    'american_football': {
        types: betTypesAmericanFootball,
        ids: idsAmericanFootball,
    },
    snooker: {
        types: betTypesSnooker,
        ids: idsSnooker,
    },
    'table_tennis': {
        types: betTypesTableTennis,
        ids: idsTableTennis,
    },
}

const timeMargins = {
    'snooker': { duration: 120, lessThan: 30, betweenStart: 90, betweenEnd: 120 },
    'ufc_mma': { duration: 15, lessThan: 5, betweenStart: 10, betweenEnd: 15 },
    'table_tennis': { duration: 30, lessThan: 10, betweenStart: 20, betweenEnd: 30 },
    'american_football': { duration: 60, lessThan: 20, betweenStart: 45, betweenEnd: 60 },
    'cricket': { duration: 300, lessThan: 60, betweenStart: 240, betweenEnd: 300 },
    'volleyball': { duration: 60, lessThan: 20, betweenStart: 45, betweenEnd: 60 },
    'ice_hockey': { duration: 60, lessThan: 20, betweenStart: 45, betweenEnd: 60 },
    'basketball': { duration: 48, lessThan: 15, betweenStart: 35, betweenEnd: 48 },
    'tennis': { duration: 180, lessThan: 60, betweenStart: 120, betweenEnd: 180 },
    'baseball': { duration: 180, lessThan: 60, betweenStart: 120, betweenEnd: 180 },
    'football': { duration: 90, lessThan: 30, betweenStart: 50, betweenEnd: 75 } // 'football' se refiere al fútbol/soccer
};


async function execute() {
    categoryActual.isLive = false;
    process.argv.forEach(arg => {
        if (arg === '--isLive') {
            categoryActual.isLive = true;
        }
    });
    // console.log( categoryActual.isLive )
    // console.log(await tienenPalabrasEnComunDinamicoT('Grêmio-RS - Estudiantes de La Plata', 'CA Sarmiento - Estudiantes de La Plata'))
    const inicio = new Date();
    // console.log(await tienenPalabrasEnComunDinamico('Adelaide Blue Eagles - Cumberland United', 'Adelaide Blue Eagles II - Cumberland United II'))
    const calculatePerPair = async (eventOdd, n, category) => {
        const quoteManager = new QuoteManager();
        let surebets = [];
        let cont = 0;
        // eventOdd = eventOdd.filter(e => e.event.name.includes('Gilbert, David - Xu Si'));
        console.log(eventOdd.length)
        for (const event of eventOdd) {
            // Fecha y hora en formato UTC
            const fechaUTC = new Date(event.event.start);
            if (categoryActual.isLive) {
                // Calcular la diferencia en milisegundos
                const differenceInMilliseconds = Math.abs(inicio - fechaUTC);
                // Convertir la diferencia a minutos
                const differenceInMinutes = differenceInMilliseconds / (1000 * 60);
            
                // Obtener los márgenes y rangos de tiempo para la categoría actual
                const { duration = 0, lessThan = 0, betweenStart = 0, betweenEnd = 0 } = timeMargins[category] || {};
            
                // Comprobar si la diferencia es menor o igual a la duración total del deporte
                const isDifferenceWithinDuration = differenceInMinutes <= duration;
            
                // Añadir condiciones para los rangos específicos según la categoría
                const isLessThanTime = differenceInMinutes < lessThan;
                const isBetweenTimes = differenceInMinutes >= betweenStart && differenceInMinutes <= betweenEnd;
            
                // Depuración para verificar valores
                console.log(`differenceInMinutes: ${differenceInMinutes}`);
                console.log(`isLessThanTime: ${isLessThanTime}`);
                console.log(`isBetweenTimes: ${isBetweenTimes}`);
                console.log(`isDifferenceWithinDuration: ${isDifferenceWithinDuration}`);
                console.log(`Márgenes para ${category}: lessThan=${lessThan}, betweenStart=${betweenStart}, betweenEnd=${betweenEnd}`);
            
                // Verificar si cumple cualquiera de las condiciones
                if (isDifferenceWithinDuration && (isLessThanTime || isBetweenTimes)) {
                    console.log("Partido considerado");
                } else {
                    console.log("Partido no considerado");
                    continue;
                }
            }
            

            fechaUTC.setHours(fechaUTC.getHours() - 5);
            const data = {
                team1: event.event.homeName,
                team2: event.event.awayName,
                start: fechaUTC,
                category
            };
            // quoteManager.addQuotes([await getBetPlayApi('1021103523', betTypes.betplay, n, '', 'Toronto Blue Jays')], types[category].types, data);
            // break;
            console.log('///////////////// ejecucion pair ' + n);
            const urls = ['', '']// await getUrlsTeams(data.team1, data.team2, n); // 
            const url = {
                team1: urls[0],
                team2: urls[1],
            }
            const name = event.event.name;
            if (!categoryActual.isLive) {
                const results1 = await Promise.all([
                    getBetPlayApi(event.event, betTypes.betplay, n),
                    getResultsWPlay(name, betTypes.wplay, n, data.team1),
                    getResultsBetsson(name, betTypes.betsson, n),
                    getResultsBetwinner(name, betTypes['1xbet'], n, 'betwinner', data.team1),
                    getResultsBetboro(name, betTypes.betboro, n, data.team1),
                ]);

                const results3 = await Promise.all([
                    getResultsBetwinner(name, betTypes['1xbet'], n, '1xbet', data.team1),
                    getCodereApi(name, betTypes.codere, n),
                    getLuckiaApi(name, betTypes.luckia, n),
                    getResultsSportium(name, betTypes.sportium, n, data.team1),
                    getResultsZamba(name, betTypes.zamba, n),
                    getResultsSuprabet(name, betTypes.suprabet, n),
                ]);

                const results2 = await Promise.all([
                    getResultsWonder(name, betTypes.wonderbet, n),
                    getResultsMegapuesta(name, betTypes.megapuesta, n),
                    getFullretoApi(name, betTypes.fullreto, n, data.team1),
                    getResultsDafabet(name, betTypes.dafabet, n),
                    getResults1bet(name, betTypes.unobet, n, data.team1),
                ]);

                const results4 = await Promise.all([
                    getPinnacleApi(name, betTypes.pinnacle, n, data.team1),
                    getCashwinApi(name, betTypes.cashwin, n),
                    getResultsBwin(name, betTypes.bwin, n),
                    getLsbetApi(name, betTypes.lsbet, n),
                    getMarathonApi(name, betTypes.marathon, n, data.team1),
                ]);

                const results5 = await Promise.all([
                    getResultsStake(name, betTypes.stake, n, data.team1),
                    // getResultsCloudbet(name, betTypes.cloudbet, n, data.team1),
                    getResultsIvibet(name, betTypes.ivibet, n),
                    getResultsGgbet(name, betTypes.ggbet, n),
                    getMostbetApi(name, betTypes.mostbet, n),
                ]);

                for (let i = 0; i < 3; i++) {
                    quoteManager.addQuotes(results1, types[category].types, data);
                    quoteManager.addQuotes(results2, types[category].types, data);
                    quoteManager.addQuotes(results3, types[category].types, data);
                    quoteManager.addQuotes(results4, types[category].types, data);
                    quoteManager.addQuotes(results5, types[category].types, data);
                }
            } else {
                const results1 = await Promise.all([
                    getFullretoApi(name, betTypes.fullreto, n, data.team1),
                    getBetPlayApi(event.event, betTypes.betplay, n),
                    getResultsWPlay(name, betTypes.wplay, n, data.team1),
                    getResultsBetsson(name, betTypes.betsson, n),
                    getResultsSportium(name, betTypes.sportium, n),
                    getMarathonApi(name, betTypes.marathon, n, data.team1),
                    getPinnacleApi(name, betTypes.pinnacle, n, data.team1),
                    getResultsGgbet(name, betTypes.ggbet, n, data.team1),
                ]);

                quoteManager.addQuotes(results1, types[category].types, data);
                quoteManager.addQuotes(results1, types[category].types, data);
                quoteManager.addQuotes(results1, types[category].types, data);
            }

            const surebet = await quoteManager.processSurebets(data, url, types[category].ids);
            surebets.push(surebet);
            quoteManager.clearQuotes();
            if (cont % 20 == 0 && cont != 0) {
                await createJSON('surebet_' + category + n + '_' + cont, surebets);
                surebets = [];
            }
            console.log('FInalizada ejecucion ' + cont);
            cont++;
            console.log('///////////////// FInalizada ejecucion pair ' + n);
        }
        await createJSON('surebet_' + n + '_' + cont, surebets);
    }

    for (const category of categories) {
        categoryActual.current = category;
        const res = await getResponse(category);
        betTypes = getBetTypes(types[category].types, category);
        let events = res.events;
        events = events.filter(({ event }) => !event.name.includes('Esports'));
        console.log(events.length);
        // events = [{
        //     event : {
        //         start: ''
        //     }
        // }]
        let pairs = dividirArregloEnDosSubarreglos(events, 2);
        await Promise.all([
            calculatePerPair(pairs[0], 1, category),
            calculatePerPair(pairs[1], 2, category),
        ]);
        await closeBrowser();
    }
    const final = new Date();
    console.log('FINAL::   ' + (final - inicio));
    await createJSON('names', matchnames);
    process.exit();

}

module.exports = {
    execute,
    getResultsYaJuegos,
};
