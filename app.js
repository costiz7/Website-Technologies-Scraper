import parquet from 'parquetjs-lite';
import Wappalyzer from 'wappalyzer';
import fs from 'fs/promises';

async function main() {
    console.log('Reading parquet file...');
    const reader = await parquet.ParquetReader.openFile('./input_data.parquet');
    const cursor = reader.getCursor();
    const domains = [];
    let record;
    
    //Extracting all domains using a cursor
    while (record = await cursor.next()) {
        if (record.root_domain) domains.push(record.root_domain);
    }
    await reader.close();

    console.log('Starting Wappalyzer...');
    const wappalyzer = new Wappalyzer({ maxWait: 15000 }); //timeout before stop
    await wappalyzer.init();

    //We use a set to keep all the unique technologies
    const uniqueTechnologiesSet = new Set();

    const finalOutput = {
        scanned_domains_count: 0,
        total_unique_technologies: 0,
        unique_technologies_list: [], // Unique technologies list
        results: {} //All websites and their technologies
    };

    //This function divides the domains in packages, and creates an array of arrays.
    function chunkArray(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
        return result;
    }

    //The length of a package
    const PACKAGE_SIZE = 5; 
    const domainBatches = chunkArray(domains, PACKAGE_SIZE);

    console.log(`Starting scraping process: ${domainBatches.length} PACKAGES`);
    
    for (let i = 0; i < domainBatches.length; i++) {
        const batch = domainBatches[i];
        console.log(`     -> Processing package: ${i + 1}/${domainBatches.length}`);
        
        await Promise.all(batch.map(async (domain) => {
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
                finalOutput.results[domain] = [{ status: "Error", Description: "Couldn't access domain." }];
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
    
    console.log(`DONE! Found ${finalOutput.total_unique_technologies} technologies in ${finalOutput.scanned_domains_count} domains.`);
}

main();