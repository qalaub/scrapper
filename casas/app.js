
const { getBetTypes, calculateTotalGol, getUrlsTeams } = require("../logic/surebets");
const { get1xBetApi, getResults1xbet } = require("./1xbet");
const { getBetPlayApi } = require("./betplay");
const { getResultsBetsson } = require("./betsson");
const { getBetwinnerApi, getResultsBetwinner } = require("./betwinner");
const { getCodereApi } = require("./codere");
const { getFullretoApi } = require("./fullreto");
const { getUnibetApi } = require("./unibet");
const { getLuckiaApi } = require("./luckia");
const { getResultsMegapuesta } = require("./megapuesta");
const { getResultsSportium } = require("./sportium");
const { createJSON, evaluateSurebets, getResponse, closeBrowser, generarCombinacionesDeCasas3, initBrowser, closeContext, generarCombinacionesDeCasas2, dividirArregloEnDosSubarreglos, matchnames, tienenPalabrasEnComunDinamico } = require("./utils");
const { getResultsWonder } = require("./wonderbet");
const { getResultsWPlay } = require("./wplay");
const { getResultsYaJuegos } = require("./yajuegos");
const { getResultsZamba } = require("./zamba");
const { getResultsBetboro } = require("./betboro");
const { betTypesFootball, categories, betTypesBaketball, idsFootball, idsBasketball } = require("../logic/constantes");
const { QuoteManager } = require("../logic/utils/QuoteManage");

// Crear una instancia de QuoteManager
const quoteManager = new QuoteManager();

const types = {
    football: {
        types: betTypesFootball,
        ids: idsFootball
    },
    basketball: {
        types: betTypesBaketball,
        ids: idsBasketball
    },

}

async function execute() {
    const inicio = new Date();
    const calculatePerPair = async (eventOdd, n, category) => {
        let surebets = [];
        let cont = 0;
        for (const event of eventOdd) {

            console.log('///////////////// ejecucion pair ' + n);
            // Fecha y hora en formato UTC
            const fechaUTC = new Date(event.event.start);
            // Convertir a hora local de Colombia (UTC-5)
            fechaUTC.setHours(fechaUTC.getHours() - 5);

            const data = {
                team1: event.event.homeName,
                team2: event.event.awayName,
                start: fechaUTC,
                category
            };
            const name = event.event.name;
            const results1 = await Promise.all([
                getBetPlayApi(event.event, betTypes.betplay, n),
                getResultsWPlay(name, betTypes.wplay, n),
                getResultsBetsson(name, betTypes.betsson, n),
                getResultsBetwinner(name, betTypes['1xbet'], n),
                getResults1xbet(name, betTypes['1xbet'], n),
                getCodereApi(name, betTypes.codere, n),
            ]);

            const results3 = await Promise.all([
                getLuckiaApi(name, betTypes.luckia, n),
                getResultsSportium(name, betTypes.sportium, n),
                getResultsZamba(name, betTypes.zamba, n),
                getResultsWonder(name, betTypes.wonderbet, n),
            ]);

            const results2 = await Promise.all([
                getResultsMegapuesta(name, betTypes.megapuesta, n),
                getFullretoApi(name, betTypes.fullreto, n),
                getResultsBetboro(name, betTypes.betboro, n),
                getUnibetApi(event.event, betTypes.betplay, n),
            ]);

            const urls = await getUrlsTeams(data.team1, data.team2, n);
            const url = {
                team1: urls[0] || '',
                team2: urls[1] || '',
            }

            quoteManager.addQuotes(results1, types[category].types);
            quoteManager.addQuotes(results2, types[category].types);
            quoteManager.addQuotes(results3, types[category].types);

            const surebet = quoteManager.processSurebets(data, url,  types[category].ids);
            console.log(surebet);
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
        const res = await getResponse(category);
        betTypes = getBetTypes(types[category].types, category);
        // await getResultsBetwinner('Borussia Dortmund - París SG', betTypes['1xbet'], 1);
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

