class LeadsService {
  constructor() {
    this.apiBase = APP_CONFIG.api.baseUrl;
    this.endpoint = APP_CONFIG.api.leadsEndpoint;
    this.timeout = APP_CONFIG.api.timeout;
  }

  async sendLead(leadData) {
    const payload = this.buildLeadPayload(leadData);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiBase}${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Tiempo de espera agotado. Intenta de nuevo.' };
      }
      console.error('Error sending lead:', error);
      return { success: false, error: error.message || 'Error de conexión. Intenta más tarde.' };
    }
  }

  buildLeadPayload(formData) {
    const now = new Date();
    return {
      nombre: formData.nombre || '',
      telefono: formData.telefono || '',
      especialidad: formData.especialidad || '',
      especialidades: formData.especialidades || [],
      plantel: formData.plantel || '',
      plantelId: formData.plantelId || '',
      fecha: now.toISOString(),
      fechaLocal: now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      origen: formData.origen || 'landing-page',
      dispositivo: this.getDeviceInfo(),
      ubicacion: formData.ubicacion || null,
      canalPreferido: formData.canalPreferido || 'whatsapp',
      utm: this.getUTMData(),
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language
    };
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'desktop';
    if (/mobile|android|iphone|ipod/i.test(ua)) device = 'mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'tablet';
    return {
      type: device,
      userAgent: ua,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 'unknown',
      memory: navigator.deviceMemory || 'unknown'
    };
  }

  getUTMData() {
    try {
      const stored = localStorage.getItem('mec_utm');
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return {};
  }

  async sendToMultipleChannels(leadData) {
    const results = {
      api: await this.sendLead(leadData),
      whatsapp: this.sendToWhatsApp(leadData),
      email: this.sendToEmail(leadData)
    };
    return results;
  }

  sendToWhatsApp(leadData) {
    const campus = getCampusById(leadData.plantelId);
    const whatsappNumber = campus?.whatsapp || APP_CONFIG.defaultWhatsAppNumber;

    let message = `🔔 *NUEVO PROSPECTO - ${APP_CONFIG.schoolName}*\n\n`;
    message += `👤 *Nombre:* ${leadData.nombre}\n`;
    message += `📞 *Teléfono:* ${leadData.telefono}\n`;
    message += `🎓 *Especialidad:* ${leadData.especialidad}\n`;
    message += `📍 *Plantel:* ${leadData.plantel}\n`;
    message += `📅 *Fecha:* ${leadData.fechaLocal}\n`;
    message += `💬 *Canal preferido:* ${leadData.canalPreferido}\n`;
    if (leadData.ubicacion) {
      message += `📌 *Ubicación aproximada:* ${leadData.ubicacion}\n`;
    }

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    return { success: true, url, method: 'whatsapp' };
  }

  sendToEmail(leadData) {
    return { success: true, method: 'email', note: 'Configure email service in backend' };
  }

  generateCoupon(plantelId, leadId) {
    const campus = getCampusById(plantelId);
    const campusCode = campus ? campus.id.split('-').map(w => w[0]).join('').toUpperCase().slice(0, 3) : 'GH';
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `GH-${campusCode}-${randomCode}${timestamp}`;
  }

  validateLeadData(data) {
    const errors = [];

    if (!data.nombre || data.nombre.trim().length < 2) {
      errors.push('El nombre es obligatorio (mínimo 2 caracteres)');
    }

    if (!data.telefono || !this.validateMexicanPhone(data.telefono)) {
      errors.push('El teléfono debe ser un número mexicano de 10 dígitos');
    }

    if (!data.especialidad) {
      errors.push('Debe seleccionar una especialidad');
    }

    if (!data.plantelId) {
      errors.push('Debe seleccionar un plantel');
    }

    if (!data.privacyAccepted) {
      errors.push('Debe aceptar el aviso de privacidad');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateMexicanPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && /^[2-9]/.test(cleaned);
  }

  formatPhoneForDisplay(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+52 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  }

  saveProgressLocally(formData) {
    try {
      const progress = {
        ...formData,
        timestamp: Date.now(),
        step: formData.currentStep || 'form'
      };
      localStorage.setItem(APP_CONFIG.form.saveProgressKey, JSON.stringify(progress));
      return true;
    } catch (e) {
      console.warn('Could not save form progress:', e);
      return false;
    }
  }

  loadProgressLocally() {
    try {
      const stored = localStorage.getItem(APP_CONFIG.form.saveProgressKey);
      if (!stored) return null;
      const progress = JSON.parse(stored);
      if (Date.now() - progress.timestamp > APP_CONFIG.form.maxProgressAge) {
        this.clearProgressLocally();
        return null;
      }
      return progress;
    } catch (e) {
      console.warn('Could not load form progress:', e);
      return null;
    }
  }

  clearProgressLocally() {
    try {
      localStorage.removeItem(APP_CONFIG.form.saveProgressKey);
    } catch (e) { /* ignore */ }
  }
}

const leadsService = new LeadsService();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LeadsService, leadsService };
}