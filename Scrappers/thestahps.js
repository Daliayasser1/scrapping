const puppeteer = require("puppeteer");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function scrapThestahps(options) {
  const urls = [
    "https://www.thestahps.com/collections/timeless-threads"
  ];
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(50000);

  const items = [];

  if (options.download && !fs.existsSync(options.downloadPath)) {
    fs.mkdirSync(options.downloadPath, { recursive: true });
  }

  for (const url of urls.flat()) {
    await page.goto(url, { waitUntil: "networkidle2" });

    const links = await page.evaluate(() => {
      const linkElements = document.querySelectorAll(
        "#CollectionAjaxContent .grid-product__content a.grid-product__link"
      );
      return Array.from(linkElements).map((link) => link.href);
    });

    for (const link of links) {
      await page.goto(link, { waitUntil: "networkidle0" });

      const itemDetails = await page.evaluate(() => {
        const title = document.querySelector("h1.product-single__title")?.innerText || "No title";
        const price = document.querySelector(".product__price").innerText.trim(); 
        const description = document.querySelector(".rte").innerText.trim(); 
        const images = Array.from(document.querySelectorAll("img")).map((img) =>
          img.src.replace(/^\/\//, "https://")
        ); 
        const colors = [...document.querySelectorAll("[data-color]")].map((el) =>
          el.getAttribute("aria-label")
        );
        const sizes = Array.from(
          document.querySelectorAll(".variant-input-wrap input[name='Size']")
        ).map((input) => ({
          size: input.value,
          available: !input.classList.contains("disabled"), 
        }));
        return { title, price, description, images, colors, sizes };
      });
      console.log(itemDetails);
      items.push({ url: link, ...itemDetails });

      if (options.download) {
        // Download images
        await downloadImages(itemDetails.images, itemDetails.title, options.downloadPath);
      }
    }
  }

  fs.writeFile("thestahps Collection.json", JSON.stringify(items, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
  });

  console.log("Scraping and downloading completed.");
  await browser.close();
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
  return;
}

module.exports = scrapThestahps;
