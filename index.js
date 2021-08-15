// ------------------------------ ИМПОРТЫ ---------------------------------
require('dotenv').config(); // telegram token, uri mongodb
const { Telegraf } = require('telegraf'); // npm-пакет для бота
const { Keyboard, Key } = require('telegram-keyboard'); // npm-пакет для создания клавиатуры
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
    ctx.reply('Ты играешь в игру "Кто хочет стать Миллионером", все просто!');
}); 

// команда «‎/stop» 
bot.command('/stop', async (ctx)=>{
    
});

// команда «‎/start» 
bot.start(async (ctx) => {  
    const isUserExists = await DB.checkUserExists(ctx.message.from.id);

    setTimeout(async () => {
        if (!isUserExists) {
            DB.createNewUser(ctx.message.from.id, ctx.message.from.username, async () => {
                enterNickname(ctx);
            }); 
        } else { 
            const userNickname = await DB.getUserData(ctx.message.from.id, 'userNickname');

            if (userNickname == '') {
                enterNickname(ctx);
            } else { 
                DB.refreshUserData(ctx.message.from.id, async () => {
                    start(ctx, ctx.message.from.id);
                });
            }
        }
    }, 3000);
}); 





// ------------------------------ ВВОД НИКНЕЙМА ---------------------------------
async function enterNickname(ctx) {
    deleteLastMessage(ctx, ctx.message.from.id);

    const lastMessageId = await ctx.reply('Добро пожаловать! Введите ваш никнейм.');

    DB.updateUserData(ctx.update.message.from.id, 'messages.lastMessageId', lastMessageId);
    DB.updateUserData(ctx.update.message.from.id, 'activeScene', 'enter_your_name');
}

bot.on('text', async (ctx, next) => {
    const userNickname = await DB.getUserData(ctx.message.from.id, 'userNickname');

    if (userNickname == '') {
        if (ctx.update.message.text.indexOf(' ') > -1 || ctx.update.message.text.length > 18 || isRussian(ctx.update.message.text) || !isValid(ctx.update.message.text)) {
            deleteLastMessage(ctx, ctx.update.message.from.id);

            const lastMessageId = await ctx.reply('Никнейм должен быть на английском, без пробелов и спец. символов. Попробуйте снова.');

            DB.updateUserData(ctx.update.message.from.id, 'messages.lastMessageId', lastMessageId);
        } else if (await DB.checkUserNickname(ctx.update.message.text)) {
            deleteLastMessage(ctx, ctx.update.message.from.id);

            const lastMessageId = await ctx.reply('Пользователь с таким никнеймом существует. Введите другой ник.');
            
            DB.updateUserData(ctx.update.message.from.id, 'messages.lastMessageId', lastMessageId);
        } else {
            deleteLastMessage(ctx, ctx.update.message.from.id);

            DB.updateUserData(ctx.update.message.from.id, 'userNickname', ctx.update.message.text);

            const tempMessage = await ctx.reply('Добро пожаловать в игру, ' + ctx.update.message.text + '!');
            
            setTimeout(async () => {
                ctx.deleteMessage(tempMessage.message_id, tempMessage.chat.id);

                start(ctx, ctx.update.message.from.id);
            }, 3000);
        }
    }

    next();
});

// экшн «‎Сыграть еще раз» 
bot.action('try_again', async (ctx) => {
    deleteMainMessage(ctx, ctx.update.callback_query.from.id);

    setTimeout(async () => {
        DB.refreshUserData(ctx.update.callback_query.from.id, async () => {
            start(ctx, ctx.update.callback_query.from.id);
        }); 
    }, 3000);
});

// функция для старта игры
async function start(ctx, userId) {
    deleteLastMessage(ctx, userId);
    deleteMainMessage(ctx, userId);
     
    const keyboardInline = Keyboard.make([
        Key.callback('Начать игру', 'pick_sum'),
        Key.callback('Моя статистика', 'statistic'),
        Key.callback('Рейтинг', 'rating')
    ], {
        columns: 1
    });
    
    const lastMsg = await ctx.reply('Хотите сыграть в игру "Кто Хочет Стать Миллионером"?', keyboardInline.inline()); 

    DB.updateUserData(userId, 'messages.lastMessageId', lastMsg);

    DB.updateUserData(userId, 'activeScene', 'main_menu');                              
}





