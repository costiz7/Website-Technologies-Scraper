import websiteTechnologiesScraper from "./websiteTechnologiesScraper.js";

//I increased listener limit to prevent MaxListenersExceededWarning during concurrent scraping
//Increase this constant if the number of Listeners is exceeded;
const LISTENERS_LIMIT = 20;
process.setMaxListeners(LISTENERS_LIMIT);


/**
 * Launches the main scraping process to identify the technologies used by the domains
 * @param {string} filePath - The path to the input `.parquet` file containing the domains
 * @param {number} packetSize - The number of domains to scan concurrently (ex: 5 or 10)
 * @param {number} timeOut - The maximum wait time per site, in milliseconds (ex: 30000)
 */
websiteTechnologiesScraper('./input_data.parquet', 5, 30000);