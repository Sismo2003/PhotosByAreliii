// The default content of every email, in English and Spanish (docs/correos.md §4.2 "Restore
// default"). An email that was never edited is sent from here; once Areli publishes her own
// version, that one wins. Block format: emails/layout.js.

const h = (text) => ({ type: 'heading', text });
const p = (text) => ({ type: 'text', text });
const note = (text) => ({ type: 'note', text });
const btn = (label, url) => ({ type: 'button', label, url });
const card = (name) => ({ type: 'card', card: name });

const en = {
  'booking.request_received': {
    subject: 'Request sent, {{ client.firstName }}',
    preheader: 'Your date isn’t booked yet — I’ll get back to you soon.',
    blocks: [
      h('Request sent, {{ client.firstName }}.'),
      p('Thank you for thinking of me! I got your request {{ booking.code }} and I’ll get back to you within a day.\n\nYour date isn’t booked yet: I’ll confirm it by email, with the deposit details.'),
      card('session'),
    ],
  },
  'booking.accepted_pay_deposit': {
    subject: 'Your date is held — deposit due {{ booking.depositDue }}',
    preheader: 'Send the deposit to lock in your session.',
    blocks: [
      h('I’d love to photograph you, {{ client.firstName }}.'),
      p('Your date is held for you. To lock it in, please send the deposit before the deadline below.'),
      card('deposit'),
      card('session'),
      note('The deposit is non-refundable and goes toward your total. If it isn’t received by the deadline, the date is released for other clients.'),
    ],
  },
  'booking.deposit_reminder': {
    subject: 'A friendly reminder about your deposit',
    preheader: 'Your date is held until {{ booking.depositDue }}.',
    blocks: [
      h('Just a reminder, {{ client.firstName }}.'),
      p('Your date is still held, but I haven’t received the deposit yet. Please send it before the deadline so I can keep your spot.'),
      card('deposit'),
      note('Already sent it? Thank you! I’ll confirm as soon as I see it.'),
    ],
  },
  'booking.confirmed': {
    subject: 'You’re booked, {{ client.firstName }}!',
    preheader: '{{ booking.date }} · {{ booking.time }}',
    blocks: [
      h('You’re booked!'),
      p('I received your deposit — thank you! Your session is confirmed. The calendar invite is attached so you don’t miss it.'),
      card('session'),
      card('balance'),
      note('Please arrive on time: after 30 minutes the session counts as a no-show and the deposit doesn’t carry over.'),
    ],
  },
  'booking.prep_reminder': {
    subject: 'See you {{ booking.date }}!',
    preheader: 'A few things to have ready for your session.',
    blocks: [
      h('Two days to go, {{ client.firstName }}!'),
      p('I can’t wait for our session. A few tips:\n\n• Bring water and anything you’d like to change into.\n• Plan to arrive 10 minutes early.\n• Text me at {{ business.phone }} if anything comes up.'),
      card('session'),
      card('balance'),
    ],
  },
  'booking.rescheduled': {
    subject: 'Your session has a new date',
    preheader: '{{ booking.date }} · {{ booking.time }}',
    blocks: [
      h('New date, same excitement.'),
      p('Your session has been moved. Here is the new date — the updated calendar invite is attached.'),
      card('reschedule'),
      card('session'),
    ],
  },
  'booking.cancelled': {
    subject: 'Your session {{ booking.code }} was cancelled',
    preheader: '',
    blocks: [
      h('Your session was cancelled.'),
      p('Hi {{ client.firstName }}, your session on {{ booking.date }} has been cancelled ({{ booking.reason }}).\n\nIf you have any questions, just reply to this email. I’d love to see you another time.'),
    ],
  },
  'booking.declined': {
    subject: 'About your request {{ booking.code }}',
    preheader: '',
    blocks: [
      h('Thank you, {{ client.firstName }}.'),
      p('I’m so sorry — I can’t take your session this time. Thank you for thinking of me, and I hope our paths cross soon.'),
    ],
  },
  'booking.expired': {
    subject: 'Your date was released',
    preheader: '',
    blocks: [
      h('Your date was released.'),
      p('Hi {{ client.firstName }}, I didn’t receive the deposit for {{ booking.code }}, so the date is open again for other clients.\n\nIf you’d still like a session, reply to this email and we’ll find a new date.'),
    ],
  },
  'followup.thanks': {
    subject: 'Thank you, {{ client.firstName }}',
    preheader: 'It was a joy to photograph you.',
    blocks: [
      h('Thank you, {{ client.firstName }}.'),
      p('It was such a joy to photograph you. I’m already editing your photos and I’ll let you know as soon as your gallery is ready.'),
    ],
  },
  'followup.review_request': {
    subject: 'Would you share a few words?',
    preheader: 'It means the world to a small business.',
    blocks: [
      h('A small favor, {{ client.firstName }}?'),
      p('If you loved your session, a short review helps other families find me. It only takes a minute and it means the world to me.'),
      btn('Leave a review', '{{ review.url }}'),
    ],
  },
  'followup.review_reminder': {
    subject: 'One last thing',
    preheader: '',
    blocks: [
      h('Just in case it slipped by.'),
      p('If you have a minute, I’d be so grateful for a short review. Thank you again for trusting me with your photos!'),
      btn('Leave a review', '{{ review.url }}'),
    ],
  },
  'gallery.delivered': {
    subject: 'Your photos are ready, {{ client.firstName }}!',
    preheader: '{{ gallery.title }}',
    blocks: [
      h('Your photos are ready!'),
      p('{{ gallery.message }}'),
      btn('Open your gallery', '{{ gallery.url }}'),
      card('gallery'),
      card('login'),
      note('Download your favorites before {{ gallery.availableUntil }}. After that the photos are deleted from the server.'),
    ],
  },
  'gallery.resent': {
    subject: 'Your gallery: {{ gallery.title }}',
    preheader: '',
    blocks: [
      h('Here is your gallery again.'),
      p('{{ gallery.message }}'),
      btn('Open your gallery', '{{ gallery.url }}'),
      card('gallery'),
    ],
  },
  'gallery.extended': {
    subject: 'Your gallery has more time',
    preheader: 'Now available until {{ gallery.availableUntil }}.',
    blocks: [
      h('More time for your photos.'),
      p('Your gallery is now available until {{ gallery.availableUntil }}.'),
      btn('Open your gallery', '{{ gallery.url }}'),
    ],
  },
  'gallery.expiry_warning': {
    subject: 'Your gallery closes in 2 days',
    preheader: 'Download your photos before {{ gallery.deleteDate }}.',
    blocks: [
      h('Your gallery closes soon.'),
      p('Hi {{ client.firstName }}, your photos will be deleted on {{ gallery.deleteDate }}. Please download everything you want to keep before then.'),
      btn('Download your photos', '{{ gallery.url }}'),
      card('gallery'),
    ],
  },
  'account.invite': {
    subject: 'Your client account is ready',
    preheader: 'Sign in to see your bookings and galleries.',
    blocks: [
      h('Welcome, {{ client.firstName }}!'),
      p('I created an account for you where you’ll find your bookings and galleries.'),
      card('login'),
      btn('Sign in', '{{ login.url }}'),
    ],
  },
  'account.password_reset': {
    subject: 'Reset your password',
    preheader: 'The link is valid for {{ reset.expiresIn }}.',
    blocks: [
      h('Reset your password'),
      p('Someone asked to reset the password of your account. If it was you, use the button below. The link is valid for {{ reset.expiresIn }}.'),
      btn('Choose a new password', '{{ reset.url }}'),
      note('Didn’t ask for this? You can ignore this email — your password stays the same.'),
    ],
  },
  'account.password_changed': {
    subject: 'Your password was changed',
    preheader: '',
    blocks: [
      h('Your password was changed.'),
      p('Hi {{ client.firstName }}, the password of your account was just changed.'),
      note('Wasn’t you? Reply to this email or text {{ business.phone }} right away.'),
    ],
  },
  'account.email_changed': {
    subject: 'Your sign-in email was changed',
    preheader: '',
    blocks: [
      h('Your sign-in email changed.'),
      p('The email you use to sign in changed from {{ change.oldEmail }} to {{ change.newEmail }}.'),
      note('Wasn’t expecting this? Reply to this email or text {{ business.phone }}.'),
    ],
  },
  'admin.new_request': {
    subject: 'New request: {{ client.displayName }} · {{ booking.date }}',
    preheader: '',
    blocks: [h('New request {{ booking.code }}'), p('{{ client.displayName }} sent a request.'), card('session')],
  },
  'admin.daily_digest': {
    subject: 'Today: {{ digest.summary }}',
    preheader: '',
    blocks: [h('Good morning!'), p('{{ digest.summary }}')],
  },
  'admin.email_bounced': {
    subject: 'An email to {{ bounce.email }} bounced',
    preheader: '',
    blocks: [h('An email bounced.'), p('The address {{ bounce.email }} rejected an email ({{ bounce.reason }}). Check it on the client’s page.')],
  },
  'support.storage_level': {
    subject: '[{{ business.name }}] Photo disk {{ storage.level }}',
    preheader: '',
    blocks: [h('Photo disk: {{ storage.level }}'), p('Free space left: {{ storage.free }}.')],
  },
  'support.email_failures': {
    subject: '[{{ business.name }}] Emails are failing',
    preheader: '',
    blocks: [
      h('Emails are failing'),
      p('{{ failure.count }} email(s) gave up after every retry in the last hour.\n\nLast error: {{ failure.lastError }}'),
      btn('Open email settings', '{{ failure.adminUrl }}'),
    ],
  },
};

