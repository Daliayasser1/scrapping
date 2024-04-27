
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");


async function scrapMobaco(options) {
  const urls = [
          "https://mobaco.com/product-category/men/?ppp=-1",
          "https://mobaco.com/product-category/women/?ppp=-1",
  ];
  const browser = await puppeteer.launch();
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let nextPageUrl = url;

    while (nextPageUrl) {
      await page.goto(nextPageUrl, { timeout: 60000 });

      const items = await page.evaluate(() => {
        const productElements = document.querySelectorAll("#main .product_inner");
        return Array.from(productElements).map((productElement) => {
          const url = productElement.querySelector("a").href;
          return url;
        });
      });

      for (const itemUrl of items) {
        console.log(itemUrl);
        const itemPage = await browser.newPage();
        await itemPage.goto(itemUrl, { timeout: 60000 });

        const productDetails = await itemPage.evaluate((itemUrl) => {
          const title = document.querySelector("h1").innerText;
          const price = document.querySelector(".price").innerText;
          const description = document.querySelector(
            ".woocommerce-product-details__short-description"
          )
            ? document.querySelector(".woocommerce-product-details__short-description").innerText
            : "";
          const images = Array.from(
            document.querySelectorAll(".woocommerce-product-gallery__image img")
          ).map((img) => img.src);

          // Updated size selection logic
          const sizes = Array.from(document.querySelectorAll(".sizes_atts.side_wdg ul li"))
            .map((li) => li.textContent.trim())
            .filter((size) => size.match(/^\d+$/)); // Filters to keep only numeric sizes

          return { title, price, description, images, sizes, url: itemUrl };
        }, itemUrl);

        allItems.push(productDetails);
        await itemPage.close();
      }

      const nextPageButton = await page.$(".pagination-item--next a");
      nextPageUrl = nextPageButton
        ? await (await nextPageButton.getProperty("href")).jsonValue()
        : null;
    }

    await page.close();
  }

  if (options.download && options.downloadPath) {
    try {
      for (const [index, item] of allItems.entries()) {
        console.log("Title:", item.title);
        console.log("Price:", item.price);
        console.log("URL:", item.url);
        console.log("Images URLs:", item.images);
        console.log("Description:", item.description);
        console.log("Sizes:", item.sizes);
        console.log("---------------------------");

        // Process each image for the current item
        for (const [imgIndex, imageUrl] of item.images.entries()) {
          const randomUUID = uuidv4();
          const imagePath = path.join(options.downloadPath, `image_${randomUUID}.JPEG`);
          try {
            await downloadImage(imageUrl, imagePath);
          } catch (error) {
            console.error(`Failed to download image ${imageUrl}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error("Error processing items:", error.message);
    }
  }

  async function downloadImage(imageUrl, imagePath) {
    const writer = fs.createWriteStream(imagePath);

    try {
      const response = await axios({
        url: imageUrl,
        method: "GET",
        responseType: "stream",
        timeout: 60000, // Timeout after 60 seconds
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } catch (error) {
      console.error(`Failed to download image from ${imageUrl}: ${error.message}`);
      // Handle or rethrow the error according to your needs
      throw error;
    }
  }

  fs.writeFile("Mobaco Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
  });

  await browser.close();
  return;
}

module.exports = scrapMobaco;
