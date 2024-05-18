const { request } = require("playwright");

const userAgents = [
    // Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    // Linux
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.818.62 Safari/537.36 Edg/90.0.818.56',
    // Opera
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36 OPR/60.0.3255.170'
];

async function initRequest(url, n, headers = {}) {
    let cont = 0;
    while (cont < 3) {
        const randomUserAgent = userAgents[Math.floor(Math.random() * n || userAgents.length)];
        const context = await request.newContext();
        try {
            const res = await context.get(url, {
                headers: {
                    'User-Agent': randomUserAgent,
                    ...headers
                },
            });
            const result = await res.json();
            return result;
        } catch (error) {
            cont++;
        }
    }
}

async function postFormData(url, formData, type = 'application/x-www-form-urlencoded') {
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    // Create a context that will issue http requests.
    const context = await request.newContext();
    // Create a repository and set the method to POST
    const res = await context.post(url, {
        headers: {
            'User-Agent': randomUserAgent,
            // Add additional headers if necessary, for example:
            'Content-Type': type  // This is typically not needed as browsers will add it along with the boundary parameter automatically.
        },
        data: formData
    });

    try {
        const result = await res.json();
        return result;
    } catch (error) {
        console.log(await res.text());
    }
}

async function postUrlEncoded(url, data) {
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    const context = await request.newContext();
    const encodedData = new URLSearchParams(data).toString();
    // console.log("Encoded Data:", encodedData);  // Imprimir datos codificados para depuración

    const res = await context.post(url, {
        headers: {
            'User-Agent': randomUserAgent,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: encodedData
    });

    try {
        const result = await res.json();
        return result;
    } catch (error) {
        console.log(await res.text());
    }
}


module.exports = {
    initRequest,
    postFormData,
    postUrlEncoded
}