const { evaluateSurebets, generarCombinacionesDeCasas2, generarCombinacionesDeCasas3, createJSON, matchnames, categoryActual } = require("../../casas/utils");
const { calculateTotalGol } = require("../surebets");

class QuoteManager {
    constructor() {
        this.quotes = new Map();
        this.betCalculators = {
        };
    }

    noCombinationNeeded = [
        'Total de goles',
        'Total de Tiros',
        'Total de tarjetas',
        'Total de goles - 2.ª parte',
        'Total de goles - 1.ª parte',
        'Total de Tiros de Esquina',
        'Hándicap 3-Way',
        'Total de puntos - Cuarto 1',
        'Total de puntos - Cuarto 2',
        'Total de puntos - Cuarto 3',
        'Total de puntos - Cuarto 4',
        'Total de puntos - 1.ª parte',
        'Total de puntos - 2.ª parte',
    ];

    doble = ['3', '9', '13'];

    addQuotes(results, betTypes) {
        for (const result of results) {
            if (result && result.bets.length > 0) {
                betTypes.forEach((type, index) => {
                    this.addQuoteIfValid(result.bets, index.toString(), result.nombre, result.url);
                });
            }
        }
    }

    addQuoteIfValid(bets, id, name, url) {
        const bet = this.getById(bets, id);
        if (bet && bet.bets && bet.bets.every(x => x !== undefined)) {
            if (!this.quotes.has(id)) {
                this.quotes.set(id, []);
            }
            this.quotes.get(id).push({
                nombre: name,
                cuotas: bet.bets,
                url
            });
        }
    }

    getById(bets, id) {
        return bets.find(b => b.id === id);
    }

    async processSurebets(data, url, ids) {
        return new Promise(async (resolve, reject) => {
            try {
                const surebets = [];

                for (const [betType, id] of Object.entries(ids)) {
                    let quotesArray = this.quotes.get(String(id));
                    if (id == '6' && quotesArray) {
                        // console.log(quotesArray.map(q => q.cuotas));
                        // console.log(extractAndGroup(quotesArray.map(q => q.cuotas)));
                    }
                    if (quotesArray && quotesArray.length > 0 && id != 6) {
                        let combinations;
                        if (id === '1') {
                            quotesArray.forEach(q => {
                                if (q.nombre === 'betplay') {
                                    q.cuotas[0] = { ...q.cuotas[0], name: data.team1 };
                                    q.cuotas[2] = { ...q.cuotas[2], name: data.team2 };
                                }
                                q.cuotas = this.sortQuotes(q.cuotas, data.team1, data.team2);
                            });
                        }
                        quotesArray = quotesArray.map(q => this.normalize(q));

                        let combinate = this.needsCombination(betType);
                        if (combinate) {
                            if (quotesArray.some(q => q.cuotas.length === 3)) {
                                combinations = generarCombinacionesDeCasas3(quotesArray);
                            } else if (!this.doble.includes(id)) {
                                combinations = generarCombinacionesDeCasas2(quotesArray);
                            }
                        } else {
                            combinations = quotesArray;
                        }
                        let calculator = this.defaultCalculate;
                        if (categoryActual.current == 'football' && !combinate) {
                            if (betType != 'Hándicap 3-Way') calculator = calculateTotalGol;
                            if (betType == 'Hándicap 3-Way') { }
                        } else if (categoryActual.current == 'basketball' && !combinate) {
                            calculator = calculateTotalGol;
                        }

                        const surebetResults = calculator(combinations, data, url, betType);
                        surebets.push(...surebetResults.map(result => ({
                            name: data.team1 + " vs " + data.team2,
                            surebet: result
                        })));
                    }
                }

                resolve(surebets);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Función para determinar si se necesitan combinaciones
    needsCombination(betType) {
        // Los tipos que no requieren combinación
        return !this.noCombinationNeeded.includes(betType);
    }

    defaultCalculate(combinations, data, url, betType) {
        return evaluateSurebets(combinations, 1000000, data, url, betType);
    }

    // Método para vaciar el mapa de cuotas
    clearQuotes() {
        this.quotes.clear();  // Vacía el mapa de cuotas
        console.log("Quotes map has been cleared.");
    }

    sortQuotes(quotesArray, team1, team2) {
        if (quotesArray.length < 1) return quotesArray;

        const compareNames = (a, b) => {
            const nameA = a.name.toString().toLowerCase();
            const nameB = b.name.toString().toLowerCase();

            // Prioridad más alta a team1
            if (nameA.includes(team1.toLowerCase()) && !nameB.includes(team1.toLowerCase())) return -1;
            if (nameB.includes(team1.toLowerCase()) && !nameA.includes(team1.toLowerCase())) return 1;

            // Siguiente prioridad a team2
            if (nameA.includes(team2.toLowerCase()) && !nameB.includes(team2.toLowerCase())) return -1;
            if (nameB.includes(team2.toLowerCase()) && !nameA.includes(team2.toLowerCase())) return 1;

            // Finalmente, ordenar por el nombre si no se cumple alguna de las condiciones anteriores
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            return 0;
        };

        quotesArray.sort(compareNames);
        return quotesArray;
    }

    normalize(quotes) {
        const normal = name => {
            if (typeof name === 'number') {
                switch (name) {
                    case 2:
                        name = 'X'
                        break;
                    case 3:
                        name = '2'
                        break;
                    case 794:
                        name = 'Equipo 1'
                        break;
                    case 180:
                        name = 'Si'
                        break;
                    case 181:
                        name = 'No'
                        break;
                }
                return name;  // Retorna el número sin cambios
            }
            name = name.trim();
            if (name.indexOf('NaN') != -1)
                name = name.substring(0, name.indexOf('NaN'));
            return name;
        };

        let normalQuotes = quotes.cuotas.map(q => ({ ...q, name: normal(q.name) }));
        return { ...quotes, cuotas: normalQuotes };
    }
}

function normalizeIdentifier(identifier) {
    if (identifier.includes(':')) {
        let parts = identifier.split(':').map(Number);
        if (parts[0] === 0) {
            return (-parts[1]).toString();
        } else if (parts[1] === 0) {
            return parts[0].toString();
        }
    } else if (identifier.includes('.')) {
        return identifier.split('.')[0];
    }
    return identifier.replace('+', '');
}

function extractAndGroup(betsArrays) {
    let groups = {};

    betsArrays.forEach(subArray => {
        subArray.forEach(bet => {
            if (bet && bet.name) {
                let match = bet.name.match(/[-+]?[\d:.]+/);
                if (match) {
                    let normalizedKey = normalizeIdentifier(match[0]);
                    if (!groups[normalizedKey]) {
                        groups[normalizedKey] = [];
                    }
                    groups[normalizedKey].push(bet);
                }
            }
        });
    });

    return groups;
}

module.exports = {
    QuoteManager
}
