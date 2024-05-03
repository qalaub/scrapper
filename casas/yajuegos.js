const { buscar } = require("../logic/utils/buscar");
const { initRequest } = require("../logic/utils/request");
const { initBrowser, createJSON, quitarTildes, tienenPalabrasEnComunDinamico } = require("./utils");

const buscarQ = async (page, query) => {
    try {
        await page.getByPlaceholder('Buscar eventos, ligas, equipos y jugadores').fill('');
        await page.waitForTimeout(1000);
        await page.getByPlaceholder('Buscar eventos, ligas, equipos y jugadores').fill(query);
        await page.getByPlaceholder('Buscar eventos, ligas, equipos y jugadores').press('Enter');
        await page.waitForTimeout(1000);
        const noResult = page.getByText('Lo sentimos; no se ha encontrado ningún evento. Compruebe los criterios de su búsqueda e inténtelo de nuevo.');
        await page.waitForTimeout(4000);
        const isVisible = await noResult.isVisible({ timeout: 5000 });
        return !isVisible;
    } catch (error) {
        return false;
    }
};

const intentarEncontrarOpcion = async (page, match) => {
    const opciones = await page.locator('xpath=//div[contains(@id, "prematch_event")]').all();
    for (const opcion of opciones) {
        const local = await opcion.locator('.sports-table__home').textContent();
        const away = await opcion.locator('.sports-table__away').textContent();
        match = match.replace(' - ', ' ');
        match = quitarTildes(match)
        let text = quitarTildes(local + ' ' + away);
        const pass = tienenPalabrasEnComunDinamico(match, text, 75);
        await page.waitForTimeout(2000);
        if (pass) {
            console.log('YAJUEGOS: ', match, text);
            await opcion.click();
            return true;
        }
    }
    return false;
};

async function getResultsYaJuegos(match, betTypes = ['1X2']) {
    const { page, context } = await initBrowser('https://sports.yajuego.co/searchResults/', 'yajuegos');
    if (page) {
        try {
            await page.waitForTimeout(3000);
            await page.mouse.click(200, 200, { timeout: 5000 });
            page.setDefaultTimeout(5000);
            await buscar(page, match, buscarQ, intentarEncontrarOpcion);
            let betYaJuegos = {
                nombre: 'yajuegos',
                title: match,
                bets: []
            }
            for (const betType of betTypes) {
                const type = await page.locator('//div[contains(@class, "accordion-toggle")]/div[text() = "' + betType + '"]').textContent();
                let betTemp = {
                    type,
                    bets: []
                }
                const bets = await page
                    .locator('//div[contains(@class, "accordion-toggle")]/div[text() = "' + betType + '"]/parent::*/parent::*/div[@class = "accordion-content"]//div[@class = "market-item"]')
                    .all();
                if (betType.type == 'Totales') {
                    let dots = "";
                    let temp = [];
                    let cont = 0;
                    for (const bet of bets) {
                        if (cont % 3 == 0 && cont != 0) {
                            betTemp.bets.push(temp[1]);
                            betTemp.bets.push(temp[0]);
                            temp = [];
                        }
                        const divs = await bet.locator('div').all();
                        if (divs.length > 1) {
                            const name = await bet.locator('div').first().textContent();
                            const quote = await bet.locator('.market-odd').first().textContent();
                            temp.push({
                                name: name + dots,
                                quote
                            });
                        } else dots = await divs[0].textContent();
                        cont++;
                    }
                    // console.log(betTemp.bets)
                } else {
                    for (const bet of bets) {
                        const name = await bet.locator('div').first().textContent();
                        const quote = await bet.locator('.market-odd').first().textContent();
                        betTemp.bets.push({
                            name,
                            quote
                        });
                    }
                }
                betYaJuegos.bets.push(betTemp);
            }

            // await page.close();
            return betYaJuegos;
        } catch (error) {
            console.log(error);
            //  await page.close();
        }
    }
}

const excludes = ["deportivo", "club", "FC", "Al", "(KSA)", "IF", 'atletico'];

async function buscarApi(match) {
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));

    const buscar = async (text) => {
        let yaJuegosSearch = await initRequest(
            `https://apigw.yajuego.co/sportsbook/search/SearchV2?source=desktop&v_cache_version=1.248.1.949`,
            'POST',
            `TERM=${text}&START=0&ROWS=100000&ISCOMPETITION=0&ISEVENT=1&ISTEAM=0&GROUPBYFIELD=sp_id&GROUPBYLIMIT=11`
        );
        return yaJuegosSearch;
    }

    for (const cad of segmentos) {
        const res = await buscar(cad);
        if (res) {
            // const pass = res.filter(q => tienenPalabrasEnComunDinamico(match, q.name, 75));
            // if (pass) return pass[0].link;
        }
    }
}

async function getYaJuegosApi(name, types) {
    try {
        const link = await buscarApi(name);
        console.log(link)
        const res = await initRequest(`https://1xbet.com/LineFeed/GetGameZip?id=${link}&lng=es&isSubGames=true&GroupEvents=true&allEventsGroupSubGames=true&countevents=250&country=91&fcountry=91&marketType=1&gr=70&isNewBuilder=true`);
        types = types.map(type => getType(type));
        return {
            nombre: '1xbet',
            title: name,
            bets: filter
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    getResultsYaJuegos,
    getYaJuegosApi
}