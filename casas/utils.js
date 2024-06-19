const { firefox, chromium, webkit, } = require("playwright");
const fs = require('fs').promises; // Importa la versión promisificada de fs
const { postFormData, initRequest } = require("../logic/utils/request");
const levenshtein = require('fast-levenshtein');
const { timeouts } = require("../const/timeouts");

let categoryActual = {};
let matchnames = [];
let surebetcont = 0;

const userAgents = [
    // Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/113.0.5672.126 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:113.0) Gecko/20100101 Firefox/113.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:113.0) Gecko/20100101 Firefox/113.0",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:113.0) Gecko/20100101 Firefox/113.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/113.0.1774.50",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/113.0.5672.127 Safari/537.36",
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:113.0) Gecko/20100101 Firefox/113.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) Chrome/112.0.5615.138',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:113.0) Gecko/20100101 Firefox/113.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:114.0) Gecko/20100101 Firefox/114.0',
    // Linux
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:113.0) Gecko/20100101 Firefox/113.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:113.0) Gecko/20100101 Firefox/113.0',
    'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:113.0) Gecko/20100101 Firefox/113.0',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:113.0) Gecko/20100101 Firefox/113.0',
    'Mozilla/5.0 (X11; Linux i686; rv:113.0) Gecko/20100101 Firefox/113.0',
];

const marathonUser = [
    // "Mozilla/5.0 (X11; Linux i686; rv:111.0) Gecko/20100101 Firefox/111.0",
    "Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/109.0",
    "Mozilla/5.0 (X11; Linux i686; rv:107.0) Gecko/20100101 Firefox/107.0",
    // "Mozilla/5.0 (X11; Linux i686; rv:105.0) Gecko/20100101 Firefox/105.0",
    "Mozilla/5.0 (X11; Linux i686; rv:103.0) Gecko/20100101 Firefox/103.0"
]

let pages = {
    betplay: null,
    wplay: null,
    '1xbet': null,
    betsson: null,
    luckia: null,
    google: null
}


let browserInstance = null; // Un único objeto para manejar el navegador y el contexto

async function initBrowser(url, name, timeout = 5000) {
    let randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    if (name.includes('marathon')) randomUserAgent = marathonUser[Math.floor(Math.random() * marathonUser.length)];
    if (name.includes('google')) randomUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:114.0) Gecko/20100101 Firefox/114.0';
    // if (name.includes('bcgame')) randomUserAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:113.0) Gecko/20100101 Firefox/113.0';
    console.log(randomUserAgent)
    const tryCreate = async () => {
        if (!browserInstance) {
            // Si no existe una instancia del navegador, crea una nueva
            const browser = await chromium.launch({
                headless: false,
                viewport: { width: 550, height: 680 },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ],
            });
            const context = await browser.newContext({
                userAgent: randomUserAgent,
                ignoreHTTPSErrors: false,
                locale: 'es-ES',
            });
            browserInstance = { browser, context }; // Almacena referencia al navegador y al contexto
        }
        if (browserInstance) {
            if (!browserInstance.context) {
                const context = await browserInstance.browser.newContext({
                    userAgent: randomUserAgent,
                });
                browserInstance.context = context; // Almacena referencia al navegador y al contexto
            }
            // Intenta crear una nueva página en el contexto existente
            let page;
            if (!pages[name]) {
                page = await browserInstance.context.newPage();
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'es-ES,es;q=0.9',
                });
                pages[name] = page;
            }
            else page = pages[name];
            page.setDefaultTimeout(timeouts.browser);
            await page.goto(url);
            await page.waitForTimeout(timeout);
            // page.setDefaultTimeout(5000);
            return { page, context: browserInstance.context };
        }
    }
    try {
        return await tryCreate();
    } catch (error) {
        try {
            return await tryCreate();
        } catch (error2) {
            console.log(error2);
            return { page: null, context: null };
        }
    }


}

async function closeBrowser() {
    if (browserInstance) {
        await Object.keys(pages).forEach(async page => {
            if (pages[page]) await pages[page].close();
        });
        if (browserInstance) {
            if (browserInstance.context) await browserInstance.context.close();
        }
        if (browserInstance) {
            if (browserInstance.browser) await browserInstance.browser.close();
        }
        browserInstance = null;
        pages = {
            betplay: null,
            wplay: null,
            '1xbet': null,
            betsson: null,
            google: null
        }
    }
}

async function closeContext() {
    if (browserInstance) {
        Object.keys(pages).forEach(async page => {
            await pages[page].close();
        });
        await browserInstance.context.close();
        browserInstance.context = null;
        pages = {
            betplay: null,
            wplay: null,
            '1xbet': null,
            betsson: null,
            google: null
        }
    }
}

async function getResponse(type) {
    let url = `https://na-offering-api.kambicdn.net/offering/v2018/betplay/listView/${type}/all/all/all/starting-within.json?lang=es_CO&market=CO&client_id=2&ncid=1717514727038&channel_id=1&useCombined=true&useCombinedLive=true&${generateFormattedDateRange(48)}`;
    if (categoryActual.isLive) {
        url = `https://na-offering-api.kambicdn.net/offering/v2018/betplay/listView/${type}/all/all/all/in-play.json?lang=es_CO&market=CO&client_id=2&channel_id=1&useCombined=true&useCombinedLive=true`;
    }
    let re = await fetch(url);
    let res = await re.json();
    return res;
}

async function createJSON(name, data) {
    try {
        // Escribe el JSON en un archivo
        const datosJSON = JSON.stringify(data, null, 2); // El argumento null, 2 es para formatear el JSON de forma legible
        await fs.writeFile(`./data/${name}.json`, datosJSON);
        console.log('¡El archivo ha sido creado correctamente!');
    } catch (err) {
        console.error('Error al escribir el archivo:', err);
    }
}

