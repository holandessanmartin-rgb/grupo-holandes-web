class FunnelTracking {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.initTracking();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  initTracking() {
    this.captureUTM();
    this.setupGlobalTracking();
  }

  captureUTM() {
    const params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const utmData = {};

    params.forEach(param => {
      const value = new URLSearchParams(window.location.search).get(param);
      if (value) utmData[param] = value;
    });

    utmData.source = utmData.utm_source || 'direct';
    utmData.medium = utmData.utm_medium || 'none';
    utmData.campaign = utmData.utm_campaign || 'organic';

    try {
      const stored = localStorage.getItem('gh_utm');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(utmData, parsed, utmData);
      } else {
        localStorage.setItem('gh_utm', JSON.stringify(utmData));
      }
    } catch (e) { /* ignore */ }

    this.utmData = utmData;
  }

  setupGlobalTracking() {
    if (window.gtag) {
      window.gtag('config', APP_CONFIG.tracking.gaId, {
        custom_map: { session_id: 'session_id' }
      });
    }
  }

  track(eventName, parameters = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      utm: this.utmData,
      page: window.location.pathname,
      ...parameters
    };

    this.events.push(event);
    this.persistEvent(event);

    this.sendToGA4(eventName, parameters);
    this.sendToMeta(eventName, parameters);
    this.sendToGTM(eventName, parameters);

    console.log('[Funnel Tracking]', eventName, parameters);
    return event;
  }

  persistEvent(event) {
    try {
      const logs = JSON.parse(localStorage.getItem('gh_funnel_events') || '[]');
      logs.push(event);
      if (logs.length > 100) logs.shift();
      localStorage.setItem('gh_funnel_events', JSON.stringify(logs));
    } catch (e) { /* ignore */ }
  }

  sendToGA4(eventName, parameters) {
    if (window.gtag) {
      window.gtag('event', eventName, {
        ...parameters,
        session_id: this.sessionId,
        utm_source: this.utmData.source,
        utm_medium: this.utmData.medium,
        utm_campaign: this.utmData.campaign
      });
    }
  }

  sendToMeta(eventName, parameters) {
    if (window.fbq) {
      const metaEventMap = {
        'view_specialty': 'ViewContent',
        'click_find_campus': 'Contact',
        'location_permission_granted': 'Contact',
        'campus_selected': 'Lead',
        'form_started': 'InitiateCheckout',
        'form_completed': 'Lead',
        'coupon_generated': 'CompleteRegistration',
        'visit_started': 'Schedule',
        'visit_scheduled': 'Schedule',
        'whatsapp_click': 'Contact',
        'phone_click': 'Contact'
      };

      const metaEvent = metaEventMap[eventName] || 'CustomEvent';
      window.fbq('track', metaEvent, {
        content_name: parameters.specialty || parameters.campus || parameters.formName || 'Unknown',
        content_category: 'Funnel',
        value: ['form_completed', 'coupon_generated', 'visit_scheduled'].includes(eventName) ? 1 : 0,
        currency: 'MXN'
      });
    }
  }

  sendToGTM(eventName, parameters) {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...parameters,
        session_id: this.sessionId,
        utm_source: this.utmData.source,
        utm_medium: this.utmData.medium,
        utm_campaign: this.utmData.campaign
      });
    }
  }

  getUTMString() {
    const params = new URLSearchParams();
    Object.entries(this.utmData).forEach(([key, value]) => {
      if (value && typeof value === 'string') params.set(key, value);
    });
    params.set('gh_session', this.sessionId);
    params.set('gh_timestamp', Date.now().toString());
    return params.toString();
  }

  buildWhatsAppUrl(phone, message) {
    const fullMessage = `${message} [${this.getUTMString()}]`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(fullMessage)}`;
  }
}

const funnelTracking = new FunnelTracking();

const FUNNEL_EVENTS = {
  PAGE_VIEW: 'page_view',
  VIEW_SPECIALTY: 'view_specialty',
  CLICK_FIND_CAMPUS: 'click_find_campus',
  LOCATION_PERMISSION_GRANTED: 'location_permission_granted',
  LOCATION_PERMISSION_DENIED: 'location_permission_denied',
  CAMPUS_SELECTED: 'campus_selected',
  FORM_STARTED: 'form_started',
  FORM_FIELD_FOCUS: 'form_field_focus',
  FORM_FIELD_BLUR: 'form_field_blur',
  FORM_VALIDATION_ERROR: 'form_validation_error',
  FORM_COMPLETED: 'form_completed',
  COUPON_GENERATED: 'coupon_generated',
  COUPON_COPIED: 'coupon_copied',
  VISIT_STARTED: 'visit_started',
  VISIT_DATE_SELECTED: 'visit_date_selected',
  VISIT_TIME_SELECTED: 'visit_time_selected',
  VISIT_SCHEDULED: 'visit_scheduled',
  WHATSAPP_CLICK: 'whatsapp_click',
  PHONE_CLICK: 'phone_click',
  MAPS_CLICK: 'maps_click',
  STEP_CHANGED: 'step_changed',
  FORM_ABANDONED: 'form_abandoned',
  FORM_RECOVERED: 'form_recovered'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FunnelTracking, funnelTracking, FUNNEL_EVENTS };
}