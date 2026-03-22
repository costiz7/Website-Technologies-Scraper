import parquet from 'parquetjs-lite';
import Wappalyzer from 'wappalyzer';
import fs from 'fs/promises';

//This function reads the path of the parquet file then returns all the domains as an array of key:domain object
async function parquetReader(path) {
    console.log('Reading parquet file...');
    const reader = await parquet.ParquetReader.openFile(path);
    const cursor = reader.getCursor();
    const domains = [];
    let record;
    
    //Extracting all domains using a cursor
    while (record = await cursor.next()) {
        if (record.root_domain) domains.push(record.root_domain);
    }
    await reader.close();

    return domains;
}

//This function divides the domains in packages, and creates an array of arrays.
function packetArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
        
    return result;
}

async function websiteTechnologiesScraper(path = './input_data.parquet', PACKET_SIZE = 5, timeOut = 15000) {
    //Reading the parquet file and retrieving it as an array of objects
    const domains = await parquetReader(path);

    //We use a set to keep all the unique technologies
    const uniqueTechnologiesSet = new Set();

    const finalOutput = {
        scanned_domains_count: 0,
        total_unique_technologies: 0,
        unique_technologies_list: [], // Unique technologies list
        results: {} //All websites and their technologies
    };

    //Initializing Wappalyzer
    console.log('Starting Wappalyzer...');
    const wappalyzer = new Wappalyzer({ maxWait: timeOut }); //timeOut before stop
    await wappalyzer.init();

    const domainPackets = packetArray(domains, PACKET_SIZE);
    console.log(`Starting scraping process for ${domainPackets.length} PACKETS`);
    
    for (let i = 0; i < domainPackets.length; i++) {
        const packet = domainPackets[i];
        console.log(`     -> Processing packet: ${i + 1}/${domainPackets.length}`);
        
        await Promise.all(packet.map(async (domain) => {
            try {
                const site = await wappalyzer.open(`https://${domain}`);
                const data = await site.analyze();
                
                const techList = data.technologies.map(tech => ({
                    technology: tech.name,
                    proof: `Wappalyzer confidence level: ${tech.confidence}%`
                }));

                //Saving current results in our finalOutput object
                finalOutput.results[domain] = techList;
                
                //We add every found technology in our set (no duplicates)
                techList.forEach(t => uniqueTechnologiesSet.add(t.technology));
                console.log('\x1b[36m%s\x1b[0m', `Current total technologies: ${uniqueTechnologiesSet.size}`);

            } catch (error) {
                console.error('\x1b[31m%s\x1b[0m', "Error: ", error.message);
                return;
            }
        }));
    }

    await wappalyzer.destroy(); // We close wappalyzer

    // We set the count of scanned domains and unique technologies in our finalOutput object
    finalOutput.scanned_domains_count = Object.keys(finalOutput.results).length;
    finalOutput.total_unique_technologies = uniqueTechnologiesSet.size;
    
    // We cast the set to an array, sort it, then attach it to finalOutput
    finalOutput.unique_technologies_list = Array.from(uniqueTechnologiesSet).sort();

    console.log('Saving output.json ...');
    await fs.writeFile('./output.json', JSON.stringify(finalOutput, null, 2));
    
    console.log('\x1b[32m%s\x1b[0m', `DONE! Found ${finalOutput.total_unique_technologies} technologies in ${finalOutput.scanned_domains_count} domains.`);
}

export default websiteTechnologiesScraper;