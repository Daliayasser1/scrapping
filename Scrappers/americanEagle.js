
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function scrapAmericanEagle() {
  const urls = [
    "https://www.ae.com/intl/en/c/women/t-shirts/graphic-tees/cat860018?pagetype=plp",
          "https://www.ae.com/intl/en/c/women/t-shirts/classic-t-shirts/cat600010?pagetype=plp",
          "https://www.ae.com/intl/en/c/women/tops/button-up-shirts/cat7670003?pagetype=plp",
          "https://www.ae.com/intl/en/c/women/tops/blouses/cat360002?pagetype=plp",
          "https://www.ae.com/intl/en/c/women/tops/hoodies-sweatshirts/cat90048?pagetype=plp",
          "https://www.ae.com/intl/en/c/women/sweaters-cardigans/view-all-sweaters-cardigans/cat2390001?pagetype=plp",
          "https://www.ae.com/intl/en/x/women/tops/oversized-tops?menu=cat4840004&pagetype=shp",
          "https://www.ae.com/intl/en/x/women/tops/oversized-tops?menu=cat4840004&pagetype=shp",
          "https://www.ae.com/us/en/x/men/featured/men-ae77-tops?menu=cat4840004&pagetype=shp",
          "https://www.ae.com/intl/en/c/men/tops/cat10025?pagetype=plp",
          "https://www.ae.com/intl/en/c/men/tops/t-shirts/cat90012?pagetype=plp",
          "https://www.ae.com/intl/en/c/men/tops/shirts/cat40005?pagetype=plp",
          "https://www.ae.com/intl/en/c/men/tops/hoodies-sweatshirts/cat90020?pagetype=plp",
          "https://www.ae.com/intl/en/c/men/tops/polos/cat510004?pagetype=plp",
          "https://www.ae.com/us/en/x/men/featured/men-ae77-jackets?menu=cat4840004&pagetype=shp",
  ];

  const browser = await puppeteer.launch({ headless: true });
  let allItems = [];

  for (const url of urls) {
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });

    // Scroll to ensure all products are loaded
    await autoScroll(page);
    const itemUrls = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(".tile-media._media_t6pdgs._tile-media_1d4brf a")
      ).map((link) => link.href);
    });

    for (const itemUrl of itemUrls) {
      console.log(itemUrl);
      const itemPage = await browser.newPage();
      await itemPage.goto(itemUrl, { timeout: 60000 });

      // Ensure size dropdown is interacted with to load sizes, if necessary
      const isDropdownVisible = await itemPage.$(".dropdown-menu._dropdown-view_172ryf");
      if (!isDropdownVisible) {
        try {
          await itemPage.waitForSelector(".dropdown-toggle._dropdown-toggle_172ryf", {
            visible: true,
            timeout: 30000,
          });

          await itemPage.click(".dropdown-toggle._dropdown-toggle_172ryf");
          await itemPage.waitForSelector(".dropdown-menu._dropdown-view_172ryf", { visible: true });
        } catch (error) {
          continue;
        }
      }

      const itemData = await itemPage.evaluate(() => {
        const title = document.querySelector("h1")?.innerText || "No title";
        //const priceElement = document.querySelector("._psp-extras_xoau9b ");
        const priceElements = document.querySelectorAll(".product-prices._container_16k42b");
        priceElements.forEach((element) => {
          console.log(element.innerText); // Outputs the text of each matching element
        });

        const description =
          document.querySelector("dropdown-menu _dropdown-view_172ryf")?.innerText ||
          "No description";
        const images = Array.from(document.querySelectorAll("picture img")).map((img) => img.src);

        // Get available sizes

        const sizes = Array.from(
          document.querySelectorAll(".dropdown-menu._dropdown-view_172ryf li")
        ).map((li) => li.textContent.trim());
        // Get colors
        const colors = Array.from(
          document.querySelectorAll(".product-swatches [data-test-color-swatch] img")
        ).map((img) => img.alt);
        return {
          title,
          priceElement: `${priceElements[0].innerText}`,
          images,
          sizes,
          colors,
          description,
          url: window.location.href,
        };
      });

      console.log(itemData);
      allItems.push(itemData);
      await itemPage.close();
    }

    await page.close();
  }

  fs.writeFileSync("American Eagle Collection.json", JSON.stringify(allItems, null, 2), (err) => {
    if (err) console.error("Error saving file:", err);
    else console.log("File saved successfully.");
  });

  await browser.close();
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function downloadImage(imageUrl, imagePath) {
  const response = await axios({
    url: imageUrl,
    method: "GET",
    responseType: "stream",
  });
  const writer = fs.createWriteStream(imagePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

module.exports = scrapAmericanEagle;

