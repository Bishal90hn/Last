const axios = require('axios');
const cheerio = require('cheerio');
const { createProxyAgent } = require('./proxy');

async function scrapeFlipkart(category) {
  const categories = {
    grocery: 'https://www.flipkart.com/grocery-supermart-store',
    electronics: 'https://www.flipkart.com/electronics-store',
    fashion: 'https://www.flipkart.com/clothing-and-accessories-store',
  };

  try {
    const url = categories[category] || categories.grocery;
    const response = await axios.get(url, {
      httpsAgent: createProxyAgent(),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const $ = cheerio.load(response.data);
    const deals = [];

    // Example Flipkart scraping logic (adjust selectors based on Flipkart’s HTML)
    $('div._1AtVbE').each((i, elem) => {
      const title = $(elem).find('a._1fQZEK').attr('title') || 'No title';
      const price = $(elem).find('div._30jeq3').text() || 'N/A';
      const link = 'https://www.flipkart.com' + $(elem).find('a._1fQZEK').attr('href');
      const image = $(elem).find('img._396cs4').attr('src') || '';
      if (title && price && link) {
        deals.push({ title, price, link, image });
      }
    });

    return deals.slice(0, 5); // Limit to 5 deals per category
  } catch (error) {
    console.error(`Flipkart scraping error (${category}):`, error.message);
    return [];
  }
}

async function scrapeTelegramChannel(bot, channel) {
  try {
    const updates = await bot.telegram.getUpdates({ offset: -10 });
    const messages = updates
      .filter((update) => update.message?.chat?.username === channel || update.message?.chat?.id.toString() === channel)
      .map((update) => ({
        text: update.message.text || '',
        photo: update.message.photo?.[0]?.file_id || '',
        link: update.message.text?.match(/(https?:\/\/[^\s]+)/g)?.[0] || '',
      }));

    const deals = [];
    for (const msg of messages) {
      let image = msg.photo;
      if (!image && msg.link) {
        // Capture image from link if no photo
        try {
          const response = await axios.get(msg.link, { httpsAgent: createProxyAgent() });
          const $ = cheerio.load(response.data);
          image = $('meta[property="og:image"]').attr('content') || '';
        } catch (error) {
          console.error(`Image capture error for ${msg.link}:`, error.message);
        }
      }
      deals.push({
        text: msg.text,
        image,
        link: msg.link,
      });
    }
    return deals;
  } catch (error) {
    console.error(`Telegram scraping error (${channel}):`, error.message);
    return [];
  }
}

module.exports = { scrapeFlipkart, scrapeTelegramChannel };
