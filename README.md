# ⚖️ Gestión de Estudio Jurídico

**Sistema integral para estudios de abogados** — Plataforma MVC con panel de control, gestión de clientes y arquitectura PWA.

Digitaliza la administración diaria del estudio: centraliza clientes, expedientes, agenda de audiencias y finanzas con un robusto sistema de pagos ciegos y planes de cuotas desde cualquier dispositivo.

![Version](https://img.shields.io/badge/version-1.0.0-red?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-Production-brightgreen?style=flat-square)

---

## Funcionalidades

- Dashboard analítico con cálculo de capital "en la calle" y ranking de deudores
- Gestión financiera con honorarios, pagos ciegos y deducción automática
- Planes de cuotas automáticos según ingresos
- Relación cliente-expediente y módulo de subida de documentos probatorios PDF
- Agenda interactiva de audiencias y vencimientos procesales
- Sistema de notas rápidas por expediente
- Autenticación segura (JWT, Bcrypt) y logs de auditoría de usuarios
- Instalable como App Nativa (PWA) con diseño responsivo mobile

---

## Stack

### Frontend
<p>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

### Backend
<p>
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Multer-FF4154?style=for-the-badge" alt="Multer" />
  <img src="https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens" alt="JWT" />
</p>

### Base de Datos & Cloud
<p>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

---

## Setup

```bash
git clone https://github.com/JuanEspinoza8/gestion-estudio-juridico.git
cd gestion-estudio-juridico
npm install
```

Crear `.env` con las credenciales de Supabase y variables de entorno:

```env
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
JWT_SECRET=tu_secreto_super_seguro
```

```bash
npm run dev
```

Acceder a la plataforma en `http://localhost:3000/login.html`

---

## Equipo

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/JuanEspinoza8">
        <img src="https://github.com/JuanEspinoza8.png" width="80px;" alt=""/><br />
        <b>Juan Espinoza</b>
      </a>
      <br />
      Lead Developer
    </td>
    <td align="center">
      <a href="https://github.com/Lucas-04git">
        <img src="https://github.com/Lucas-04git.png" width="80px;" alt=""/><br />
        <b>Lucas</b>
      </a>
      <br />
      Frontend & UI/UX Developer
    </td>
  </tr>
</table>