function obtenerCombinacionesCotizaciones(...listasDeCuotas) {
    // Función auxiliar para calcular el producto cartesiano
    function productoCartesiano(arr) {
        return arr.reduce((a, b) => {
            return a.flatMap(d => b.map(e => [d, e].flat()));
        });
    }

    // Calculamos el producto cartesiano de todas las listas de cuotas
    const combinacionesDeCuotas = productoCartesiano(listasDeCuotas);

    return combinacionesDeCuotas;
}

function calculateSureBet(odds, totalInvestment, bettingHouses) {
    let sumOdds = 0;
    let sumImport = 0;
    const investments = [];

    // Validar entradas
    if (!odds.length || odds.some(od => isNaN(parseFloat(od)) || parseFloat(od) <= 0) || odds.length !== bettingHouses.length) {
        return "Ingrese valores válidos para todas las cuotas y asegúrese de que cada cuota tenga su correspondiente casa de apuestas.";
    }

    // Calcular sumOdds y sumImport
    odds.forEach(od => {
        const odd = parseFloat(od);
        sumOdds += 100 / odd;
        sumImport += 1 / odd;
    });

    // Verificar si es posible la surebet
    if (sumOdds >= 100) {
        return "NO ES POSIBLE LA SURBET";
    }

    // Calcular inversiones por cada cuota, ajustado por el monto total que se desea invertir
    odds.forEach((odd) => {
        const oddValue = parseFloat(odd);
        const investmentPercentage = (1 / oddValue) / sumImport;
        const investment = (totalInvestment * investmentPercentage).toFixed(2);
        investments.push(parseFloat(investment));
    });

    // Crear objeto con las inversiones, las cuotas y las casas de apuestas
    const result = odds.map((odd, index) => ({
        casaDeApuestas: bettingHouses[index],
        cuota: parseFloat(odd),
        inversion: investments[index]
    }));

    return {
        esPosible: "SI ES POSIBLE LA SURBET",
        apuestas: result
    };
}

