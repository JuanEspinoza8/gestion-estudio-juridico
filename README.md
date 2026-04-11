# Gestión de Estudio Jurídico (MVP)

Este proyecto es un Producto Mínimo Viable (MVP) diseñado para la gestión integral de un estudio jurídico. Permite administrar la cartera de clientes, llevar el control de cuentas corrientes y honorarios, y organizar la agenda de turnos del estudio.

## Características Principales
- **Gestión de Clientes:** Alta, baja y modificación del directorio de clientes con sus expedientes asociados.
- **Cuentas Corrientes:** Asignación de honorarios totales, registro de pagos parciales y cálculo automático de deuda restante.
- **Agenda de Turnos:** Sistema de calendario para organizar reuniones y audiencias.
- **Dashboard Estadístico:** Panel de control con métricas clave (deuda total en la calle, próximos vencimientos, últimos ingresos).
- **Seguridad:** Autenticación de usuarios mediante JWT (JSON Web Tokens).

## Stack Tecnológico
- **Frontend:** HTML5, CSS3, JavaScript Vanilla (Fetch API).
- **Backend:** Node.js, Express.js.
- **Base de Datos:** PostgreSQL (Alojada en la nube).
- **Arquitectura:** MVC (Modelo-Vista-Controlador) simplificado.

## Estructura del Proyecto
El repositorio está organizado siguiendo buenas prácticas de separación de responsabilidades:
```text
/
├── public/          # Archivos estáticos del Frontend (HTML, CSS, JS)
├── src/
│   ├── config/      # Configuración de conexión a la Base de Datos
│   ├── models/      # Clases POO (Modelos de datos)
│   └── routes/      # Endpoints de la API REST (Express)
├── docs/            # Documentación (Diagramas DER, Scripts SQL)
├── server.js        # Punto de entrada del servidor backend
└── .env.example     # Plantilla de variables de entorno 