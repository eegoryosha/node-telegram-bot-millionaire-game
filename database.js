const mongoose = require(`mongoose`);
require('dotenv').config();

// ДОСТАЕМ СХЕМУ
const Schema = mongoose.Schema;

const queSchema = Schema({
    question: String,
    answers: Array
});

const userSchema = Schema({
    _id: Number,
    userName: String,
    questionCount: Number,
    passedQuestions: Array,
    currentQuestion: String,
    currentAnswers: Array,
    correctAnswer: String,
    pickedAnswer: String,
    lastMessageId: Object,
    mainMessageId: Object,
    isInGame: Boolean,
    isSecondLife: Boolean,
    prompts: Object,
    pickedMoney: String,
    isButtonBlock: Boolean
}, {
    minimize: false // по умолчанию minimize стоит true, что означает, что пустые объекты на будут заноситься в базу при создании
});


// ДОСТАЕМ МОДЕЛЬ КОЛЛЕКЦИИ 
const questionsLvl0 = mongoose.model('lvl0', queSchema);
const questionsLvl1 = mongoose.model('lvl1', queSchema); // (Название коллекции, Схема)
const questionsLvl2 = mongoose.model('lvl2', queSchema);
const questionsLvl3 = mongoose.model('lvl3', queSchema);
const users = mongoose.model('users', userSchema);


// console.log(typeof(questionsLvl0));
// СОЗДАЕТ И ДОБАВЛЯЕТ
// users.create({
//     _id: 12312333,
//     userName: 'igoryosha',
//     kek: questionsLvl3
// }).then((user)=>{
//     users.find({}).exec(async (err, res)=>{
//         if(err){
//             console.log(err);
//             return;
//         }
//         console.log('res0: '+res[0].userName);   
//     });
//     console.log(user);   
// }).catch(err=>{
//     console.log(err);
// });

//ИЩЕТ И АПДЕЙТИТ
// users.findOneAndUpdate({_id: 369591320}, {
//     userName: 'Я 123123'   
// }).then(()=>{
//     users.find({}).exec((err, res)=>{
//         console.log(res[0].userName); 
//     });
// });

//ДОСТАЕТ ПОЛНУЮ ТАБЛИЦУ
// questionsLvl0.find({}, (err, res)=>{
//     console.log('kek '+res[0].question)
// });

//ПОМЕСТИТЬ ДАННЫЕ В ОТДЕЛЬНУЮ ПЕРЕМЕННУЮ
// async function getRes(){
//     let myDate = await users.find({_id: 369591320});
//     console.log(myDate[0].userName);
// }
// getRes();


// ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ В БАЗУ ДАННЫХ 
async function addOrRefreshUser(userId, userName, callback) {
    users.find({
        _id: userId,
    }, (err, res) => {
        if (res[0] == undefined) {
            users.create({
                _id: userId,
                userName: userName, 
                questionCount: 1,
                passedQuestions: [],
                currentQuestion: '',
                currentAnswers: [],
                correctAnswer: '',
                pickedAnswer: '',
                lastMessageId: {},
                mainMessageId: {},
                isInGame: false,
                isSecondLife: false,
                prompts: {
                    fiftyFifty: true,
                    secondLife: true,
                    changeQuestion: true
                },
                pickedMoney: '',
                isButtonBlock: false
            }).then(()=>{
                if(callback != null){
                    callback();
                }
            });
        } else {
            users.findOneAndUpdate({
                _id: res[0]._id
            }, {
                questionCount: 1,
                passedQuestions: [],
                currentQuestion: '',
                currentAnswers: [],
                correctAnswer: '',
                pickedAnswer: '',
                isInGame: false,
                isSecondLife: false,
                prompts: {
                    fiftyFifty: true,
                    secondLife: true,
                    changeQuestion: true
                },
                pickedMoney: '',
                isButtonBlock: false
            }).then(() => { // почему-то без .then не работает
                if(callback != null){
                   callback();
                }
            });
        }
    }); 
}


