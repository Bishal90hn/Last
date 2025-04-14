require('dotenv').config();
const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const { scrapeFlipkart, scrapeTelegramChannel } = require('./scraper');

const bot = new Telegraf(process.env.BOT_TOKEN);
const channelId = process.env.CHANNEL_ID || '@DeelDhamaka3';
const categories = ['grocery', 'electronics', 'fashion'];
const telegramChannels = [
  '@bigsavings_lootdeals',
  '@Loot_DealsX',
  '@TrickXpert',
  '@LNRQ0Y1-9RkzZDRl',
  '@Th6aG5Zaxz_i_u7a',
  // Add more channels if needed
];

function cleanText(text) {
  // Remove channel names and unwanted text
  let cleaned = text.replace(/@[\w]+/g, '').replace(/#[\w]+/g, '').trim();
  // Add professional touch
  return `🔥 *Super Deal Alert!* 🔥\n\n${cleaned}\n\n🛒 Grab it now before it’s gone! #DeelDhamaka`;
}

async function postDeals() {
  try {
    let allDeals = [];

    // Scrape Flipkart
    for (const category of categories) {
      const deals = await scrapeFlipkart(category);
      allDeals.push(...deals.map((deal) => ({
        text: `${deal.title} at ${deal.price}`,
        image: deal.image,
        link: deal.link,
      })));
    }

    // Scrape Telegram channels
    for (const channel of telegramChannels) {
      const deals = await scrapeTelegramChannel(bot, channel);
      allDeals.push(...deals);
    }

    // Shuffle and limit to 10-12 deals
    allDeals = allDeals.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 10);

    // Post deals
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
      // Delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('Error in postDeals:', error.message);
  }
}

// Schedule posts every day at 10 AM IST
schedule.scheduleJob('0 10 * * *', postDeals);

// Start bot
bot.launch().then(() => console.log('Bot started'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
