import * as cheerio from 'cheerio';

export async function extractWebsite(link) {
    const url = `https://${link}`;

    //Implemented a controller to abort the extracting process in case that 20s pass.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        console.log(`Extracting from: ${url}`);

        const response = await fetch(url, {
            signal: controller.signal,
            //this header imitates a real browser
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        clearTimeout(timeoutId);

        if(!response.ok) {
            console.error(`Couldn't fetch: ${response.status}`);
            return;
        }

        const html = await response.text();

        //Here we take all the headers and put them in an object
        const headers = {};
        for(const [key, value] of response.headers.entries()) {
            headers[key.toLowerCase()] = value;
        }

        const $ = cheerio.load(html);

        return { link, headers, html, $ };
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Couldn't extract from ${link}: `, error.message);
        return;
    }
}