// ------------------------------ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ---------------------------------
bot.action('statistic', async (ctx) => {
    let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount');
    let userNickname = await DB.getUserData(ctx.update.callback_query.from.id, 'userNickname');
    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.winSum');
    let winSumPrettify = prettifyMoney(winSum) + ' руб.';

    deleteLastMessage(ctx, ctx.update.callback_query.from.id);

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
        'Всего выиграно: <code>' + winSumPrettify + '</code>', 
        keyboard.inline()
    ); 

    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg);
});

bot.action('back_to_menu', async (ctx) => {
    start(ctx, ctx.update.callback_query.from.id);
});




// ------------------------------ РЕЙТИНГ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ---------------------------------
bot.action('rating', async (ctx) => {
    let users = await DB.users.find().sort({'userStatistic.winSum': -1}).limit(10);
    let stringRating = '';

    deleteLastMessage(ctx, ctx.update.callback_query.from.id);

    users.forEach((el, i) => {
        let winSumString = prettifyMoney(parseInt(el.userStatistic.winSum)) + ' руб.';
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

    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg);
});




// ------------------------------ ВЫБОР НЕСГОРАЕМОЙ СУММЫ ---------------------------------
// вывод кнопок с суммами 
bot.action('pick_sum', async (ctx) => {
    deleteLastMessage(ctx, ctx.update.callback_query.from.id);

    const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);  
    const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
    const lastMsg = await ctx.reply('Выберите несгораемую сумму:', moneyKeyboard.keyboard.inline());

    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.mainMessageId', mainMsg);
    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg); 

    DB.updateUserData(ctx.update.callback_query.from.id, 'activeScene', 'pick_sum');
    DB.updateUserData(ctx.update.callback_query.from.id, 'isButtonBlock', false);
});  

// предупреждение: нельзя выбрать эту сумму
bot.action('pick_sum_again', async ctx => {
    ctx.answerCbQuery('Вы не можете выбрать эту сумму!');
});





// ------------------------------ ВЫВОД ВОПРОСА ---------------------------------
// определение уровня сложности вопроса исходя из номера вопроса
async function checkQuestionLevel(ctx) {
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount');

    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isSecondLife', false);
 
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

            DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.currentQuestion', res[random].question, async () => {
                const passedQuestions = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.passedQuestions'); 
                const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentQuestion');

                // проверка повторяющихся вопросов
                if (passedQuestions.includes(currentQuestion)) {
                    checkQuestionLevel(ctx); 
                } else {
                    DB.pushUserData(ctx.update.callback_query.from.id, 'currentGame.passedQuestions', currentQuestion);
                    
                    createQuestion(ctx, questionLvl);
                }
            });
        }
    });
}

