/* Testimonios reales de alumnos.
   ⚠️ REGLA: solo testimonios AUTORIZADOS. No inventar textos, nombres ni calificaciones.
   `isPlaceholder: true` marca texto de relleno: NUNCA debe publicarse.
   Textos citados VERBATIM desde las reseñas de Google del plantel; solo se les
   quitó el ruido de la interfaz (emojis de reacción, "Foto N de la opinión…",
   "…Más", "Editado", contadores). No se reescriben ni se corregen faltas.
   Firma visible en el sitio: iniciales + plantel. `fuente` da pie al aviso
   "Reseñas verificadas de Google". */
const TESTIMONIALS = [
  {
    id: 'test-1',
    texto: 'Execelentes maestro, mucha práctica y poca teoría, te enseñan bien, te explican a detalle que hace que no y etc etc, tienen mucha herramienta buena, equipo especializado para las prácticas, la teoría bien explicada, tanto en preguntas y respuestas, lo recomiendo',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'M.L.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  },
  {
    id: 'test-2',
    texto: 'Es buena escuela, la mayor parte es práctico y fácil de aprender, los profes están preparados y resuelven las dudas',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'K.V.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  },
  {
    id: 'test-3',
    texto: 'Es una buena opción para empezar aprender mecánica y tiene muy buenas opciones de estudios en lo que aprendí mucho y ya voy a poner mi taller estudien chavos es la mejor escuela',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'O.C.L.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  },
  {
    id: 'test-4',
    texto: 'Excelente institución, las clases son 10/10 y un ambiente excelente',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'A.R.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  },
  {
    id: 'test-5',
    texto: 'Muy buena escuela para empezar a conocer el mundo de la mecánica automotriz',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'A.G.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  },
  {
    id: 'test-6',
    texto: 'Excelente servicio y un aprendizaje muy profesional',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'J.A.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  },
  {
    id: 'test-7',
    texto: 'Excelente plantel es el mejor enseñan de lo mejor mis respetos',
    calificacion: 5,
    isPlaceholder: false,
    autor: 'A.M.',
    especialidad: '',
    campus: 'san-martin-oaxaca',
    fuente: 'Google'
  }
];

function getAllTestimonials() {
  return TESTIMONIALS.filter(t => !t.isPlaceholder);
}

function getTestimonialsBySpecialty(specialtyId) {
  return TESTIMONIALS.filter(t => !t.isPlaceholder && t.especialidad === specialtyId);
}

function getTestimonialsByCampus(campusId) {
  return TESTIMONIALS.filter(t => !t.isPlaceholder && t.campus === campusId);
}

function getRandomTestimonials(count = 3) {
  const all = getAllTestimonials();
  const shuffled = [...all].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function renderStars(rating) {
  return '⭐'.repeat(rating);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TESTIMONIALS,
    getAllTestimonials,
    getTestimonialsBySpecialty,
    getTestimonialsByCampus,
    getRandomTestimonials,
    renderStars
  };
}
