
const DB = require(`./database`); // ИМПОРТ ФАЙЛА, ГДЕ ПОДКЛЮЧАЕТСЯ БД
require('dotenv').config(); // ИМПОРТ КОНФИГА С ТОКЕНОМ, MONGODB URI и т.д.
const promptsKeyboard = require('./keyboards/promptsKeyboard');
const moneyKeyboard = require('./keyboards/moneyKeyboard');

// ПОДКЛЮЧАЮ БД
(async function main() { 
    await DB.initialize();
})();



// const express = require('express');
// const mongoose = require('mongoose');
// const { createServer } = require('http');
// const app = express();
// const port = 3000;

// mongoose.connect('mongodb+srv://igor:admin123@cluster0.t0vcb.mongodb.net/questions?retryWrites=true&w=majority', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// .then(() => {
//     console.log('MongoDB connected');
// })
// .catch(err => {
//     console.log(err);
// });

// const userSchema = new mongoose.Schema({
//     name:{
//         type: String,
//         required: true,
//     },
//     email:{
//         type: String,
//         required: true,
//     }
// });

// const Users = mongoose.model('Users', userSchema);

// app.get('/', (req, res) => {
//     Users.create({ 
//         name: 'Igor2',
//         email: 'satafakapchannel@gmail.com',
//     })
//     .then(user => {
//         res.send(user);

//     })
//     .catch(err => res.send(err));
// });

// const server = createServer(app);
// server.listen(port, () => console.log(`server is up. port: ${port}`));

const {
    Telegraf,
    Telegram
} = require('telegraf');

const {
    Keyboard, // импорт клавиатуры
    Key // импорт кнопки от клавиатуры
} = require('telegram-keyboard');
const e = require('express');
const {
    secondLife
} = require('./keyboards/promptsKeyboard');
 
const bot = new Telegraf(process.env.TOKEN);

bot.help((ctx) => ctx.reply('ВСЕ КОМАНДЫ КОТОРЫЕ ЕСТЬ')); // реакция на help

bot.launch(); // запуск бота 

bot.use((ctx, next) => {
    console.log(promptsKeyboard.fiftyFifty.isActive);
    
    next();
});

function refresh() {
    questionCount = 1;
    passedQuestions = [];
    currentQuestion = '';
    currentAnswers = [];  
    correctAnswer = '';
    questionLvl = '';
    lastMessageId = '';
    mainMessageId = '';
    isInGame = false;

    promptsKeyboard.fiftyFifty.isActive = true;
    promptsKeyboard.secondLife.isActive = true;
    promptsKeyboard.changeQuestion.isActive = true;
}

// РЕАКЦИЯ НА КОМАНДУ /start
bot.action('try_again', (ctx) => {
    setTimeout(() => {
        DB.addOrRefreshUser(ctx.update.callback_query.from.id, ctx.update.callback_query.from.first_name); 
        start(ctx);
    }, 3000);
});

bot.start(async (ctx) => {
    setTimeout(() => {
        DB.addOrRefreshUser(ctx.message.from.id, ctx.message.from.first_name);
        start(ctx);
    }, 3000);
}); 

async function start(ctx) {
    if (mainMessageId != null && mainMessageId != undefined && mainMessageId != '' && mainMessageId != 'string') {
        ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    }
    if (lastMessageId != null && lastMessageId != undefined && lastMessageId != '' && lastMessageId != 'string') {
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    }
    refresh();
    const keyboardInline = Keyboard.make([
        Key.callback('Сыграть!', 'pick_sum')
    ]);

    lastMessageId = await ctx.reply('Хотите сыграть в игру "Кто Хочет Стать Миллионером"?', keyboardInline.inline()); // под это сообщение помещаем инлайн-кнопку 
}

bot.action('pick_sum', async (ctx) => {
    ctx.deleteMessage();
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply()); // ПОДКЛЮЧАЕМ КЛАВИАТУРУ ИЗ promptsKeyboards.js
    setTimeout(async () => {
        lastMessageId = await ctx.reply('Выберите несгораемую сумму:', moneyKeyboard.keyboard.inline());
    }, 300);
});
bot.action('pick_sum_again', async ctx => {
    ctx.deleteMessage();
    lastMessageId = await ctx.reply('Выберите несгораемую сумму:', moneyKeyboard.keyboard.inline());
});