// добавление вопроса в БД пользователя
async function createQuestion(ctx, questionLvl) { 
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentQuestion');

    // обнуление массива с прошлыми вариантами ответов в БД 
    await new Promise((response) => {
        DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers', [], () => {
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
            await new Promise(async (response) => {
                DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.correctAnswer', res[0].answers[0], () => {
                    response();
                }); 
            });

            shuffle(res[0].answers); // перемешиваем массив с вариантами ответов

            // добавление вариантов ответов в БД пользователя
            await new Promise(response => {
                res[0].answers.forEach(async (el, i, arr) => {
                    DB.pushUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers', el, () => {
                        if (i == arr.length-1) {
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
async function drawQuestionKeyboard(ctx) {
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentQuestion');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount'); 
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.pickedMoney');

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

    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg); 
    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isInGame', true);
    DB.updateUserData(ctx.update.callback_query.from.id, 'activeScene', 'question');
    DB.updateUserData(ctx.update.callback_query.from.id, 'isButtonBlock', false); 
}





// ------------------------------ НАЖАТИЕ НА ПОДСКАЗКУ ---------------------------------
bot.on('text', async ctx => {
    const lastMessageId = await DB.getUserData(ctx.message.from.id, 'messages.lastMessageId');
    const isInGame = await DB.getUserData(ctx.message.from.id, 'currentGame.isInGame');
    const isfiftyFifty = await DB.getUserData(ctx.message.from.id, 'currentGame.prompts.fiftyFifty');
    const isSecondLife = await DB.getUserData(ctx.message.from.id, 'currentGame.prompts.secondLife');
    const isChangeQuestion = await DB.getUserData(ctx.message.from.id, 'currentGame.prompts.changeQuestion');

    // если нажал на «‎50/50» 
    if (ctx.update.message.text == '50/50' && isfiftyFifty == true && isInGame == true) {
        ctx.deleteMessage();
        deleteLastMessage(ctx, ctx.message.from.id);
        
        
        DB.updateUserData(ctx.message.from.id, 'currentGame.isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', 'fiftyFifty_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите взять подсказку <b>50/50</b>?', keyboard.inline());

        DB.updateUserData(ctx.message.from.id, 'messages.lastMessageId', lastMsg);
    }

    // если нажал на «‎Право на ошибку» 
    else if (ctx.update.message.text == 'Право на ошибку' && isSecondLife == true && isInGame == true) {
        ctx.deleteMessage();
        deleteLastMessage(ctx, ctx.message.from.id);

        DB.updateUserData(ctx.message.from.id, 'currentGame.isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', 'secondLife_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите взять подсказку <b>Право на ошибку</b>?', keyboard.inline());

        DB.updateUserData(ctx.message.from.id, 'messages.lastMessageId', lastMsg);
    }

    // если нажал на «‎Поменять вопрос»
    else if (ctx.update.message.text == 'Поменять вопрос' && isChangeQuestion == true && isInGame == true) {
        ctx.deleteMessage();
        deleteLastMessage(ctx, ctx.message.from.id);

        DB.updateUserData(ctx.message.from.id, 'currentGame.isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', 'change_question_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите <b>Поменять вопрос</b>?', keyboard.inline());

        DB.updateUserData(ctx.message.from.id, 'messages.lastMessageId', lastMsg);
    }

    // если нажал на «‎Забрать деньги»
    else if (ctx.update.message.text == 'Забрать деньги' && isInGame == true) {
        ctx.deleteMessage();
        deleteLastMessage(ctx, ctx.message.from.id);

        DB.updateUserData(ctx.message.from.id, 'isInGame', false);

        const keyboard = Keyboard.make([
            Key.callback('Да', await DB.getUserData(ctx.message.from.id, 'currentGame.questionCount') == 1 ? 'take_money_yes_alert' : 'take_money_yes'),
            Key.callback('Нет', 'say_no')
        ], {
            columns: 1
        });

        const lastMsg = await ctx.replyWithHTML('Вы уверены, что хотите <b>Забрать деньги</b>?', keyboard.inline());

        DB.updateUserData(ctx.message.from.id, 'messages.lastMessageId', lastMsg);
    } 

    // удаление всех прочих сообщений пользователя
    else {
        ctx.deleteMessage(); 
    }
});




 
// ------------------------------ ЭКШНЫ НА ПОДСКАЗКИ ---------------------------------
// экшн на «‎50/50» 
bot.action('fiftyFifty_yes', async ctx => { 
    const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.correctAnswer');
    let currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers');

    deleteLastMessage(ctx, ctx.update.callback_query.from.id);
    deleteMainMessage(ctx, ctx.update.callback_query.from.id);

    
    await new Promise(async (response) => {
        DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.prompts.fiftyFifty', false, async () => {
            const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
            const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());

            DB.updateUserData(ctx.update.callback_query.from.id, 'messages.mainMessageId', mainMsg);
 
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

            // добавление двух неправильных вариантов ответов в БД как пустую строчку
            if (el != correctAnswer && el != random[randomNumber]) {
                DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers.'+ i, ' ', () => {
                    if (i == array.length - 1) {
                        response();
                    } 
                });
            } 

            // добавление случайного неправильного варианта ответа и правильного ответа в БД
            if ( el == correctAnswer || el == random[randomNumber]) {
                DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers.' + i, el, () => {
                    if (i == array.length - 1) {
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
    deleteLastMessage(ctx, ctx.update.callback_query.from.id);
    deleteMainMessage(ctx, ctx.update.callback_query.from.id);

    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isSecondLife', true); // true означает, что пользователь имеет право на ошибку на текущий вопрос

    await new Promise(async (response) => {
        DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.prompts.secondLife', false, async () => {
            const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
            const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
            DB.updateUserData(ctx.update.callback_query.from.id, 'messages.mainMessageId', mainMsg);

            response();
        }); 
    });
    
    drawQuestionKeyboard(ctx);
});

// экшн на «‎Поменять вопрос» 
bot.action('change_question_yes', async ctx => {
    deleteLastMessage(ctx, ctx.update.callback_query.from.id);
    deleteMainMessage(ctx, ctx.update.callback_query.from.id);

    await new Promise(async (response) => {
        DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.prompts.changeQuestion', false, async () => {
            const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
            const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
            DB.updateUserData(ctx.update.callback_query.from.id, 'messages.mainMessageId', mainMsg);

            response();
        });
    });
    
    let tempMessage = await ctx.replyWithHTML('Вопрос меняется. \n\nПодождите немного...');

    setTimeout(async () => {
        ctx.deleteMessage(tempMessage.message_id, tempMessage.chat.id);
        checkQuestionLevel(ctx);
    }, 3000);
});

// экшн на «‎Забрать деньги» 
bot.action('take_money_yes', async ctx => {
    deleteLastMessage(ctx, ctx.update.callback_query.from.id);
    deleteMainMessage(ctx, ctx.update.callback_query.from.id);
    
    const pKeyboard = await promptsKeyboard.keyboard(ctx.update.callback_query.from.id);
    const mainMsg = await ctx.reply('Вы играете в игру "Кто Хочет Стать Миллионером"!', pKeyboard.reply());
    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.mainMessageId', mainMsg);

    const keyboard = Keyboard.make([
        Key.callback('Сыграть еще раз', 'try_again')
    ]);

    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount');
    const lastMsg = await ctx.replyWithHTML(`Вы забрали <code>${moneyKeyboard.money[questionCount-2]}</code>`, keyboard.inline());
    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg); 

    let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount');
    DB.updateUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount', ++gameCount);

    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.winSum');
    let winSumString = moneyKeyboard.money[questionCount-2].replace(/\s+/g, ''); // удаление пробелов в строке
    let winSumNumber = parseInt(winSumString);
    winSum += winSumNumber;
    DB.updateUserData(ctx.update.callback_query.from.id, 'userStatistic.winSum', winSum);
});

