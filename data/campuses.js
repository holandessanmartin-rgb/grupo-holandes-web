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
    whatsapp: '529515678678',
    email: 'holandes.san.martin@gmail.com',
    facebook: 'https://www.facebook.com/share/18ZNmVAa6D/',
    tiktok: 'https://www.tiktok.com/@escuelamecanicasanmartin',
    mapsUrl: 'https://maps.app.goo.gl/9ARtRCeDxyePNtsYA',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicaholandesmontoya',
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
    whatsapp: '529512446714',
    email: 'escuelaautomotrizdeltule@gmail.com',
    facebook: 'https://www.facebook.com/escuelademecanicaeltule',
    tiktok: 'https://www.tiktok.com/@escuelaholandes',
    mapsUrl: 'https://www.google.com/maps/place/ESCUELA+DE+MEC%C3%81NICA+AUTOMOTRIZ+PLANTEL+SANTA+MARIA+EL+TULE+(GRUPO+HOLAND%C3%89S)/@17.0471767,-96.6416831,17z/data=!4m9!1m2!2m1!1smaps!3m5!1s0x85c7245d00077e65:0x43f94163642933cf!8m2!3d17.0488986!4d-96.6397517!16s%2Fg%2F11btn17gfz?entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D',
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
    direccion: 'Oaxaca - Puerto Ángel SN, Morelos, 71510 Ocotlán de Morelos, Oaxaca',
    referencia: '',
    latitud: 16.8108649,
    longitud: -96.6705505,
    whatsapp: '529511569122',
    email: 'mecanicaholandesocotlan@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=61586800357027',
    tiktok: 'https://www.tiktok.com/@mecanica.holandes',
    mapsUrl: 'https://www.google.com/maps/place/Escuela+De+Mec%C3%A1nica+Automotriz+Grupo+Holand%C3%A9s+plantel+Ocotl%C3%A1n+de+Morelos/@16.81087,-96.6731254,17z/data=!3m1!4b1!4m6!3m5!1s0x85c73f8acacc6485:0x12793ac1f26adadd!8m2!3d16.8108649!4d-96.6705505!16s%2Fg%2F11z5265s88?entry=ttu&g_ep=EgoyMDI2MDkyNy4xIKXMDSoASAFQAw%3D%3D',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicaholandes/',
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
    direccion: 'Carretera Costera 200 S/N, Barra Navidad, Puerto Escondido, Oaxaca',
    referencia: '',
    latitud: 15.872,
    longitud: -97.0767,
    whatsapp: '529541377496',
    email: 'holandesmecanicapuertoescondid@gmail.com',
    facebook: 'https://www.facebook.com/share/19oUeeDHNw/',
    tiktok: 'https://www.tiktok.com/@holandes.mecanica',
    // PENDIENTE (2026-10-04): pedir al plantel un link de Google Maps.
    // El de la hoja "DATOS POR PLANTEL" (maps.app.goo.gl/dy47159T7Jp7WLeW9) devuelve 404;
    // mientras, "Cómo llegar" usa el fallback de coordenadas.
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: '',
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
    direccion: '22 Sur, Colonia Santa Cruz, Pinotepa Nacional, Oaxaca',
    referencia: '',
    latitud: 16.3302712,
    longitud: -98.044008,
    whatsapp: '529541350663',
    email: 'guerreroelizabethnohemi@gmail.com',
    facebook: 'https://www.facebook.com/escuelaholandespinotepa',
    tiktok: 'https://www.tiktok.com/@mecanicaghpino',
    mapsUrl: 'https://www.google.com/maps/place/ESCUELA+DE+MEC%C3%81NICA+AUTOMOTRIZ+PLANTEL+PINOTEPA+NACIONAL+(GRUPO+HOLAND%C3%89S)/@16.3302712,-98.044008,885m/data=!3m2!1e3!4b1!4m6!3m5!1s0x85b7e30c65b8674b:0x9f727e8e3007b56d!8m2!3d16.3302712!4d-98.044008!16s%2Fg%2F11lcys6866?entry=ttu&g_ep=EgoyMDI2MDkzMC4wIKXMDSoASAFQAw%3D%3D',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/escuelademecanicapinotepa',
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
    whatsapp: '529514701010',
    email: 'escuelaautomotrizdeltule@hotmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=100063545187105',
    tiktok: 'https://www.tiktok.com/@mecnica.automotri2',
    mapsUrl: 'https://www.google.com/maps/place/Escuela+De+Mec%C3%A1nica+Automotriz+Grupo+Holand%C3%A9s/data=!4m7!3m6!1s0x85c87b72118d288f:0x77aaa52626432aa!8m2!3d17.0222727!4d-97.9259081!16s%2Fg%2F11pkfkq694!19sChIJjyiNEXJ7yIURqjJkYlKqegc?authuser=0&hl=es&g_ep=EgoyMDI2MDkyNy4wIJJjKgBIAVAD&rclk=1',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/esc_mecanica_putla/',
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
    latitud: 17.8049292,
    longitud: -97.7801043,
    whatsapp: '529531712465',
    email: 'escuelaautomotrizhuajuapan@hotmail.com',
    facebook: 'https://escuela-de-mecanica-automotriz-diesel-y-gasolina-grupo.negocio.site',
    tiktok: 'https://www.tiktok.com/@grupoholandes267',
    mapsUrl: 'https://www.google.com/maps/place/ESCUELA+DE+MECANICA+AUTOMOTRIZ+PLANTEL+HUAJUAPAN+DE+LE%C3%92N+(GRUPO+HOLAND%C3%89S)/@17.8049292,-97.780402,55m/data=!3m1!1e3!4m10!1m2!2m1!1sEscuela+De+Mec%C3%A1nica+Automotriz+Huajuapan!3m6!1s0x85c601fd8e2b7245:0x600f1e55d2672a0e!8m2!3d17.8049292!4d-97.7801043!15sCilFc2N1ZWxhIERlIE1lY8OhbmljYSBBdXRvbW90cml6IEh1YWp1YXBhblorIillc2N1ZWxhIGRlIG1lY8OhbmljYSBhdXRvbW90cml6IGh1YWp1YXBhbpIBEHRlY2huaWNhbF9zY2hvb2yaAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnMxTkZOSWFHaFJibGt5VFRGb1ExTlZhR2hSYlVZeFRUQXhiRlpzUlJBQuABAPoBBAgAECg!16s%2Fg%2F11g6mhzltz?hl=es&entry=ttu&g_ep=EgoyMDI2MDkzMC4wIKXMDSoASAFQAw%3D%3D',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00, 19:00–21:00 · Sáb–Dom: 8:00–15:00 · Licenciatura en Ingeniería Automotriz: jue–vie 8:00–14:00 · Bachillerato: lun, mié, vie 12:00–15:00',
    instagram: 'https://www.instagram.com/escuelaautomotrizhuajuapan',
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
    latitud: 18.0817935,
    longitud: -96.1200272,
    whatsapp: '522871285361',
    email: 'escuelaautomotriztuxtepec1@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=100083378160643',
    tiktok: 'https://www.tiktok.com/@escuelautomotriztux',
    mapsUrl: 'https://www.google.com/maps/place/ESCUELA+DE+MEC%C3%81NICA+AUTOMOTRIZ+PLANTEL+TUXTEPEC+(GRUPO+HOLAND%C3%89S)/@18.0817935,-96.1200272,877m/data=!3m2!1e3!4b1!4m6!3m5!1s0x85c3e65f24ef2ddb:0xd95f677ff567ec!8m2!3d18.0817935!4d-96.1200272!16s%2Fg%2F11thk4b_2c?hl=es-US&entry=ttu&g_ep=EgoyMDI2MDkzMC4wIKXMDSoASAFQAw%3D%3D',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/escuelamecanicatuxtepec',
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
    whatsapp: '529511123419',
    email: 'Grupoholandes.ejutla@gmail.com',
    facebook: 'https://www.facebook.com/profile',
    tiktok: 'https://www.tiktok.com/@mecanica.gh.ejutl',
    mapsUrl: 'https://maps.app.goo.gl/KbmkuT8HVEMpiR5o7',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicaghejutla',
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
    longitud: -97.6886497,
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
    whatsapp: '522741184468',
    email: 'mecanicaholandestierrablanca@gmail.com',
    facebook: 'https://www.facebook.com/share/1J353tMCEA/',
    tiktok: 'https://www.tiktok.com/@mecanicaholandesti',
    mapsUrl: 'https://maps.app.goo.gl/stpk6SyKQGTceYG98?g_st=awb',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 15:00–17:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecholandestierrablanca',
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
    whatsapp: '522382350190',
    email: 'haromiguelharo@gmail.com',
    facebook: 'https://www.facebook.com/share/1QDXiSp6Ca/',
    tiktok: 'https://www.tiktok.com/@mecanicaholandes',
    mapsUrl: 'https://maps.app.goo.gl/ijRqJ8g6YGkGAYmu6',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00, 11:00–13:00, 15:00–17:00, 17:00–19:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicaghtehuacan',
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
    direccion: 'Kilómetro 1, salida a Igualapa, Ometepec, Guerrero',
    referencia: '',
    latitud: 16.7016,
    longitud: -98.4209,
    whatsapp: '527411263176',
    email: 'elizabethnohemiguerreromarin1@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=61591521839835',
    tiktok: 'https://www.tiktok.com/@escuela.mecnica.o',
    mapsUrl: 'https://maps.google.com/maps/search/escuela%20de%20mec%C3%A1nica%20Ometepec/@16.7016,-98.4209,17z?hl=es',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    instagram: 'https://www.instagram.com/mecanicaometepec',
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
    latitud: 17.996944427490234,
    longitud: -92.9267578125,
    whatsapp: '529931672561',
    email: 'escuelademecanicavillahermosa@gmail.com',
    facebook: 'https://www.facebook.com/share/19XFTnB6Aj/',
    tiktok: 'https://www.tiktok.com/@grupoholandesvhs',
    mapsUrl: 'https://google.com/maps?q=17.996944427490234,-92.9267578125&z=17&hl=es',
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
    whatsapp: '529514777094',
    email: 'mecanicaautomotrizdelsureste@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=61584241204914',
    tiktok: 'https://www.tiktok.com/@ingeniera.mecanic7',
    instagram: 'https://www.instagram.com/ingmecanicadelsureste',
    mapsUrl: 'https://www.google.com/maps/place/CENTRO+EDUCATIVO+DE+MEC%C3%81NICA+AUTOMOTRIZ+DEL+SURESTE/@17.0487494,-96.640093,20z/data=!4m6!3m5!1s0x85c7253f9c500ab5:0x6bdfca68556beed!8m2!3d17.0487494!4d-96.6397995!16s%2Fg%2F11nvh9w2g5?entry=ttu&g_ep=EgoyMDI2MDkyNy4wIKXMDSoASAFQAw%3D%3D',
    especialidades: ['licenciatura-mecanica'],
    horario: 'Atención personalizada: consultar directamente con Ing. Emmanuel',
    requisitos: ['Acta de nacimiento actualizada (original y dos copias B/N)', 'CURP', 'INE del alumno', 'Comprobante de domicilio', 'INE del tutor', 'Certificado médico', 'Certificado de bachillerato', '4 fotografías tamaño infantil'],
    imagenes: ['img/planteles/cemas/cemas1.jpeg', 'img/planteles/cemas/cemas2.jpeg'],
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

function normSearch(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function searchCampuses(query) {
  const q = normSearch(query).trim();
  if (!q) return getAllActiveCampuses();
  return getAllActiveCampuses().filter(c =>
    normSearch(c.nombre).includes(q) ||
    normSearch(c.ciudad).includes(q) ||
    normSearch(c.estado).includes(q) ||
    normSearch(c.direccion).includes(q) ||
    normSearch(c.referencia).includes(q)
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
