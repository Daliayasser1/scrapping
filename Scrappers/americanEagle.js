

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function scrapAmericanEagle(options) {
  const urls = [
    "https://www.ae.com/intl/en/c/women/t-shirts/graphic-tees/cat860018?pagetype=plp",
    "https://www.ae.com/intl/en/c/women/t-shirts/classic-t-shirts/cat600010?pagetype=plp",
    "https://www.ae.com/intl/en/c/women/tops/button-up-shirts/cat7670003?pagetype=plp",
    "https://www.ae.com/intl/en/c/women/tops/blouses/cat360002?pagetype=plp",
    "https://www.ae.com/intl/en/c/women/tops/hoodies-sweatshirts/cat90048?pagetype=plp",
    "https://www.ae.com/intl/en/c/women/sweaters-cardigans/view-all-sweaters-cardigans/cat2390001?pagetype=plp",
    "https://www.ae.com/intl/en/x/women/tops/oversized-tops?menu=cat4840004&pagetype=shp",
    "https://www.ae.com/intl/en/x/women/tops/oversized-tops?menu=cat4840004&pagetype=shp",
    "https://www.ae.com/us/en/x/men/featured/men-ae77-tops?menu=cat4840004&pagetype=shp",
    "https://www.ae.com/intl/en/c/men/tops/cat10025?pagetype=plp",
    "https://www.ae.com/intl/en/c/men/tops/t-shirts/cat90012?pagetype=plp",
    "https://www.ae.com/intl/en/c/men/tops/shirts/cat40005?pagetype=plp",
    "https://www.ae.com/intl/en/c/men/tops/hoodies-sweatshirts/cat90020?pagetype=plp",
    "https://www.ae.com/intl/en/c/men/tops/polos/cat510004?pagetype=plp",
    "https://www.ae.com/us/en/x/men/featured/men-ae77-jackets?menu=cat4840004&pagetype=shp",
  ];

  const browser = await puppeteer.launch({ headless: true });
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    try {
      await page.goto(url, { timeout: 60000 });

      // Scroll to ensure all products are loaded
      await autoScroll(page);
      const itemUrls = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll(".tile-media._media_t6pdgs._tile-media_1d4brf a")
        ).map((link) => link.href);
      });

      // Scrap only first 15 items from each URL
      const itemsToScrap = itemUrls.slice(0, 15);

      for (const itemUrl of itemsToScrap) {
        console.log(itemUrl);
        const itemPage = await browser.newPage();
        try {
          await itemPage.goto(itemUrl, { timeout: 60000 });

          // Ensure size dropdown is interacted with to load sizes, if necessary
          const isDropdownVisible = await itemPage.$(".dropdown-menu._dropdown-view_172ryf");
          if (!isDropdownVisible) {
            try {
              await itemPage.waitForSelector(".dropdown-toggle._dropdown-toggle_172ryf", {
                visible: true,
                timeout: 30000,
              });

              await itemPage.click(".dropdown-toggle._dropdown-toggle_172ryf");
              await itemPage.waitForSelector(".dropdown-menu._dropdown-view_172ryf", { visible: true });
            } catch (error) {
              // Handle error interacting with dropdown
            //  console.error("Error interacting with dropdown for", itemUrl);
              continue;
            }
          }

          const itemData = await itemPage.evaluate(() => {
            const title = document.querySelector("h1")?.innerText || "No title";
            const price = document.querySelectorAll(".product-prices._container_16k42b");
            const images = Array.from(document.querySelectorAll("picture img")).map((img) => img.src);
            const sizes = Array.from(
              document.querySelectorAll(".dropdown-menu._dropdown-view_172ryf li")
            ).map((li) => li.textContent.trim());
            const colors = Array.from(
              document.querySelectorAll(".product-swatches [data-test-color-swatch] img")
            ).map((img) => img.alt);
            return {
              title,
              price: `${price[0].innerText}`,
              images,
              sizes,
              colors,
              description: "No description",
              url: window.location.href,
            };
          });

          console.log(itemData);
          allItems.push(itemData);
        } catch (error) {
          // Handle timeout or other errors on item page
          console.error("Error scraping item page:", error);
        } finally {
          await itemPage.close();
        }
      }
    } catch (error) {
      // Handle timeout or other errors on main page
      console.error("Error accessing URL:", error);
    } finally {
      await page.close();
    }
  }

  // Write JSON file before downloading images
  fs.writeFileSync("american Eagle Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) console.error("Error saving file:", err);
    else console.log("File saved successfully.");
  });

  if (options.download && options.downloadPath) {
    for (const item of allItems) {
      for (let imgIndex = 0; imgIndex < item.images.length; imgIndex++) {
        const imageUrl = item.images[imgIndex];
        console.log("Image URL:", imageUrl);
        const randomUUID = uuidv4();
        const imagePath = path.join(options.downloadPath, `product_${randomUUID}.jpg`);
        const writer = fs.createWriteStream(imagePath);
        const response = await axios({
          url: imageUrl,
          method: "GET",
          responseType: "stream",
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      }
      console.log("---------------------------");
    }
  }

  await browser.close();
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

module.exports = scrapAmericanEagle;


