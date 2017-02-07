const Telegraf = require('telegraf')
const { Telegram } = require('telegraf')
var request = require('request')
var getTodayTweets = require('./twitterService')
var schedule = require('node-schedule')

const BOT_TOKEN = process.env.BOT_TOKEN
const LUIS_SUBSCRIPTION_KEY = process.env.LUIS_SUBSCRIPTION_KEY
const luis_url = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/4773266f-c31e-4bc2-b973-b6ac04a22601?subscription-key='+ LUIS_SUBSCRIPTION_KEY +'&q='

const app = new Telegraf(BOT_TOKEN)
const telegram = new Telegram(BOT_TOKEN)

const CHAT_ID = -197428130;

app.command('start', (ctx) => {
  console.log('start', ctx.from)
  ctx.reply('Welcome!')
})
let intervalId;
var j = schedule.scheduleJob('* 12 * * *', function(){
  console.log('se produce el job')
  intervalId = setInterval(() => getTodayTweets().then(t => {
    if(t && t.length > 0) {
      let today_tweets = t.join("\n")
      telegram.sendMessage(CHAT_ID, 'Ahi os mando el menu...')
      telegram.sendMessage(CHAT_ID, today_tweets)
      clearTweetsInterval()
    }
  }),60000)
});

function clearTweetsInterval() {
  clearInterval(intervalId)
}

app.on('message', (ctx) => {

  const msg = ctx.update.message.text  
  const encoded_msg = encodeURIComponent(msg)  
  let ask_luis_url = luis_url + encoded_msg

  request(ask_luis_url, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      try {
        const resp = JSON.parse(body);
        if(resp.topScoringIntent.intent === 'GetTheMenu') {
          ctx.reply('Ahora te mando el menu...')
          getTodayTweets()
			      .then(t => ctx.reply((t && t.length > 0) ? t.join("\n") : "Todavia no han publicado"))
        }
        else {
          ctx.reply('No se que quieres decir con ' + resp.query)
        }
      }
      catch(e) {
        console.error(e)
        ctx.reply('Ha habido un error...' + e)
      }      
    }
  })
  
})

app.startPolling()