async function updateUserData(pushOrReplace, userId, attribute, data, callback) { // callback - то, что будет выполняться после апдейта
    if(pushOrReplace == 'replace'){
        if(attribute.substr(-3, 1) == '[' && isNaN(attribute.substr(-2, 1)) == false && attribute.substr(-1) == ']'){
            let str = attribute.slice(0, -3);
            let index = attribute.substr(-2, 1);
            let attr = str + '.' + index;

            users.findOneAndUpdate({
                _id: userId
            },{
                $set:{
                    [attr]: await data,
                }
            }).then(()=>{
                if(callback != null){
                    callback();
                }
            });
        } else{
            users.findOneAndUpdate({
                _id: userId
            }, {
                [attribute]: await data
            }).then(() => {
                if(callback != null){
                    callback();  
                }
            });
        }
    } else if(pushOrReplace == 'push'){
        users.findOneAndUpdate({
            _id: userId
        }, {
            $push: {
                [attribute]: await data
            } 
        }).then(()=>{
            if(callback != null){
                callback();
            }
        });
    }
}

async function clearMainMessageId(userId, callback){
    users.findOneAndUpdate({
        _id: userId
    },{
        $set:{
            'mainMessageId': {},
        }
    }).then(()=>{
        if(callback != null){
            callback();
        }
    });
}
async function clearLastMessageId(userId, callback){
    users.findOneAndUpdate({
        _id: userId
    },{
        $set:{
            'lastMessageId': {},
        }
    }).then(()=>{
        if(callback != null){
            callback();
        }
    });
}





async function getUserData(userId, attribute) { 
    let data = await users.find({ 
        _id: userId
    }, {
        [attribute]: true+1 // true означает, что это поле будет выводиться, +1 на случай, если мы ищем boolean значения
    }); // find(какого юзера ищем, поля для вывода, функция)
    let stringCode = 'data[0].'+attribute;
    let result = eval(stringCode);
    return result;
}

 


// ДОСТАЕМ ВСЕ ЗАПИСИ ИЗ КОЛЛЕКЦИИ
questionsLvl0.find({}).exec((err, res) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log('res0: ' + res[5].question); // ДОСТАЮ ПЕРВУЮ ЗАПИСЬ В КОЛЛЕКЦИИ Lvl1
});
questionsLvl1.find({}).exec((err, res) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log('res1: ' + res[5].question); // ДОСТАЮ ПЕРВУЮ ЗАПИСЬ В КОЛЛЕКЦИИ Lvl1
});
questionsLvl2.find({}).exec((err, res) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log('res2: ' + res[0].question); // ДОСТАЮ ПЕРВУЮ ЗАПИСЬ В КОЛЛЕКЦИИ Lvl2
});

questionsLvl3.find({}).exec((err, res) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log('res3: ' + res[0].question); // ДОСТАЮ ПЕРВУЮ ЗАПИСЬ В КОЛЛЕКЦИИ Lvl3
});




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









 
// ФУНКЦИЯ ДЛЯ ПОДКЛЮЧЕНИЯ БАЗЫ MONGODB
async function initialize() {
    // ПЕРЕДАЕМ ССЫЛКУ И НАСТРОЙКИ
    await mongoose.connect(process.env.MONGO, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        })
        .then(() => console.log('MongoDB connected'))
        .catch((error) => console.log(error));
}






// ЭКСПОРТЫ
module.exports = {
    initialize: initialize,
    questionsLvl0: questionsLvl0,
    questionsLvl1: questionsLvl1,
    questionsLvl2: questionsLvl2,
    questionsLvl3: questionsLvl3,
    users: users,
    addOrRefreshUser: addOrRefreshUser,
    updateUserData: updateUserData,
    getUserData: getUserData,
    clearMainMessageId: clearMainMessageId,
    clearLastMessageId: clearLastMessageId
};