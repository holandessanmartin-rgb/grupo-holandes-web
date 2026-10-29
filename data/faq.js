const FAQ = [
  {
    id: 'faq-1',
    categoria: 'general',
    pregunta: '¿Necesito experiencia previa para inscribirme?',
    respuesta: 'No. Nuestras especialidades están diseñadas desde nivel cero. Solo necesitas ganas de aprender y compromiso.',
    orden: 1
  },
  {
    id: 'faq-2',
    categoria: 'general',
    pregunta: '¿Qué edad necesito para estudiar?',
    respuesta: 'A partir de 13 años. Menores de edad requieren autorización de padre o tutor.',
    orden: 2
  },
  {
    id: 'faq-3',
    categoria: 'general',
    pregunta: '¿Cuánto duran los cursos?',
    respuesta: 'Mecánica Automotriz: 2 años. Reparación de Motocicletas: 1 año 9 meses. Mecánica Diésel: 2 años. Electrónica Automotriz: 1 año 9 meses. Todas con clases 90% prácticas y módulos de 3 meses.',
    orden: 3
  },
  {
    id: 'faq-4',
    categoria: 'general',
    pregunta: '¿Qué especialidades tienen?',
    respuesta: 'Tenemos 3 especialidades técnicas: Mecánica Automotriz, Mecánica Diésel y Electrónica Automotriz. Además ofrecemos nuestro curso de Reparación de Motocicletas y, si deseas cursar una ingeniería, contamos con la Licenciatura en Ingeniería Mecánica Automotriz en los planteles Santa María del Tule, Santa Cruz Xoxocotlán y Huajuapan de León. <a href="/especialidades/licenciatura-mecanica-automotriz">Consulta los detalles y horarios</a>.',
    orden: 4
  },
  {
    id: 'faq-5',
    categoria: 'planteles',
    pregunta: '¿Dónde están los planteles?',
    respuesta: 'Nuestra sede principal es el Plantel Santa María del Tule: Privada de la Cruz n. 5, Santa María del Tule, Oaxaca, C.P. 68297. Además tenemos 18 planteles más en Oaxaca, Veracruz, Puebla, Guerrero y Tabasco. <a href="/planteles">Encuentra el más cercano a ti</a>.',
    orden: 5
  },
  {
    id: 'faq-6',
    categoria: 'planteles',
    pregunta: '¿Puedo elegir el plantel que prefiera?',
    respuesta: 'Sí, puedes elegir el plantel que más te convenga. Usa nuestro buscador para encontrar el más cercano a tu ubicación.',
    orden: 6
  },
  {
    id: 'faq-7',
    categoria: 'planteles',
    pregunta: '¿Puedo visitar el plantel antes de inscribirme?',
    respuesta: '¡Claro que sí! Agenda una visita sin compromiso, conoce nuestras instalaciones, habla con instructores y recibe un cupón de descuento.',
    orden: 7
  },
  {
    id: 'faq-8',
    categoria: 'clases',
    pregunta: '¿Las clases son prácticas?',
    respuesta: 'Sí, el 90% de las clases son prácticas. Trabajas con motores, vehículos, motocicletas, herramientas y equipos de diagnóstico reales.',
    orden: 8
  },
  {
    id: 'faq-9',
    categoria: 'clases',
    pregunta: '¿Trabajan con vehículos reales?',
    respuesta: 'Absolutamente. Contamos con motores, frentes, automóviles completos, camiones y motocicletas de diferentes marcas y tecnologías para que aprendas en situaciones reales.',
    orden: 9
  },
  {
    id: 'faq-10',
    categoria: 'inscripcion',
    pregunta: '¿Cómo puedo obtener información?',
    respuesta: 'Puedes: 1) Llenar el formulario en esta página, 2) Enviar WhatsApp al plantel, 3) Llamar por teléfono, 4) Visitar el plantel directamente.',
    orden: 10
  },
  {
    id: 'faq-11',
    categoria: 'cupon',
    pregunta: '¿Cómo funciona el cupón de descuento?',
    respuesta: 'Al agendar y acudir a tu visita al plantel, recibes un cupón único (ej. GH-SM-8K42) que aplicas en tu inscripción. El descuento se define por administración.',
    orden: 11
  },
  {
    id: 'faq-12',
    categoria: 'visita',
    pregunta: '¿Cómo puedo agendar una visita?',
    respuesta: 'Después de enviar tu información, podrás seleccionar fecha, horario y plantel en nuestra agenda. También puedes hacerlo directo por WhatsApp.',
    orden: 12
  },
  {
    id: 'faq-13',
    categoria: 'horarios',
    pregunta: '¿Qué horarios manejan?',
    respuesta: 'Lunes a viernes: turnos de 2 horas entre 7:00 AM y 9:00 PM. Sábados y domingos: 8:00 AM a 3:00 PM. Consulta disponibilidad por plantel.',
    orden: 13
  },
  {
    id: 'faq-14',
    categoria: 'requisitos',
    pregunta: '¿Cuáles son los requisitos de inscripción?',
    respuesta: 'Copia de acta de nacimiento, último certificado de estudios, comprobante de domicilio, CURP y 4 fotografías tamaño infantil (B/N o color).',
    orden: 14
  },
  {
    id: 'faq-15',
    categoria: 'certificacion',
    pregunta: '¿Los cursos tienen validez oficial?',
    respuesta: 'Sí, contamos con RVOE y clave de centro de trabajo SEP (20PBT0186W). Al finalizar recibes certificado oficial.',
    orden: 15
  }
];

function getAllFAQ() {
  return FAQ.sort((a, b) => a.orden - b.orden);
}

function getFAQByCategory(category) {
  return FAQ.filter(f => f.categoria === category).sort((a, b) => a.orden - b.orden);
}

function getFAQCategories() {
  const cats = [...new Set(FAQ.map(f => f.categoria))];
  return cats.map(cat => ({
    id: cat,
    nombre: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: FAQ.filter(f => f.categoria === cat).length
  }));
}

function renderFAQ(faqs) {
  if (!faqs || !faqs.length) return '';
  // Sin el wrapper FAQPage, Question/Answer quedan huérfanos y Google no los
  // asocia. El scope va en el padre de todos los <details>.
  return `<div itemscope itemtype="https://schema.org/FAQPage">` + faqs.map(faq => `
    <details class="faq-item" itemscope itemtype="https://schema.org/Question">
      <summary class="faq-question" itemprop="name">${faq.pregunta}</summary>
      <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${faq.respuesta}</p>
      </div>
    </details>
  `).join('') + `</div>`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FAQ,
    getAllFAQ,
    getFAQByCategory,
    getFAQCategories,
    renderFAQ
  };
}