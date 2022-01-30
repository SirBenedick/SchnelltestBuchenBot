const TelegramBot = require('node-telegram-bot-api');
const { bookTicket } = require("./booking_gewandhaus");
const d = new Date();
const date = d.getMonth() + "-" +d.getDay() + "-" + d.getHours() + "-" + d.getMinutes()
const log = require('simple-node-logger').createSimpleFileLogger(date + '.log');
require('dotenv').config()
log.info("Starting booking bot")

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN, { polling: true });

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  console.log(chatId + ": /echo")

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Matches "/echo [whatever]"
bot.onText(/\/buchen/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  log.info(chatId + ": /buchen")

  bookTicket(bot, chatId)
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  log.info(chatId + ": " + msg.text)
});