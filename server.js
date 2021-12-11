const TelegramBot = require('node-telegram-bot-api');
const { getVacunatorios } = require('./services/reservas');
const ReservaService = require('./services/reservas');

// replace the value below with the Telegram token you receive from @BotFather
const token = '1785809850:AAEQ61o2w_vmUmA-UXkiGDC77lVay4MO8RQ';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

const globalStatus = new Map();

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
  try{
    console.log(msg.text.trim());
    const chatId = msg.chat.id;

    var chatStatus = globalStatus.get(chatId);

    handleChatStatus(chatId, msg, chatStatus);
  }catch(error){
    console.log(error);
  }
});

const handleChatStatus = (chatId, msg, status) => {
  if(!status){
    bot.sendMessage(chatId, "Hola! Bienvenido al bot de vacunación.\n\nEste bot fue creado con fines académicos para el laboratorio TSE.\n\nPara crear una reserva de vacunación escriba \"reservar\". \nPuede volver a este menú enviando el mensaje \"menu\"");    
    status = {
      
    }
    globalStatus.set(chatId, status);
    return;
  }

  if(msg.text.trim() === 'menu'){
    globalStatus.delete(chatId);
    bot.sendMessage(chatId, "Hola! Bienvenido al bot de vacunación.\n\nEste bot fue creado con fines académicos para el laboratorio TSE.\n\nPara crear una reserva de vacunación escriba \"reservar\". \nPuede volver a este menú enviando el mensaje \"menu\"");    
    return;
  }

  if(!status.request){
    if(msg.text.trim() === 'reservar'){
      bot.sendMessage(chatId, "A continuación introduzca su cédula de identidad, sin puntos ni guiones. (Ej: 12345678)");
      status = {
        request: 'reservar',
        step: 1
      }
      globalStatus.set(chatId, status)
      return;
    }
  }

  if(status.request == 'reservar'){
    handleReservarRequest(chatId, msg, status);
  }
}