function quitarTildes(cadena) {
    return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizar(palabra) {
    palabra = quitarTildes(palabra);
    const patrones = /\bam\b|\bfc\b|\bsp\b|\bAS\b|-RJ|-RS|Kan City|-SP|CF|FC|F\.C\.|`|FK|CA|SC|-BA|CFC|JPN|OCS|-AM|\bSL\b/g;
    palabra = palabra
        .replace(patrones, '')
        .replace('da amadora', '')
        .replace('Sporting Club', 'SC')
        .replace('de Futbol', '')
        .replace('Futbol Club', '')
        .replace('Futbol', '')
        .replace(' de ', ' ')
        .replace(' De ', ' ')
        .toLowerCase();
    palabra = palabra
        .replace(/\b(sub-20|u20|under 20|sub 20|subtwenty)\b/g, 'sub20')
        .replace(/\b(sub-19|u19|under 19|sub 19)\b/g, 'sub20')
        .replace(/\b(women|femenino|female|mujeres|fem|\(f\)|\(fem\)|\(w\)|\(won\))\b(?!\.)/gi, 'femenino')
        .replace(/\((f|w|fem)\)/gi, 'femenino')
        .replace(/\b(baloncesto)\b/g, '')
        .replace(/\b(90 min)\b/g, '')
        .replace(/\([a-z]{3}\)/g, '')
        .replace(/[\(\)]/g, '')  // Elimina paréntesis restantes
        .replace(/[-.']/g, ' ')
        .replace(/\b(vs\.|v\.|vs|v)\b/g, ' ')
        .replace(/\s+/g, ' ')  // Sustituye múltiples espacios en blanco por un solo espacio
        .replace(/-|\./g, '')
        .trim();
    if (categoryActual.current == 'volleyball') palabra = palabra.replace('femenino', '');
    return palabra;
}

function distanciaLevenshtein(a, b) {
    const matriz = [];
    for (let i = 0; i <= a.length; i++) {
        matriz[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        matriz[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matriz[i][j] = Math.min(matriz[i - 1][j] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j - 1] + cost);
        }
    }
    return matriz[a.length][b.length];
}

function equiposIguales(equipo1, equipo2) {
    const umbral = 3;  // Ajustar según la necesidad
    return distanciaLevenshtein(equipo1, equipo2) <= umbral;
}

function obtenerSinonimos() {
    return {
        'tsitsipas': ['s tsitsipas', 'tsitsipas', 'stefanos tsitsipas'],
        'alcaraz': ['c alcaraz garfia', 'alcaraz', 'carlos alcaraz'],
        'olympique': ['olympique', 'olympique safi', 'oc safi', 'oc'],
        'aguada': ['aguada santeros', 'santeros aguada', 'santeros'],
        'huskies': ['huskies', 'tuatara'],
        'basketball': ['basketball', 'basket'],
        'asp': ['asp', 'patras'],
        'maceio': ['crb maceio', 'maceio', 'crb_al'],
        'psg': ['psg', 'paris sg', 'paris saint-germain', 'paris saint germain'],
        'paris': ['psg', 'paris sg', 'paris saint-germain', 'paris saint germain'],
        'criciuma': ['criciuma', 'cricluma'],
        'argentina': ['argentina', 'arg'],
        'paraguay': ['paraguay', 'par'],
        'sub20': ['sub20', 'sub-20', 'u20', 'under 20', 'sub twenty'],
        'passo': ['passo fundo-rs', 'passo fundo ge', 'pf', 'esporte clube passo fundo ge', 'passo'],
        'gloria': ['gloria-rs', 'ec gloria', 'gloria de vacaria', 'ge gloria', 'gloria'],
        'guangsha': ['zhejiang guangsha', 'guangsha lions'],
        'guandong': ['guangdong', 'guangdong southern tigers'],
        'leopards': ['zhejiang leopards', 'shenzhen leopards'],
        'denver': ['denver nuggets', 'den nuggets', 'den'],
        // 'losangeles': ['los angeles lakers', 'la lakers', 'l.a. lakers', 'la'],
        'nuggets': ['denver nuggets', 'den nuggets', 'den'],
        // 'lakers': ['los angeles lakers', 'la lakers', 'l.a. lakers', 'la'],
        'warriors': ['golden state warriors', 'gs warriors'],
        'heat': ['miami heat'],
        'celtics': ['boston celtics'],
        'leopards': ['shenzhen leopards', 'leopards shenzhen'],
        'liaoning': ['liaoning flying', 'flying liaoning'],
        'oberwart': ['oberwart gunners'],
        'swans': ['allianz swans gmunden', 'swans gmunden'],
        'penarol': ['penarol', 'peñarol', 'ca penarol', 'club atletico penarol'],
        'lorenzo': ['san lorenzo', 'san lorenzo de almagro', 'club atletico san lorenzo'],
        'franca': ['franca', 'franca bc'],
        'mogi': ['mogi das cruzes', 'mogi'],
        'cavaliers': ['cle cavaliers', 'cleveland cavaliers'],
        'magic': ['orl magic', 'orlando magic'],
        "huddersfield": ["huddersfield", "huddersfield town"],
        "swansea": ["swansea", "swansea city"],
        'alshabab': ['al shabab'],
        'rustaq': ['rustaq'],
        'riffa': ['al riffa'],
        'alcorcon': ['alcorcon ad'],
        'santander': ['racing santander'],
        'riestra': ['deportivo riestra'],
        'huracan': ['atlético huracán'],
        'ittihad': ['al-ittihad jeddah', 'al ittihad'],
        'wahda': ['al-wahda mecca', 'al wahda'],
        'united': ['utd'],
        'verona': ['vr'],
        'genoa': ['gnova', 'genua'],
        'auxerre': ['aj auxerre'],
        'troyes': ['troyes'],
        'guabira': ['guabira montero', 'guabira club'],
        'jazira': ['al jazira abu dhabi'],
        'ahly': ['al ahly cairo'],
        'tolima': ['cd tolima'],
        'aguilas': ['rionegro aguilas', 'aguilas doradas'],
        'zacapa': ['zacapa tellioz'],
        'coatepeque': ['deportivo coatepeque'],
        'osasuna': ['ca osasuna'],
        'valencia': ['valencia cf'],
        'barracas': ['ca barracas central', 'barracas central'],
        'millonarios': ['millonarios fc', 'club deportivo millonarios'],
        'junior': ['club deportivo junior'],
        'al shabab': ['al shabab riyadh'],
        'dhofar': ['dhofar club'],
        'abha': ['abha club'],
        'hansa rostock': ['fc hansa rostock', 'hansa rostock ii'],
        'fc magdeburg': ['fc magdeburg', 'magdeburg fc'],
        'standard': ['st liege', 'standard de liege'],
        'augsburg': ['fc augsburgo', 'augsburg'],
        "stortford": ["stortford", "stortford's"],
        "curzon": ["curzon", "curzon's"],
        "bishop": ["bishop", "bishop's"],
        "spennymoor": ["spennymoor", "spennymoor town", "fc spennymoor", "fc spennymoor town"],
        "kings": ["kings lynn", "king's lynn", "kings lynn town", "fc kings lynn", "fc kings lynn town"],
        "spennymoor": ["spennymoor", "spennymoor town", "fc spennymoor", "fc spennymoor town"],
        "medellin": ["independiente medellín", "independiente medellin", "dim", "deportivo independiente medellin"],
        "nacional": ["atlético nacional", "atletico nacional", "nacional", "atl nacional"]
        // Continúa expandiendo según necesidad
    };
}

function obtenerAbreviaciones() {
    return {
        // Equipos de la NBA (algunos ya listados anteriormente)
        // 'lakers': ['los angeles lakers', 'la lakers', 'l.a. lakers', 'la'],
        'celtics': ['boston celtics', 'bos celtics', 'bos'],
        'bulls': ['chicago bulls', 'chi bulls', 'chi'],
        'warriors': ['golden state warriors', 'gs warriors', 'gsw', 'golden state'],
        'heat': ['miami heat', 'mia heat', 'mia'],
        'cavaliers': ['cleveland cavaliers', 'cle cavaliers', 'cle'],
        'spurs': ['san antonio spurs', 'sa spurs', 'sa'],
        'knicks': ['new york knicks', 'ny knicks', 'nyk'],
        'nets': ['brooklyn nets', 'bk nets', 'bkn'],
        'sixers': ['philadelphia 76ers', 'phi 76ers', 'phi'],

        // Equipos de Euroliga
        'real madrid': ['real madrid', 'rm', 'real madrid baloncesto'],
        'barcelona': ['fc barcelona', 'barcelona', 'barça'],
        'cska': ['cska moscow', 'cska'],
        'efes': ['anadolu efes', 'efes'],
        'olympiacos': ['olympiacos', 'oly'],
        'fenerbahçe': ['fenerbahçe', 'fener'],
        'maccabi': ['maccabi tel aviv', 'maccabi'],
        'panathinaikos': ['panathinaikos', 'pana'],
        'zalgiris': ['zalgiris kaunas', 'zalgiris'],
        'bayern': ['bayern munich', 'bayern'],
        'gran canaria': ['herbalife gran canaria', 'gran canaria'],

        // Otros equipos de Euroliga
        'baskonia': ['saski baskonia', 'baskonia'],
        'unicaja': ['unicaja malaga', 'unicaja'],
        'alba': ['alba berlin', 'alba'],
        'red star': ['crvena zvezda', 'red star', 'cz'],
        'partizan': ['partizan belgrade', 'partizan'],

        // Equipos de la CBA
        'guangdong': ['guangdong southern tigers', 'guangdong tigers', 'guangdong'],
        'liaoning': ['liaoning flying leopards', 'liaoning leopards', 'liaoning'],
        'sharks': ['shanghai sharks', 'shanghai'],
        'beijing': ['beijing ducks', 'beijing'],

        // Equipos de la NBL (Australia)
        'sydney': ['sydney kings', 'sydney'],
        'melbourne': ['melbourne united', 'melbourne'],
        'wildcats': ['perth wildcats', 'wildcats'],
        'breakers': ['new zealand breakers', 'breakers'],

        // Otros equipos internacionales
        'unics': ['unics kazan', 'unics'],
        'monaco': ['as monaco', 'monaco'],
        'virtus': ['virtus bologna', 'virtus'],
        'darussafaka': ['darussafaka istanbul', 'darussafaka'],
        'buducnost': ['buducnost volI', 'buducnost'],
        'olimpo': ['olimpia milan', 'olimpia milano', 'ea7 emporio armani milano', 'milano'],


        // NBA Teams adicionales
        'hawks': ['atlanta hawks', 'atl hawks', 'atl'],
        'hornets': ['charlotte hornets', 'cha hornets', 'cha'],
        'mavericks': ['dallas mavericks', 'dal mavericks', 'dal'],
        'nuggets': ['denver nuggets', 'den nuggets', 'den'],
        'pistons': ['detroit pistons', 'det pistons', 'det'],
        'warriors': ['golden state warriors', 'gs warriors', 'gsw', 'golden state'],
        'rockets': ['houston rockets', 'hou rockets', 'hou'],
        'pacers': ['indiana pacers', 'ind pacers', 'ind'],
        'clippers': ['los angeles clippers', 'la clippers', 'lac'],
        'grizzlies': ['memphis grizzlies', 'mem grizzlies', 'mem'],
        'heat': ['miami heat', 'mia heat', 'mia'],
        'bucks': ['milwaukee bucks', 'mil bucks', 'mil'],
        'timberwolves': ['minnesota timberwolves', 'min timberwolves', 'min'],
        'pelicans': ['new orleans pelicans', 'no pelicans', 'no'],
        'thunder': ['oklahoma city thunder', 'okc thunder', 'okc'],
        'magic': ['orlando magic', 'orl magic', 'orl'],
        'suns': ['phoenix suns', 'phx suns', 'phx'],
        'blazers': ['portland trail blazers', 'por trail blazers', 'por'],
        'kings': ['sacramento kings', 'sac kings', 'sac'],
        'spurs': ['san antonio spurs', 'sa spurs', 'sa'],
        'raptors': ['toronto raptors', 'tor raptors', 'tor'],
        'jazz': ['utah jazz', 'uta jazz', 'uta'],
        'wizards': ['washington wizards', 'was wizards', 'was'],

        // Euroleague Teams adicionales
        'baskonia': ['saski baskonia', 'baskonia'],
        'unicaja': ['unicaja malaga', 'unicaja'],
        'alba': ['alba berlin', 'alba'],
        'red star': ['crvena zvezda', 'red star', 'cz'],
        'partizan': ['partizan belgrade', 'partizan'],

        // CBA Teams adicionales
        'sharks': ['shanghai sharks', 'shanghai'],
        'beijing': ['beijing ducks', 'beijing'],

        // NBL Teams adicionales
        'wildcats': ['perth wildcats', 'wildcats'],
        'breakers': ['new zealand breakers', 'breakers'],

        // Otros equipos internacionales adicionales
        'unics': ['unics kazan', 'unics'],
        'monaco': ['as monaco', 'monaco'],
        'virtus': ['virtus bologna', 'virtus'],
        'darussafaka': ['darussafaka istanbul', 'darussafaka'],
        'buducnost': ['buducnost volI', 'buducnost'],
        'olimpo': ['olimpia milan', 'olimpia milano', 'ea7 emporio armani milano', 'milano']
    };
}

function obtenerTerminosEspeciales() {
    return ['II', '2', 'ii'];
}

function aplicarSinonimos(palabras, sinonimos) {
    return palabras.map(palabra => {
        for (let key in sinonimos) {
            if (sinonimos[key].includes(palabra)) {
                return key;  // Retorna el término canónico si encuentra un sinónimo
            }
        }
        return palabra;  // Retorna la palabra original si no se encuentra un sinónimo
    });
}

function expandirAbreviaciones(palabras, abreviaciones) {
    return palabras.map(palabra => {
        for (let key in abreviaciones) {
            if (abreviaciones[key].includes(palabra.toLowerCase())) {
                return key;  // Retorna el término completo
            }
        }
        return palabra;  // Retorna la palabra original si no se encuentra una abreviación
    });
}

function contieneTerminosEspeciales(palabras, terminosEspeciales) {
    return palabras.some(palabra => terminosEspeciales.includes(palabra));
}

function obtenerDistanciaLevenshtein(str1, str2) {
    return distanciaLevenshtein(str1, str2);
}

function obtenerSimilitudJaccard(set1, set2) {
    const interseccion = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);
    return interseccion.size / union.size;
}

function evaluarCoincidencias(palabras1, palabras2) {
    const sinonimos = obtenerSinonimos();
    const abreviaciones = obtenerAbreviaciones();
    const terminosEspeciales = obtenerTerminosEspeciales();
    // Ajuste dinámico de umbrales
    const longitudMedia = (palabras1.length + palabras2.length) / 2;
    // Expande las abreviaciones
    palabras1 = expandirAbreviaciones(palabras1, abreviaciones);
    palabras2 = expandirAbreviaciones(palabras2, abreviaciones);

    // Aplica sinónimos
    palabras1 = aplicarSinonimos(palabras1, sinonimos);
    palabras2 = aplicarSinonimos(palabras2, sinonimos);

    const set1 = new Set(palabras1);
    const set2 = new Set(palabras2);

    const especial1 = contieneTerminosEspeciales(palabras1, terminosEspeciales);
    const especial2 = contieneTerminosEspeciales(palabras2, terminosEspeciales);

    // Si uno contiene términos especiales y el otro no, retorna false.
    if (especial1 !== especial2) {
        return false;
    }

    const jaccard = obtenerSimilitudJaccard(set1, set2);
    const distanciaLevenshtein = obtenerDistanciaLevenshtein(palabras1.join(' '), palabras2.join(' '));

    let umbralJaccard, umbralLevenshtein;

    if (longitudMedia <= 5) {
        umbralJaccard = 0.61;
        umbralLevenshtein = 9;
    } else if (longitudMedia <= 10) {
        umbralJaccard = 0.65;
        umbralLevenshtein = 10;
    } else {
        umbralJaccard = 0.58;
        umbralLevenshtein = 8;
    }
    if (jaccard == 1) umbralLevenshtein = 25;
    const esJaccardSuficiente = jaccard >= umbralJaccard;
    const esLevenshteinAceptable = distanciaLevenshtein <= umbralLevenshtein;
    if (true) {
        // console.log(palabras1, palabras2)
        // console.log(jaccard, distanciaLevenshtein, umbralJaccard, umbralLevenshtein);
    }
    return esJaccardSuficiente && esLevenshteinAceptable;
}

function tienenPalabrasEnComunDinamicoT(cadena1, cadena2) {
    if (cadena1 === 'Locales Visitantes' || cadena2 === 'Locales Visitantes') {
        return false;
    }
    let equipo1 = normalizar(cadena1);
    let equipo2 = normalizar(cadena2);
    console.log(equipo1, equipo2)
    if (equiposIguales(equipo1, equipo2)) {
        return true;
    }
    if (equipo1 == 'real sociedad atletico madrid' && equipo2 == 'real sociedad real madrid') return false;
    if (equipo1 == 'bahrein corea del sur' && equipo2 == 'singapur corea del sur') return false;

    // Verificar si uno de los equipos contiene "femenino" y el otro no
    const contieneFemenino1 = equipo1.includes('femenino');
    const contieneFemenino2 = equipo2.includes('femenino');
    if (contieneFemenino1 !== contieneFemenino2 && categoryActual.current != 'volleyball') {
        return false;
    }
    if (categoryActual.current == 'volleyball') equipo1 = equipo1.replace('femenino', '');
    if (categoryActual.current == 'volleyball') equipo2 = equipo2.replace('femenino', '');
    // Expresión regular para dividir la cadena en palabras, teniendo en cuenta guiones bajos
    const palabrasRegex = /[^\W_()]+(?:_[^\W_()]+)*/g;

    let palabras1 = equipo1.match(palabrasRegex) || []; // Divide la cadena en palabras
    let palabras2 = equipo2.match(palabrasRegex) || [];
    return evaluarCoincidencias(palabras1, palabras2);
}

async function tienenPalabrasEnComunDinamico(cadena1, cadena2, porcentajeUmbral = 65) {
    const firts = tienenPalabrasEnComunDinamicoT(cadena1, cadena2);
    if (!firts) return { similarity: '', pass: false };
    cadena1 = normalizar(cadena1);
    cadena2 = normalizar(cadena2);
    const res = await postFormData('https://compare.qalaub.com/comparar', {
        sentences: [
            cadena1,
            cadena2
        ]
    }, 'application/json');
    console.log(cadena1, cadena2)
    console.log(await res)
    if (res) return { similarity: res.similarity, pass: res.similarity > 0.70 };
    return { similarity: '', pass: false };
}

function generarCombinacionesDeCasas2(casas) {
    let combinaciones = [];

    // Filtrar las casas que tienen cuotas undefined o vacías
    casas = casas.filter(casa => casa?.cuotas && casa.cuotas.length == 2);

    // Si después de filtrar no quedan suficientes casas para formar una combinación, retorna un arreglo vacío
    if (casas.length < 2) return [];

    // Generar combinaciones de dos casas
    for (let i = 0; i < casas.length - 1; i++) {
        for (let j = i + 1; j < casas.length; j++) {
            for (let a = 0; a < casas[i].cuotas.length; a++) {
                for (let b = 0; b < casas[j].cuotas.length; b++) {
                    if (a !== b) { // Asegurar que se usen cuotas diferentes para la combinación
                        const team1 = casas[i].cuotas[a].name;
                        const team2 = casas[j].cuotas[b].name;
                        if (team1 != team2) { // Verificar que los equipos no sean iguales
                            combinaciones.push([
                                { casa: casas[i].nombre, team: team1, quote: casas[i].cuotas[a].quote, url: casas[i].url || '' },
                                { casa: casas[j].nombre, team: team2, quote: casas[j].cuotas[b].quote, url: casas[j].url || '' }
                            ]);
                        }
                    }
                }
            }
        }
    }

    return combinaciones;
}

function generarCombinacionesDeCasas3(casas) {
    let combinaciones = [];

    // Filtrar las casas que tienen cuotas undefined o vacías
    casas = casas.filter(casa => casa.cuotas && casa.cuotas.length == 3);

    // Si después de filtrar no quedan suficientes casas para formar una combinación, retorna un arreglo vacío
    if (casas.length < 3) return [];

    // Generar combinaciones de tres casas
    for (let i = 0; i < casas.length - 2; i++) {
        for (let j = i + 1; j < casas.length - 1; j++) {
            for (let k = j + 1; k < casas.length; k++) {
                for (let a = 0; a < casas[i].cuotas.length; a++) {
                    for (let b = 0; b < casas[j].cuotas.length; b++) {
                        for (let c = 0; c < casas[k].cuotas.length; c++) {
                            // Asegurar que se usen cuotas diferentes para la combinación
                            if (a != b && b != c && a != c) {
                                const team1 = casas[i].cuotas[a].name;
                                const team2 = casas[j].cuotas[b].name;
                                const team3 = casas[k].cuotas[c].name;
                                if (team1 != team2 && team2 != team3 && team1 != team3) { // Verificar que los equipos no sean iguales
                                    combinaciones.push([
                                        { casa: casas[i].nombre, team: team1, quote: casas[i].cuotas[a].quote, url: casas[i].url || '' },
                                        { casa: casas[j].nombre, team: team2, quote: casas[j].cuotas[b].quote, url: casas[j].url || '' },
                                        { casa: casas[k].nombre, team: team3, quote: casas[k].cuotas[c].quote, url: casas[k].url || '' }
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return combinaciones;
}

function generarCombinacionesDeCasas2MoreLess(casas) {
    let combinaciones = [];

    // Filtrar las casas que tienen cuotas undefined o vacías
    casas = casas.filter(casa => casa?.cuotas && casa.cuotas.length > 0);

    // Si después de filtrar no quedan suficientes casas para formar una combinación, retorna un arreglo vacío
    if (casas.length < 2) return [];

    // Crear un objeto para agrupar las cuotas por su valor numérico
    let cuotasPorValor = {};

    casas.forEach(casa => {
        casa.cuotas.forEach(cuota => {
            const valor = cuota.name.match(/[\d\.]+/)[0];
            const tipo = cuota.name.includes('más') || cuota.name.includes('mas') ? 'mas' : 'menos';
            if (!cuotasPorValor[valor]) {
                cuotasPorValor[valor] = { mas: [], menos: [] };
            }
            cuotasPorValor[valor][tipo].push({
                casa: casa.nombre,
                team: cuota.name,
                quote: cuota.quote,
                url: casa.url || ''
            });
        });
    });

    // Obtener los valores ordenados numéricamente
    const valoresOrdenados = Object.keys(cuotasPorValor).sort((a, b) => parseFloat(a) - parseFloat(b));

    // Crear combinaciones asegurando que cada par (más y menos) se combinen correctamente
    for (let i = 0; i < valoresOrdenados.length - 1; i++) {
        const valorActual = valoresOrdenados[i];
        const valorSiguiente = valoresOrdenados[i + 1];

        const masCuotas = cuotasPorValor[valorActual].mas;
        const menosCuotas = cuotasPorValor[valorSiguiente].menos;

        masCuotas.forEach(masCuota => {
            menosCuotas.forEach(menosCuota => {
                if (masCuota.casa !== menosCuota.casa && menosCuota.quote !== undefined) {
                    combinaciones.push([masCuota, menosCuota]);
                }
            });
        });
    }

    return combinaciones;
}

function evaluateSurebets(combinations, totalInvestment, data, url, type) {
    let results = [];
    if (!combinations) return ['No se encontraron surebets.'];

    combinations.forEach(combination => {
        let result = calculateSureBetForCombination(combination, totalInvestment, type);
        if (result && result.isSureBet) {
            results.push(result);
        }
    });

    if (results.length) {
        console.log('//////////////////////// surebet //////////////////');
        let fecha = new Date(data.start);
        let fechaISO = fecha.toISOString();
        const category = getCategoryByMatch(type);
        console.log(results.length);
        results = removeDuplicateHouseEntries(results);
        console.log(results.length);
        if (results.length < 20) {
            results.forEach(async result => {
                const pass = await hasDuplicateEntries(result.investments, data.team1, data.team2);
                if (!pass) {
                    postFormData('https://lafija.qalaub.com/v1/api/surebet/', {
                        surebet: JSON.stringify(
                            {
                                surebet: result.investments,
                                ...data,
                                type,
                                event: category,
                            }
                        ),
                        team1: url.team1.toString(),
                        team2: url.team2.toString(),
                        matches: fechaISO,
                        live: categoryActual.isLive,
                    }, 'application/json');
                } else {
                    console.log('Entrada duplicada encontrada en surebet, no se enviará.');
                }
            });
        }

        surebetcont++;
        console.log('//////////////////////// surebet //////////////////');
    }

    return results.length > 0 ? results : ['No se encontraron surebets.'];
}

async function hasDuplicateEntries(investments, team1, team2) {
    if (investments.length === 0) return false;

    // Normalizar nombres de equipos
    for (let i = 0; i < investments.length; i++) {
        investments[i].team = normalizeTeamName(investments[i].team, team1, team2);
    }

    let team1Count = 0;
    let team2Count = 0;

    for (let investment of investments) {
        if (typeof investment.team === 'string') {
            investment.team = investment.team.toLowerCase();
            if (/\b(si|no|sí)\b/i.test(investment.team)) return false;
            if (/menos|más/i.test(investment.team)) return false;
        }

        let normalizedTeam = normalizeTeamName(investment.team, team1, team2);

        const res1 = await postFormData('https://compare.qalaub.com/comparar', {
            sentences: [normalizedTeam, team1]
        }, 'application/json');
        const res2 = await postFormData('https://compare.qalaub.com/comparar', {
            sentences: [normalizedTeam, team2]
        }, 'application/json');

        let similarity1 = parseFloat(res1.similarity);
        let similarity2 = parseFloat(res2.similarity);

        if (similarity1 > 0.70) team1Count++;
        if (similarity2 > 0.70) team2Count++;

        if (team1Count > 1 || team2Count > 1) return true;
    }

    // Verificar si ambos equipos aparecen exactamente una vez
    return !(team1Count === 1 && team2Count === 1);
}

function normalizeTeamName(team, team1, team2) {
    console.log(team)
    if (team == 1 || team == "1") return team1;
    if (team == 2 || team == "2") return team2;

    if (team.includes(team1)) return team1;
    if (team.includes(team2)) return team2;
    return team;
}

function removeDuplicateHouseEntries(data) {
    const uniqueEntries = [];
    const seenHouses = new Set();

    for (const entry of data) {
        const houses = entry.investments.map(investment => investment.casa).sort();
        const housesKey = houses.join(',');

        if (!seenHouses.has(housesKey)) {
            uniqueEntries.push(entry);
            seenHouses.add(housesKey);
        }
    }

    return uniqueEntries;
}

function calculateSureBetForCombination(combination, totalInvestment, type) {
    const odds = combination.map(entry => parseFloat(entry.quote));
    let sumOdds = 0;
    let sumImport = 0;
    const investments = [];
    let potentialProfit = 0;

    if (odds.some(isNaN) || odds.some(odd => odd <= 0)) {
        return null;
    }

    odds.forEach(odd => {
        sumOdds += 100 / odd;
        sumImport += 1 / odd;
    });
    if (sumOdds >= 100) {
        return null;
    }
    odds.forEach((odd, index) => {
        const investmentPercentage = (1 / odd) / sumImport;
        const investment = (totalInvestment * investmentPercentage).toFixed(2);
        investments.push({
            type,
            casa: combination[index].casa,
            team: combination[index].team,
            url: combination[index].url,
            odd: odd,
            investment: parseFloat(investment)
        });
        let thisProfit = (investment * odd) - totalInvestment;
        potentialProfit = Math.max(potentialProfit, thisProfit);
    });

    return {
        investments,
        potentialProfit: potentialProfit.toFixed(2),
        isSureBet: true
    };
}

function findSureBets(oddsArrays, totalInvestment) {
    const indices = Array.from({ length: oddsArrays.length }, (_, i) => i);
    const permutaciones = generarPermutaciones(indices);
    const sureBets = [];

    permutaciones.forEach(permutacion => {
        const oddsCombination = permutacion.map((pos, index) => oddsArrays[index][pos]);
        const result = calculateSureBetForCombination(oddsCombination, totalInvestment);
        if (result && result.isSureBet) {
            sureBets.push({
                combination: oddsCombination,
                investments: result.investments,
                potentialProfit: result.potentialProfit
            });
        }
    });

    return sureBets.length > 0 ? sureBets : 'No se encontraron surebets con las combinaciones dadas.';
}

const extraerCotizaciones = bets => bets.map(bet => bet.quote);

function generateFormattedDateRange(hoursToAdd) {
    function formatIsoDateWithOffset(date) {
        // Construye la fecha en formato ISO sin milisegundos
        let isoDate = date.toISOString().slice(0, -5).replace(/[:-]/g, '').replace('T', 'T');
        // Calcula el offset de la zona horaria en horas y minutos
        let offsetSign = (date.getTimezoneOffset() > 0) ? "-" : "+";
        let offsetHours = Math.abs(Math.floor(date.getTimezoneOffset() / 60));
        let offsetMinutes = Math.abs(date.getTimezoneOffset() % 60);
        // Formatea el offset a dos dígitos
        offsetHours = (offsetHours < 10) ? '0' + offsetHours : offsetHours;
        offsetMinutes = (offsetMinutes < 10) ? '0' + offsetMinutes : offsetMinutes;
        // Construye la cadena de fecha final
        return `${isoDate}${offsetSign}${offsetHours}${offsetMinutes}`;
    }

    // Fecha y hora actuales
    const now = new Date();

    // Fecha y hora adelante por el número de horas especificado
    const later = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));

    // Formatear ambas fechas
    const formattedNow = formatIsoDateWithOffset(now);
    const formattedLater = formatIsoDateWithOffset(later);

    return `from=${formattedNow}&to=${formattedLater}`;
}

function obtenerObjetoPorTipo(types, tipoBuscado) {
    return types.find(t => t.type == tipoBuscado);
}

function dividirArregloEnDosSubarreglos(arreglo) {
    const longitud = arreglo.length;
    const mitad = Math.ceil(longitud / 2);
    const subarreglo1 = arreglo.slice(0, mitad);
    const subarreglo2 = arreglo.slice(mitad);
    return [subarreglo1, subarreglo2];
}

function ordenarDinamicamenteMasMenos(apuestas) {
    return apuestas.sort((a, b) => {
        // Extraer los números para comparar
        const numA = parseFloat(a.name.split(' ')[1]); // Asumimos que el número está después del primer espacio
        const numB = parseFloat(b.name.split(' ')[1]);

        // Ordenar primero por número
        if (numA !== numB) {
            return numA - numB;
        }

        // Si los números son iguales, 'Más' va antes de 'Menos'
        // Aseguramos que 'Más' es evaluado correctamente y comparamos también 'Menos'
        const esMasA = /\b[m][aá]s\b/i.test(a.name);
        const esMasB = /\b[m][aá]s\b/i.test(b.name);

        if (esMasA && !esMasB) {
            return -1; // 'Más' va antes que 'Menos'
        } else if (!esMasA && esMasB) {
            return 1;  // 'Menos' va después de 'Más'
        }

        return 0; // En caso de que ambos sean 'Más' o ambos 'Menos', son considerados iguales
    });
}

async function scrollToBottom(page) {
    const getBodyHeight = () => {
        return page.evaluate(() => {
            return document.body.scrollHeight;
        });
    };

    let availableHeight = await page.evaluate(() => window.innerHeight);
    let totalHeight = await getBodyHeight();
    let currentHeight = 0;

    while (currentHeight < totalHeight - 500) {
        await page.mouse.wheel(0, availableHeight);
        currentHeight += availableHeight;
        totalHeight = await getBodyHeight();  // Recalcular en caso de que la altura cambie (contenido dinámico)
    }
}

function agruparApuestas(apuestas, tipoDeseado) {
    let agrupadas = new Map();
    let otrosTipos = [];

    // Procesar todas las apuestas
    apuestas.forEach(apuesta => {
        if (apuesta.type === tipoDeseado) {
            if (!agrupadas.has(apuesta.id)) {
                agrupadas.set(apuesta.id, {
                    id: apuesta.id,
                    type: apuesta.type,
                    bets: [...apuesta.bets]
                });
            } else {
                let current = agrupadas.get(apuesta.id);
                current.bets.push(...apuesta.bets);
            }
        } else {
            otrosTipos.push(apuesta);
        }
    });

    agrupadas.forEach(value => {
        otrosTipos.push(value);
    });
    return otrosTipos;
}

function getCategoryByMatch(type) {
    const categories = {
        "Principal": [
            'Tiempo reglamentario',
            'Ambos Equipos Marcarán',
            'Se clasifica para la siguiente ronda',
            'Doble Oportunidad',
            'Prórroga incluida',
            'Total de puntos - Prórroga incluida',
        ],
        "Goles": [
            'Total de goles',
            'Ambos Equipos Marcarán',
            'Gol en ambas mitades',
        ],
        "1 Mitad": [
            'Total de goles - 1.ª parte',
            'Ambos Equipos Marcarán - 1.ª parte',
            'Doble Oportunidad - 1.ª parte',
            'Hándicap asiático - 1.ª parte',
            'Total asiático - 1.ª parte',
            '1.ª parte',
            'Apuesta sin empate - 1.ª parte',
            'Total de puntos - 1.ª parte',
        ],
        "2 Mitad": [
            'Total de goles - 2.ª parte',
            'Ambos Equipos Marcarán - 2.ª parte',
            'Doble Oportunidad - 2.ª parte',
            '2.ª parte',
            'Apuesta sin empate - 2.ª parte',
            'Total de puntos - 2.ª parte',
        ],
        "Tarjetas": [
            'Total de tarjetas',
            'Tarjeta Roja mostrada',
            'Más Tarjetas',
        ],
        "Esquinas": [
            'Total de Tiros de Esquina',
            'Más Tiros de Esquina',
            'Total de Tiros de Esquina - 1.ª parte',
        ],
        'Cuarto 1': [
            'Cuarto 1',
            'Apuesta sin empate - Cuarto 1',
            'Total de puntos - Cuarto 1',
        ],
        'Cuarto 2': [
            'Cuarto 2',
            'Apuesta sin empate - Cuarto 2',
            'Total de puntos - Cuarto 2',
        ],
        'Cuarto 3': [
            'Cuarto 3',
            'Apuesta sin empate - Cuarto 3',
            'Total de puntos - Cuarto 3',
        ],
        'Cuarto 4': [
            'Cuarto 4',
            'Apuesta sin empate - Cuarto 4',
            'Total de puntos - Cuarto 4',
        ],
    };

    for (const category in categories) {
        if (categories[category].includes(type)) {
            return category;
        }
    }
    return "Categoría Desconocida";
}


const abbreviateTeamName = (teamName) => {
    const words = teamName.split(" ");
    const abbreviation = words.map((word, index) => {
        if (index === 0) {
            return word.substring(0, 3); // Tomar los primeros 3 caracteres del primer nombre
        }
        return word; // Mantener el segundo nombre completo
    }).join(" ");
    return abbreviation;
};

const transformString = (input) => {
    const teams = input.split(" - ");
    const transformedTeams = teams.map(team => abbreviateTeamName(team));
    return transformedTeams.join(" - ");
};


module.exports = {
    initBrowser,
    createJSON,
    quitarTildes,
    tienenPalabrasEnComunDinamico,
    calculateSureBet,
    obtenerCombinacionesCotizaciones,
    findSureBets,
    evaluateSurebets,
    generarCombinacionesDeCasas2,
    generarCombinacionesDeCasas3,
    extraerCotizaciones,
    generateFormattedDateRange,
    getResponse,
    closeBrowser,
    closeContext,
    obtenerObjetoPorTipo,
    dividirArregloEnDosSubarreglos,
    ordenarDinamicamenteMasMenos,
    matchnames,
    surebetcont,
    scrollToBottom,
    agruparApuestas,
    categoryActual,
    tienenPalabrasEnComunDinamicoT,
    generarCombinacionesDeCasas2MoreLess,
    transformString
}