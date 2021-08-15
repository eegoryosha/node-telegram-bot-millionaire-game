// ------------------------------ ИМПОРТЫ ---------------------------------
const mongoose = require(`mongoose`);
require('dotenv').config();





// ------------------------------ РАБОТА СО СХЕМАМИ ---------------------------------
const Schema = mongoose.Schema; 

// схема вопросов
const queSchema = Schema({
    question: String, // текст вопроса
    answers: Array // массив с вариантами ответа
});

// схема пользователя
const userSchema = Schema({
    _id: Number, // уникальный идентификатор
    userName: String, // логин пользователя
    userNickname: String, // никнейм пользователя
    userStatistic: Object, // статистика пользователя
    currentGame: Object, // данные текущей игры
    messages: Object, // сообщения в чате
    isButtonBlock: Boolean,  // заблокированы ли кнопки
    activeScene: String, // активная сцена
}, {
    minimize: false // по умолчанию minimize стоит true, что означает, что пустые объекты не будут заноситься в базу при создании
});

// модели из коллекций 
const questionsLvl0 = mongoose.model('lvl0', queSchema);
const questionsLvl1 = mongoose.model('lvl1', queSchema);  
const questionsLvl2 = mongoose.model('lvl2', queSchema);
const questionsLvl3 = mongoose.model('lvl3', queSchema);
const users = mongoose.model('users', userSchema);





// ------------------------------ ПОДКЛЮЧЕНИЕ БД ---------------------------------
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





// ------------------------------ РАБОТА С БД ---------------------------------
// добавление пользователя в бд
function createNewUser(userId, userName, callback){
    users.create({
        _id: userId, 
        userName: userName, 
        userNickname: '', 
        userStatistic: {
            winSum: 0, 
            gameCount: 0 
        },
        currentGame: {
            questionCount: 1,
            currentQuestion: '',
            passedQuestions: [],
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
        },
        messages: {
            lastMessageId: {},
            mainMessageId: {},
        },  
        isButtonBlock: false,
        activeScene: 'enter_your_name'
    }).then(()=>{
        if(callback != null){
            callback();
        }
    });
}

// обнуление данных пользователя
function refreshUserData(userId, callback) {
    users.findOneAndUpdate({
        _id: userId
    }, {
        currentGame: {
            questionCount: 1,
            currentQuestion: '',
            passedQuestions: [],
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
        },
        isButtonBlock: false,
        activeScene: 'hello_scene'
    }).then(() => { // без .then не работает
        if(callback != null){
           callback(); 
        }
    });
}

// апдейт данных пользователя
function updateUserData(userId, attribute, data, callback) { // callback - то, что будет выполняться после апдейта
    users.findOneAndUpdate({
        _id: userId
    }, {
        [attribute]: data
    }).then(() => {
        if(callback != null){
            callback();  
        }
    });
}

// пуш данных в массив 
function pushUserData(userId, attribute, data, callback) {
    users.findOneAndUpdate({
        _id: userId
    }, {
        $push: {
            [attribute]: data
        } 
    }).then(()=>{
        if(callback != null){
            callback();
        }
    });
}

// получение данных пользователя
async function getUserData(userId, attribute) { 
    let data = await users.find({ 
        _id: userId
    }, {
        [attribute]: true + 1 // true означает, что это поле будет выводиться, +1 на случай, если мы ищем boolean значения
    }); // find(какого юзера ищем, поля для вывода, функция)
    let stringCode = 'data[0].'+ attribute; // т.к. attribute - строка, которая может иметь несколько вложенностей для поиска объекта, 
                                            // необходимо сделать строчку, которую eval преобразует в код
    let result = eval(stringCode); 
    return result;
}

// удаление главного сообщения в БД
async function removeMainMessage(userId, callback){
    users.findOneAndUpdate({
        _id: userId
    },{
        $set:{
            'messages.mainMessageId': {},
        }
    }).then(()=>{
        if(callback != null){
            callback();
        }
    });
}

// удаление последнего сообщения в БД
function removeLastMessage(userId, callback){
    users.findOneAndUpdate({
        _id: userId
    },{
        $set:{
            'messages.lastMessageId': {},
        }
    }).then(()=>{
        if(callback != null){
            callback();
        }
    });
}

// проверка на существование пользователя в БД
async function checkUserExists(userId){
    let arr = await users.find({_id: userId});
    if(arr[0] == undefined){
        return false;
    }else{
        return true;
    }
}

// проверка, есть ли такой никнейм в БД
async function checkUserNickname(nickname){
    let regex = new RegExp(nickname, 'i'); // игнор регистра
    let arr = await users.find({userNickname: regex});
    if(arr[0] == undefined){
        return false;
    } else{
        return true;
    }
}





module.exports = {
    initialize: initialize,
    questionsLvl0: questionsLvl0,
    questionsLvl1: questionsLvl1,
    questionsLvl2: questionsLvl2,
    questionsLvl3: questionsLvl3,
    users: users,
    updateUserData: updateUserData,
    getUserData: getUserData,
    removeMainMessage: removeMainMessage,
    removeLastMessage: removeLastMessage,
    checkUserExists: checkUserExists,
    checkUserNickname: checkUserNickname,
    createNewUser: createNewUser,
    refreshUserData: refreshUserData,
    pushUserData: pushUserData
};












