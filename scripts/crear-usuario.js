// scripts/crear-usuario.js
// Crea un usuario del sistema (no hay registro público). La contraseña se pide
// por consola sin mostrarla y se guarda hasheada con bcrypt.
//
// Uso: npm run crear-usuario -- "Nombre Apellido" email@estudio.com [rol]
require('dotenv').config();

const readline = require('readline');
const Usuario = require('../src/models/Usuario');

function pedirContraseña(pregunta) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    return new Promise((resolve) => {
        rl.question(pregunta, (respuesta) => {
            rl.close();
            process.stdout.write('\n');
            resolve(respuesta);
        });
        // No mostrar lo que se escribe
        rl._writeToOutput = () => {};
    });
}

async function main() {
    const [nombre, email, rol = 'abogado'] = process.argv.slice(2);
    if (!nombre || !email) {
        console.error('Uso: npm run crear-usuario -- "Nombre Apellido" email@estudio.com [rol]');
        process.exit(1);
    }

    const password = await pedirContraseña(`Contraseña para ${email}: `);
    if (password.length < 8) {
        console.error('La contraseña tiene que tener al menos 8 caracteres.');
        process.exit(1);
    }

    const usuario = await new Usuario({ nombre, email, password, rol }).guardar();
    console.log(`Usuario creado: #${usuario.id} ${usuario.email} (${usuario.rol})`);
    process.exit(0);
}

main().catch((error) => {
    console.error(error.code === '23505' ? 'Ya existe un usuario con ese email.' : error.message);
    process.exit(1);
});
