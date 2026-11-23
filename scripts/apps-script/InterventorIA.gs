// ==================== InterventorIA: sincronización de correspondencia ====================
// Agrega este archivo a tu proyecto de Apps Script (Archivo > Nuevo > Script). No modifica tu
// código actual: envía cada correo de Gmail (con su cuerpo, hilo e id) a la base de datos de
// InterventorIA, donde se acumula el histórico, se clasifica y se controla el plazo de respuesta.
//
// Uso:
//   1. cargarHistoricoInterventorIA()  -> una vez, carga los correos desde FECHA_HISTORICO.
//   2. programarSincronizacion()       -> una vez, deja corriendo la sincronización cada 15 min.
// Reenviar correos ya cargados no los duplica ni cambia lo que se haya editado en la app.

var IA_URL = '__URL_INGESTA__';     // dirección de envío (la da la app)
var IA_CLAVE = '';                  // solo si se configuró INTEGRACION_TOKEN en Vercel
var IA_DOMINIO_PROPIO = 'incolta';  // correos de este dominio cuentan como ENVIADOS
var IA_DIAS_SINCRONIZACION = 3;     // ventana de la sincronización periódica
var IA_FECHA_HISTORICO = '2026/01/01';

// Correos automáticos que no son correspondencia (mismos filtros del script de informes)
var IA_REMITENTES_EXCLUIDOS = [
  'notify.microsoft.com', 'accounts.google.com', 'noreply-accounts@google.com', 'read.ai',
  'ape@sena.edu.co', 'drive-shares-dm-noreply@google.com', 'adobe.com', 'norventas.com',
  'gemini-notes@google.com', 'workspace-noreply@google.com'
];
var IA_ASUNTOS_EXCLUIDOS = [
  'código de verificación', 'alerta de seguridad', 'nuevo inicio de sesión',
  'restablecimiento de contraseña', 'bienvenido', 'pre-read', 'informe de la reunión',
  'invitación', 'funciones potenciadas por ia', 'has compartido algunos datos'
];
// ==========================================================================================

/** Sincronización periódica: correos de los últimos días. */
function sincronizarInterventorIA() {
  var query = 'newer_than:' + IA_DIAS_SINCRONIZACION + 'd -in:trash -in:spam';
  var total = 0;
  for (var start = 0; ; start += 100) {
    var threads = GmailApp.search(query, start, 100);
    if (threads.length === 0) break;
    total += enviarHilos_(threads);
    if (threads.length < 100) break;
  }
  Logger.log('InterventorIA: ' + total + ' correos sincronizados.');
}

/**
 * Carga del histórico. Si se acerca al límite de 6 minutos de Apps Script se detiene y
 * guarda por dónde iba: vuelve a ejecutarla hasta que diga "Histórico completo".
 */
function cargarHistoricoInterventorIA() {
  var props = PropertiesService.getScriptProperties();
  var start = Number(props.getProperty('IA_HISTORICO_OFFSET') || 0);
  var inicio = Date.now();
  var query = 'after:' + IA_FECHA_HISTORICO + ' -in:trash -in:spam';
  var total = 0;
  while (Date.now() - inicio < 4.5 * 60 * 1000) {
    var threads = GmailApp.search(query, start, 50);
    if (threads.length === 0) {
      props.deleteProperty('IA_HISTORICO_OFFSET');
      Logger.log('Histórico completo: ' + total + ' correos enviados en esta ejecución.');
      return;
    }
    total += enviarHilos_(threads);
    start += threads.length;
    props.setProperty('IA_HISTORICO_OFFSET', String(start));
  }
  Logger.log('Faltan correos: ejecuta de nuevo cargarHistoricoInterventorIA (van ' + start + ' hilos).');
}

/** Deja la sincronización corriendo cada 15 minutos (borra programaciones anteriores). */
function programarSincronizacion() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarInterventorIA') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarInterventorIA').timeBased().everyMinutes(15).create();
  Logger.log('Sincronización programada cada 15 minutos.');
}

function enviarHilos_(threads) {
  var miCorreo = Session.getActiveUser().getEmail().toLowerCase();
  var zona = Session.getScriptTimeZone();
  var items = [];
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      var de = message.getFrom() || '';
      var deLower = de.toLowerCase();
      var asunto = message.getSubject() || '';
      var asuntoLower = asunto.toLowerCase();
      if (IA_REMITENTES_EXCLUIDOS.some(function (r) { return deLower.indexOf(r) !== -1; })) return;
      if (IA_ASUNTOS_EXCLUIDOS.some(function (a) { return asuntoLower.indexOf(a) !== -1; })) return;

      var enviado = (miCorreo && deLower.indexOf(miCorreo) !== -1) || deLower.indexOf(IA_DOMINIO_PROPIO) !== -1;
      var fecha = message.getDate();
      items.push({
        id: message.getId(),
        hilo: thread.getId(),
        tipo: enviado ? 'enviado' : 'recibido',
        fecha: Utilities.formatDate(fecha, zona, 'yyyy-MM-dd'),
        hora: Utilities.formatDate(fecha, zona, 'HH:mm'),
        remitente: de.replace(/"/g, '').trim(),
        destinatario: (message.getTo() || '').replace(/"/g, '').trim(),
        asunto: asunto,
        cuerpo: (message.getPlainBody() || '').substring(0, 5000),
        enlace: 'https://mail.google.com/mail/u/0/#all/' + thread.getId()
      });
    });
  });
  for (var i = 0; i < items.length; i += 40) {
    var res = UrlFetchApp.fetch(IA_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: IA_CLAVE ? { 'x-integracion-token': IA_CLAVE } : {},
      payload: JSON.stringify({ fuente: 'apps-script', items: items.slice(i, i + 40) }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('InterventorIA respondió ' + res.getResponseCode() + ': ' + res.getContentText());
  }
  return items.length;
}
