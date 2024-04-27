
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");


async function scrapBasiclook(options) {
  const urls = [
    "https://basiclook.com/collections/women", "https://basiclook.com/collections/men"
  ];
  const browser = await puppeteer.launch();
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    let nextPageUrl = url;

    while (nextPageUrl) {
      await page.goto(nextPageUrl);

      const productLinks = await page.evaluate(() => {
        const productElements = document.querySelectorAll(
          "#product-grid .card-product .relative a"
        );
        return Array.from(productElements).map((el) => el.href);
      });
      for (const itemUrl of productLinks) {
        await page.goto(itemUrl);

        const productDetails = await page.evaluate(() => {
          const title = document.querySelector("h1").innerText;
          const price = document.querySelector(".price__regular")
            ? document.querySelector(".price__regular").innerText
            : null;
          const descriptionContainer = document.querySelector(
            "#Complementary-0-menu-drawer .drawer__row .rte"
          );
          const description = Array.from(descriptionContainer.querySelectorAll("p"))
            .map((p) => p.innerText.trim())
            .join(" ");

          const imageElements = document.querySelectorAll(".swiper-slide .media--thumb img");
          const images = Array.from(imageElements).map((img) => img.src);
          const sizes = Array.from(
            document.querySelectorAll(
              ".product-selector__buttons[data-input-wrapper] ul.list-unstyled li input[name='options[Size]'] + label"
            )
          ).map((label) => label.innerText.trim());
          const colors = Array.from(
            document.querySelectorAll(
              ".product__swatches.swatches ul.list-unstyled li input[name='options[Color]']"
            )
          ).map((input) => input.value);

          return { title, price, description, images, sizes, colors };
        });
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

  fs.writeFile("basiclook Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) throw err;
    console.log("File saved");
  });

  await browser.close();
  return;
}

module.exports = scrapBasiclook;