const es = {
  'booking.request_received': {
    subject: 'Solicitud enviada, {{ client.firstName }}',
    preheader: 'Tu fecha todavía no está reservada — te respondo pronto.',
    blocks: [
      h('Solicitud enviada, {{ client.firstName }}.'),
      p('¡Gracias por pensar en mí! Recibí tu solicitud {{ booking.code }} y te respondo en menos de un día.\n\nTu fecha todavía no está reservada: te la confirmo por correo, con los datos del depósito.'),
      card('session'),
    ],
  },
  'booking.accepted_pay_deposit': {
    subject: 'Tu fecha está apartada — depósito antes del {{ booking.depositDue }}',
    preheader: 'Envía el depósito para asegurar tu sesión.',
    blocks: [
      h('Me encantaría fotografiarte, {{ client.firstName }}.'),
      p('Tu fecha está apartada. Para asegurarla, envía el depósito antes de la fecha límite.'),
      card('deposit'),
      card('session'),
      note('El depósito no es reembolsable y se descuenta del total. Si no llega a tiempo, la fecha se libera para otros clientes.'),
    ],
  },
  'booking.deposit_reminder': {
    subject: 'Un recordatorio sobre tu depósito',
    preheader: 'Tu fecha está apartada hasta el {{ booking.depositDue }}.',
    blocks: [
      h('Solo un recordatorio, {{ client.firstName }}.'),
      p('Tu fecha sigue apartada, pero todavía no recibo el depósito. Envíalo antes de la fecha límite para conservar tu lugar.'),
      card('deposit'),
      note('¿Ya lo enviaste? ¡Gracias! Te confirmo en cuanto lo vea.'),
    ],
  },
  'booking.confirmed': {
    subject: '¡Tu sesión está reservada, {{ client.firstName }}!',
    preheader: '{{ booking.date }} · {{ booking.time }}',
    blocks: [
      h('¡Sesión reservada!'),
      p('Recibí tu depósito, ¡gracias! Tu sesión está confirmada. Te adjunto la invitación para tu calendario.'),
      card('session'),
      card('balance'),
      note('Llega a tiempo: después de 30 minutos la sesión cuenta como no presentada y el depósito no se transfiere.'),
    ],
  },
  'booking.prep_reminder': {
    subject: '¡Nos vemos el {{ booking.date }}!',
    preheader: 'Algunas cosas para tener listas.',
    blocks: [
      h('¡Faltan dos días, {{ client.firstName }}!'),
      p('Ya quiero que llegue nuestra sesión. Algunos consejos:\n\n• Trae agua y la ropa a la que quieras cambiarte.\n• Llega 10 minutos antes.\n• Escríbeme al {{ business.phone }} si surge algo.'),
      card('session'),
      card('balance'),
    ],
  },
  'booking.rescheduled': {
    subject: 'Tu sesión tiene nueva fecha',
    preheader: '{{ booking.date }} · {{ booking.time }}',
    blocks: [
      h('Nueva fecha, la misma emoción.'),
      p('Tu sesión cambió de fecha. Aquí está la nueva; te adjunto la invitación actualizada.'),
      card('reschedule'),
      card('session'),
    ],
  },
  'booking.cancelled': {
    subject: 'Tu sesión {{ booking.code }} se canceló',
    preheader: '',
    blocks: [
      h('Tu sesión se canceló.'),
      p('Hola {{ client.firstName }}, tu sesión del {{ booking.date }} se canceló ({{ booking.reason }}).\n\nSi tienes preguntas, responde a este correo. Me encantaría verte en otra ocasión.'),
    ],
  },
  'booking.declined': {
    subject: 'Sobre tu solicitud {{ booking.code }}',
    preheader: '',
    blocks: [
      h('Gracias, {{ client.firstName }}.'),
      p('Lo siento mucho, esta vez no puedo tomar tu sesión. Gracias por pensar en mí; ojalá coincidamos pronto.'),
    ],
  },
  'booking.expired': {
    subject: 'Tu fecha se liberó',
    preheader: '',
    blocks: [
      h('Tu fecha se liberó.'),
      p('Hola {{ client.firstName }}, no recibí el depósito de {{ booking.code }}, así que la fecha quedó libre para otros clientes.\n\nSi todavía quieres tu sesión, responde a este correo y buscamos otra fecha.'),
    ],
  },
  'followup.thanks': {
    subject: 'Gracias, {{ client.firstName }}',
    preheader: 'Fue un gusto fotografiarte.',
    blocks: [
      h('Gracias, {{ client.firstName }}.'),
      p('Fue un gusto fotografiarte. Ya estoy editando tus fotos y te aviso en cuanto tu galería esté lista.'),
    ],
  },
  'followup.review_request': {
    subject: '¿Me regalas unas palabras?',
    preheader: 'Significa muchísimo para un negocio pequeño.',
    blocks: [
      h('¿Un pequeño favor, {{ client.firstName }}?'),
      p('Si te encantó tu sesión, una reseña corta ayuda a otras familias a encontrarme. Toma un minuto y significa muchísimo para mí.'),
      btn('Dejar una reseña', '{{ review.url }}'),
    ],
  },
  'followup.review_reminder': {
    subject: 'Una última cosa',
    preheader: '',
    blocks: [
      h('Por si se te pasó.'),
      p('Si tienes un minuto, te agradecería mucho una reseña corta. ¡Gracias otra vez por confiarme tus fotos!'),
      btn('Dejar una reseña', '{{ review.url }}'),
    ],
  },
  'gallery.delivered': {
    subject: '¡Tus fotos están listas, {{ client.firstName }}!',
    preheader: '{{ gallery.title }}',
    blocks: [
      h('¡Tus fotos están listas!'),
      p('{{ gallery.message }}'),
      btn('Abrir tu galería', '{{ gallery.url }}'),
      card('gallery'),
      card('login'),
      note('Descarga tus favoritas antes del {{ gallery.availableUntil }}. Después las fotos se borran del servidor.'),
    ],
  },
  'gallery.resent': {
    subject: 'Tu galería: {{ gallery.title }}',
    preheader: '',
    blocks: [h('Aquí está tu galería otra vez.'), p('{{ gallery.message }}'), btn('Abrir tu galería', '{{ gallery.url }}'), card('gallery')],
  },
  'gallery.extended': {
    subject: 'Tu galería tiene más tiempo',
    preheader: 'Disponible hasta el {{ gallery.availableUntil }}.',
    blocks: [
      h('Más tiempo para tus fotos.'),
      p('Tu galería ahora está disponible hasta el {{ gallery.availableUntil }}.'),
      btn('Abrir tu galería', '{{ gallery.url }}'),
    ],
  },
  'gallery.expiry_warning': {
    subject: 'Tu galería cierra en 2 días',
    preheader: 'Descarga tus fotos antes del {{ gallery.deleteDate }}.',
    blocks: [
      h('Tu galería cierra pronto.'),
      p('Hola {{ client.firstName }}, tus fotos se borrarán el {{ gallery.deleteDate }}. Descarga todo lo que quieras conservar antes de esa fecha.'),
      btn('Descargar tus fotos', '{{ gallery.url }}'),
      card('gallery'),
    ],
  },
  'account.invite': {
    subject: 'Tu cuenta de cliente está lista',
    preheader: 'Entra para ver tus reservas y galerías.',
    blocks: [
      h('¡Bienvenida, {{ client.firstName }}!'),
      p('Te creé una cuenta donde encontrarás tus reservas y galerías.'),
      card('login'),
      btn('Iniciar sesión', '{{ login.url }}'),
    ],
  },
  'account.password_reset': {
    subject: 'Restablece tu contraseña',
    preheader: 'El enlace vale por {{ reset.expiresIn }}.',
    blocks: [
      h('Restablece tu contraseña'),
      p('Alguien pidió restablecer la contraseña de tu cuenta. Si fuiste tú, usa el botón. El enlace vale por {{ reset.expiresIn }}.'),
      btn('Elegir una contraseña nueva', '{{ reset.url }}'),
      note('¿No lo pediste? Ignora este correo: tu contraseña sigue igual.'),
    ],
  },
  'account.password_changed': {
    subject: 'Tu contraseña cambió',
    preheader: '',
    blocks: [
      h('Tu contraseña cambió.'),
      p('Hola {{ client.firstName }}, la contraseña de tu cuenta acaba de cambiar.'),
      note('¿No fuiste tú? Responde a este correo o escríbeme al {{ business.phone }} de inmediato.'),
    ],
  },
  'account.email_changed': {
    subject: 'Tu correo de acceso cambió',
    preheader: '',
    blocks: [
      h('Tu correo de acceso cambió.'),
      p('El correo con el que entras cambió de {{ change.oldEmail }} a {{ change.newEmail }}.'),
      note('¿No lo esperabas? Responde a este correo o escríbeme al {{ business.phone }}.'),
    ],
  },
};

// Emails to Areli and support are only written in English; the Spanish tab starts from the same text.
for (const key of ['admin.new_request', 'admin.daily_digest', 'admin.email_bounced', 'support.storage_level', 'support.email_failures']) {
  es[key] = en[key];
}

export const DEFAULTS = { en, es };

/** A fresh copy of the default content (callers may mutate it). */
export function defaultContent(key, locale = 'en') {
  const content = DEFAULTS[locale]?.[key] ?? DEFAULTS.en[key];
  return content ? structuredClone(content) : null;
}
