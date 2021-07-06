// ------------------------------ ИМПОРТЫ ---------------------------------
require('dotenv').config(); // (npm-пакет) telegram token, uri mongodb
const { Telegraf, Telegram } = require('telegraf'); // npm-пакет для бота
const { Keyboard, Key } = require('telegram-keyboard'); // npm-пакет для клавиатуры
const DB = require('./database'); // база данных
const promptsKeyboard = require('./keyboards/promptsKeyboard'); // клавиатура подсказок
const moneyKeyboard = require('./keyboards/moneyKeyboard'); // клавиатура денег


// ------------------------------ ПОДКЛЮЧЕНИЕ БАЗЫ ДАННЫХ ---------------------------------
(async function main() { 
    await DB.initialize();
})();
 

// ------------------------------ НАСТРОЙКА ТЕЛЕГРАФА ---------------------------------
const bot = new Telegraf(process.env.TOKEN);  
bot.launch(); // запуск бота 


// ------------------------------ КОМАНДЫ В ЧАТЕ ---------------------------------
// команда «‎/help»
bot.help((ctx) => { 
    ctx.reply('ВСЕ КОМАНДЫ КОТОРЫЕ ЕСТЬ');
}); 

// команда «‎/start» 
bot.start(async (ctx) => {
    setTimeout(() => {
        DB.addOrRefreshUser(ctx.message.from.id, ctx.message.from.first_name);
        start(ctx);
    }, 3000);
}); 
 
// выбор «‎Сыграть еще раз» 
bot.action('try_again', (ctx) => {
    setTimeout(() => {
        DB.addOrRefreshUser(ctx.update.callback_query.from.id, ctx.update.callback_query.from.first_name); 
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




///////////////////////////////////////////////////////////del
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


// ------------------------------ ВЫБОР НЕСГОРАЕМОЙ СУММЫ ---------------------------------
bot.action('pick_sum', async (ctx) => {
    ctx.deleteMessage();
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply()); // ПОДКЛЮЧАЕМ КЛАВИАТУРУ ИЗ promptsKeyboards.js
    setTimeout(async () => {
        lastMessageId = await ctx.reply('Выберите несгораемую сумму:', moneyKeyboard.keyboard.inline());
    }, 300);
});



// если выбрал неправильную сумму
bot.action('pick_sum_again', async ctx => {
    ctx.deleteMessage();
    lastMessageId = await ctx.reply('Выберите несгораемую сумму:', moneyKeyboard.keyboard.inline());
});


// ------------------------------ ВЫВОД ВОПРОСА ---------------------------------
// определение уровня сложности вопроса с помощью номера вопроса
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

// выбор случайного вопроса из БД и проверка повторяющихся вопросов
function createQuestion(lvl, ctx) {
    lvl.find({}).exec(async (err, res) => {
        if (err) {
            console.log(err);
        } else {
            let random = Math.floor(Math.random() * res.length);  
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentQuestion', res[random].question, async ()=>{
                const passedQuestions = await DB.getUserData(ctx.update.callback_query.from.id, 'passedQuestions'); 
                const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
                console.log(currentQuestion);
                console.log(passedQuestions);
                if (!passedQuestions.includes(currentQuestion)) {
                    DB.updateUserData('push', ctx.update.callback_query.from.id, 'passedQuestions', currentQuestion);
                    drawQuestionKeyboard(ctx);
                } else {
                    console.log('повторился вопрос: ' + currentQuestion);
                    pickRandomQuestion(ctx); 
                }
            });
        }
    });
}

// вывод вопроса пользователю
async function drawQuestionKeyboard(ctx) { 
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentAnswers', []);
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    let currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    
    questionLvl.find({
        question: currentQuestion
    }, async (err, res) => {
        if (err) {
            console.log(err);
        } else {
            
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'correctAnswer', res[0].answers[0]);
            shuffle(res[0].answers);
            new Promise(response =>{
                res[0].answers.forEach(async (el, i, arr) => {
                    DB.updateUserData('push', ctx.update.callback_query.from.id, 'currentAnswers', el, ()=>{
                        if(i == arr.length-1){
                            response();
                        }
                    }); 
                });
            }).then(async ()=>{
                currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');

                console.log(res[0].answers[0]);

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
            });
            
            
            
        }

    });
}








// ------------------------------ НАЖАТИЕ НА ПОДСКАЗКУ ---------------------------------
bot.on('text', async ctx => {
    // если нажал на «‎50/50» 
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
    // если нажал на «‎Право на ошибку» 
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
    // если нажал на «‎Поменять вопрос»
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
    // если нажал на «‎Забрать деньги»
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

// ------------------------------ ЭКШНЫ НА ПОДСКАЗКИ ---------------------------------
// экшн на «‎50/50» 
bot.action('fiftyFifty_yes', async ctx => { 
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    let currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'correctAnswer');

    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);

    promptsKeyboard.fiftyFifty.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());
    let random = []; 
    let randomNumber = Math.floor(Math.random() * 3); 
    
    await new Promise((response) =>{
        currentAnswers.forEach(async (el, i, array) => {
            currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
            if (el != correctAnswer) {
                random.push(currentAnswers[i]);
            } 
            if (el != correctAnswer && el != random[randomNumber]) {
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentAnswers['+i+']', ' ', ()=>{
                    if(i == array.length-1){
                        response();
                    } 
                });
            } 
            if ( el == correctAnswer || el == random[randomNumber]){
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentAnswers['+i+']', el, ()=>{
                    if(i == array.length-1){
                        response();
                    }
                }); 
            }
            
        });   
    });
    currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    console.log(currentAnswers); 
    lastMessageId = await ctx.replyWithHTML(
        moneyKeyboard.createString(moneyKeyboard.pickedMoney, questionCount - 1) + 
        '\n' +
        '________________________________________________' +
        '\n\n' +
        'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' +
        '\n\n' + 
        currentQuestion, 
    promptsKeyboard.defaultAnswersKeyboard(currentAnswers).inline());
    isInGame = true;
    
   
}); 

// экшн на «‎Право на ошибку»   
bot.action('secondLife_yes', async ctx => {
    isSecondLife = true;
    ctx.deleteMessage();
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    promptsKeyboard.secondLife.isActive = false;
    mainMessageId = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', promptsKeyboard.keyboard().reply());

    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    
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

// экшн на «‎Поменять вопрос» 
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

// экшн на «‎Забрать деньги» 
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

// экшн, если передумал брать подсказку
bot.action('say_no', async ctx => {
    ctx.deleteMessage();
    
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
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




///////////////////////////////////////////////////////////del
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









bot.on('callback_query', async ctx => {  
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'correctAnswer');
    const pickedAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedAnswer');
 
    // ПРОВЕРКА ПРАВИЛЬНОСТИ ОТВЕТА
    if (currentAnswers.includes(ctx.update.callback_query.data)) {
        await new Promise((response)=>{
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'pickedAnswer', ctx.update.callback_query.data);
            response();
        });   

        // если нажал на пустой вариант ответа при подсказке 50/50
        if (ctx.update.callback_query.data != ' ') { 
            ctx.deleteMessage();
        } 
        
        // ЕСЛИ ПРАВИЛЬНЫЙ ОТВЕТ
        if (correctAnswer == ctx.update.callback_query.data) {
            let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
            questionCount++; 
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'questionCount', questionCount, async ()=>{
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
            });
            

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
                let pickedMoney = moneyKeyboard.pickedMoney.replace(/\s+/g, ''); // replace убирает пробелы
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

    // несгораемая
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
 

