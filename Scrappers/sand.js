
const puppeteer = require("puppeteer");
const fs = require("fs");
const axios = require("axios");

const path = require("path");
const { v4: uuidv4 } = require("uuid");


async function scrapSand(options) {
  const urls = [
    "https://sandeg.shop/collections/all",
    "https://sandeg.shop/collections/all?page=2",
    "https://sandeg.shop/collections/all?page=3",
    "https://sandeg.shop/collections/all?page=4",
    "https://sandeg.shop/collections/all?page=5",
    "https://sandeg.shop/collections/all?page=6",
    "https://sandeg.shop/collections/all?page=7",
    "https://sandeg.shop/collections/all?page=8",
  ];
  const browser = await puppeteer.launch();
  let allItems = [];
  for (const url of urls) {
    const page = await browser.newPage();
    await page.goto(url);

    // Extract all product URLs from the main page
    const productUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll(".card__heading a"));
      return links.map((link) => link.href);
    });
    for (const url2 of productUrls) {
      const productPage = await browser.newPage();
      await productPage.goto(url2);

      const item = await productPage.evaluate(() => {
        try {
          const title = document.querySelector("h1").innerText;
          const price = document.querySelector(".price__regular .price-item--regular").innerText;
          const description = document.querySelector(".product__description").innerText;
          const sizes = Array.from(
            document.querySelectorAll("#variant-radios-template--18011341652265__main input[name='Size'] + label")
          ).map((el) => el.innerText.trim());
          const colors = Array.from(
            document.querySelectorAll("#variant-radios-template--18011341652265__main input[name='Color'] + label")
          ).map((el) => el.innerText.trim());
          const images = Array.from(document.querySelectorAll(".product__media img")).map(
            (img) => img.src
          );

          return { title, price, description, sizes, colors, images };
        } catch (error) {
          console.error("Error while extracting item:", error);
          console.error("Failed selector:", error.selector); // Log the failing selector
          return null; // Return null if extraction fails
        }
      });
      if (item !== null) {
        console.log(item);
        if (options.download) await downloadImages(item.images, item.title, options.downloadPath);

        allItems.push(item);
      }
      await productPage.close();
    }
    await page.close(); // Close the main page after processing its products
  }

  await browser.close(); // Close the browser after processing all URLs

  // Write data to JSON file
  fs.writeFile("sand.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) throw err;
    console.log("Data written to products.json");
  });
}

async function downloadImages(images, title, downloadPath) {
  for (const [index, imageUrl] of images.entries()) {
    const randomUUID = uuidv4();
    const imagePath = path.join(downloadPath, `image_${randomUUID}.jpg`);
    const writer = fs.createWriteStream(imagePath);

    try {
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
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  }

}

module.exports = scrapSand;
