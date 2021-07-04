const config = require('./config.json'); // ИМПОРТ КОНФИГА С ТОКЕНОМ, MONGODB URI и т.д.
const DB = require(`./database`); // ИМПОРТ ФАЙЛА, ГДЕ ПОДКЛЮЧАЕТСЯ БД
const promptsKeyboard = require('./keyboards/promptsKeyboards');
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
} = require('./keyboards/promptsKeyboards');

const bot = new Telegraf(config.token);

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
        DB.addOrRefreshUser(ctx);
        start(ctx);
    }, 3000);
});

bot.start(async (ctx) => {
    console.log(ctx);
    setTimeout(() => {
        DB.addOrRefreshUser(ctx);
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
            Key.callback('Да', questionCount == 1 ? 'take_money_yes_alert' : 'take_money_yes'),
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
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    promptsKeyboard.fiftyFifty.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());
    let random = [];
    let randomNumber = Math.floor(Math.random() * 3);
    currentAnswers.forEach((el, i) => {
        if (el == correctAnswer) {
            el = correctAnswer;
        } else {
            random.push(currentAnswers[i]);
        }
    });
    currentAnswers.forEach((el, i) => {
        if (el == correctAnswer || el == random[randomNumber]) {
            el = correctAnswer;
        } else {
            currentAnswers[i] = ' ';
        }
    });
    const keyboard = Keyboard.make([
        Key.callback(currentAnswers[0] == ' ' ? ' ' : 'A) ' + currentAnswers[0], currentAnswers[0]),
        Key.callback(currentAnswers[1] == ' ' ? ' ' : 'B) ' + currentAnswers[1], currentAnswers[1]),
        Key.callback(currentAnswers[2] == ' ' ? ' ' : 'C) ' + currentAnswers[2], currentAnswers[2]),
        Key.callback(currentAnswers[3] == ' ' ? ' ' : 'D) ' + currentAnswers[3], currentAnswers[3])
    ], {
        columns: 1
    });
    lastMessageId = await ctx.replyWithHTML(moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + '\n________________________________________________\n\nВопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>): \n\n' + currentQuestion, keyboard.inline());
    isInGame = true;
});

bot.action('say_no', async ctx => {
   
    ctx.deleteMessage();
    const keyboard = Keyboard.make([
        Key.callback(currentAnswers[0] == ' ' ? ' ' : 'A) ' + currentAnswers[0], currentAnswers[0]),
        Key.callback(currentAnswers[1] == ' ' ? ' ' : 'B) ' + currentAnswers[1], currentAnswers[1]),
        Key.callback(currentAnswers[2] == ' ' ? ' ' : 'C) ' + currentAnswers[2], currentAnswers[2]),
        Key.callback(currentAnswers[3] == ' ' ? ' ' : 'D) ' + currentAnswers[3], currentAnswers[3])
    ], {
        columns: 1
    });
    lastMessageId = await ctx.replyWithHTML(moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + '\n________________________________________________\n\nВопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>): \n\n' + currentQuestion, keyboard.inline());
    isInGame = true;

});

// ЭКШНЫ НА ПОДСКАЗКУ Право на ошибку    
bot.action('secondLife_yes', async ctx => {
    isSecondLife = true;
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    promptsKeyboard.secondLife.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());
    const keyboard = Keyboard.make([
        Key.callback(createLuseButtons('A)', currentAnswers[0]), currentAnswers[0]),
        Key.callback(createLuseButtons('B)', currentAnswers[1]), currentAnswers[1]),
        Key.callback(createLuseButtons('C)', currentAnswers[2]), currentAnswers[2]),
        Key.callback(createLuseButtons('D)', currentAnswers[3]), currentAnswers[3])
    ], {
        columns: 1
    });

    function createLuseButtons(letter, answer) {
        switch (answer) {
            case ' ':
                return ' ';
            default:
                return letter + ' ' + answer;
        }

    }
    lastMessageId = await ctx.replyWithHTML(moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + '\n________________________________________________\n\nВопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>): \n\n' + currentQuestion, keyboard.inline());
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
    lastMessageId = await ctx.replyWithHTML(`Вы забрали <code>${moneyKeyboard.money[questionCount-2]}</code>`, keyboard.inline());
});
bot.action('take_money_yes_alert', async ctx => {
    ctx.answerCbQuery('Нечего забирать!');
});

