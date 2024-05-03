
function evaluarCoincidencias(palabras1, palabras2, sinonimos, porcentajeUmbral) {
    palabras1 = aplicarSinonimos(palabras1, sinonimos);
    palabras2 = aplicarSinonimos(palabras2, sinonimos);

    const set1 = new Set(palabras1.filter(p => p.length > 2));  // Filtra palabras demasiado cortas que no aportan significado
    const set2 = new Set(palabras2.filter(p => p.length > 2));

    const interseccion = new Set([...set1].filter(x => set2.has(x)));
    let puntuacion = (interseccion.size / Math.min(set1.size, set2.size)) * 100;

    const texto1 = palabras1.join(' ');
    const texto2 = palabras2.join(' ');
    let distancia = levenshtein.get(texto1, texto2);
    let longitudMax = Math.max(texto1.length, texto2.length);
    let umbralLevenshtein = longitudMax * 0.4;

    // console.log("Puntuación: ", puntuacion, "Distancia Levenshtein: ", distancia, "Umbral: ", umbralLevenshtein);

    return puntuacion >= porcentajeUmbral && distancia <= umbralLevenshtein;
}

module.exports = {
    evaluarCoincidencias
}