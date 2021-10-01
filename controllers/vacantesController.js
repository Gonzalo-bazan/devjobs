const mongoose = require('mongoose');
const Vacante = mongoose.model('Vacante');
const multer = require('multer');
const shortid = require('shortid');

exports.formularioNuevaVacante=(req,res)=>{
    res.render('nueva-vacante',{
        nombrePagina: 'Nueva Vacante',
        tagline: 'Llena el formulario y publica tu vacante',
        cerrarSesion:true,
        nombre:req.user.nombre,
        imagen: req.user.imagen
    });
}

//Agregar vacantes a la BBDD

exports.agregarVacante=async(req,res)=>{
    const vacante = new Vacante(req.body);

    //Usuario autor de la vacante

    vacante.autor = req.user._id;

    //Crear arreglo de skills

    vacante.skills = req.body.skills.split(',');

    //Almacenar en la BBDD

    const nuevaVacante = await vacante.save();

    //Redireccionar 
    res.redirect(`/vacantes/${nuevaVacante.url}`);

    
}

//Mostrar una vacante

exports.mostrarVacante = async (req,res,next)=>{
    const vacante = await Vacante.findOne({url: req.params.url}).populate('autor');

    //No hay resultados

    if(!vacante) return next();

    res.render('vacante',{
        vacante,
        nombrePagina: vacante.titulo,
        barra: true
    })
}

exports.formEditarVacante=async (req,res,next)=>{
    const vacante = await Vacante.findOne({url: req.params.url}).lean();

    if(!vacante) return next();

    res.render('editar-vacante',{
        vacante,
        nombrePagina: `Editar - ${vacante.titulo}`,
        cerrarSesion:true,
        nombre:req.user.nombre,
        imagen: req.user.imagen
    });
}

exports.editarVacante = async(req,res)=>{
    const vacanteActualizada = req.body;

    vacanteActualizada.skills = req.body.skills.split(',');

    const vacante = await Vacante.findOneAndUpdate({url: req.params.url}, vacanteActualizada,{
        new: true,
        runValidators: true
    });

    res.redirect(`/vacantes/${vacante.url}`);

}

//Validar y Sanitizar los campos de las nuevas vacantes


exports.validarVacante = (req,res,next)=>{
    //Sanitizar los campos

    req.sanitizeBody('titulo').escape();
    req.sanitizeBody('empresa').escape();
    req.sanitizeBody('ubicacion').escape();
    req.sanitizeBody('salario').escape();
    req.sanitizeBody('contrato').escape();
    req.sanitizeBody('skills').escape();

    //Validar 

    req.checkBody('titulo','Agrega un Título a la vacante').notEmpty();
    req.checkBody('empresa','Agrega un Empresa').notEmpty();
    req.checkBody('ubicacion','Agrega una Ubicación').notEmpty();
    req.checkBody('contrato','Selecciona el tipo de Contrato').notEmpty();
    req.checkBody('skills','Agrega al menos una habilidad').notEmpty();

    const errores = req.validationErrors();

    if(errores){
        //Recargar vista con los errores
        req.flash('error',errores.map(error=>error.msg));

        res.render('nueva-vacante',{
            nombrePagina: 'Nueva Vacante',
            tagline: 'Llena el formulario y publica tu vacante',
            cerrarSesion:true,
            nombre:req.user.nombre,
            mensajes: req.flash()
        });


    }

    next();

}

exports.eliminarVacante = async (req,res)=>{
    const { id } = req.params;

    const vacante = await Vacante.findById(id);

    if(verificarAutor(vacante,req.user)){
        //Todo bien, si es el usuario eliminar
        vacante.remove();
        res.status(200).send('Vacante eliminada correctamente');
    }else{
        //No permitido
        res.status(403).send('Error')
    }
    
    
    
}

const verificarAutor = (vacante={},usuario={})=>{
    if(!vacante.autor.equals(usuario._id)){
        return false
    }

    return true;

}

//Subir archivos en pdf

exports.subirCV = (req,res,next)=>{
    upload(req,res,function(error){
        
        if(error){
            
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error','El archivo es muy grande, máximo 100kb');
                }else{
                    req.flash('error',error.message);
                }
            }else{
                req.flash('error',error.message);
            }

            res.redirect('back');
            return;
        }else{
            next();
        }
        
    });

    
}

//Opciones de Multer

const configuracionMulter = {
    limits : {fileSize : 100000},
    storage: fileStorage = multer.diskStorage({
        destination: (req,file,cb)=>{
            cb(null,__dirname+'../../public/uploads/cv');
        },
        filename: (req,file,cb)=>{
            const extension = file.mimetype.split('/')[1];
            cb(null,`${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req,file,cb){
        if(file.mimetype=== 'application/pdf'){
            //El callback se ejecuta como true o false: true cuando la imagen se acepta

            cb(null,true);
        }else{
            cb(new Error('Formato no válido'),false);
        }
    }
    
}

const upload = multer(configuracionMulter).single('cv');

//Almacenar los candidatos en la BBDD
exports.contactar = async (req,res,next) =>{
    
    const vacante = await Vacante.findOne({url: req.params.url});

    //Si no existe la vacante

    if(!vacante) return next();

    //Todo bien, construir el nuevo objeto

    const nuevoCandidato = {
        nombre: req.body.nombre,
        email: req.body.email,
        cv: req.file.filename
    }

    //Almacenar la vacante

    vacante.candidatos.push(nuevoCandidato);
    await vacante.save();

    //Mensaje flash y redirección

    req.flash('correcto','Se envió tu CV correctamente');

    res.redirect('/');

    
}

exports.mostrarCandidatos =async (req,res,next)=>{
    const vacante = await Vacante.findById(req.params.id);

    if(vacante.autor!=req.user._id.toString()){
        return next();
    }

    if(!vacante){
        return next();
    }

    res.render('candidatos',{
        nombrePagina : `Candidatos Vacante - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        candidatos: vacante.candidatos
    });

    


}

exports.buscarVacantes = async (req,res)=>{
    const vacantes = await Vacante.find({
        $text:{
            $search : req.body.q
        }
    });

    //Mostrar vacantes

    res.render('home',{
        nombrePagina: `Resultados para la búsqueda : ${req.body.q}`,
        barra: true,
        vacantes
    })
}