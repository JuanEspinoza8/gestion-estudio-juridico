// src/utils/escapeHtml.js
// Escapa un texto para insertarlo en HTML (por ejemplo, en el cuerpo de un email).
function escapeHtml(valor) {
    return (valor === null || valor === undefined ? '' : String(valor))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = escapeHtml;