// ПОДСКАЗКИ (bot.on перекрывает bot.hears)
bot.on('text', async ctx => {
    // ЕСЛИ НАЖАЛ НА 50/50
    if (ctx.update.message.text == '50/50' && promptsKeyboard.fiftyFifty.isActive == true && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
        isInGame = false;
        const keyboard = Keyboard.make([
            Key.callback('Да', 'fiftyFifty_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });
        ctx.replyWithHTML('Вы уверены, что хотите взять подсказку <b>50/50</b>?', keyboard.inline());
    }
    // ЕСЛИ НАЖАЛ НА Право на ошибку
    else if (ctx.update.message.text == 'Право на ошибку' && promptsKeyboard.secondLife.isActive == true && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
        isInGame = false;
        const keyboard = Keyboard.make([
            Key.callback('Да', 'secondLife_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });
        ctx.replyWithHTML('Вы уверены, что хотите взять подсказку <b>Право на ошибку</b>?', keyboard.inline());
    }
    // ЕСЛИ НАЖАЛ НА Поменять вопрос
    else if (ctx.update.message.text == 'Поменять вопрос' && promptsKeyboard.changeQuestion.isActive == true && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
        isInGame = false;
        const keyboard = Keyboard.make([
            Key.callback('Да', 'change_question_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });
        ctx.replyWithHTML('Вы уверены, что хотите <b>Поменять вопрос</b>?', keyboard.inline());
    }
    // ЕСЛИ НАЖАЛ НА Забрать деньги
    else if (ctx.update.message.text == 'Забрать деньги' && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
        isInGame = false;
        const keyboard = Keyboard.make([
            Key.callback('Да', await DB.getUserData(ctx.message.from.id, 'questionCount') == 1 ? 'take_money_yes_alert' : 'take_money_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        ctx.replyWithHTML('Вы уверены, что хотите <b>Забрать деньги</b>?', keyboard.inline());

    } else {
        ctx.deleteMessage(); // УДАЛЯЕТ ВСЕ ЛИШНИЕ СООБЩЕНИЯ ОТ ПОЛЬЗОВАТЕЛЯ
    }
});

// ЭКШНЫ НА ПОДСКАЗКУ 50/50
bot.action('fiftyFifty_yes', async ctx => {
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');  ////////////////////////////////////////////////////////////
    
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    promptsKeyboard.fiftyFifty.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());
    let random = []; 
    let randomNumber = Math.floor(Math.random() * 3);
    currentAnswers.forEach((el, i) => {
        if (el != correctAnswer) {
            random.push(currentAnswers[i]);
        } 
        if (el != correctAnswer && el != random[randomNumber]) {
            currentAnswers[i] = ' '; 
            
        } 
    });   
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');

    lastMessageId = await ctx.replyWithHTML(
            moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + 
            '\n' +
            '________________________________________________' +
            '\n\n' +
            'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' +
            '\n\n' + 
            currentQuestion, 
        promptsKeyboard.defaultAnswersKeyboard(currentAnswers).inline() 
    );

    isInGame = true;
}); 

bot.action('say_no', async ctx => {
   
    ctx.deleteMessage();
    
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    
    lastMessageId = await ctx.replyWithHTML(
            moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + 
            '\n' +
            '________________________________________________' +
            '\n\n' +
            'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' +
            '\n\n' + 
            currentQuestion, 
        promptsKeyboard.defaultAnswersKeyboard(currentAnswers).inline()
    );
    
    isInGame = true;

});

// ЭКШНЫ НА ПОДСКАЗКУ Право на ошибку    
bot.action('secondLife_yes', async ctx => {
    isSecondLife = true;
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    promptsKeyboard.secondLife.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());

    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    
    lastMessageId = await ctx.replyWithHTML(
            moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + 
            '\n' +
            '________________________________________________'+
            '\n\n' +
            'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>): '+
            '\n\n' + 
            currentQuestion, 
        promptsKeyboard.defaultAnswersKeyboard(currentAnswers).inline()
    );
    
    isInGame = true;
});

// ЭКШНЫ НА ПОДСКАЗКУ Поменять вопрос
bot.action('change_question_yes', async ctx => {
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    promptsKeyboard.changeQuestion.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());
    let message = await ctx.replyWithHTML('Вопрос меняется. \n\nПодождите немного...');
    setTimeout(() => {
        ctx.deleteMessage(message.message_id, message.chat.id);
        pickRandomQuestion(ctx);
    }, 3000);
});

// ЭКШНЫ НА ПОДСКАЗКУ Забрать деньги
bot.action('take_money_yes', async ctx => {
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);

    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());
    const keyboard = Keyboard.make([
        Key.callback('Сыграть еще раз', 'try_again')
    ]);
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    lastMessageId = await ctx.replyWithHTML(`Вы забрали <code>${moneyKeyboard.money[questionCount-2]}</code>`, keyboard.inline());
});
bot.action('take_money_yes_alert', async ctx => {
    ctx.answerCbQuery('Нечего забирать!');
});

let questionCount = 1; // номер вопроса
let passedQuestions = []; // текста вопросов, которые уже были
let currentQuestion = ''; // текст текущего вопроса
let currentAnswers = []; // текущие варианты ответа

let correctAnswer = ''; // текст правильного ответа
let pickedAnswer = ''; // текст выбранного ответа 
let questionLvl; // текущий уровень вопросов
let lastMessageId = ''; // последнее сообщение
let mainMessageId = ''; // главное сообщение
let isInGame = false; // флажок состояния игры для подсказок 
let isSecondLife = false; // работает ли подсказка право на ошибку

async function pickRandomQuestion(ctx) {
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    isSecondLife = false;
    if (questionCount <= 2) {
        questionLvl = DB.questionsLvl0;
        createQuestion(DB.questionsLvl0, ctx);
    } else if (questionCount > 2 && questionCount <= 5) {
        questionLvl = DB.questionsLvl1;
        createQuestion(DB.questionsLvl1, ctx);
    } else if (questionCount > 5 && questionCount <= 10) {
        questionLvl = DB.questionsLvl2;
        createQuestion(DB.questionsLvl2, ctx);
    } else if (questionCount > 10) {
        questionLvl = DB.questionsLvl3;
        createQuestion(DB.questionsLvl3, ctx);
    }
}

// ВЫБОР ВОПРОСА ИЗ БД
function createQuestion(lvl, ctx) {
    lvl.find({}).exec(async (err, res) => {
        if (err) {
            console.log(err);
        } else {
            let random = Math.floor(Math.random() * res.length); 
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentQuestion', res[random].question);
            const passedQuestions = await DB.getUserData(ctx.update.callback_query.from.id, 'passedQuestions'); 
            const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
            console.log(passedQuestions);
            if (!passedQuestions.includes(currentQuestion)) {
                DB.updateUserData('push', ctx.update.callback_query.from.id, 'passedQuestions', currentQuestion);
                drawQuestionKeyboard(ctx);
            } else {
                console.log('повторился вопрос: ' + currentQuestion);
                pickRandomQuestion(ctx); 
            }
        }
    });
}

// ПОКАЗ ВОПРОСА НА ЭКРАН 
async function drawQuestionKeyboard(ctx) {
    currentAnswers = [];
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    questionLvl.find({
        question: currentQuestion
    }, async (err, res) => {
        if (err) {
            console.log(err);
        } else {
            correctAnswer = res[0].answers[0];
            shuffle(res[0].answers);
            res[0].answers.forEach((el, i) => {
                currentAnswers.push(el);
            });

            console.log(correctAnswer);
            
            lastMessageId = await ctx.replyWithHTML(
                    moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + 
                    '\n' +
                    '________________________________________________' +
                    '\n\n' +
                    'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' + 
                    '\n\n' + currentQuestion, 
                promptsKeyboard.defaultAnswersKeyboard(currentAnswers).inline()
            );
            isInGame = true;
        }

    });
}



bot.on('callback_query', async ctx => {  
    // ПРОВЕРКА ПРАВИЛЬНОСТИ ОТВЕТА
    if (currentAnswers.includes(ctx.update.callback_query.data)) {
        pickedAnswer = ctx.update.callback_query.data;

        if (ctx.update.callback_query.data != ' ') {
            ctx.deleteMessage();
        }
 
        if (correctAnswer == ctx.update.callback_query.data) {
            let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
            questionCount++; 
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'questionCount', questionCount);
            if (questionCount == 16) {
                lastMessageId = await ctx.replyWithHTML('Вы победили! Ваш выигрыш: <code>3 000 000 рублей!</code>');
                isInGame = false;
            } else {
                let message = await ctx.replyWithHTML('И это правильный ответ! \nВаш выигрыш составляет <code>' + (moneyKeyboard.money[questionCount - 2]) + '</code>\n\nПереходим к следующему вопросу...');
                isInGame = false;
                setTimeout(() => {  
                    ctx.deleteMessage(message.message_id, message.chat.id);
                    pickRandomQuestion(ctx);
                }, 3000);
            }

            // ЕСЛИ НЕПРАВИЛЬНЫЙ ОТВЕТ
        } else if (currentAnswers.includes(ctx.update.callback_query.data) && ctx.update.callback_query.data != ' ' && ctx.update.callback_query.data != correctAnswer) {
            // ЕСЛИ ДЕЙСТВУЕТ ПОДСКАЗКА Право на ошибку
            if (isSecondLife) {
                
                const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
                const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
                lastMessageId = await ctx.replyWithHTML(
                        moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + 
                        '\n' +
                        '________________________________________________' +
                        '\n\n' +
                        'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' +
                        '\n\n' + currentQuestion, 
                    promptsKeyboard.secondLifeKeyboard(currentAnswers, pickedAnswer).inline()
                );
                isInGame = true;
                isSecondLife = false;

                                     
            }
            // ЕСЛИ НЕ ДЕЙСТВУЕТ ПОДСКАЗКА Право на ошибку
            else {
                isInGame = false; 
                
                let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
                let gain; 
                let pickedMoney = moneyKeyboard.pickedMoney.replace(/\s+/g, '');
                let currentMoney = moneyKeyboard.money[questionCount-1].replace(/\s+/g, '');
                if(parseInt(currentMoney) > parseInt(pickedMoney)){
                    gain = moneyKeyboard.pickedMoney;
                } else {
                    gain = '0 руб.';
                }
                lastMessageId = await ctx.replyWithHTML(`И это неправильный ответ. Вы проиграли!\n\nВаш выигрыш: <code>${gain}</code>`, promptsKeyboard.luseKeyboard(currentAnswers, pickedAnswer, correctAnswer).inline());

    
            }
        } 
    }

    // ЗАПОМИНАЮ НЕСГОРАЕМУЮ СУММУ
    if (moneyKeyboard.money.includes(ctx.update.callback_query.data)) {
        ctx.deleteMessage();
        if (ctx.update.callback_query.data == moneyKeyboard.money[moneyKeyboard.money.length - 1]) {
            const keyboard = Keyboard.make([
                Key.callback('Выбрать другую сумму', 'pick_sum_again')
            ]);
            ctx.reply('Вы не можете выбрать эту сумму. \nПопробуйте снова.', keyboard.inline());
        } else {
            moneyKeyboard.pickedMoney = ctx.update.callback_query.data;
            let message = await ctx.replyWithHTML('Ваша несгораемая сумма: <code>' + moneyKeyboard.pickedMoney + '</code> \n\nИгра начинается...');

            setTimeout(() => {
                ctx.deleteMessage(message.message_id, message.chat.id);
                pickRandomQuestion(ctx);
            }, 3000);
        }
    }
});





// ФУНКЦИЯ, КОТОРАЯ МЕРЕМЕШИВАЕТ ЭЛЕМЕНТЫ МАССИВА
function shuffle(arr) {
    let j;
    let temp;
    for (let i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[j];
        arr[j] = arr[i];
        arr[i] = temp;
    }
    return arr;
}
 

