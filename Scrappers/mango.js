const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");


async function scrapMango(options) {
  const urls = [
              "https://shop.mango.com/eg-en/women/dresses-and-jumpsuits_c55363448",
               "https://shop.mango.com/eg-en/women/tops_c19912693",
               "https://shop.mango.com/eg-en/women/t-shirts_c66796663",
               "https://shop.mango.com/eg-en/women/blouses-and-shirts_c78920337",
               "https://shop.mango.com/eg-en/women/sweaters-and-cardigans_c87138853",
               "https://shop.mango.com/eg-en/women/coats_c67886633",
               "https://shop.mango.com/eg-en/women/trousers_c52748027",
               "https://shop.mango.com/eg-en/women/jeans_c12563337",
               "https://shop.mango.com/eg-en/men/shirts_c10863844",
               "https://shop.mango.com/eg-en/men/t-shirts_c12018147",
               "https://shop.mango.com/eg-en/men/polos_c20667557",
               "https://shop.mango.com/eg-en/men/trousers_c11949748",
               "https://shop.mango.com/eg-en/men/jackets-and-overshirts_c16042202",
               "https://shop.mango.com/eg-en/men/sweatshirts_c71156082",
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
      await page.waitForSelector('div[data-testid*="plp.product"] a[data-testid$=".link"]');
      await autoScroll(page);

      const productLinks = await page.evaluate(() => {
        const allDivsWithProducts = document.querySelectorAll('div[data-testid*="plp.product"]');
        const urls = [];
        allDivsWithProducts.forEach((div) => {
          const links = div.querySelectorAll('a[data-testid$=".link"]');
          links.forEach((link) => {
            if (link && link.href) {
              urls.push(link.href);
            }
          });
        });
        return urls;
      });

      console.log(productLinks);
      for (const itemUrl of productLinks) {
        await page.goto(itemUrl);
        await page.waitForSelector(".product-features .product-name");
        await page.waitForSelector('span[data-testid="currentPrice"] span.text-title-xl');
        await page.waitForSelector(".product-info-text");
        await page.waitForSelector(".product-images .image-js");
        await page.waitForSelector(
          ".size-selector-container ul[aria-label='Select your size'] li button[data-testid='pdp.sizeSelector.size.available'] span.text-title-m"
        );
        await page.waitForSelector(".product-colors .colors-info-name");
        const productDetails = await page.evaluate(() => {
          const titleElement = document.querySelector(".product-features .product-name");
          const title = titleElement ? titleElement.innerText.trim() : "Title not found";
          const priceElement = document.querySelector(
            'span[data-testid="currentPrice"] span.text-title-xl'
          );
          const price = priceElement ? priceElement.innerText : null;
          const descriptionContainer = document.querySelector(".product-info-text");
          const description = descriptionContainer ? descriptionContainer.textContent.trim() : "";

          const images = Array.from(document.querySelectorAll(".product-images .image-js")).map(
            (img) => img.getAttribute("src")
          );
          const sizes = Array.from(
            document.querySelectorAll(
              ".size-selector-container ul[aria-label='Select your size'] li button[data-testid='pdp.sizeSelector.size.available'] span.text-title-m"
            )
          ).map((sizeElement) => sizeElement.innerText.trim());
          const colors = Array.from(
            document.querySelectorAll(".product-colors .colors-info-name")
          ).map((colorElement) => colorElement.innerText.trim());

          return { title, price, description, images, sizes, colors };
        });
        console.log(productDetails);
        allItems.push(productDetails);
      }

      
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

module.exports = scrapMango;
