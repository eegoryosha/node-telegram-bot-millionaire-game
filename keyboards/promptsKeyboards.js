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


module.exports = {
    keyboard: keyboard,
    fiftyFifty: fiftyFifty,
    secondLife: secondLife,
    changeQuestion: changeQuestion,
};