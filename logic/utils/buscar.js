const { quitarTildes } = require("../../casas/utils");
const { timeouts } = require("../../const/timeouts");

const excludes = ["deportivo", "club", "FC", "Al", "(KSA)", "IF", 'atletico'];

async function buscar(page, match, buscarQ, intentarEncontrarOpcion, obj = {}) {
   
    let segmentos = match.includes(' - ') ? match.split(' - ').map(segmento => quitarTildes(segmento.trim().replace('-', ' '))) : [quitarTildes(match.replace('-', ' '))];
    segmentos = segmentos.flatMap(segmento => segmento.split(' ').filter(seg => !excludes.includes(seg.toLowerCase())));
    for (const cad of segmentos) {
        if (await buscarQ(page, cad)) {
            const encontrado = await intentarEncontrarOpcion(page, match, obj);
            if (encontrado) return;
        }
    }
    console.log('/////////// no se encontro nada');
    return 'no hay resultados';
    // await page.close();
}

let maxSimilarityObject = optPass => optPass.reduce((maxObj, current) => {
    return parseFloat(current.similarity) > parseFloat(maxObj.similarity) ? current : maxObj;
}, optPass[0]);

async function selectMoreOption(optPass) {
    return maxSimilarityObject(optPass);
}


module.exports = {
    buscar,
    excludes,
    selectMoreOption
}