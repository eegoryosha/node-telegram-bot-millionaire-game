const { Keyboard, Key } = require('telegram-keyboard');

let pickedMoney = '';
const money = [
    '500 руб.',
    '1 000 руб.',
    '2 000 руб.',
    '3 000 руб.',
    '5 000 руб.',
    '10 000 руб.',
    '15 000 руб.',
    '25 000 руб.',
    '50 000 руб.',
    '100 000 руб.',
    '200 000 руб.',
    '400 000 руб.',
    '800 000 руб.',
    '1 500 000 руб.',
    '3 000 000 руб.'
];

function createString(pick, current){ // (несгораемая сумма, текущий вопрос)
    let string = '';
    
    for(let i = money.length-1; i >= 0; i--){
        if((money[i] == pick || i == money.length-1) && i != current){    
            string += `<b>${money[i]}</b>\n`;
        } else if(i == current && money[i] != pick && i != money.length-1){
            string += `${money[i]} ❗\n`;
        } else if(i == current && (money[i] == pick || i == money.length-1)){
            string += `<b>${money[i]}</b> ❗\n`;
        } else{
            string += `${money[i]}\n`;
        }
        
    }
    return string;
}

let createMoneyKeyboard = [];
for(let i = money.length-1; i>=0; i--){
    if(i == money.length-1){
        createMoneyKeyboard.push(Key.callback(i+1 + '. ' + money[i], money[i]));
    }
    else{
        createMoneyKeyboard.push(Key.callback(i+1 + '. ' + money[i], money[i]));
    }
    
}
let keyboard = Keyboard.make(createMoneyKeyboard, {
    columns: 1
});

module.exports = {
    keyboard: keyboard,
    money: money,
    pickedMoney: pickedMoney,
    createString: createString
};
