
require('dotenv').config();
const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const axios = require('axios');
const cheerio = require('cheerio');
const Agent = require('socks5-http-client/lib/Agent');

// Proxy Configuration
const proxyList = [
  { host: 'proxy1.example.com', port: 1080, username: 'user1', password: 'pass1' }, // Replace with real proxies
  { host: 'proxy2.example.com', port: 1080, username: 'user2', password: 'pass2' }, // Replace with real proxies
];

function getRandomProxy() {
  if (proxyList.length === 0) return null;
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}

function createProxyAgent() {
  const proxy = getRandomProxy();
  if (!proxy) return null;
  return new Agent({
    socksHost: proxy.host,
    socksPort: proxy.port,
    socksUsername: proxy.username,
    socksPassword: proxy.password,
  });
}

// Scraping Functions
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

// Bot Logic
const bot = new Telegraf(process.env.BOT_TOKEN);
const channelId = process.env.CHANNEL_ID || '@DeelDhamaka3';
const categories = ['grocery', 'electronics', 'fashion'];
const telegramChannels = [
  '@bigsavings_lootdeals',
  '@Loot_DealsX',
  '@TrickXpert',
  '@LNRQ0Y1-9RkzZDRl',
  '@Th6aG5Zaxz_i_u7a',
];

function cleanText(text) {
  let cleaned = text.replace(/@[\w]+/g, '').replace(/#[\w]+/g, '').trim();
  return `🔥 *Super Deal Alert!* 🔥\n\n${cleaned}\n\n🛒 Grab it now before it’s gone! #DeelDhamaka`;
}

async function postDeals() {
  try {
    let allDeals = [];

    for (const category of categories) {
      const deals = await scrapeFlipkart(category);
      allDeals.push(...deals.map((deal) => ({
        text: `${deal.title} at ${deal.price}`,
        image: deal.image,
        link: deal.link,
      })));
    }

    for (const channel of telegramChannels) {
      const deals = await scrapeTelegramChannel(bot, channel);
      allDeals.push(...deals);
    }

    allDeals = allDeals.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 10);

    for (const deal of allDeals) {
      const caption = cleanText(deal.text + (deal.link ? `\n${deal.link}` : ''));
      try {
        if (deal.image && deal.image.startsWith('http')) {
          await bot.telegram.sendPhoto(channelId, deal.image, { caption, parse_mode: 'Markdown' });
        } else if (deal.image) {
          await bot.telegram.sendPhoto(channelId, { source: deal.image }, { caption, parse_mode: 'Markdown' });
        } else {
          await bot.telegram.sendMessage(channelId, caption, { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error(`Error posting deal: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('Error in postDeals:', error.message);
  }
}

schedule.scheduleJob('0 10 * * *', postDeals);

bot.launch().then(() => console.log('Bot started successfully'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
