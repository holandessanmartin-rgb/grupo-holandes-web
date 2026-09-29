/* ============================================================
   PLANTELES — Grupo Holandés
   Fuente: hoja "Lista de planteles fanpage tiktok ubicación"
   (recursos/) + coordenadas y direcciones del proyecto.
   Para agregar un plantel: añade un objeto; todo lo demás
   (buscador, cercanía, funnel, WhatsApp) funciona solo.
   ============================================================ */
const CAMPUSES = [
  {
    id: 'san-martin-oaxaca',
    nombre: 'Plantel San Martín, Oaxaca',
    slug: 'san-martin-oaxaca',
    ciudad: 'Oaxaca de Juárez',
    estado: 'Oaxaca',
    direccion: 'Tierra y Libertad 100 A, Ejidal, 68144 Oaxaca de Juárez, Oaxaca',
    referencia: 'A 3 cuadras de Plaza Bella',
    latitud: 17.0709913,
    longitud: -96.7545431,
    telefono: '+52 951 567 8678',
    whatsapp: '529515678678',
    email: 'holandes.san.martin@gmail.com',
    facebook: 'https://www.facebook.com/share/18ZNmVAa6D/',
    tiktok: 'https://www.tiktok.com/@escuelamecanicasanmartin',
    mapsUrl: 'https://maps.app.goo.gl/9ARtRCeDxyePNtsYA',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: ['img/planteles/san-martin-oaxaca/motos1.jpeg', 'img/planteles/san-martin-oaxaca/motos4.jpeg'],
    activo: true,
    orden: 1
  },
  {
    id: 'santa-maria-tule',
    nombre: 'Plantel Santa María del Tule',
    slug: 'santa-maria-del-tule',
    ciudad: 'Santa María del Tule',
    estado: 'Oaxaca',
    direccion: 'Privada de la Cruz n. 5, Santa María del Tule, Oaxaca, C.P. 68297',
    referencia: '',
    latitud: 17.0488986,
    longitud: -96.6397517,
    telefono: '+52 951 244 6714',
    whatsapp: '529512446714',
    email: 'escuelaautomotrizdeltule@gmail.com',
    facebook: 'https://www.facebook.com/escuelademecanicaeltule',
    tiktok: 'https://www.tiktok.com/@escuelaholandes',
    mapsUrl: 'https://maps.app.goo.gl/qhRgmxdE5P3XFL4q7',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/escuelaautomotrizdeltule/',
    imagenes: [],
    activo: true,
    orden: 2
  },
  {
    id: 'santa-cruz-xoxocotlan',
    nombre: 'Plantel Santa Cruz Xoxocotlán',
    slug: 'santa-cruz-xoxocotlan',
    ciudad: 'Santa Cruz Xoxocotlán',
    estado: 'Oaxaca',
    direccion: 'Calle Progreso N. 929, Fraccionamiento ICHI-KOLO, Colonia Centro, Santa Cruz Xoxocotlán, C.P. 71230',
    referencia: 'A un costado de la Gasolinera Pemex y el Monte de Piedad, cerca de la Policía Vial',
    latitud: 17.021988,
    longitud: -96.7336239,
    telefono: '+52 951 561 5847',
    whatsapp: '529515615847',
    email: 'grupoholandesxoxo@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=100063788365063',
    tiktok: 'https://www.tiktok.com/@grupo_holandes_xoxo',
    mapsUrl: 'https://maps.app.goo.gl/BYkQhEtEirPAR2Lp6?g_st=awb',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/escuelademecanicaxoxo',
    imagenes: [],
    activo: true,
    orden: 3
  },
  {
    id: 'zimatlan-alvarez',
    nombre: 'Plantel Zimatlán de Álvarez',
    slug: 'zimatlan-de-alvarez',
    ciudad: 'Zimatlán de Álvarez',
    estado: 'Oaxaca',
    direccion: 'García Vigil #400, San Lorenzo, Zimatlán de Álvarez, Oaxaca',
    referencia: '',
    latitud: 16.8657107,
    longitud: -96.7823507,
    telefono: '+52 951 184 2843',
    whatsapp: '529511842843',
    email: 'mecanicaholandeszimatlan@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=61577364175503',
    tiktok: 'https://www.tiktok.com/@mecanicaholandesz',
    mapsUrl: 'https://maps.app.goo.gl/oweskxvPE5ysgCR17',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicaghzimatlan/',
    imagenes: [],
    activo: true,
    orden: 4
  },
  {
    id: 'ocotlan-morelos',
    nombre: 'Plantel Ocotlán de Morelos',
    slug: 'ocotlan-de-morelos',
    ciudad: 'Ocotlán de Morelos',
    estado: 'Oaxaca',
    direccion: 'Puerto Ángel SN, Morelos',
    referencia: '',
    latitud: 16.7956,
    longitud: -96.6744,
    telefono: '',
    whatsapp: '529513143703',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61586800357027',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 5
  },
  {
    id: 'miahuatlan-diaz',
    nombre: 'Plantel Miahuatlán de Porfirio Díaz',
    slug: 'miahuatlan-de-porfirio-diaz',
    ciudad: 'Miahuatlán de Porfirio Díaz',
    estado: 'Oaxaca',
    direccion: 'Ejército Nacional 283, Benito Juárez, 70805 Miahuatlán de Porfirio Díaz, Oaxaca',
    referencia: '',
    latitud: 16.3494615,
    longitud: -96.5994194,
    telefono: '+52 951 425 0632',
    whatsapp: '529514250632',
    email: 'grupoholandesmiahuatlan@gmail.com',
    facebook: 'https://www.facebook.com/share/1F9iWZZdDD/',
    tiktok: 'https://www.tiktok.com/@miahuatlan.grupoholandes',
    mapsUrl: 'https://maps.app.goo.gl/Kg1cth2xViQSYKpC7',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/grupoholandesmiahuatlan',
    imagenes: [],
    activo: true,
    orden: 6
  },
  {
    id: 'puerto-escondido',
    nombre: 'Plantel Puerto Escondido',
    slug: 'puerto-escondido',
    ciudad: 'Puerto Escondido',
    estado: 'Oaxaca',
    direccion: 'Barra de Navidad',
    referencia: '',
    latitud: 15.872,
    longitud: -97.0767,
    telefono: '+52 951 314 3703',
    whatsapp: '529513143703',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61578060667176',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 7
  },
  {
    id: 'pinotepa-nacional',
    nombre: 'Plantel Pinotepa Nacional',
    slug: 'pinotepa-nacional',
    ciudad: 'Pinotepa Nacional',
    estado: 'Oaxaca',
    direccion: 'Pinotepa Nacional',
    referencia: '',
    latitud: 16.3428,
    longitud: -98.0519,
    telefono: '',
    whatsapp: '529513143703',
    email: '',
    facebook: 'https://www.facebook.com/escuelaholandespinotepa',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 8
  },
  {
    id: 'putla-guerrero',
    nombre: 'Plantel Putla Villa de Guerrero',
    slug: 'putla-villa-de-guerrero',
    ciudad: 'Putla Villa de Guerrero',
    estado: 'Oaxaca',
    direccion: 'Calle México Num. 9, Barrio Palo de Obo, Putla de Guerrero, Oaxaca',
    referencia: '',
    latitud: 17.0222727,
    longitud: -97.9259081,
    telefono: '+52 951 470 1010',
    whatsapp: '529514701010',
    email: 'escuelaautomotrizdeltule@hotmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=100063545187105',
    tiktok: 'https://www.tiktok.com/@mecnica.automotri2',
    mapsUrl: 'https://www.google.com/maps/place/Escuela+De+Mec%C3%A1nica+Automotriz+Grupo+Holand%C3%A9s/@17.0222727,-97.9259081,17z',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 9
  },
  {
    id: 'huajuapan-leon',
    nombre: 'Plantel Huajuapan de León',
    slug: 'huajuapan-de-leon',
    ciudad: 'Huajuapan de León',
    estado: 'Oaxaca',
    direccion: 'Calle Galeana #25, Colonia Centro, Heroica Ciudad de Huajuapan de León, Oaxaca',
    referencia: '',
    latitud: 17.8072,
    longitud: -97.7837,
    telefono: '+52 953 171 2465',
    whatsapp: '529531712465',
    email: 'escuelaautomotrizhuajuapan@hotmail.com',
    facebook: 'https://escuela-de-mecanica-automotriz-diesel-y-gasolina-grupo.negocio.site',
    tiktok: 'https://www.tiktok.com/@grupoholandes267',
    mapsUrl: 'https://www.bing.com/maps/search?v=2&pc=FACEBK&mid=8100&mkt=es-MX&q=GALEANA25%2C+Heroica+Ciudad+de+Huajuapan+de+Le%C3%B3n+Centro%2C+Mexico%2C+69000&cp=17.751676%7E-97.491839',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00 · Licenciatura en Ingeniería Automotriz: jue–vie 8:00–14:00 · Bachillerato: lun, mié, vie 12:00–15:00',
    imagenes: [],
    activo: true,
    orden: 10
  },
  {
    id: 'tuxtepec',
    nombre: 'Plantel San Juan Bautista Tuxtepec',
    slug: 'san-juan-bautista-tuxtepec',
    ciudad: 'San Juan Bautista Tuxtepec',
    estado: 'Oaxaca',
    direccion: 'Av. 5 de Mayo #420 entre Rayón e Hidalgo, Col. Centro, Tuxtepec, Oaxaca',
    referencia: '',
    latitud: 18.0874632,
    longitud: -96.1227767,
    telefono: '+52 287 128 5361',
    whatsapp: '522871285361',
    email: 'escuelaautomotriztuxtepec1@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=100083378160643',
    tiktok: 'https://www.tiktok.com/@escuelautomotriztux',
    mapsUrl: 'https://share.google/LaLCJgY257JlT5A0P',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 11
  },
  {
    id: 'juchitan-zaragoza',
    nombre: 'Plantel Juchitán de Zaragoza',
    slug: 'juchitan-de-zaragoza',
    ciudad: 'Juchitán de Zaragoza',
    estado: 'Oaxaca',
    direccion: 'Calle los Robles entre Frambollanes, Fraccionamiento Reforma, Juchitán de Zaragoza, Oaxaca',
    referencia: '',
    latitud: 16.4344,
    longitud: -95.0208,
    telefono: '+52 971 729 8631',
    whatsapp: '529717298631',
    email: 'escuelaautomotrizjuchitan@gmail.com',
    facebook: 'https://www.facebook.com/share/19hSWdSLr9/',
    tiktok: 'https://www.tiktok.com/@mecanicaholandesjuchitan',
    mapsUrl: 'https://maps.app.goo.gl/9A6ZXhNSv5oVVZoS6',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/escuelamecanicajuchitan',
    imagenes: [],
    activo: true,
    orden: 12
  },
  {
    id: 'ejutla-crespo',
    nombre: 'Plantel Ejutla de Crespo',
    slug: 'ejutla-de-crespo',
    ciudad: 'Ejutla de Crespo',
    estado: 'Oaxaca',
    direccion: 'Calle 20 de Noviembre 763, C.P. 71500, Vista Hermosa, Ejutla de Crespo, Oaxaca',
    referencia: '',
    latitud: 16.5976679,
    longitud: -96.6608337,
    telefono: '+52 951 112 3419',
    whatsapp: '529511123419',
    email: 'Grupoholandes.ejutla@gmail.com',
    facebook: 'https://www.facebook.com/profile',
    tiktok: 'https://www.tiktok.com/@mecanica.gh.ejutl',
    mapsUrl: 'https://maps.app.goo.gl/KbmkuT8HVEMpiR5o7',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 13
  },
  {
    id: 'tlaxiaco',
    nombre: 'Plantel Tlaxiaco',
    slug: 'tlaxiaco',
    ciudad: 'Tlaxiaco',
    estado: 'Oaxaca',
    direccion: 'Calle Jacarandas núm. 19, Barrio San Sebastián, Tlaxiaco, Oaxaca',
    referencia: '',
    latitud: 17.2696919,
    longitud: -96.6886497,
    telefono: '+52 953 171 2465',
    whatsapp: '529531712465',
    email: 'mecanicaautomotriztlaxiaco@gmail.com',
    facebook: 'https://www.facebook.com/EscuelaDeMecanicaTlaxiaco',
    tiktok: 'https://www.tiktok.com/@mecanicatlaxiaco',
    mapsUrl: 'https://maps.app.goo.gl/6owhFMmHV6qL5gWM8',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicatlaxiaco',
    imagenes: [],
    activo: true,
    orden: 14
  },
  {
    id: 'tierra-blanca',
    nombre: 'Plantel Tierra Blanca',
    slug: 'tierra-blanca',
    ciudad: 'Tierra Blanca',
    estado: 'Veracruz',
    direccion: 'Calle Mártires de Chicago #17B, Colonia Obrera, Tierra Blanca, Veracruz',
    referencia: '',
    latitud: 18.4507,
    longitud: -96.3578,
    telefono: '+52 274 118 4468',
    whatsapp: '522741184468',
    email: 'mecanicaholandestierrablanca@gmail.com',
    facebook: 'https://www.facebook.com/share/1J353tMCEA/',
    tiktok: 'https://www.tiktok.com/@mecanicaholandesti',
    mapsUrl: 'https://maps.app.goo.gl/stpk6SyKQGTceYG98?g_st=awb',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 15
  },
  {
    id: 'tehuacan',
    nombre: 'Plantel Tehuacán',
    slug: 'tehuacan',
    ciudad: 'Tehuacán',
    estado: 'Puebla',
    direccion: 'Calle 2 Norte #405, Colonia Ignacio Zaragoza, Tehuacán, Puebla',
    referencia: '',
    latitud: 18.4658011,
    longitud: -97.3978348,
    telefono: '+52 230 103 4203',
    whatsapp: '522301034203',
    email: 'haromiguelharo@gmail.com',
    facebook: 'https://www.facebook.com/share/1QDXiSp6Ca/',
    tiktok: 'https://www.tiktok.com/@mecanicaholandes',
    mapsUrl: 'https://maps.app.goo.gl/ijRqJ8g6YGkGAYmu6',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00, 15:00–17:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 16
  },
  {
    id: 'ometepec',
    nombre: 'Plantel Ometepec',
    slug: 'ometepec',
    ciudad: 'Ometepec',
    estado: 'Guerrero',
    direccion: 'Ometepec',
    referencia: '',
    latitud: 16.6867,
    longitud: -98.4056,
    telefono: '',
    whatsapp: '529513143703',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61591521839835',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 17
  },
  {
    id: 'villahermosa',
    nombre: 'Plantel Villahermosa',
    slug: 'villahermosa',
    ciudad: 'Villahermosa',
    estado: 'Tabasco',
    direccion: 'Sánchez Magallanes 1204, Centro, Villahermosa, Tabasco, C.P. 86000',
    referencia: '',
    latitud: 17.9750389,
    longitud: -92.9513741,
    telefono: '+52 993 167 2561',
    whatsapp: '529931672561',
    email: 'escuelademecanicavillahermosa@gmail.com',
    facebook: 'https://www.facebook.com/share/19XFTnB6Aj/',
    tiktok: 'https://www.tiktok.com/@grupoholandesvhs',
    mapsUrl: 'https://maps.app.goo.gl/JasHDmKCUJrTyLr36?g_st=ic',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00, 15:00–17:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00',
    instagram: '',
    imagenes: [],
    activo: true,
    orden: 18
  },
  {
    id: 'cemas-licenciatura',
    nombre: 'Plantel CEMAS — Licenciatura en Ingeniería en Mecánica Automotriz',
    slug: 'cemas',
    ciudad: 'Santa María del Tule',
    estado: 'Oaxaca',
    direccion: 'Privada de la Cruz N. 5, Santa María del Tule, Oaxaca',
    referencia: 'Centro Educativo de Mecánica Automotriz del Sureste',
    latitud: 17.0487494,
    longitud: -96.6397995,
    telefono: '+52 951 477 7094',
    whatsapp: '529514777094',
    email: 'mecanicaautomotrizdelsureste@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=61584241204914',
    tiktok: 'https://www.tiktok.com/@ingeniera.mecanic7',
    instagram: 'https://www.instagram.com/ingmecanicadelsureste',
    mapsUrl: 'https://maps.app.goo.gl/G62LwgWRGEhgcFdq6',
    especialidades: ['mecanica-automotriz'],
    horario: 'Atención personalizada: consultar directamente con Ing. Emmanuel',
    imagenes: [],
    activo: true,
    orden: 19
  },
];

