import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.picanteria.miraflores',
  appName: 'Picantería Miraflores',
  webDir: 'dist',
  // La app NATIVA carga la interfaz desde el sitio desplegado en Vercel.
  // Así, actualizar la UI = hacer deploy en Vercel (git push); las tablets reciben
  // el cambio al reabrir la app, SIN reinstalar el APK. Los cambios NATIVOS
  // (ícono, plugins, permisos) sí requieren generar un APK nuevo.
  // El bundle local (webDir 'dist') queda como respaldo del build.
  server: {
    url: 'https://www.picanteriamiraflores.com',
    cleartext: false,
  },
  plugins: {
    // Ejecuta las peticiones HTTP por la capa NATIVA de Android en vez del WebView.
    // Con esto CORS deja de aplicar (es una regla del navegador, no del servidor),
    // así la app puede consumir https://api.picanteriamiraflores.com sin necesidad
    // de agregar 'https://localhost' al ALLOWED_ORIGINS del backend.
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FFFFFF',      // fondo del splash (claro, como el manifest PWA)
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: '#2563EB',      // primary — se sincroniza con el header azul
      style: 'DARK',                   // texto/iconos claros sobre fondo oscuro (azul)
    },
  },
};

export default config;
