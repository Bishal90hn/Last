require('dotenv').config();
const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const axios = require('axios');
const cheerio = require('cheerio');

// यूजर-एजेंट लिस्ट (मानव जैसा व्यवहार के लिए)
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
];

// रैंडम यूजर-एजेंट चुनने की फंक्शन
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Bot और कॉन्फ़िगरेशन
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

// टेक्स्ट को साफ करने की फंक्शन
function cleanText(text) {
  let cleaned = text.replace(/@[\w]+/g, '').replace(/#[\w]+/g, '').trim();
  return `🔥 *Super Deal Alert!* 🔥\n\n${cleaned}\n\n🛒 Grab it now before it’s gone! #DeelDhamaka`;
}

// Flipkart से डील स्क्रैप करना
async function scrapeFlipkart(category) {
  const categories = {
    grocery: 'https://www.flipkart.com/grocery-supermart-store',
    electronics: 'https://www.flipkart.com/electronics-store',
    fashion: 'https://www.flipkart.com/clothing-and-accessories-store',
  };

  try {
    const url = categories[category] || categories.grocery;
    const userAgent = getRandomUserAgent();
    const response = await axios.get(url, {
      headers: { 'User-Agent': userAgent },
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

    // 5 सेकंड का डिले, ब्लॉकिंग से बचने के लिए
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return deals.slice(0, 5); // 5 डील्स प्रति कैटेगरी
  } catch (error) {
    console.error(`Flipkart scraping error (${category}):`, error.message);
    return [];
  }
}

// Telegram चैनल से डील स्क्रैप करना
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
          const userAgent = getRandomUserAgent();
          const response = await axios.get(msg.link, {
            headers: { 'User-Agent': userAgent },
          });
          const $ = cheerio.load(response.data);
          image = $('meta[property="og:image"]').attr('content') || '';
        } catch (error) {
          console.error(`Image capture error for ${msg.link}:`, error.message);
        }
      }
      deals.push({ text: msg.text, image, link: msg.link });
    }
    return deals;
  } catch (error) {
    console.error(`Telegram scraping error (${channel}):`, error.message);
    return [];
  }
}

// डील पोस्ट करना
async function postDeals() {
  try {
    let allDeals = [];

    // Flipkart से डील्स
    for (const category of categories) {
      const deals = await scrapeFlipkart(category);
      allDeals.push(...deals.map((deal) => ({
        text: `${deal.title} at ${deal.price}`,
        image: deal.image,
        link: deal.link,
      })));
    }

    // Telegram चैनल से डील्स
    for (const channel of telegramChannels) {
      const deals = await scrapeTelegramChannel(bot, channel);
      allDeals.push(...deals);
    }

    // 10-12 रैंडम डील्स चुनें
    allDeals = allDeals.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 10);

    // डील्स पोस्ट करें
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
      // पोस्ट के बीच 3 सेकंड का डिले, रेट लिमिट से बचने के लिए
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('Error in postDeals:', error.message);
  }
}

// रोज़ सुबह 10 बजे (IST) डील्स पोस्ट करने का शेड्यूल
schedule.scheduleJob('0 10 * * *', postDeals);

// Bot शुरू करें
bot.launch().then(() => console.log('Bot started successfully'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
