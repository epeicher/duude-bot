const Telegraf = require('telegraf')
const { Telegram, Extra, Markup } = require('telegraf')
var request = require('request')
var getTodayTweets = require('./twitterService')
var schedule = require('node-schedule')
var util = require('util')

const BOT_TOKEN = process.env.BOT_TOKEN
const LUIS_SUBSCRIPTION_KEY = process.env.LUIS_SUBSCRIPTION_KEY
const luis_url = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/4773266f-c31e-4bc2-b973-b6ac04a22601?subscription-key='+ LUIS_SUBSCRIPTION_KEY +'&q='

const app = new Telegraf(BOT_TOKEN)
const telegram = new Telegram(BOT_TOKEN)

const CHAT_ID = -197428130;
const DATE_STARTED = new Date()
const MODE_ANSWER = 0
const MODE_STORE = 1

app.command('start', (ctx) => {
  console.log('start', ctx.from)
  ctx.reply('Welcome!')
})

let state = MODE_ANSWER
let menuList = {};

schedule.scheduleJob('0 11 * * 1-5', function() {
  console.log('se produce el job')
  let intervalId = setInterval(() => getTodayTweets().then(t => {
    if(t && t.length > 0) {
      let today_tweets = t.join("\n")
      telegram.sendMessage(CHAT_ID, 'Ahi os mando el menu...\n\n' + today_tweets + '\n\nElige mesa: ', getKeyboard())
      state = MODE_STORE
      menuList = {}
      clearInterval(intervalId)
      setTimeout(function(){
        telegram.sendMessage(CHAT_ID, 'En 5 minutos mando el menu ar Dani')        
        setTimeout(function(){
          telegram.sendMessage(CHAT_ID, 'He mandado el siguiente menu\n',formatMenu(menuList))
          state = MODE_ANSWER
        }, 5*60*1000)
      },40*60*1000)
    }
  }).catch(e => console.log('error',e)),60000)
});

function formatRow(row) {
  console.log(JSON.stringify(row))
  return JSON.stringify(row)
}

function formatMenu(raw) {
  let menu = '';
  Object.keys(raw).forEach(function(e) { menu += util.format("[%s]: '%s'%s",e,formatRow(raw[e]),'\n')})
  return menu;
}

app.action(/.+/, (ctx) => {
  const user = ctx.update.callback_query.from.first_name
  menuList[ctx.from.first_name] = Object.assign(menuList[ctx.from.first_name] || {}, {mesa:ctx.match[0]})
	ctx.reply('Menu actualizado a \n' + formatMenu(menuList));
  return ctx.answerCallbackQuery(`El amigo ${user} ha pulsado ${ctx.match || ctx.match[0]}`)
})

app.on('message', (ctx) => {

  const msg = ctx.update.message.text  

  console.log('Received the message', msg);
  console.log('The state is', state);  

  if(state === MODE_ANSWER) {

    getTodayTweets().
      then(t => ctx.reply((t && t.length > 0) ? t.join("\n") : "Todavia no han publicado")).
      catch(e => console.log('Error recuperando los tweets', e))

  } else if (state === MODE_STORE) {

    const user = ctx.from.first_name
    menuList[user] = Object.assign(menuList[user] || {},{menu: msg})
    ctx.reply('Menu actualizado a \n' + formatMenu(menuList));

    return ctx.reply('Elige mesa: ', getKeyboard())
  }
})

function getKeyboard() {
  return Extra.HTML().markup((m) =>
      m.inlineKeyboard([
        m.callbackButton('Mesa 1', 'Mesa 1'),
        m.callbackButton('Mesa 2', 'Mesa 2'),
        m.callbackButton('Mesa 3', 'Mesa 3'),
        m.callbackButton('Mesa 4', 'Mesa 4')
    ]))
}

app.startPolling()
