
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");


async function scrapDefacto(options) {
  const urls = [
    "https://www.defacto.com/en-eg/woman-blouse",
    "https://www.defacto.com/en-eg/woman-t-shirt",
    "https://www.defacto.com/en-eg/woman-t-shirt?page=2",
    "https://www.defacto.com/en-eg/woman-shirt",
    "https://www.defacto.com/en-eg/woman-shirt?page=2",
    "https://www.defacto.com/en-eg/woman-jacket",
    "https://www.defacto.com/en-eg/woman-skirt",
    "https://www.defacto.com/en-eg/woman-sweatpants",
    "https://www.defacto.com/en-eg/man-t-shirts",
    "https://www.defacto.com/en-eg/man-t-shirts?page=2",
    "https://www.defacto.com/en-eg/man-shirts",
    "https://www.defacto.com/en-eg/man-jeans",
    "https://www.defacto.com/en-eg/woman-cardigans",
    "https://www.defacto.com/en-eg/woman-cardigans?page=2",
];
  const browser = await puppeteer.launch();
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let nextPageUrl = url;

    while (nextPageUrl) {
      await page.goto(nextPageUrl);

      const productLinks = await page.evaluate(() => {
        const linkElements = document.querySelectorAll(".image-box a");
        return Array.from(linkElements).map((el) => new URL(el.href, window.location.origin).href);
      });

      console.log(productLinks);
      for (const itemUrl of productLinks) {
        await page.goto(itemUrl);
        await page.waitForSelector(".product-size-selector__buttons button");

        const productDetails = await page.evaluate(() => {
          const titleElement = document.querySelector(".product-card__name");
          const title = titleElement ? titleElement.textContent.trim() : "Title not found";
          const priceElement = document.querySelector(".product-card__price--new");
          const price = priceElement ? priceElement.textContent.trim() : "Price not found";
          const descriptionElements = document.querySelectorAll(
            ".product-details.product-card__section ul li"
          );
          const description = Array.from(descriptionElements)
            .map((li) => li.textContent.trim())
            .join(", ");

          const imageElements = document.querySelectorAll(".swiper-slide .swiper-item img");
          const images = Array.from(imageElements).map((img) => {
            return `https:${img.dataset.src}` || `https:${img.src}`;
          });
          const sizeButtons = document.querySelectorAll(".product-size-selector__buttons button");
          const sizes = [];

          sizeButtons.forEach((button) => {
            const buttonText = button.textContent.trim();
            if (buttonText && buttonText !== "Find My Size") {
              sizes.push(buttonText);
            }
          });
          const colorElements = document.querySelectorAll(".product-card__image [data-title]");
          const colors = Array.from(colorElements).map((el) => el.dataset.title);

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

  fs.writeFile("defacto Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
  });

  await browser.close();
  return;
}

module.exports = scrapDefacto;
