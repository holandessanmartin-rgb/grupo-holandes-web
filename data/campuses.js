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
    direccion: 'Calle Tierra y Libertad #100 A, Colonia Ejidal San Martín Montoya',
    referencia: 'A 3 cuadras de Plaza Bella',
    latitud: 17.0709913,
    longitud: -96.7545431,
    telefono: '+52 951 567 8678',
    whatsapp: '529515678678',
    email: 'holandes.san.martin@gmail.com',
    facebook: 'https://www.facebook.com/profile.php?id=100077581861663',
    tiktok: 'https://www.tiktok.com/@escuelamecanicasanmartin',
    mapsUrl: 'https://maps.app.goo.gl/G62LwgWRGEhgcFdq6',
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
    direccion: 'Privada de la Cruz #5, Centro',
    referencia: '',
    latitud: 17.0488986,
    longitud: -96.6397517,
    telefono: '+52 951 244 6714',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/escuelademecanicaeltule',
    tiktok: 'https://www.tiktok.com/@escuelaholandes',
    mapsUrl: 'https://maps.app.goo.gl/qhRgmxdE5P3XFL4q7',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'mecanica-diesel', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Calle Progreso 929, Priv. del Camino Real',
    referencia: '',
    latitud: 17.021988,
    longitud: -96.7336239,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=100063788365063',
    tiktok: '',
    mapsUrl: 'https://maps.app.goo.gl/cQDUsqbszZsnRSWR6',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Calle García Vigil 400, San Lorenzo',
    referencia: '',
    latitud: 16.8689,
    longitud: -96.7803,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61577364175503',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    whatsapp: '',
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
    direccion: 'Centro, Miahuatlán',
    referencia: '',
    latitud: 16.3303,
    longitud: -96.5917,
    telefono: '+52 951 425 0632',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61562497043335',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    telefono: '+52 954 137 7496',
    whatsapp: '',
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
    whatsapp: '',
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
    direccion: 'Putla Villa de Guerrero',
    referencia: '',
    latitud: 17.0219,
    longitud: -97.9267,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=100063545187105',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Galeana 25, Centro',
    referencia: '',
    latitud: 17.8072,
    longitud: -97.7837,
    telefono: '+52 953 532 4573',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/ESCMECAGRUPOHOLANDES',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Av. 5 de Mayo #420, Col. Centro',
    referencia: '',
    latitud: 18.0819,
    longitud: -96.1353,
    telefono: '+52 287 128 5361',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=100083378160643',
    tiktok: 'https://www.tiktok.com/@escuelautomotriztux',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Calle los Robles SN, Fracc. Reforma',
    referencia: '',
    latitud: 16.4344,
    longitud: -95.0208,
    telefono: '+52 971 729 8631',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=100040988766720',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: '5a Priv. de 20 de Noviembre #2',
    referencia: '',
    latitud: 16.5672,
    longitud: -96.7297,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61591640976110',
    tiktok: '',
    mapsUrl: '',
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
    direccion: 'Tlaxiaco',
    referencia: '',
    latitud: 17.2708,
    longitud: -97.6797,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61591325338909',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Tierra Blanca',
    referencia: '',
    latitud: 18.4507,
    longitud: -96.3578,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61577361603723',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    direccion: 'Tehuacán',
    referencia: '',
    latitud: 18.4667,
    longitud: -97.3975,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=61564617134149',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
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
    whatsapp: '',
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
    direccion: 'Villahermosa',
    referencia: '',
    latitud: 17.9892,
    longitud: -92.9281,
    telefono: '',
    whatsapp: '',
    email: '',
    facebook: 'https://www.facebook.com/profile.php?id=100095255011349',
    tiktok: '',
    mapsUrl: '',
    especialidades: ['mecanica-automotriz', 'reparacion-motocicletas', 'electronica-automotriz'],
    horario: 'Lun–Vie: 7:00–9:00, 9:00–11:00 · Sáb–Dom: 8:00–15:00',
    imagenes: [],
    activo: true,
    orden: 18
  }
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
