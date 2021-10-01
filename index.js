const mongoose = require('mongoose');
require('./config/db');

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const router = require('./routes');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore=require('connect-mongo');
const bodyParser=require('body-parser');
const epxressValidator = require('express-validator');
const flash = require('connect-flash');
const createError = require('http-errors');
const passport = require('./config/passport');
mongoose.Promise = global.Promise;

require('dotenv').config({path : 'variables.env'});

const app = express();

//body-parser

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//Validacion de campos

app.use(epxressValidator());

//habilitar handlebars como view

app.engine('handlebars',
    exphbs({
        defaultLayout: 'layout',
        helpers: require('./helpers/handlebars'),
        runtimeOptions:{
            allowProtoPropertiesByDefault:true,
            allowProtoMethodsByDefault:true
        }
    })
);

app.set('view engine','handlebars');

//Static files

app.use(express.static(path.join(__dirname,'public')));

app.use(cookieParser());
app.use(session({
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb+srv://root:root@cluster0.aogzi.mongodb.net/devjobs'})
}));

//Inicializar passport

app.use(passport.initialize());
app.use(passport.session());

//Alertas y flash messages

app.use(flash());

//Crear middleware

app.use((req,res,next)=>{
    res.locals.mensajes=req.flash();
    next();
});



app.use('/',router());

//404 pagina no existente

app.use((req,res,next)=>{
    next(createError(404,'No encontrado'));
})

//Administración de los errores

app.use((error,req,res,next)=>{
    res.locals.mensaje = error.message;
    const status = error.status || 500;
    res.locals.status = status;
    res.status(status);
    res.render('error');
})

//Dejar que heroku asigne el puerto

const host = '0.0.0.0';
const port = process.env.PORT;

app.listen(port,host,()=>{
    console.log('El servidor esta funcionando');
});