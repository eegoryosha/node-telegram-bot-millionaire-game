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

bot.launch();   





// ------------------------------ КОМАНДЫ В ЧАТЕ ---------------------------------
// команда «‎/help»
bot.help((ctx) => { 
    ctx.reply('Ты играешь в игру "Кто хочет стать Миллионером", что непонятного?');
}); 

// команда «‎/stop» 
bot.command('/stop', async (ctx)=>{
    
});

// команда «‎/start» 
bot.start(async (ctx) => {  
    const userExists = await DB.checkUserExists(ctx.message.from.id);
    console.log(userExists);
    setTimeout(async () => {
        if(userExists == false){
            DB.addOrRefreshUser(ctx.message.from.id, ctx.message.from.username, async ()=>{
                enterNickname(ctx);
            });
        } else{
            const userNickname = await DB.getUserData(ctx.message.from.id, 'userNickname');
            if(userNickname == ''){
                enterNickname(ctx);
            }
            else{ 
                DB.addOrRefreshUser(ctx.message.from.id, ctx.message.from.username, async ()=>{
                    start(ctx, ctx.message.from.id);
                });
            }
           
        }
    }, 3000);
}); 


async function enterNickname(ctx){
    let lastMessageId = await DB.getUserData(ctx.message.from.id, 'lastMessageId'); 
    if (Object.keys(lastMessageId).length != 0) {
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    }
    lastMessageId = await ctx.reply('Добро пожаловать! Введите ваш никнейм.');
    DB.updateUserData('replace', ctx.update.message.from.id, 'lastMessageId', lastMessageId);
    DB.updateUserData('replace', ctx.update.message.from.id, 'activeScene', 'enter_your_name');
}

bot.on('text', async (ctx, next)=>{
    let lastMessageId = await DB.getUserData(ctx.update.message.from.id, 'lastMessageId');
    const activeScene = await DB.getUserData(ctx.message.from.id, 'activeScene'); 
    if(activeScene == 'enter_your_name'){
        if(ctx.update.message.text.indexOf(' ') > -1 || ctx.update.message.text.length > 18 || isRussian(ctx.update.message.text) == true || isValid(ctx.update.message.text) == false){
            ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
            DB.clearLastMessageId(ctx.update.message.from.id);

            lastMessageId = await ctx.reply('Вы не можете ввести такой никнейм. Попробуйте снова.');
            DB.updateUserData('replace', ctx.update.message.from.id, 'lastMessageId', lastMessageId);
        }else if(await DB.checkUserNickname(ctx.update.message.text)){
            ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
            DB.clearLastMessageId(ctx.update.message.from.id);

            lastMessageId = await ctx.reply('Пользователь с таким никнеймом существует. Введите другой ник.');
            DB.updateUserData('replace', ctx.update.message.from.id, 'lastMessageId', lastMessageId);
        }else{
            ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
            DB.clearLastMessageId(ctx.update.message.from.id);

            DB.updateUserData('replace', ctx.update.message.from.id, 'userNickname', ctx.update.message.text);

            const message = await ctx.reply('Добро пожаловать в игру, ' + ctx.update.message.text + '!');
            
            setTimeout(async () => {
                ctx.deleteMessage(message.message_id, message.chat.id);

                start(ctx, ctx.update.message.from.id);
            }, 3000);
        }
    }
    next();
});

// экшн «‎Сыграть еще раз» 
bot.action('try_again', async (ctx) => {
    let mainMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'mainMessageId'); 
    if (Object.keys(mainMessageId).length != 0) {
        ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    }
    DB.clearMainMessageId(ctx.update.callback_query.from.id);

    setTimeout(async () => {
        DB.addOrRefreshUser(ctx.update.callback_query.from.id, ctx.update.callback_query.from.username, async ()=>{
            start(ctx, ctx.update.callback_query.from.id);
        }); 
    }, 3000);
});

