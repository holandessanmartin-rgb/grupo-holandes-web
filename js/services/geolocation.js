class GeolocationService {
  constructor() {
    this.watchId = null;
    this.lastPosition = null;
    this.permissionState = 'prompt';
  }

  async getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.lastPosition = position;
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(this.formatError(error));
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  formatError(error) {
    const messages = {
      1: 'Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación o busca manualmente.',
      2: 'No se pudo obtener tu ubicación. Intenta de nuevo o busca manualmente.',
      3: 'Tiempo de espera agotado. Intenta de nuevo.',
      4: 'Error desconocido al obtener la ubicación.'
    };
    return new Error(messages[error.code] || messages[4]);
  }

  async checkPermission() {
    if (!navigator.permissions) {
      return 'unsupported';
    }
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      this.permissionState = permission.state;
      return permission.state;
    } catch (e) {
      return 'unsupported';
    }
  }

  watchPosition(callback, options = {}) {
    if (!navigator.geolocation) {
      callback(new Error('Geolocation not supported'));
      return null;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastPosition = position;
        callback(null, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        callback(this.formatError(error), null);
      },
      { ...defaultOptions, ...options }
    );

    return this.watchId;
  }

  clearWatch() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getLastPosition() {
    if (!this.lastPosition) return null;
    return {
      latitude: this.lastPosition.coords.latitude,
      longitude: this.lastPosition.coords.longitude,
      accuracy: this.lastPosition.coords.accuracy,
      timestamp: this.lastPosition.timestamp
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  formatDistance(km) {
    if (km < 1) {
      return `${Math.round(km * 1000)} metros`;
    }
    return `${km.toFixed(1)} km`;
  }

  getMapsDirectionsUrl(lat, lng, label = '') {
    const destination = `${lat},${lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    return url;
  }

  getStaticMapUrl(lat, lng, zoom = 15, width = 400, height = 300) {
    const apiKey = APP_CONFIG.tracking?.googleMapsApiKey || '';
    if (!apiKey) return '';
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7Clabel:%7C${lat},${lng}&key=${apiKey}`;
  }
}

const geolocationService = new GeolocationService();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeolocationService, geolocationService };
}