const fs = require("fs");
const path = require("path");
const urls = require("./h&m.data");
//const scrap = require("./Scrappers/defactoBlouse");
const scrapDefacto = require("./Scrappers/defactoBlouse");
const scrapDalydress = require("./Scrappers/dalydress");
const scrapBasiclook = require("./Scrappers/basiclook");
const scrapSand = require("./Scrappers/sand");
const scrapThestahps = require("./Scrappers/thestahps");
const scrapAmericanEagle = require("./Scrappers/americanEagle");
const scrapMobaco = require("./Scrappers/mobaco");
const scrapMango = require("./Scrappers/mango");
const scrapHM = require("./Scrappers/h&m");


const scrap = async (scrapeFunciton, options) => {
  const data = await scrapeFunciton({
    download: options.download,
    downloadPath: options.downloadPath,
  });
  return data;
};
const runAllScrapers = async () => {
  
  const scrapers = [

    /*   {
      scraper: scrapMobaco,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      }, 
    }, 
  
    {
      scraper: scrapAmericanEagle,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      }, 
    },  
  
    {
      scraper: scrapThestahps,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, 
  
    {
      scraper: scrapSand,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, 
 
    {
      scraper: scrapBasiclook,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, 
  
    {
      scraper: scrapDalydress,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, 
  
   {
      scraper: scrapDefacto,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, 
  
    {
      scraper: scrapMango,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, */
  
    {
      scraper: scrapHM,
      options: {
        download: true,
        downloadPath: `${__dirname}/assets/items`,
      },
    }, 
  ]; 

  // Execute all scrapers concurrently
  const results = await Promise.all(
    scrapers.map(async ({ scraper, options }) => {
      try {
        return await scrap(scraper, options);
      } catch (error) {
        console.error(`Error running scraper: ${error}`);
        return null;
      }
    })
  );

  console.log("All scrapers executed successfully!");
  return results;
};

// Run all scrapers
runAllScrapers()
  .then((results) => {
    // Process results if needed
  })
  .catch((error) => {
    console.error(`Error running scrapers: ${error}`);
  });
