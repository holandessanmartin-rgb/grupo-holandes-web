const APP_CONFIG = {
  schoolName: 'GRUPO HOLANDÉS',
  schoolShortName: 'HOLANDÉS',
  schoolTagline: 'Escuela de Mecánica Automotriz',
  schoolDescription: 'Formación técnica en mecánica automotriz y motocicletas, con clases 90% prácticas y diferentes planteles para que estudies cerca de ti.',
  privacyPolicyUrl: 'https://grupoholandes.mx/aviso-privacidad',
  couponDiscount: 'DESCUENTO_ESPECIAL',
  defaultWhatsAppNumber: '529515678678',
  defaultWhatsAppMessage: 'Hola, quiero información sobre los cursos de Grupo Holandés.',

  tracking: {
    gaId: 'G-WEFT42D53B',       // Google Analytics 4 (Analytics → Admin → Recopilación de datos)
    gtmId: 'GTM-XXXXXXX',       // Google Tag Manager (opcional)
    metaPixelId: 'XXXXXXXXXXXXX', // Meta Pixel (Eventos → Administrador de eventos)
    tiktokPixelId: ''           // TikTok Pixel (opcional)
  },

  api: {
    baseUrl: '/api',
    leadsEndpoint: '/api/leads',
    timeout: 10000
  },

  // Webhook de Google Apps Script para acumular todo en Sheets (Drive).
  // Se obtiene en: Hoja de cálculo → Extensiones → Apps Script
  // (código en scripts/Code.gs) → Implementar como App web.
  sheetsWebhookUrl: 'https://script.google.com/macros/s/AKfycbzXQdRQ22B0wF9PdQGESoKc8dZJs8InXFcj67kNPILhpGkzJYSLWTxDMsRKfWUo95wj/exec',

  form: {
    saveProgressKey: 'gh_form_progress',
    maxProgressAge: 24 * 60 * 60 * 1000
  },

  funnel: {
    steps: [
      { id: 'specialty', label: 'Especialidad', icon: '🎓' },
      { id: 'campus', label: 'Plantel', icon: '📍' },
      { id: 'form', label: 'Tus datos', icon: '👤' },
      { id: 'coupon', label: 'Cupón', icon: '🎁' },
      { id: 'schedule', label: 'Visita', icon: '📅' }
    ]
  },

  seo: {
    defaultTitle: 'Grupo Holandés | Escuela de Mecánica Automotriz - Aprende Mecánica Práctica',
    defaultDescription: 'Formación técnica en mecánica automotriz y motocicletas, 90% práctica. Plantel San Martín, Oaxaca. ¡Inscríbete hoy!',
    siteUrl: 'https://grupoholandes.mx',
    twitterHandle: '@grupoholandes',
    facebookAppId: ''
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APP_CONFIG };
}