bot.action('take_money_yes_alert', async ctx => {
    ctx.answerCbQuery('Нечего забирать!');
});

// экшн, если передумал брать подсказку
bot.action('say_no', async ctx => {
    deleteLastMessage(ctx, ctx.update.callback_query.from.id);
    
    drawQuestionKeyboard(ctx);
});





// ------------------------------ РЕАКЦИИ НА НАЖАТИЯ INLINE-КНОПОК ---------------------------------
bot.on('callback_query', async ctx => {  
    const activeScene = await DB.getUserData(ctx.update.callback_query.from.id, 'activeScene'); 
    const isButtonBlock = await DB.getUserData(ctx.update.callback_query.from.id, 'isButtonBlock');


    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers');
    const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.correctAnswer');
    const isSecondLife = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.isSecondLife');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.pickedMoney');

    // проверка правильности ответа  
    if (currentAnswers.includes(ctx.update.callback_query.data) && isButtonBlock == false && activeScene != 'check_answer') {
        DB.updateUserData(ctx.update.callback_query.from.id, 'activeScene', 'check_answer');
        DB.updateUserData(ctx.update.callback_query.from.id, 'isButtonBlock', true); 



        await new Promise((response) => {
            DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.pickedAnswer', ctx.update.callback_query.data, () => {
                response();
            });
        });   

         // удаление последнего сообщения
        if (ctx.update.callback_query.data != ' ') { 
            ctx.deleteMessage();
        } 
        
        // если ответ правильный
        if (correctAnswer == ctx.update.callback_query.data) {
            let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount');

            questionCount++;

            DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount', questionCount, async () => {
                // если пользователь ответил на 15 вопросов - победа
                if (questionCount == 16) {
                    const keyboard = Keyboard.make([
                        Key.callback('Сыграть еще раз', 'try_again')
                    ]);

                    const lastMsg = await ctx.replyWithHTML('Вы победили! Ваш выигрыш: <code>3 000 000 рублей!</code>', keyboard.inline());

                    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.winSum');
                    winSum += 3000000;
                    DB.updateUserData(ctx.update.callback_query.from.id, 'userStatistic.winSum', winSum);

                    let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount');
                    DB.updateUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount', ++gameCount);

                    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg); 
                    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isInGame', false);
                } else {
                    let tempMessage = await ctx.replyWithHTML('И это правильный ответ! \nВаш выигрыш составляет <code>' + (moneyKeyboard.money[questionCount - 2]) + '</code>\n\nПереходим к следующему вопросу...');
                    
                    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isInGame', false);
                    
                    setTimeout(async () => {  
                        ctx.deleteMessage(tempMessage.message_id, tempMessage.chat.id);

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
                let questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount');

                DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isInGame', false);

                // проверка, выиграл ли пользовать какую-то сумму при поражении или нет
                let gain; 
                let pickedMoneyNum = pickedMoney.replace(/\s+/g, ''); // удаление пробелов в строке
                let currentMoney = moneyKeyboard.money[questionCount-1].replace(/\s+/g, '');  
                if (parseInt(currentMoney) > parseInt(pickedMoneyNum)) {
                    gain = pickedMoney;
                    const gainNumber = parseInt(pickedMoneyNum);
                    let winSum = await DB.getUserData(ctx.update.callback_query.from.id, 'winSum');
                    winSum += gainNumber;
                    DB.updateUserData(ctx.update.callback_query.from.id, 'userStatistic.winSum', winSum);
                } else {
                    gain = '0 руб.';
                }

                const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers');
                const correctAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.correctAnswer');
                const pickedAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.pickedAnswer');

                let gameCount = await DB.getUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount');
                DB.updateUserData(ctx.update.callback_query.from.id, 'userStatistic.gameCount', ++gameCount);

                const pKeyboard = await promptsKeyboard.luseKeyboard(currentAnswers, pickedAnswer, correctAnswer);
                const lastMsg = await ctx.replyWithHTML(`И это неправильный ответ. Вы проиграли!\n\nВаш выигрыш: <code>${gain}</code>`, pKeyboard.inline());
                DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg); 
            }
        } 
    }

    // добавление несгораемой суммы в БД
    if (moneyKeyboard.money.includes(ctx.update.callback_query.data)) {
        const activeScene = await DB.getUserData(ctx.update.callback_query.from.id, 'activeScene');
        const isButtonBlock = await DB.getUserData(ctx.update.callback_query.from.id, 'isButtonBlock');

        if(activeScene != 'message_picked_sum' && isButtonBlock == false) {
            DB.updateUserData(ctx.update.callback_query.from.id, 'activeScene', 'message_picked_sum');
            DB.updateUserData(ctx.update.callback_query.from.id, 'isButtonBlock', true); 

            ctx.deleteMessage(); 

            DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.pickedMoney', ctx.update.callback_query.data, async () => {
                let pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.pickedMoney');
    
                let tempMessage = await ctx.replyWithHTML('Ваша несгораемая сумма: <code>' + pickedMoney + '</code> \n\nИгра начинается...');
    
                setTimeout(async () => {
                    ctx.deleteMessage(tempMessage.message_id, tempMessage.chat.id);
    
                    checkQuestionLevel(ctx);
                }, 3000);
            }); 
        }
    }
});





