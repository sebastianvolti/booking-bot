const axios = require('axios');

module.exports = { 
  nuevaSolicitud: function (solicitud) {
    const request = {
        url: "/reservas-web/api/solicitudes/",
        method: "post",
        baseURL: "http://reservas07.web.elasticloud.uy",
        data: solicitud
    };
    return axios(request);
  },
  getVacunatorios: function(departamento){
    const request = {
      url: "/reservas-web/api/backoffice/vacunatorios",
      params: {
        departamento: departamento
      },
      method: "get",
      baseURL: "http://reservas07.web.elasticloud.uy",
    };
    return axios(request);
  },
  getEnfermedades: function(){
    const request = {
      url: "reservas-web/api/backoffice/enfermedades",
      method: "get",
      baseURL: "http://reservas07.web.elasticloud.uy",
    };
    return axios(request);
  }
}