// функция для старта игры
async function start(ctx, userId) {
    let lastMessageId = await DB.getUserData(userId, 'lastMessageId'); 
    let mainMessageId = await DB.getUserData(userId, 'mainMessageId'); 
    
    // удаление главного сообщения из БД, когда его еще нет
    if(lastMessageId.text == 'Хотите сыграть в игру "Кто Хочет Стать Миллионером"?'){
        await new Promise(async response =>{
            DB.clearMainMessageId(userId, async ()=>{ 
                mainMessageId = await DB.getUserData(userId, 'mainMessageId'); 
                response();
            });
        });
    } 

    if (Object.keys(mainMessageId).length != 0) {
        ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    }
    if (Object.keys(lastMessageId).length != 0) {
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    }
     
    const keyboardInline = Keyboard.make([
        Key.callback('Начать игру', 'pick_sum'),
        Key.callback('Моя статистика', 'statistic'),
        Key.callback('Рейтинг', 'rating')
    ], {
        columns: 1
    });
    
    const lastMsg = await ctx.reply('Хотите сыграть в игру "Кто Хочет Стать Миллионером"?', keyboardInline.inline()); 

    DB.updateUserData('replace', userId, 'lastMessageId', lastMsg);

    DB.updateUserData('replace', userId, 'activeScene', 'main_menu');
}





// ------------------------------ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ---------------------------------
bot.action('statistic', async (ctx) => {
    let lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId'); 
    let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'gameCount');
    let userNickname = await DB.getUserData(ctx.update.callback_query.from.id, 'userNickname');
    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'winSum');
    let winSumString = prettify(winSum) + ' руб.';

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);

    const keyboard = Keyboard.make([
        Key.callback('<<<<', 'back_to_menu'),
    ], {
        columns: 1
    });
    const lastMsg = await ctx.replyWithHTML(
        'Статистика игрока ' + userNickname +':'+
        '\n\n' +
        'Сыграно игр: <code>' + gameCount + ' </code>' +
        '\n'+
        'Всего выиграно: <code>' + winSumString + '</code>', 
        keyboard.inline()
    ); 

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg);
});

bot.action('back_to_menu', async (ctx) =>{
    start(ctx, ctx.update.callback_query.from.id);
});




// ------------------------------ РЕЙТИНГ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ---------------------------------
bot.action('rating', async (ctx)=>{
    let lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId'); 
    let users = await DB.users.find().sort({winSum: -1}).limit(10);
    let stringRating = '';

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);

    users.forEach((el, i)=>{
        let winSumString = prettify(parseInt(el.winSum)) + ' руб.';
        stringRating += i + 1 + ') ' +  el.userNickname + ' - <code>' + winSumString + '</code>\n';
    });
    
    const keyboard = Keyboard.make([
        Key.callback('<<<<', 'back_to_menu'),
    ], {
        columns: 1
    });
    const lastMsg = await ctx.replyWithHTML(
        '<b>Топ-10 игроков:</b>' +
        '\n\n' +
        stringRating,
        keyboard.inline()
    ); 

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg);
});




// ------------------------------ ВЫБОР НЕСГОРАЕМОЙ СУММЫ ---------------------------------
// вывод кнопок с суммами 
bot.action('pick_sum', async (ctx) => {
    let lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId'); 

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);

    const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);  
    const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
    const lastMsg = await ctx.reply('Выберите несгораемую сумму:', moneyKeyboard.keyboard.inline());

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'mainMessageId', mainMsg);
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg); 



    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'activeScene', 'pick_sum'); 
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isButtonBlock', false); 
});  

// предупреждение: нельзя выбрать эту сумму
bot.action('pick_sum_again', async ctx => {
    ctx.answerCbQuery('Вы не можете выбрать эту сумму!');
});





