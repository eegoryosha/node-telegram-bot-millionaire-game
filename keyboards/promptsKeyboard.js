// ------------------------------ ИМПОРТЫ ---------------------------------
const { Keyboard, Key } = require('telegram-keyboard');
const DB = require('../database');





// ------------------------------ ПОДСКАЗКИ ---------------------------------
let fiftyFifty = {
    activeName: '50/50',
    inActiveName: '✖5̶0̶/̶5̶0̶✖',
    isActive: true
};
let secondLife = {
    activeName: 'Право на ошибку',
    inActiveName: '✖П̶р̶а̶в̶о̶ ̶н̶а̶ ̶о̶ш̶и̶б̶к̶у̶✖',
    isActive: true
};
let changeQuestion = {
    activeName: 'Поменять вопрос',
    inActiveName: '✖П̶о̶м̶е̶н̶я̶т̶ь̶ ̶в̶о̶п̶р̶о̶с̶✖',
    isActive: true
};





// ------------------------------ КЛАВИАТУРЫ ---------------------------------
// клавиатура с выбором подсказок 
async function keyboard(userId) { 
    const isfiftyFifty = await DB.getUserData(userId, 'currentGame.prompts.fiftyFifty');
    const isSecondLife = await DB.getUserData(userId, 'currentGame.prompts.secondLife');
    const isChangeQuestion = await DB.getUserData(userId, 'currentGame.prompts.changeQuestion');

    const keyboard = Keyboard.make([
        Key.callback(isfiftyFifty ? fiftyFifty.activeName : fiftyFifty.inActiveName),
        Key.callback(isSecondLife ? secondLife.activeName : secondLife.inActiveName),
        Key.callback(isChangeQuestion ? changeQuestion.activeName : changeQuestion.inActiveName), 
        Key.callback('Забрать деньги')
    ], {
        columns: 2
    });

    return keyboard;
}

// клавиатура с вариантами ответа 
function defaultAnswersKeyboard(arr) { 
    const keyboard = Keyboard.make([
        Key.callback(arr[0] == ' ' ? ' ' : 'A) ' + arr[0], arr[0]),
        Key.callback(arr[1] == ' ' ? ' ' : 'B) ' + arr[1], arr[1]),
        Key.callback(arr[2] == ' ' ? ' ' : 'C) ' + arr[2], arr[2]),
        Key.callback(arr[3] == ' ' ? ' ' : 'D) ' + arr[3], arr[3])
    ], {
        columns: 1
    });

    return keyboard;
}

// клавиатура если реализована подсказка «Вторая жизнь»‎ 
async function secondLifeKeyboard(arr, pickedAnswer) {
    const keyboard = Keyboard.make([
        Key.callback(await createSecondLifeButtons('A)', await arr[0]), await arr[0]),
        Key.callback(await createSecondLifeButtons('B)', await arr[1]), await arr[1]),
        Key.callback(await createSecondLifeButtons('C)', await arr[2]), await arr[2]),
        Key.callback(await createSecondLifeButtons('D)', await arr[3]), await arr[3])
    ], {
        columns: 1
    });

    async function createSecondLifeButtons(letter, answer) {
        switch (answer) {
            case await pickedAnswer:
                return letter + ' ' + await answer + ' ❌';  
            case ' ':
                return ' ';
            default:
                return letter + ' ' + await answer;
        }
    }

    return keyboard;
}

// клавиатура во время проигрыша
async function luseKeyboard(arr, pickedAnswer, correctAnswer) {
    const keyboard = Keyboard.make([ 
        Key.callback(await createLuseButtons('A)', arr[0])),
        Key.callback(await createLuseButtons('B)', arr[1])),
        Key.callback(await createLuseButtons('C)', arr[2])), 
        Key.callback(await createLuseButtons('D)', arr[3])),
        Key.callback(' '),
        Key.callback('Попробовать снова', 'try_again')
    ], { 
        columns: 1
    });
    async function createLuseButtons(letter, answer) { 
        switch (answer) {
            case await correctAnswer:
                return letter + ' ' + answer + ' ✅';
            case await pickedAnswer:
                return letter + ' ' + answer + ' ❌';
            case ' ':
                return ' ';
            default:
                return letter + ' ' + answer;
        }
    }

    return keyboard;
}





module.exports = {
    keyboard: keyboard,
    defaultAnswersKeyboard: defaultAnswersKeyboard,
    luseKeyboard: luseKeyboard,
    secondLifeKeyboard: secondLifeKeyboard,
    fiftyFifty: fiftyFifty,
    secondLife: secondLife,
    changeQuestion: changeQuestion,
};