import parquet from 'parquetjs-lite';

//This function reads all website domains from the '.parquet' input file
async function getWebsitesFromParquet(path) {
    const websites = [];

    try {
        //This opens the file
        const reader = await parquet.ParquetReader.openFile(path);

        const cursor = reader.getCursor();
        let record = null;

        //This iterates through every record and 'pushes' the website into an array
        while(record = await cursor.next()) {
            if(record.root_domain) {
                websites.push(record.root_domain);
            }
        }

        await reader.close();
        return websites;
    } catch (error) {
        console.error(`Couldn't read the parquet: `, error);
        return [];
    }
}

//Testing in main function
async function main() {
    console.log('Reading file...');
    const websites = await getWebsitesFromParquet('./input_data.parquet');

    console.log(`Extracted websites: ${websites.length}`);
    console.log(JSON.stringify(websites, null, " "));
}

main();