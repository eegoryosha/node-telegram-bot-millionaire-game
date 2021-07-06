const {Keyboard, Key} = require('telegram-keyboard');

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


function keyboard(){
    let keyboard = Keyboard.make([
        Key.callback(fiftyFifty.isActive ? fiftyFifty.activeName : fiftyFifty.inActiveName),
        Key.callback(secondLife.isActive ? secondLife.activeName : secondLife.inActiveName),
        Key.callback(changeQuestion.isActive ? changeQuestion.activeName : changeQuestion.inActiveName), 
        Key.callback('Забрать деньги')
    ], {
        columns: 2
    });
    return keyboard;
}

function defaultAnswersKeyboard(arr){ 
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

function secondLifeKeyboard(arr, pickedAnswer){
    const keyboard = Keyboard.make([
        Key.callback(createSecondLifeButtons('A)', arr[0]), arr[0]),
        Key.callback(createSecondLifeButtons('B)', arr[1]), arr[1]),
        Key.callback(createSecondLifeButtons('C)', arr[2]), arr[2]),
        Key.callback(createSecondLifeButtons('D)', arr[3]), arr[3])
    ], {
        columns: 1
    });
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
    return keyboard;
}

function luseKeyboard(arr, pickedAnswer, correctAnswer){
    const keyboard = Keyboard.make([
        Key.callback(createLuseButtons('A)', arr[0])),
        Key.callback(createLuseButtons('B)', arr[1])),
        Key.callback(createLuseButtons('C)', arr[2])),
        Key.callback(createLuseButtons('D)', arr[3])),
        Key.callback(' '),
        Key.callback('Попробовать снова', 'try_again')
    ], { 
        columns: 1
    });
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