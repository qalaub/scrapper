const { getBetTypes, getUrlsTeams } = require("../logic/surebets");
const { getBetPlayApi } = require("./betplay");
const { getResultsBetsson, getBetssonApi } = require("./betsson");
const { getResultsBetwinner } = require("./betwinner");
const { getCodereApi } = require("./codere");
const { getFullretoApi } = require("./fullreto");
const { getUnibetApi } = require("./unibet");
const { getLuckiaApi } = require("./luckia");
const { getResultsMegapuesta } = require("./megapuesta");
const { getResultsSportium } = require("./sportium");
const {
    createJSON,
    getResponse,
    closeBrowser,
    dividirArregloEnDosSubarreglos,
    matchnames,
    categoryActual,
    tienenPalabrasEnComunDinamicoT,
    tienenPalabrasEnComunDinamico } = require("./utils");
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
} = require("../logic/constantes");
const { QuoteManager } = require("../logic/utils/QuoteManage");
const { getPinnacleApi } = require("./pinnacle");
const { getResultsDafabet } = require("./dafabet");
const { getCashwinApi } = require("./cashwin");
const { getResultsBwin } = require("./bwin");
const { getLsbetApi } = require("./lsbet");
const { getResultsGgbet } = require("./ggbet");
const { getMarathonApi } = require("./marathonbet");
const { getResultsLeon } = require("./leon");
const { getResultsStake } = require("./stake");



const types = {
    football: {
        types: betTypesFootball,
        ids: idsFootball
    },
    basketball: {
        types: betTypesBaketball,
        ids: idsBasketball
    },
    tennis: {
        types: betTypesTennis,
        ids: idsTennis
    },
    volleyball: {
        types: betTypesTennis,
        ids: idsTennis
    },
    'ufc_mma': {
        types: betTypesTennis,
        ids: idsTennis
    },
}

async function execute() {
    categoryActual.isLive = false;
    console.log(await tienenPalabrasEnComunDinamicoT('Santeros De Aguada', 'Aguada Santeros'))
    const inicio = new Date();
    // console.log(await tienenPalabrasEnComunDinamico('Adelaide Blue Eagles - Cumberland United', 'Adelaide Blue Eagles II - Cumberland United II'))
    const calculatePerPair = async (eventOdd, n, category) => {
        const quoteManager = new QuoteManager();
        let surebets = [];
        let cont = 0;
        // eventOdd = eventOdd.filter(e => e.event.name.includes('Drogheda'));
        // console.log(eventOdd.length)
        for (const event of eventOdd) {
            // Fecha y hora en formato UTC
            const fechaUTC = new Date(event.event.start);
            if (categoryActual.isLive) {
                // Calcular la diferencia en milisegundos
                const differenceInMilliseconds = Math.abs(inicio - fechaUTC);
                // Convertir la diferencia a minutos
                const differenceInMinutes = differenceInMilliseconds / (1000 * 60);
                // Comprobar si la diferencia es de 70 minutos o menos
                const isDifference70MinutesOrLess = differenceInMinutes <= 70;
                console.log(isDifference70MinutesOrLess);  // Devolverá true o false
                if (!isDifference70MinutesOrLess) continue;
            }
            fechaUTC.setHours(fechaUTC.getHours() - 5);
            const data = {
                team1: event.event.homeName,
                team2: event.event.awayName,
                start: fechaUTC,
                category
            };
            // await getUrlsTeams(data.team1, data.team2, n);
            // quoteManager.addQuotes([await getResultsStake('Minnesota Timberwolves - Dallas Mavericks', betTypes.stake, n, 'SV Wehen Wiesbaden')], types[category].types, data);
            // break;
            console.log('///////////////// ejecucion pair ' + n);
            const urls = await getUrlsTeams(data.team1, data.team2, n);
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
                    getResultsBetwinner(name, betTypes['1xbet'], n),
                    getResultsBetboro(name, betTypes.betboro, n, data.team1),
                ]);

                const results3 = await Promise.all([
                    getResultsBetwinner(name, betTypes['1xbet'], n, '1xbet'),
                    getCodereApi(name, betTypes.codere, n),
                    getLuckiaApi(name, betTypes.luckia, n),
                    getResultsSportium(name, betTypes.sportium, n),
                    getResultsZamba(name, betTypes.zamba, n),
                ]);

                const results2 = await Promise.all([
                    getResultsWonder(name, betTypes.wonderbet, n),
                    getResultsMegapuesta(name, betTypes.megapuesta, n),
                    getFullretoApi(name, betTypes.fullreto, n),
                    getResultsDafabet(name, betTypes.dafabet, n),
                    // getResultsLeon(name, betTypes.leon, n, data.team1),
                    getResultsStake(name, betTypes.stake, n, data.team1),
                ]);

                const results4 = await Promise.all([
                    getPinnacleApi(name, betTypes.pinnacle, n, data.team1),
                    getCashwinApi(name, betTypes.cashwin, n),
                    getResultsBwin(name, betTypes.bwin, n),
                    getLsbetApi(name, betTypes.lsbet, n),
                    getResultsGgbet(name, betTypes.ggbet, n),
                    getMarathonApi(name, betTypes.marathon, n, data.team1)
                ]);

                for (let i = 0; i < 1; i++) {
                    quoteManager.addQuotes(results1, types[category].types, data);
                    quoteManager.addQuotes(results2, types[category].types, data);
                    quoteManager.addQuotes(results3, types[category].types, data);
                    quoteManager.addQuotes(results4, types[category].types, data);
                }
            } else {
                const results1 = await Promise.all([
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
            // console.log(surebet)
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