// ------------------------------ СКРИПТЫ ---------------------------------
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

// разбивка числа на триады
function prettifyMoney(num) {
    let n = num.toString().split('').reverse();
    let result = '';

    n.forEach((el, i) => {
        if ((i + 1) % 3 == 0) {
            result += el + ' ';
        } else {
            result += el;
        }
    });

    return result.split('').reverse().join('');
}

// если ошибся с «‎Правом на ошибку» 
async function drawSecondLifeButtons(ctx) {
    const currentAnswers = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentAnswers');
    const pickedAnswer = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.pickedAnswer');
    const questionCount = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.questionCount');
    const currentQuestion = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.currentQuestion');
    const pickedMoney = await DB.getUserData(ctx.update.callback_query.from.id, 'currentGame.pickedMoney');

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
    DB.updateUserData(ctx.update.callback_query.from.id, 'messages.lastMessageId', lastMsg);  
    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isInGame', true);
    DB.updateUserData(ctx.update.callback_query.from.id, 'currentGame.isSecondLife', false);

    DB.updateUserData(ctx.update.callback_query.from.id, 'activeScene', 'question');
    DB.updateUserData(ctx.update.callback_query.from.id, 'isButtonBlock', false); 
}

// проверка, есть ли русские символы
function isRussian(text) {
    return /[А-яЁё]/i.test(text); 
}

// проверка, есть ли лишние символы
function isValid(str) {
    return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);
}

// удаление последнего сообщения из чата и из БД
async function deleteLastMessage(ctx, id) {
    let lastMessageId = await DB.getUserData(id, 'messages.lastMessageId'); 

    if (Object.keys(lastMessageId).length != 0) {
        ctx.deleteMessage(lastMessageId.message_id, lastMessageId.chat.id);
        DB.removeLastMessage(id);
    }
}

// удаление главного сообщения из чата и из БД
async function deleteMainMessage(ctx, id) {
    let mainMessageId = await DB.getUserData(id, 'messages.mainMessageId'); 

    if (Object.keys(mainMessageId).length != 0) {
        ctx.deleteMessage(mainMessageId.message_id, mainMessageId.chat.id);
        DB.removeMainMessage(id);
    }
}