
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
    "https://www.defacto.com/en-eg/woman-cardigans?page=2",];

  const browser = await puppeteer.launch({ headless: true });
  const allItems = [];

  try {
    for (const url of urls) {
      const page = await browser.newPage();
      let nextPageUrl = url;

      while (nextPageUrl) {
        await page.goto(nextPageUrl);
        await page.waitForSelector(".image-box a");

        const productLinks = await page.evaluate(() => {
          const linkElements = document.querySelectorAll(".image-box a");
          return Array.from(linkElements)
            .slice(0, 30)
            .map((el) => new URL(el.href, window.location.origin).href);
        });

        console.log("Product Links:", productLinks);

        for (const itemUrl of productLinks) {
          console.log("Item URL:", itemUrl);
          await page.goto(itemUrl);

          try {
            // Increase the timeout to 10 minutes (600000 milliseconds)
            await page.waitForSelector(".product-size-selector__buttons button", {
              timeout: 600000,
            });
          } catch (error) {
            console.error("Timeout waiting for product size selector:", error);
            continue; // Skip this item and proceed to the next one
          }

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

          console.log("Product Details:", productDetails);
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

    // Write JSON file before downloading images
    fs.writeFile("defacto Collection.json", JSON.stringify(allItems, null, 2), (err) => {
      if (err) throw err;
      console.log("Data saved to Defacto Collection.json");
    });

    // Download images
    if (options.download && options.downloadPath) {
      for (const item of allItems) {
        for (let imgIndex = 0; imgIndex < item.images.length; imgIndex++) {
          const imageUrl = item.images[imgIndex];
          console.log("Downloading image:", imageUrl);
          const randomUUID = uuidv4();
          const imagePath = path.join(options.downloadPath, `product_${randomUUID}.jpg`);
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

            console.log("Image downloaded successfully:", imageUrl);
          } catch (error) {
            console.error("Error downloading image:", imageUrl, error.message);
            continue; // Skip to the next image
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

module.exports = scrapDefacto;






///////////////////////////////////////////////
/*
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

  try {
    for (const url of urls) {
      const page = await browser.newPage();
      let nextPageUrl = url;
      let itemCount = 0;
  
      while (nextPageUrl && itemCount < 20) {
        try {
          await page.goto(nextPageUrl, { waitUntil: "networkidle2", timeout: 300000 }); // Increase timeout to 5 minutes (300,000 milliseconds)
        } catch (error) {
          if (error.name === "TimeoutError") {
            console.error("Navigation timeout occurred. Reloading the page.");
            await page.reload({ waitUntil: "networkidle2" });
          } else {
            throw error;
          }
        }

        const productLinks = await page.evaluate(() => {
          const linkElements = document.querySelectorAll(".image-box a");
          return Array.from(linkElements).map((el) => new URL(el.href, window.location.origin).href);
        });

        for (const itemUrl of productLinks) {
          if (itemCount >= 20) break;

          await page.goto(itemUrl);
          await page.waitForSelector(".product-size-selector__buttons button");

          const productDetails = await page.evaluate(() => {
            const titleElement = document.querySelector(".product-card__name");
            const title = titleElement ? titleElement.textContent.trim() : "Title not found";
            const priceElement = document.querySelector(".product-card__price--new");
            const price = priceElement ? priceElement.textContent.trim() : "Price not found";
            const descriptionElements = document.querySelectorAll(".product-details.product-card__section ul li");
            const description = Array.from(descriptionElements).map((li) => li.textContent.trim()).join(", ");

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

            const itemUrl = document.querySelector("#product-fill > div > div:nth-child(1) > div > div.product-card__image > div.image-box > a")?.href || "URL not found";

            return { title, price, description, images, sizes, colors, itemUrl };
          });

          allItems.push(productDetails);
          itemCount++;
        }

        const nextPageButton = await page.$(".pagination-item--next a");
        nextPageUrl = nextPageButton ? await (await nextPageButton.getProperty("href")).jsonValue() : null;
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

    const jsonData = JSON.stringify(allItems, null, 2);
    fs.writeFile("DEFACTO.json", jsonData, (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
      } else {
        console.log("Data saved to DEFACTO.json");
      }
    });
  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await browser.close();
  }

  return;
}

module.exports = scrapDefacto;
*/