// ------------------------------ ВЫВОД ВОПРОСА ---------------------------------
// определение уровня сложности вопроса с помощью номера вопроса
async function checkQuestionLevel(ctx) {
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isSecondLife', false);
 
    if (questionCount <= 2) {
        pickRandomQuestion(ctx, DB.questionsLvl0);
    } else if (questionCount > 2 && questionCount <= 5) {
        pickRandomQuestion(ctx, DB.questionsLvl1);
    } else if (questionCount > 5 && questionCount <= 10) {
        pickRandomQuestion(ctx, DB.questionsLvl2);
    } else if (questionCount > 10) {
        pickRandomQuestion(ctx, DB.questionsLvl3);
    }
}

// выбор случайного вопроса из БД и проверка повторяющихся вопросов
function pickRandomQuestion(ctx, questionLvl) {
    questionLvl.find({}).exec(async (err, res) => {
        if (err) {
            console.log(err);
        } else {
            let random = Math.floor(Math.random() * res.length); // достаем случайный индекс в базе вопросов
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentQuestion', res[random].question, async ()=>{
                const passedQuestions = await DB.getUserData(ctx.update.callback_query.from.id, 'passedQuestions'); 
                const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');

                // проверка повторяющихся вопросов
                if (passedQuestions.includes(currentQuestion)) {
                    checkQuestionLevel(ctx, questionLvl); 
                } else {
                    DB.updateUserData('push', ctx.update.callback_query.from.id, 'passedQuestions', currentQuestion);
                    
                    createQuestion(ctx, questionLvl);
                }
            });
        }
    });
}

// добавление вопроса в БД пользователя
async function createQuestion(ctx, questionLvl) { 
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');

    // обнуление массива с прошлыми вариантами ответов в БД 
    await new Promise((response)=>{
        DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentAnswers', [], ()=>{
            response();
        });
    });
    
    // добавление вариантов ответов в БД пользователя
    questionLvl.find({
        question: currentQuestion
    }, async (err, res) => {
        if (err) {
            console.log(err);
        } else {
            // добавление правильного ответа в БД (он всегда под индексом 0)
            await new Promise(async (response)=>{
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'correctAnswer', res[0].answers[0], ()=>{
                    response();
                }); 
            });

            shuffle(res[0].answers); // перемешиваем массив с вариантами ответов

            // добавление вариантов ответов в БД пользователя
            await new Promise(response =>{
                res[0].answers.forEach(async (el, i, arr) => {
                    DB.updateUserData('push', ctx.update.callback_query.from.id, 'currentAnswers', el, ()=>{
                        if(i == arr.length-1){
                            response();
                        }
                    }); 
                }); 
            });  

            drawQuestionKeyboard(ctx);
        }
    });
}

// вывод вопроса пользователю
async function drawQuestionKeyboard(ctx){
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount'); 
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');

    // вывод вопроса и клавиатуры с вариантами ответов
    const lastMsg = await ctx.replyWithHTML(
            moneyKeyboard.createString(pickedMoney, questionCount - 1) + 
            '\n' +
            '_________________________________' +
            '\n\n' +
            'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' + 
            '\n\n' + currentQuestion, 
        promptsKeyboard.defaultAnswersKeyboard(currentAnswers).inline()
    );
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg); 

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isInGame', true);



    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'activeScene', 'question');
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isButtonBlock', false); 
}





