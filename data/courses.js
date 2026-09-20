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
    plantel: 'san-martin-oaxaca',
    activo: true
  }
];

function getAllActiveCourses() {
  return (typeof COURSES !== 'undefined' ? COURSES : []).filter(c => c.activo);
}
function getCourseById(id) {
  return getAllActiveCourses().find(c => c.id === id) || null;
}
