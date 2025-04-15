const axios = require('axios');
const cheerio = require('cheerio');
const config = require('./config');

async function scrapeFlipkart() {
  try {
    const response = await axios.get('https://www.flipkart.com/', {
      proxy: {
        host: config.proxy.host,
        port: config.proxy.port,
        protocol: config.proxy.protocol
      }
    });
    const $ = cheerio.load(response.data);
    const deals = [];
    $('div._2kHMtA').each((i, el) => {
      const title = $(el).find('a._2UzuFa').text();
      const price = $(el).find('div._1vC4OE').text();
      deals.push({ title, price });
    });
    await new Promise(resolve => setTimeout(resolve, 1800000)); // 30 मिनट का डिले
    return deals.slice(0, 3); // 3 डील्स Flipkart से
  } catch (error) {
    console.log('Flipkart scraping error:', error);
    return [];
  }
}

async function scrapeTelegramChannels() {
  const channels = [
    'https://t.me/+AdUPh392S6xhNmY1',
    'https://t.me/bigsavings_lootdeals',
    'https://t.me/Loot_DealsX',
    'https://t.me/+Th6aG5Zaxz_i_u7a',
    'https://t.me/TrickXpert',
    'https://t.me/+LNRQ0Y1-9RkzZDRl'
  ];
  const deals = [];
  for (let channel of channels) {
    deals.push({ link: channel, title: 'Loot Deal from Hidden Channel' });
  }
  return deals.slice(0, 9); // 9 डील्स Telegram से
}

module.exports = { scrapeFlipkart, scrapeTelegramChannels };
