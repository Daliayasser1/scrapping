

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
      try {
        await page.goto(nextPageUrl, { timeout: 60000 });
      } catch (error) {
        console.error(`Error navigating to ${nextPageUrl}: ${error.message}`);
        break; // Break the loop if there's an error
      }

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

        try {
          await itemPage.goto(itemUrl, { timeout: 60000 });
        } catch (error) {
          console.error(`Error navigating to ${itemUrl}: ${error.message}`);
          await itemPage.close();
          continue; // Continue to the next item
        }

        const productDetails = await itemPage.evaluate((itemUrl) => {
          const title = document.querySelector("h1").innerText;
          const price = document.querySelector(".price").innerText;
          const description = document.querySelector(
            ".desc.side_wdg > p"
          )
            ? document.querySelector(".desc.side_wdg > p").innerText
            : "";
          const images = Array.from(
            document.querySelectorAll(".woocommerce-product-gallery__image img")
          ).map((img) => img.src);

          const sizes = Array.from(document.querySelectorAll(".sizes_atts.side_wdg ul li"))
            .map((li) => li.textContent.trim())
            .filter((size) => size.match(/^\d+$/));

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

  await new Promise((resolve, reject) => {
    fs.writeFile("Mobaco Collection.json", JSON.stringify(allItems, null, 2), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (options.download && options.downloadPath) {
    try {
      for (const [index, item] of allItems.entries()) {
        const formattedItem = {
          title: item.title,
          price: item.price,
          description: item.description,
          images: item.images,
          sizes: item.sizes,
          url: item.url
        };
        console.log(JSON.stringify(formattedItem, null, 2));

        for (const [imgIndex, imageUrl] of item.images.entries()) {
          const randomUUID = uuidv4();
          const imagePath = path.join(options.downloadPath, `image_${randomUUID}.JPEG`);
          try {
            await downloadImage(imageUrl, imagePath);
          } catch (error) {
            console.error(`Failed to download image ${imageUrl}: ${error.message}`);
          }
        }

        console.log("---------------------------");
      }
    } catch (error) {
      console.error("Error processing items:", error.message);
    }
  }

  await browser.close();
  return;
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
    throw error;
  }
}

module.exports = scrapMobaco;
