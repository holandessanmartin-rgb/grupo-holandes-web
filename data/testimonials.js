const TESTIMONIALS = [
  {
    id: 'test-1',
    texto: 'Las prácticas me ayudaron mucho a entender realmente cómo funciona un vehículo. Me gustó que desde las primeras clases comenzamos a trabajar de manera práctica.',
    calificacion: 5,
    isPlaceholder: true,
    autor: 'Alumno — Testimonio pendiente de autorización',
    especialidad: 'mecanica-automotriz',
    campus: 'santa-maria-tule',
    fecha: '2026-01-15'
  },
  {
    id: 'test-2',
    texto: 'Los profesores explican paso a paso y permiten practicar directamente en el taller.',
    calificacion: 5,
    isPlaceholder: true,
    autor: 'Alumno — Testimonio pendiente de autorización',
    especialidad: 'reparacion-motocicletas',
    campus: 'santa-cruz-xoxocotlan',
    fecha: '2026-02-20'
  },
  {
    id: 'test-3',
    texto: 'Buscaba aprender mecánica desde cero y las prácticas me ayudaron a ganar confianza para comenzar a realizar mis propios trabajos.',
    calificacion: 5,
    isPlaceholder: true,
    autor: 'Alumno — Testimonio pendiente de autorización',
    especialidad: 'mecanica-automotriz',
    campus: 'san-martin-oaxaca',
    fecha: '2026-03-10'
  },
  {
    id: 'test-4',
    texto: 'Me gustó mucho el enfoque práctico y poder trabajar con vehículos reales.',
    calificacion: 5,
    isPlaceholder: true,
    autor: 'Alumno — Testimonio pendiente de autorización',
    especialidad: 'reparacion-motocicletas',
    campus: 'tuxtepec',
    fecha: '2026-04-05'
  },
  {
    id: 'test-5',
    texto: 'La atención de los instructores es excelente, siempre resuelven tus dudas y te guían en cada práctica.',
    calificacion: 5,
    isPlaceholder: true,
    autor: 'Alumno — Testimonio pendiente de autorización',
    especialidad: 'mecanica-automotriz',
    campus: 'huajuapan-leon',
    fecha: '2026-05-12'
  },
  {
    id: 'test-6',
    texto: 'Recomiendo mucho la escuela, aprendes de verdad y sales preparado para trabajar.',
    calificacion: 5,
    isPlaceholder: true,
    autor: 'Alumno — Testimonio pendiente de autorización',
    especialidad: 'reparacion-motocicletas',
    campus: 'miahuatlan-diaz',
    fecha: '2026-06-18'
  }
];

function getAllTestimonials() {
  return TESTIMONIALS.filter(t => t.isPlaceholder);
}

function getTestimonialsBySpecialty(specialtyId) {
  return TESTIMONIALS.filter(t => t.isPlaceholder && t.especialidad === specialtyId);
}

function getTestimonialsByCampus(campusId) {
  return TESTIMONIALS.filter(t => t.isPlaceholder && t.campus === campusId);
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