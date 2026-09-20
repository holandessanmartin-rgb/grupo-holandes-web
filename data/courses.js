/* Cursos especializados: corta duración, talleres y bootcamps.
   Estructura lista para mostrarse como curso independiente. */
const COURSES = [
  {
    id: 'bootcamp-mujeres-biker',
    nombre: 'Bootcamp Intensivo: Mecánica Preventiva para Mujeres Biker',
    slug: 'mujeres-biker',
    icon: '🏍️',
    fecha: 'Por definir',
    duracion: '2 días (fin de semana)',
    horario: 'Sábado y domingo 9:00 AM – 2:00 PM',
    precio: 'Consultar',
    temario: [
      'Revisión preventiva: aceite, cadena, frenos y neumáticos',
      'Qué llevar en ruta: kit básico y ponchaduras',
      'Lectura de tablero y testigos',
      'Cuándo ir al taller: diagnóstico oportuno'
    ],
    requisitos: ['Motocicleta propia (opcional)', 'Ganas de aprender'],
    cupo: 20,
    // Planteles donde está disponible (ids de data/campuses.js).
    // Edita estas listas para activar/desactivar el curso por plantel.
    planteles: ['san-martin-oaxaca'],
    activo: true
  },
  {
    id: 'curso-verano',
    nombre: 'Curso de Verano: Mecánica Básica',
    slug: 'curso-de-verano',
    icon: '☀️',
    fecha: 'Julio – Agosto',
    duracion: '4 semanas',
    horario: 'Lunes a viernes 9:00 AM – 1:00 PM',
    precio: 'Consultar',
    temario: [
      'Herramientas y seguridad en el taller',
      'Motor: partes y funcionamiento',
      'Cambio de aceite, filtros y bujías',
      'Frenos y neumáticos: revisión básica'
    ],
    requisitos: ['A partir de 15 años'],
    cupo: 25,
    planteles: ['san-martin-oaxaca', 'santa-maria-tule', 'santa-cruz-xoxocotlan'],
    activo: true
  },
  {
    id: 'curso-alarmas',
    nombre: 'Curso: Instalación de Alarmas',
    slug: 'instalacion-de-alarmas',
    icon: '🚨',
    fecha: 'Por definir',
    duracion: '2 semanas',
    horario: 'Sábados 9:00 AM – 2:00 PM',
    precio: 'Consultar',
    temario: [
      'Electricidad básica del automóvil',
      'Tipos de alarmas y sensores',
      'Instalación paso a paso',
      'Pruebas y diagnóstico de fallas'
    ],
    requisitos: ['Conocimientos básicos de electricidad (deseable)'],
    cupo: 15,
    planteles: ['san-martin-oaxaca', 'tuxtepec'],
    activo: true
  },
  {
    id: 'curso-gps',
    nombre: 'Curso: Instalación de GPS',
    slug: 'instalacion-de-gps',
    icon: '📡',
    fecha: 'Por definir',
    duracion: '2 semanas',
    horario: 'Sábados 9:00 AM – 2:00 PM',
    precio: 'Consultar',
    temario: [
      'Cómo funciona el rastreo satelital',
      'Conexión eléctrica y respaldo de batería',
      'Instalación discreta en el vehículo',
      'Plataformas de monitoreo y corta-corriente'
    ],
    requisitos: ['Conocimientos básicos de electricidad (deseable)'],
    cupo: 15,
    planteles: ['san-martin-oaxaca'],
    activo: true
  }
];

function getCoursesForCampus(campusId) {
  return getAllActiveCourses().filter(c => (c.planteles || []).includes(campusId));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COURSES, getAllActiveCourses, getCourseById, getCoursesForCampus };
}

function getAllActiveCourses() {
  return (typeof COURSES !== 'undefined' ? COURSES : []).filter(c => c.activo);
}
function getCourseById(id) {
  return getAllActiveCourses().find(c => c.id === id) || null;
}
