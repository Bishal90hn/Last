const Telegraf = require('telegraf');
const config = require('./config');
const { scrapeFlipkart, scrapeTelegramChannels } = require('./scraper');

const bot = new Telegraf(config.botToken);

bot.start((ctx) => ctx.reply('Bot started!'));

async function postDeals() {
  const flipkartDeals = await scrapeFlipkart(); // 3 डील्स, 30 मिनट डिले के साथ
  const channelDeals = await scrapeTelegramChannels(); // 9 डील्स
  const allDeals = [...flipkartDeals, ...channelDeals].slice(0, 12); // कुल 12 पोस्ट्स

  for (let deal of allDeals) {
    let message = `🔥 *Loot Deal Alert!*\n${deal.title || deal.link}\nPrice: ${deal.price || 'Check Link'}\nSource: Hidden Channel\nClick: ${deal.link || 'N/A'}`;
    await bot.telegram.sendMessage(config.channelId, message, { parse_mode: 'Markdown' });
    await new Promise(resolve => setTimeout(resolve, 2000)); // पोस्ट के बीच 2 सेकंड डिले
  }
}

setInterval(postDeals, 24 * 60 * 60 * 1000); // हर 24 घंटे में पोस्ट
postDeals(); // पहली बार तुरंत पोस्ट

bot.launch();
console.log('Bot is running...');
