
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function scrapDalydress(options) {
  const urls = [
          "https://dalydress.com/collections/all-blouses?page=4",
          "https://dalydress.com/collections/all-blouses?page=3",
          "https://dalydress.com/collections/cardigans-2",
          "https://dalydress.com/collections/all-pulloverss",
          "https://dalydress.com/collections/all-shirts",
          "https://dalydress.com/collections/all-t-shirtss",
  ];
  const browser = await puppeteer.launch();
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let nextPageUrl = url;

    while (nextPageUrl) {
      await page.goto(nextPageUrl);
      await page.waitForSelector(".sparq-thumbnail-wrap a.sparq-loop-product");

      const productLinks = await page.evaluate(() => {
        const productElements = document.querySelectorAll(
          ".sparq-thumbnail-wrap a.sparq-loop-product"
        );
        return Array.from(productElements).map((el) => el.href);
      });

      console.log(productLinks);
      for (const itemUrl of productLinks) {
        await page.goto(itemUrl);

        const productDetails = await page.evaluate(() => {
          const title = document.querySelector(".product-single__title").innerText.trim();
          const price = document.querySelector(".product__price .money").innerText.trim();

          const description = document.querySelector(
            ".product-single__description-full p"
          ).innerText;

          const imageLinks = document.querySelectorAll(".product__thumb-item a");
          const images = Array.from(imageLinks).map((link) => link.href);

          const sizes = Array.from(
            document.querySelectorAll('.variant-input-wrap[name="Size"] .variant-input')
          ).map((el) => {
            const size = el.querySelector("input").value;
            const isDisabled = el.querySelector("input").classList.contains("disabled");
            return { size, isDisabled };
          });

          const colors = Array.from(
            document.querySelectorAll('.variant-input-wrap[name="Color"] .variant-input')
          ).map((el) => el.querySelector("input").value);

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
  
  fs.writeFile("dalydress Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
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
  return;
}

module.exports = scrapDalydress;