function getCampusById(id) {
  return CAMPUSES.find(c => c.id === id);
}

function getCampusesBySpecialty(specialtyId) {
  return CAMPUSES.filter(c => c.activo && c.especialidades.includes(specialtyId));
}

function getAllActiveCampuses() {
  return CAMPUSES.filter(c => c.activo).sort((a, b) => a.orden - b.orden);
}

function getCampusForWhatsApp(campusId) {
  const campus = getCampusById(campusId);
  return campus ? campus.whatsapp : null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestCampus(userLat, userLon, specialtyId = null) {
  let campuses = getAllActiveCampuses();
  if (specialtyId) {
    campuses = campuses.filter(c => c.especialidades.includes(specialtyId));
  }
  const withDistance = campuses
    .filter(c => typeof c.latitud === 'number' && typeof c.longitud === 'number')
    .map(c => ({
      ...c,
      distancia: calculateDistance(userLat, userLon, c.latitud, c.longitud)
    }))
    .sort((a, b) => a.distancia - b.distancia);
  return withDistance;
}

function searchCampuses(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return getAllActiveCampuses();
  return getAllActiveCampuses().filter(c =>
    c.nombre.toLowerCase().includes(q) ||
    c.ciudad.toLowerCase().includes(q) ||
    c.estado.toLowerCase().includes(q) ||
    c.direccion.toLowerCase().includes(q) ||
    (c.referencia || '').toLowerCase().includes(q)
  );
}

function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} metros`;
  }
  return `${km.toFixed(1)} km`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CAMPUSES,
    getCampusById,
    getCampusesBySpecialty,
    getAllActiveCampuses,
    getCampusForWhatsApp,
    calculateDistance,
    findNearestCampus,
    searchCampuses,
    formatDistance
  };
}
