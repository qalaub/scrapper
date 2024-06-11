const { timeouts } = require("../const/timeouts");
const { excludes, selectMoreOption } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const {
    initBrowser,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    matchnames,
    categoryActual,
    tienenPalabrasEnComunDinamicoT,
} = require("./utils");

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let marathonSearch = await initRequest(`https://mobile.marathonbet.com/mobile-gate/api/v1/events/search?query=${text}`);
        if (categoryActual.isLive) {
            marathonSearch = marathonSearch.live?.map(temp => {
                return {
                    name: temp.name,
                    link: temp.eventTreeId
                }
            });
        } else {
            marathonSearch = marathonSearch.prematch?.map(temp => {
                return {
                    name: temp.name,
                    link: temp.eventTreeId
                }
            });
        }
        return marathonSearch;
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

const permit1 = [
    'Total de goles',
    'Total de goles - 2.º tiempo',
    'Total de goles - 1.er tiempo',
    'Total de córneres',
    'Tarjetas amarillas - Total',
    'Total de córneres - 1.er tiempo',
    'Total de puntos',
    'Total de puntos - 1.er cuarto',
    'Total de puntos - 2.º cuarto',
    'Total de puntos - 1.ª mitad',
    'Total de puntos - 3.er cuarto',
    'Total de puntos - 4.º cuarto',
    'Total de puntos - 2.ª mitad',
    'Total de juegos',
    'Total de juegos del 1.er set',
    'Total de sets',
    'Total de dobles faltas',
    'Total de aces',
    'Total de carreras',
    'Total de carreras en la 1.ª entrada'
];

const permit2 = [
    'Más córneres',
    'Más tarjetas amarillas',
    'Más hits',
];

const permit3 = [
    'Ganador del partido incluyendo la prórroga',
    'Resultado de la 2.ª mitad',
    'Resultado del 3.er cuarto',
    'Resultado de la 1.ª mitad',
    'Resultado del 2.º cuarto',
    'Resultado del 1.er cuarto',
    'Resultado de la 2.ª mitad',
]

async function clickAndWait(page, selector) {
    await page.getByText(selector).click();
    page.setDefaultTimeout(2000);
    await page.waitForTimeout(1000);
}

const typeToSelector = {
    'Total de goles - 2.º tiempo': 'Mercados de tiempos',
    'Total de córneres - 1.er tiempo': 'Mercados de córneres',
    'Más tarjetas amarillas': 'Mercados de faltas',
    'Resultado de la 1.ª mitad': 'Mercados de mitades',
    'Resultado del 1.er cuarto': 'Mercados de cuartos',
    '1st Set Result': 'Mercados de sets',
    'Gana el 1.er set': 'Mercados de sets',
    'Total de dobles faltas': 'Mercados de dobles faltas',
    'Total de aces': 'Mercados de aces',
    'Más hits': 'Otros',
};


async function getMarathonApi(name, types, n, team1) {
    try {
        const link = await buscarApi(name);
        console.log(link);
        if (link) {
            let url = `https://marathonbet.com`;
            const { page, context } = await initBrowser(url, 'marathon' + n, 1000);
            if (page) {
                let bets = [];
                await page.goto(`https://mobile.marathonbet.com/es/sport/${categoryActual.isLive ? 'live' : 'prematch'}/event/${link}`);
                await page.waitForTimeout(5000);
                page.setDefaultTimeout(timeouts.bet);
                for (const type of types) {
                    try {
                        if (typeToSelector.hasOwnProperty(type.type)) {
                            await clickAndWait(page, typeToSelector[type.type]);
                        }
                        let title = await page.locator('//h3[text() = "' + type.type + '"]');
                        const parent = await page.locator('//h3[text() = "' + type.type + '"]/parent::*/parent::*/parent::*').first();
                        let collapse = await parent.locator('//div[contains(@data-type ,"header")]');
                        collapse = await collapse.getAttribute('class');
                        if (!collapse.includes('styles-module_header--expanded')) await parent.click();
                        await page.waitForTimeout(700);
                        let betTemp = [];
                        if (permit1.includes(type.type)) {
                            let titles = await parent.locator('//li').all();
                            titles = [await titles[1].textContent(), await titles[2].textContent()];
                            const btns = await parent.locator('//*/b').all();
                            const number = await parent.locator('//div[@data-test="celllabel"]').all();
                            let cont = 0;
                            for (let i = 0; i < btns.length; i++) {
                                if (i % 2 == 0 && i != 0) cont++;
                                if (cont > number.length - 1) break;
                                let quote = await btns[i].textContent();
                                let name = titles[i % 2 == 0 ? 0 : 1] + ' ' + await number[cont].textContent();
                                if (quote.includes('Impar') || quote.includes('Par')) break;
                                betTemp.push({
                                    name,
                                    quote: quote
                                });
                            }
                            betTemp = ordenarDinamicamenteMasMenos(betTemp);
                        } else {
                            let titles = await parent.locator('//li').all();
                            let btns = await parent.locator('//span').all();
                            if (permit2.includes(type.type)) {
                                titles = await parent.locator('//span/span').all();
                                btns = await parent.locator('//span/b').all();
                            }
                            for (let i = 0; i < btns.length; i++) {
                                let name = await titles[i].textContent();
                                let quote = await btns[i].textContent();
                                betTemp.push({
                                    name,
                                    quote: quote
                                });
                            }
                        }
                        if (permit3.includes(type.type)) {
                            console.log('////////////////////////////////////////')
                            const p = await page.locator('//div[@data-test = "event-team-names"]/div').first();
                            const t = await p.textContent();
                            if (t != "" && t) {
                                if (!tienenPalabrasEnComunDinamicoT(t, team1)) {
                                    if (betTemp.length == 2) {
                                        let temp = betTemp[0];
                                        betTemp[0] = betTemp[1];
                                        betTemp[1] = temp;
                                    } else if (betTemp.length == 3) {
                                        let temp = betTemp[0];
                                        betTemp[0] = betTemp[2];
                                        betTemp[2] = temp;
                                    }
                                }
                            }
                            console.log('////////////////////////////////////////')
                        }
                        bets.push({
                            id: Object.keys(type)[0],
                            type: type.type,
                            bets: betTemp,
                        })
                        // console.log(betTemp);
                        console.log('//////// MARATHONBET LENGTH ', bets.length);
                    } catch (error) {
                        // console.log(error)
                        console.log('ERROR AL ENCONTRAR APUESTA')
                    }
                }
                url = await page.url() || url;
                console.log('//////////////////// MARATHONBET //////////////////')
                console.log('//////////////////// MARATHONBET //////////////////')
                return {
                    nombre: 'marathon',
                    title: name,
                    bets,
                    url
                }
            }
        }

    } catch (error) {
        // if (error.includes('Value')) {
        console.log(error)
        // }
    }
}

function ordenarDinamicamenteMasMenos(apuestas) {
    const mas = apuestas.filter(apuesta => apuesta.name.includes('Más')).sort((a, b) => parseFloat(a.name) - parseFloat(b.name));
    const menos = apuestas.filter(apuesta => apuesta.name.includes('Menos')).sort((a, b) => parseFloat(a.name) - parseFloat(b.name));

    const resultado = [];
    const maxLength = Math.max(mas.length, menos.length);

    for (let i = 0; i < maxLength; i++) {
        if (i < mas.length) resultado.push(mas[i]);
        if (i < menos.length) resultado.push(menos[i]);
    }

    return resultado;
}

module.exports = {
    getMarathonApi
}