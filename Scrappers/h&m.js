
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function scrapHM(options) {
  const urls = [
              "https://eg.hm.com/en/shop-women/shop-product/shirts-blouses/blouses/",
               "https://eg.hm.com/en/shop-women/shop-product/dresses/",
               "https://eg.hm.com/en/shop-women/shop-product/tops/",
               "https://eg.hm.com/en/shop-women/shop-product/sweatshirts-hoodies/",
               "https://eg.hm.com/en/shop-women/shop-product/cardigans-jumpers/",
               "https://eg.hm.com/en/shop-women/shop-product/jackets-coats/",
               "https://eg.hm.com/en/shop-women/shop-product/trousers/",
               "https://eg.hm.com/en/shop-women/shop-product/jeans/",
               "https://eg.hm.com/en/shop-men/shop-product/t-shirts-tanks/",
               "https://eg.hm.com/en/shop-men/shop-product/shirts/",
               "https://eg.hm.com/en/shop-men/shop-product/hoodies-sweatshirts/",
               "https://eg.hm.com/en/shop-men/shop-product/trousers/",
               "https://eg.hm.com/en/shop-men/shop-product/jeans/",
               "https://eg.hm.com/en/shop-men/shop-product/jackets-coats/",
  ];
  const browser = await puppeteer.launch();
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let nextPageUrl = url;

    while (nextPageUrl) {
      await page.goto(nextPageUrl);

      async function autoScroll(page) {
        await page.evaluate(async () => {
          await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100; 
            var timer = setInterval(() => {
              var scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100); 
          });
        });
      }
      await page.waitForSelector(".list-product-gallery.product-selected-url");
      await autoScroll(page);

      const productLinks = await page.evaluate(() => {
        const linkElements = document.querySelectorAll(
          ".list-product-gallery.product-selected-url"
        );
        const productURLs = [];

        
        if (linkElements.length > 0) {
          
          linkElements.forEach((linkElement) => {
            const productURL = linkElement.getAttribute("href");
            console.log(productURL); // Output the product URL
            productURLs.push(`https://eg.hm.com${productURL}`);
          });
        } else {
          console.log("Product URLs not found");
        }

        return productURLs;
      });
      console.log("links", productLinks);
      for (const itemUrl of productLinks) {
        await page.goto(itemUrl);
        await page.waitForSelector("#product-zoom-container img");
        await autoScroll(page);

        const productDetails = await page.evaluate(() => {
          const titleElement = document.querySelector("h1");
          const title = titleElement ? titleElement.textContent.trim() : "Title not found";
          const priceElement = document.querySelector(".price-block .price-amount");
          const currencyElement = document.querySelector(".price-block .price-currency");
          let price = null;

          if (priceElement && currencyElement) {
            const amount = priceElement.textContent.trim();
            const currency = currencyElement.textContent.trim();
            price = `${currency}${amount}`;
          }
          const descriptionElement = document.querySelector(".description-first");
          const description = descriptionElement
            ? descriptionElement.textContent.trim()
            : "Description not found";

          const images = Array.from(document.querySelectorAll("#product-zoom-container img"))
            .map((imgElement) => {
              if (imgElement && imgElement.getAttribute("data-zoom-url")) {
                return imgElement.getAttribute("data-zoom-url");
              } else {
                return null;
              }
            })
            .filter((image) => image !== null);
          const sizes = Array.from(document.querySelectorAll(".select-buttons a"))
            .map((sizeElement) => sizeElement.getAttribute("data-value"))
            .filter((size) => size !== null && size !== undefined);
          const colors = Array.from(document.querySelectorAll(".select-buttons a"))
            .map((colorElement) => colorElement.getAttribute("data-color-label"))
            .filter((color) => color !== null && color !== undefined);

          return { title, price, description, images, sizes, colors };
        });
        console.log(productDetails);
        allItems.push(productDetails);
      }

      // Get URL for the next page
      const nextPageButton = await page.$(".pagination-item--next a");
      nextPageUrl = nextPageButton
        ? await (await nextPageButton.getProperty("href")).jsonValue()
        : null;
    }

    await page.close();
  }

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

  fs.writeFile("mango Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
  });

  await browser.close();
  return;
}

module.exports = scrapHM;
