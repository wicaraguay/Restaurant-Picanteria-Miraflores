@echo off
REM Script para probar creación de empleado con roleId

echo === Obteniendo roles disponibles ===
curl http://localhost:3000/api/roles

echo.
echo.
echo === Creando empleado de prueba ===
curl -X POST http://localhost:3000/api/employees ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Mesero\",\"username\":\"testmesero\",\"password\":\"test123\",\"roleId\":\"ROLE_ID_AQUI\",\"phone\":\"0999999999\",\"salary\":500,\"shifts\":{\"Lunes\":\"AM\",\"Martes\":\"PM\",\"Miercoles\":\"AM-PM\",\"Jueves\":\"AM\",\"Viernes\":\"PM\",\"Sabado\":\"Libre\",\"Domingo\":\"Libre\"},\"equipment\":{\"uniform\":true,\"epp\":false}}"

echo.
echo.
echo === Verificando empleados creados ===
curl http://localhost:3000/api/employees

pause
