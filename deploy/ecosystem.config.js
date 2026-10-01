// PM2 — mantiene server.js vivo con reinicio automático.
// Uso: pm2 start deploy/ecosystem.config.js --env production && pm2 save && pm2 startup
module.exports = {
  apps: [{
    name: 'grupo-holandes',
    script: 'server.js',
    cwd: '/opt/grupo-holandes-web',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3100
    },
    error_file: '/var/log/grupo-holandes/err.log',
    out_file: '/var/log/grupo-holandes/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '400M'
  }]
};