// ------------------------------ НАЖАТИЕ НА ПОДСКАЗКУ ---------------------------------
bot.on('text', async ctx => {
    const lastMessageId = await DB.getUserData(ctx.message.from.id, 'lastMessageId');
    const isInGame = await DB.getUserData(ctx.message.from.id, 'isInGame');
    const isfiftyFifty = await DB.getUserData(ctx.message.from.id, 'prompts.fiftyFifty');
    const isSecondLife = await DB.getUserData(ctx.message.from.id, 'prompts.secondLife');
    const isChangeQuestion = await DB.getUserData(ctx.message.from.id, 'prompts.changeQuestion');

    // если нажал на «‎50/50» 
    if (ctx.update.message.text == '50/50' && isfiftyFifty == true && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
        
        DB.updateUserData('replace', ctx.message.from.id, 'isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', 'fiftyFifty_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите взять подсказку <b>50/50</b>?', keyboard.inline());

        DB.updateUserData('replace', ctx.message.from.id, 'lastMessageId', lastMsg);
    }

    // если нажал на «‎Право на ошибку» 
    else if (ctx.update.message.text == 'Право на ошибку' && isSecondLife == true && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);

        DB.updateUserData('replace', ctx.message.from.id, 'isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', 'secondLife_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите взять подсказку <b>Право на ошибку</b>?', keyboard.inline());

        DB.updateUserData('replace', ctx.message.from.id, 'lastMessageId', lastMsg);
    }

    // если нажал на «‎Поменять вопрос»
    else if (ctx.update.message.text == 'Поменять вопрос' && isChangeQuestion == true && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);

        DB.updateUserData('replace', ctx.message.from.id, 'isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', 'change_question_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите <b>Поменять вопрос</b>?', keyboard.inline());

        DB.updateUserData('replace', ctx.message.from.id, 'lastMessageId', lastMsg);
    }

    // если нажал на «‎Забрать деньги»
    else if (ctx.update.message.text == 'Забрать деньги' && isInGame == true) {
        ctx.deleteMessage();
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);

        DB.updateUserData('replace', ctx.message.from.id, 'isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', await DB.getUserData(ctx.message.from.id, 'questionCount') == 1 ? 'take_money_yes_alert' : 'take_money_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите <b>Забрать деньги</b>?', keyboard.inline());

        DB.updateUserData('replace', ctx.message.from.id, 'lastMessageId', lastMsg);
    } 

    // удаление всех прочих сообщений пользователя
    else {
        ctx.deleteMessage(); 
    }
});




 
// ------------------------------ ЭКШНЫ НА ПОДСКАЗКИ ---------------------------------
// экшн на «‎50/50» 
bot.action('fiftyFifty_yes', async ctx => { 
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'correctAnswer');
    const mainMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'mainMessageId');
    const lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');
    let currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);

    
    await new Promise(async (response)=>{
        DB.updateUserData('replace', ctx.update.callback_query.from.id, 'prompts.fiftyFifty', false, async ()=>{
            const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
            const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'mainMessageId', mainMsg);
            response();
        }); 
    });
    
    let random = []; // массив с неправильными ответами     
    let randomNumber = Math.floor(Math.random() * 3); // индекс от 0 до 2, чтобы получить один случайный неправильный вариант ответа 
    
    await new Promise((response) =>{
        currentAnswers.forEach(async (el, i, array) => {
            // добавление в массив с неправильными вариантами ответов
            if (el != correctAnswer) {
                random.push(currentAnswers[i]);
            } 

            // добавление двух неправильных вариантов ответов в БД как пустоту
            if (el != correctAnswer && el != random[randomNumber]) {
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentAnswers['+i+']', ' ', ()=>{
                    if(i == array.length-1){
                        response();
                    } 
                });
            } 

            // добавление случайного неправильного варианта ответа и правильного ответа в БД
            if ( el == correctAnswer || el == random[randomNumber]){
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'currentAnswers['+i+']', el, ()=>{
                    if(i == array.length-1){
                        response();
                    }
                }); 
            }
        });   
    });
    
    drawQuestionKeyboard(ctx);  
}); 

// экшн на «‎Право на ошибку»   
bot.action('secondLife_yes', async ctx => {
    const mainMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'mainMessageId');
    const lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isSecondLife', true); // true означает, что пользователь имеет право на ошибку на текущий вопрос

    await new Promise(async (response)=>{
        DB.updateUserData('replace', ctx.update.callback_query.from.id, 'prompts.secondLife', false, async ()=>{
            const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
            const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'mainMessageId', mainMsg);
            response();
        }); 
    });
    
    drawQuestionKeyboard(ctx);
});

