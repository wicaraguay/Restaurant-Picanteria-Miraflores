/**
 * PM2 Ecosystem Configuration
 * Para ejecutar: pm2 start ecosystem.config.js
 *
 * Documentación: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      name: 'restaurant-pm-api',
      script: 'dist/main.js',

      // Cluster mode: usa todos los cores del CPU
      instances: 'max',
      exec_mode: 'cluster',

      // Auto-restart en caso de fallo
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Variables de entorno para producción
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Variables de entorno para desarrollo
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart automático si la app crashea
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,

      // Kill timeout
      kill_timeout: 5000,

      // Source maps para mejor debugging
      source_map_support: true,
    }
  ],

  // Deploy configuration (opcional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:usuario/restaurant-pm.git',
      path: '/var/www/restaurant-pm',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