const handleReservarRequest = (chatId, msg, status) => {
  if(status.step == 1){
    //input cedula
    var ci = msg.text.trim();
    if(ci.length > 8 || isNaN(ci)){
      bot.sendMessage(chatId, "La cédula ingresada no es válida, ingrese su cédula sin puntos ni guiones incluyendo dígito verificador. (Ej: 12345678)");
      return;
    }
    status.solicitud = {
      ci: ci
    }
    status.step = 2;
    ReservaService.getEnfermedades()
    .then((response) => {
      console.log(response.data);
      var enfermedades = [];
      var enfermedadesMsg = "Usted se encuentra habilitado/a para agendar una vacunación para las siguientes enfermedades:";
      for(v of response.data){
        enfermedades[v.id] = v.nombre;
        enfermedadesMsg += "\n\n" + v.id + " - " + v.nombre;
      }
      enfermedadesMsg += "\n\nIngrese el número de la enfermedad contra la que desea vacunarse.";
      status.agendas = enfermedades;
      bot.sendMessage(chatId, enfermedadesMsg);
    }).catch((error) => {
      console.log(error);
      bot.sendMessage(chatId, "Lo sentimos usted no se encuentra habilitado para vacunarse contra ninguna enfermedad.");
    })
    return;
  }else if (status.step == 2){
    var agenda = msg.text.trim() 

    if(isNaN(agenda)){
      bot.sendMessage(chatId, "El número ingresado no es válido\n\nUsted se encuentra habilitado/a para agendar una vacunación para las siguientes enfermedades:\n\n1-Covid19\n\nIngrese el número de la enfermedad contra la que desea vacunarse.");
      return;
    }

    status.solicitud.idAgenda = agenda;
    status.step = 3;

    bot.sendMessage(chatId, "Ingrese una dirección de correo electrónico.\nRecibirá un correo a esta dirección cuando se confirme la fecha y hora de su solicitud.");
    return;
  }else if(status.step == 3){
    var email = msg.text.trim();

    if(!validateEmail(email)){
      bot.sendMessage(chatId, "La dirección de correo electrónico no tiene un formato correcto.\n\nIngrese una dirección de correo electrónico.\nRecibirá un correo a esta dirección cuando se confirme la fecha y hora de su solicitud.");
      return;
    }

    status.solicitud.email = email;
    status.step = 4;
    bot.sendMessage(chatId, "Escriba el nombre del departamento en el que desea vacunarse.");
    return;
  }else if(status.step == 4){
    var departamentoMsg = msg.text.trim();
    var departamento = departamentoMsg.toUpperCase().replace(" ", "_");
    console.log(departamento);

    if(!validateDepartamento(departamento)){
      bot.sendMessage(chatId, "El departamento que escribió no es correcto.\n\nEscriba el nombre del departamento en el que desea vacunarse.");
      return;
    }

    status.solicitud.departamento = departamento;
    status.step = 5;
    ReservaService.getVacunatorios(departamentoMsg.replace(" ", ""))
      .then((response) => {
        console.log(response.data);
        var vacunatorios = [];
        var vacunatoriosMsg = "Elija en que vacunatorio desea vacunarse:";
        for(v of response.data){
          vacunatorios[v.id] = v.nombre;
          vacunatoriosMsg += "\n\n" + v.id + " - " + v.nombre;
        }
        status.vacuatorios = vacunatorios;
        bot.sendMessage(chatId, vacunatoriosMsg);
      }).catch((error) => {
        console.log(error);
        bot.sendMessage(chatId, "Lo sentimos ocurrió un error al procesar la lista de vacunatorios disponibles. Inténtelo más tarde");
      })
    
    return;
  }else if(status.step == 5){
    var idVacuntorio = msg.text.trim();

    status.solicitud.idVacunatorio = idVacuntorio;
    status.step = 6;
    bot.sendMessage(chatId, "Elija en que horario desea vacunarse:\n\n1 - 8hs a 14hs\n\n2 - 14hs a 22hs");
    return;
  }else if(status.step == 6){
    var horarioOption = msg.text.trim();
    var horario;
    if(horarioOption == "1"){
      horario = "MATUTINO";
    }else if(horarioOption == "2"){
      horario = "VESPERTINO";
    }else{
      bot.sendMessage(chatId, "Elija en que horario desea vacunarse:\n\n1 - 8hs a 14hs\n\n2 - 14hs a 22hs");
      return;
    }
    status.horarios = {
      1: "8hs a 14hs",
      2: "14hs a 22hs"
    }
    status.solicitud.horario = horario;
    status.step = 7;
    status.confirmacion =  "Datos de la solicitud:\n\nCédula: " + status.solicitud.ci + "\nCorreo: " + status.solicitud.email + 
          "\nEnfermedad: " + status.agendas[status.solicitud.idAgenda] + 
          "\nDepartamento: " + status.solicitud.departamento + "\nVacunatorio: " + status.vacuatorios[status.solicitud.idVacunatorio] + 
          "\nHorario: " + status.horarios[horarioOption] + "\n\n¿Confirma esta solicitud? (si/no)";
    bot.sendMessage(chatId, status.confirmacion);
    return;
  }else if(status.step == 7){
    var confirmacion = msg.text.trim();

    if(confirmacion.toLowerCase() == "si"){
      ReservaService.nuevaSolicitud(status.solicitud)
      .then(() => {
        bot.sendMessage(chatId, "Solicitud registrada con éxito.\nSerá notificado vía email cuando se confirme la fecha y la hora de su vacunación.");
      })
      .catch((error) => {
        console.log(error);
        bot.sendMessage(chatId, "Ocurrió un error al registrar la solicitud.\nPor favor contacte a los administradores del bot.");
      });     

    }else if(confirmacion.toLowerCase() == "no"){
      globalStatus.delete(chatId);
      bot.sendMessage(chatId, "Hola! Bienvenido al bot de vacunación.\n\nEste bot fue creado con fines académicos para el laboratorio TSE.\n\nPara crear una reserva de vacunación escriba \"reservar\". \nPuede volver a este menú enviando el mensaje \"menu\"");    
      return;
    }else{
      bot.sendMessage(chatId, status.confirmacion);
      return;
    }
  }
  
}

const validateEmail = (email) => {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

const validateDepartamento = (departamento) => {
  return true;
}