// экшн на «‎Поменять вопрос» 
bot.action('change_question_yes', async ctx => {
    const mainMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'mainMessageId');
    const lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId');

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id); 
    
    await new Promise(async(response)=>{
        DB.updateUserData('replace', ctx.update.callback_query.from.id, 'prompts.changeQuestion', false, async()=>{
            const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
            const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'mainMessageId', mainMsg);
            response();
        });
    });
    
    let message = await ctx.replyWithHTML('Вопрос меняется. \n\nПодождите немного...');

    setTimeout(async () => {
        ctx.deleteMessage(message.message_id, message.chat.id);
        checkQuestionLevel(ctx);
    }, 3000);
});

// экшн на «‎Забрать деньги» 
bot.action('take_money_yes', async ctx => {
    const mainMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'mainMessageId');
    const lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId');

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
    
    const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
    const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'mainMessageId', mainMsg);

    const keyboard = Keyboard.make([
        Key.callback('Сыграть еще раз', 'try_again')
    ]);

    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const lastMsg = await ctx.replyWithHTML(`Вы забрали <code>${moneyKeyboard.money[questionCount-2]}</code>`, keyboard.inline());
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg); 

    let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'gameCount');
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'gameCount', ++gameCount);

    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'winSum');
    let winSumString = moneyKeyboard.money[questionCount-2].replace(/\s+/g, ''); // удаление пробелов в строке
    let winSumNumber = parseInt(winSumString);
    winSum += winSumNumber;
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'winSum', winSum);
});

bot.action('take_money_yes_alert', async ctx => {
    ctx.answerCbQuery('Нечего забирать!');
});

// экшн, если передумал брать подсказку
bot.action('say_no', async ctx => {
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');
    const lastMessageId = await DB.getUserData(ctx.update.callback_query.from.id, 'lastMessageId');

    ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
    
    drawQuestionKeyboard(ctx);
});





