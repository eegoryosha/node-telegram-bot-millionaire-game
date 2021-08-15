// ------------------------------ ИМПОРТЫ ---------------------------------
const { Keyboard, Key } = require('telegram-keyboard');





// ------------------------------ МАССИВ С ВОЗМОЖНЫМ ВЫБОРОМ НЕСГОРАЕМОЙ СУММЫ ---------------------------------
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
 




// ------------------------------ СОЗДАНИЕ СООБЩЕНИЯ С ВЫБОРОМ СУММЫ ---------------------------------
function createString(pick, current) { // (несгораемая сумма, номер текущего вопроса)
    let string = '';
    
    for(let i = money.length - 1; i >= 0; i--) {
        if ((money[i] == pick || i == money.length-1) && i != current) {    
            string += `<b>${money[i]}</b>\n`;  
        } else if (i == current && money[i] != pick && i != money.length-1) {
            string += `${money[i]} ❗\n`; 
        } else if (i == current && (money[i] == pick || i == money.length-1)) {
            string += `<b>${money[i]}</b> ❗\n`;
        } else {
            string += `${money[i]}\n`;
        }
    }

    return string;
}

let moneyKeyboard = [];
for (let i = money.length - 1; i >= 0; i--){
    if (i == money.length - 1) {
        moneyKeyboard.push(Key.callback(i + 1 + '. ' + money[i], 'pick_sum_again'));
    }
    else {
        moneyKeyboard.push(Key.callback(i + 1 + '. ' + money[i], money[i]));
    }
}
let keyboard = Keyboard.make(moneyKeyboard, {
    columns: 1
});

module.exports = {
    keyboard: keyboard,
    money: money,
    createString: createString
};
