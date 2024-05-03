const { evaluateSurebets, generarCombinacionesDeCasas2, generarCombinacionesDeCasas3 } = require("../../casas/utils");
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
    ];

    addQuotes(results, betTypes) {
        for (const result of results) {
            if (result && result.bets.length > 0) {
                betTypes.forEach((type, index) => {
                    this.addQuoteIfValid(result.bets, index.toString(), result.nombre);
                });
            }
        }
    }

    addQuoteIfValid(bets, id, name) {
        const bet = this.getById(bets, id);
        if (bet && bet.bets && bet.bets.every(x => x !== undefined)) {
            if (!this.quotes.has(id)) {
                this.quotes.set(id, []);
            }
            this.quotes.get(id).push({
                nombre: name,
                cuotas: bet.bets
            });
        }
    }

    getById(bets, id) {
        return bets.find(b => b.id === id);
    }

    processSurebets(data, url, ids) {
        const surebets = [];
        // Iterar sobre cada par clave-valor en el objeto ids
        Object.entries(ids).forEach(([betType, id]) => {
            const quotesArray = this.quotes.get(String(id));  // Obtener las cuotas asociadas al id actual
            console.log(quotesArray);

            if (quotesArray && quotesArray.length > 0) {
                let combinations;

                let combinate = this.needsCombination(betType);
                if (combinate) {
                    if (quotesArray.some(q => q.cuotas.length === 3)) {
                        combinations = generarCombinacionesDeCasas3(quotesArray);
                    } else {
                        combinations = generarCombinacionesDeCasas2(quotesArray);
                    }
                } else {
                    combinations = quotesArray;  // Utiliza el array directamente sin generar combinaciones
                }

                // Utilizar el tipo de apuesta directamente desde el mapeo
                const calculator = combinate ? this.defaultCalculate : calculateTotalGol;
                // Calcular los resultados de surebet
                const surebetResults = calculator(combinations, data, url, betType);
                // Guardar los resultados de surebet
                surebets.push(...surebetResults.map(result => ({
                    name: data.team1 + " vs " + data.team2,
                    surebet: result
                })));
            }
        });

        return surebets;
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
}

module.exports = {
    QuoteManager
}