// ------------------------------ РЕАКЦИИ НА НАЖАТИЯ INLINE-КНОПОК ---------------------------------
bot.on('callback_query', async ctx => {  
    const activeScene = await DB.getUserData(ctx.update.callback_query.from.id, 'activeScene'); 
    const isButtonBlock = await DB.getUserData(ctx.update.callback_query.from.id, 'isButtonBlock');


    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'correctAnswer');
    const isSecondLife = await DB.getUserData(ctx.update.callback_query.from.id, 'isSecondLife');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');

    // проверка правильности ответа  
    if (currentAnswers.includes(ctx.update.callback_query.data) && isButtonBlock == false && activeScene != 'check_answer') {
        DB.updateUserData('replace', ctx.update.callback_query.from.id, 'activeScene', 'check_answer');
        DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isButtonBlock', true); 



        await new Promise((response)=>{
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'pickedAnswer', ctx.update.callback_query.data, ()=>{
                response();
            });
        });   

         // удаление последнего сообщения
        if (ctx.update.callback_query.data != ' ') { 
            ctx.deleteMessage();
        } 
        
        // если ответ правильный
        if (correctAnswer == ctx.update.callback_query.data) {
            let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');

            questionCount++; 

            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'questionCount', questionCount, async ()=>{
                // если пользователь ответил на 15 вопросов - победа
                if (questionCount == 16) {
                    const keyboard = Keyboard.make([
                        Key.callback('Сыграть еще раз', 'try_again')
                    ]);

                    const lastMsg = await ctx.replyWithHTML('Вы победили! Ваш выигрыш: <code>3 000 000 рублей!</code>', keyboard.inline());

                    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'winSum');
                    winSum += 3000000;
                    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'winSum', winSum);

                    let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'gameCount');
                    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'gameCount', ++gameCount);

                    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg); 
                    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isInGame', false);
                } else {
                    let message = await ctx.replyWithHTML('И это правильный ответ! \nВаш выигрыш составляет <code>' + (moneyKeyboard.money[questionCount - 2]) + '</code>\n\nПереходим к следующему вопросу...');
                    
                    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isInGame', false);
                    
                    


                    setTimeout(async () => {  
                        ctx.deleteMessage(message.message_id, message.chat.id);

                        checkQuestionLevel(ctx);
                    }, 3000);
                } 
            });
        }

        // если ответ неправильный
        else if (currentAnswers.includes(ctx.update.callback_query.data) && ctx.update.callback_query.data != ' ' && ctx.update.callback_query.data != correctAnswer) {
            // если действует подсказка «‎Право на ошибку»
            if (isSecondLife) {
                drawSecondLifeButtons(ctx);
            }

            // если не действует подсказка «‎Право на ошибку»
            else {
                let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');

                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isInGame', false);

                // проверка, выиграл ли пользовать какую-то сумму при поражении или нет
                let gain; 
                let pickedMoneyNum = pickedMoney.replace(/\s+/g, ''); // удаление пробелов в строке
                let currentMoney = moneyKeyboard.money[questionCount-1].replace(/\s+/g, '');  
                if(parseInt(currentMoney) > parseInt(pickedMoneyNum)){
                    gain = pickedMoney;
                    const gainNumber = parseInt(pickedMoneyNum);
                    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'winSum');
                    winSum += gainNumber;
                    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'winSum', winSum);
                } else {
                    gain = '0 руб.';
                }

                const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
                const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'correctAnswer');
                const pickedAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedAnswer');

                let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'gameCount');
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'gameCount', ++gameCount);

                const pKeyboard = await promptsKeyboard.luseKeyboard(currentAnswers, pickedAnswer, correctAnswer);
                const lastMsg = await ctx.replyWithHTML(`И это неправильный ответ. Вы проиграли!\n\nВаш выигрыш: <code>${gain}</code>`, pKeyboard.inline());
                DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg); 
            }
        } 


        
    }

    // добавление несгораемой суммы в БД
    if (moneyKeyboard.money.includes(ctx.update.callback_query.data)) {
        const activeScene = await DB.getUserData(ctx.update.callback_query.from.id, 'activeScene');
        const isButtonBlock = await DB.getUserData(ctx.update.callback_query.from.id, 'isButtonBlock');


        if(activeScene != 'message_picked_sum' && isButtonBlock == false){
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'activeScene', 'message_picked_sum');
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isButtonBlock', true); 

            
            ctx.deleteMessage(); 
            DB.updateUserData('replace', ctx.update.callback_query.from.id, 'pickedMoney', ctx.update.callback_query.data, async ()=>{
                let pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');
    
                let message = await ctx.replyWithHTML('Ваша несгораемая сумма: <code>' + pickedMoney + '</code> \n\nИгра начинается...');
    
                setTimeout(async () => {
                    ctx.deleteMessage(message.message_id, message.chat.id);
    
                    checkQuestionLevel(ctx);
                }, 3000);
            }); 


            
            
        }
    }
});


// функция, которая перемешивает элементы массива
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

function prettify(num) {
    var n = num.toString();
    return n.replace(/(\d{1,3}(?=(?:\d\d\d)+(?!\d)))/g, "$1" + ' ');
}
 

async function drawSecondLifeButtons(ctx){
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentAnswers');
    const pickedAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedAnswer');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentQuestion');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'pickedMoney');

    const pKeyboard = await promptsKeyboard.secondLifeKeyboard(currentAnswers, pickedAnswer);
    const lastMsg = await ctx.replyWithHTML(
            moneyKeyboard.createString(pickedMoney, questionCount - 1) + 
            '\n' +
            '_________________________________' +
            '\n\n' +
            'Вопрос №' + questionCount + ' (<code>' + moneyKeyboard.money[questionCount - 1] + '</code>):' +
            '\n\n' + currentQuestion, 
            pKeyboard.inline()  
    );
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'lastMessageId', lastMsg);  
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isInGame', true);
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isSecondLife', false);

    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'activeScene', 'question');
    DB.updateUserData('replace', ctx.update.callback_query.from.id, 'isButtonBlock', false); 
}

function isRussian(text) {
    return /[А-яЁё]/i.test(text); 
}

function isValid(str){
    return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);
}

