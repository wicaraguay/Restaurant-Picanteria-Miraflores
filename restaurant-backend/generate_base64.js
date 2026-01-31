const fs = require('fs');
const path = require('path');

// Nombre del archivo P12 (ajústalo si se llama diferente)
const P12_FILENAME = 'src/secrets/firma.p12';

try {
    const filePath = path.resolve(process.cwd(), P12_FILENAME);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: No se encuentra el archivo en: ${filePath}`);
        console.error('Asegúrate de colocar este script en la carpeta raíz del backend o ajustar la ruta P12_FILENAME.');
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64String = fileBuffer.toString('base64');

    console.log('\n✅ Conversión Exitosa! Copia todo el texto de abajo (sin espacios extra):');
    console.log('-----------------------------------------------------------');
    console.log(base64String);
    console.log('-----------------------------------------------------------');
    console.log('\n👉 Crea una Variable de Entorno en Render llamada SRI_SIGNATURE_BASE64 y pega este valor.');

} catch (error) {
    console.error('Error:', error.message);
}
