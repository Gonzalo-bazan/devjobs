const emailConfig = require('../config/email');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const util = require('util');
const { send } = require('process');

let transport = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
    }
});

//Utilizar templates de handlebars

transport.use('compile',hbs({
    viewEngine: 'handlebars',
    viewPath: __dirname+'/../views/emails',
    extName:'.handlebars'
}));


exports.enviar = async(opciones)=>{
    const opcionesEmail = {
        from: 'devJobs <noreply@devjobs.com>',
        to: opciones.usuario.email,
        subject: opciones.subject,
        template: opciones.archivo,
        context: {
            resetUrl: opciones.resetUrl
        }
    }

    const sendMail = util.promisify(transport.sendMail,transport);
    return sendMail.call(transport,opcionesEmail);
}