let questionCount = 1; // номер вопроса
async function questionCount1(ctx){ 
    return await DB.getUserData(ctx.message.from.id, 'questionCount');    /////////////////////////////////////////
}


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

function pickRandomQuestion(ctx) {
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
    lvl.find({}).exec((err, res) => {
        if (err) {
            console.log(err);
        } else {
            let questionIndex = Math.floor(Math.random() * res.length);
            currentQuestion = res[questionIndex].question;

            if (!passedQuestions.includes(currentQuestion)) {
                passedQuestions.push(currentQuestion);
                drawQuestionKeyboard(ctx);
            } else {
                console.log('повторился вопрос: ' + currentQuestion);
                pickRandomQuestion(ctx);
            }
        }
    });
}

// ПОКАЗ ВОПРОСА НА ЭКРАН 
function drawQuestionKeyboard(ctx) {
    currentAnswers = [];
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

            const keyboard = Keyboard.make([
                Key.callback('A) ' + currentAnswers[0], currentAnswers[0]),
                Key.callback('B) ' + currentAnswers[1], currentAnswers[1]),
                Key.callback('C) ' + currentAnswers[2], currentAnswers[2]),
                Key.callback('D) ' + currentAnswers[3], currentAnswers[3])
            ], {
                columns: 1
            });
            lastMessageId = await ctx.replyWithHTML(moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + '\n________________________________________________\n\nВопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>): \n\n' + currentQuestion, keyboard.inline());
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
            questionCount++;
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
                const keyboard = Keyboard.make([
                    Key.callback(createSecondLifeButtons('A)', currentAnswers[0]), currentAnswers[0]),
                    Key.callback(createSecondLifeButtons('B)', currentAnswers[1]), currentAnswers[1]),
                    Key.callback(createSecondLifeButtons('C)', currentAnswers[2]), currentAnswers[2]),
                    Key.callback(createSecondLifeButtons('D)', currentAnswers[3]), currentAnswers[3])
                ], {
                    columns: 1
                });
                lastMessageId = await ctx.replyWithHTML(moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + '\n________________________________________________\n\nВопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>): \n\n' + currentQuestion, keyboard.inline());
                isInGame = true;
                isSecondLife = false;

                function createSecondLifeButtons(letter, answer) {
                    switch (answer) {
                        case pickedAnswer:
                            return letter + ' ' + answer + ' ❌';
                        case ' ':
                            return ' ';
                        default:
                            return letter + ' ' + answer;
                    }
                }
            }
            // ЕСЛИ НЕ ДЕЙСТВУЕТ
            else {
                isInGame = false;
                const keyboard = Keyboard.make([
                    Key.callback(createLuseButtons('A)', currentAnswers[0])),
                    Key.callback(createLuseButtons('B)', currentAnswers[1])),
                    Key.callback(createLuseButtons('C)', currentAnswers[2])),
                    Key.callback(createLuseButtons('D)', currentAnswers[3])),
                    Key.callback(' '),
                    Key.callback('Попробовать снова', 'try_again')
                ], {
                    columns: 1
                });
                lastMessageId = await ctx.replyWithHTML(`И это неправильный ответ. Вы проиграли!\n\nВы остановились на <code>${moneyKeyboard.money[questionCount-1]}</code>`, keyboard.inline());

                function createLuseButtons(letter, answer) {
                    switch (answer) {
                        case correctAnswer:
                            return letter + ' ' + answer + ' ✅';
                        case pickedAnswer:
                            return letter + ' ' + answer + ' ❌';
                        case ' ':
                            return ' ';
                        default:
                            return letter + ' ' + answer;
                    }
                }
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


module.exports = {
    questionCount: questionCount,
    passedQuestions: passedQuestions,
    currentQuestion: currentQuestion,
    currentAnswers: currentAnswers,
    correctAnswer: correctAnswer,
    pickedAnswer: pickedAnswer,
    questionLvl: questionLvl,
    lastMessageId: lastMessageId,
    mainMessageId: mainMessageId,
    isInGame: isInGame,
    isSecondLife: isSecondLife
};