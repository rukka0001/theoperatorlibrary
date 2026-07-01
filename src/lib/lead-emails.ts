/**
 * Spanish lead-nurture email sequence for the "Cómo empezar a hacer trading
 * desde Chile" free guide.
 *
 * Five emails: #1 delivers the guide immediately, #2–#5 are scheduled follow-ups
 * that build trust and bridge toward the PAID book at its EXISTING launch price.
 *
 * Compliance guardrails baked into the copy: educational only, no profit
 * promises, no signals, no "hazte rico", and NO extra/stacked discount — the
 * emails point at the current launch offer already configured on the product.
 *
 * Each builder returns the parts `sendEmail` needs (subject/html/text). The
 * schedule (which email goes out when) lives in `leads.ts`, not here.
 */
import type { Product } from '../config/products';
import { formatPrice } from '../config/products';
import type { LeadMagnet } from '../config/lead-magnets';

const DISCLAIMER =
  'Contenido educativo. No es asesoría financiera, legal ni tributaria. Hacer trading implica riesgo de pérdida de capital.';

export interface NurtureContext {
  /** Absolute site origin, e.g. https://theoperatorlibrary.com. */
  siteUrl: string;
  /** Signed, expiring link to the free guide PDF (/api/leads/download?token=). */
  guideDownloadUrl: string;
  /** The paid product this sequence nurtures toward. */
  product: Product;
  /** The free guide being delivered. */
  magnet: LeadMagnet;
}

export interface NurtureEmail {
  /** Stable id used for scheduling + Resend tags/debugging. */
  key: string;
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Product landing page URL with attribution params (never breaks checkout). */
function productUrl(ctx: NurtureContext, emailKey: string): string {
  const params = new URLSearchParams({
    utm_source: 'lead_magnet',
    utm_medium: 'email',
    utm_campaign: 'guia_gratis_trading_chile',
    utm_content: emailKey
  });
  return `${ctx.siteUrl}/es/${ctx.product.slug}?${params.toString()}`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#f59e0b;color:#0c0a09;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">${escapeHtml(
    label
  )}</a>`;
}

/** Brand shell shared by every nurture email (dark header + white card + footer). */
function shell(innerHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#0c0a09;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a09;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#0c0a09;padding:20px 28px;">
                <span style="color:#fafaf9;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">The Operator Library</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;color:#44403c;font-size:15px;line-height:1.65;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;border-top:1px solid #e7e5e4;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">
                  ${escapeHtml(DISCLAIMER)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

// ---------------------------------------------------------------------------
// Email 1 — instant: deliver the guide
// ---------------------------------------------------------------------------

function email1(ctx: NurtureContext, ttlDays: number): NurtureEmail {
  const subject = 'Tu guía gratis para empezar a hacer trading desde Chile';
  const html = shell(
    `<h1 style="margin:0 0 16px;font-size:22px;color:#1c1917;">Aquí está tu guía 👇</h1>` +
      p(
        'Gracias por pedirla. Adentro tienes el <strong>mapa</strong> para empezar a operar mercados internacionales desde Chile: qué revisar antes de elegir un broker, cómo pensar el USD/CLP, cómo mover dinero, los horarios de mercado y los costos reales que casi nadie te cuenta.'
      ) +
      `<p style="margin:8px 0 20px;">${button(ctx.guideDownloadUrl, 'Descargar la guía (PDF)')}</p>` +
      p(
        `El enlace es personal y vence en ${ttlDays} días, así que descárgala cuando puedas.`
      ) +
      p(
        'Una cosa antes de irme: la guía cubre la <em>logística</em> —la parte fácil—. En los próximos días te voy a escribir para contarte la parte difícil, la que decide si conservas tu cuenta: el riesgo, la disciplina y los errores que a mí me costaron caro. Revisa tu correo.'
      ) +
      p('— Chris')
  );
  const text = [
    'Aquí está tu guía.',
    '',
    'Gracias por pedirla. Adentro tienes el mapa para empezar a operar mercados internacionales desde Chile: brokers, USD/CLP, mover dinero, horarios y costos reales.',
    '',
    `Descárgala aquí (enlace personal, vence en ${ttlDays} días):`,
    ctx.guideDownloadUrl,
    '',
    'La guía cubre la logística: la parte fácil. En los próximos días te escribo para contarte la parte difícil: el riesgo y la disciplina que deciden si conservas tu cuenta.',
    '',
    '— Chris',
    '',
    DISCLAIMER
  ].join('\n');
  return { key: 'email1_guide', subject, html, text };
}

// ---------------------------------------------------------------------------
// Email 2 — Day 1: story / trust
// ---------------------------------------------------------------------------

function email2(ctx: NurtureContext): NurtureEmail {
  const subject = 'Ganaba muchas operaciones y aun así perdía dinero';
  const href = productUrl(ctx, 'email2_story');
  const html = shell(
    p('Te quiero contar algo incómodo, porque a mí me habría servido oírlo antes.') +
      p(
        'Durante mucho tiempo yo <strong>ganaba la mayoría de mis operaciones</strong>… y aun así mi cuenta se achicaba. Suena imposible, pero es de lo más común. El problema no era encontrar buenas entradas.'
      ) +
      p(
        'El problema era todo lo demás: arriesgaba demasiado en una sola operación, no cortaba a tiempo cuando el precio se iba en mi contra, operaba de más, y unas pocas decisiones malas borraban semanas de trabajo bueno. Ganar muchas veces poco y perder pocas veces mucho te deja en rojo.'
      ) +
      p(
        'No fue un “secreto” lo que cambió las cosas. Fue construir un <strong>sistema de riesgo y disciplina</strong> — y sostenerlo cuando menos ganas tenía de hacerlo.'
      ) +
      p(
        'De eso trata mi libro completo, con mis números y mis peores errores incluidos. Si quieres verlo desde ya, está aquí:'
      ) +
      `<p style="margin:8px 0 16px;">${button(href, 'Ver el libro completo')}</p>` +
      p('Mañana o pasado te sigo contando. — Chris')
  );
  const text = [
    'Durante mucho tiempo yo ganaba la mayoría de mis operaciones y aun así mi cuenta se achicaba.',
    '',
    'El problema no era encontrar buenas entradas. Era todo lo demás: arriesgaba demasiado en una sola operación, no cortaba a tiempo, operaba de más, y unas pocas decisiones malas borraban semanas de trabajo bueno.',
    '',
    'Lo que cambió las cosas no fue un secreto: fue construir un sistema de riesgo y disciplina, y sostenerlo.',
    '',
    'De eso trata mi libro completo, con mis números y mis peores errores incluidos:',
    href,
    '',
    '— Chris',
    '',
    DISCLAIMER
  ].join('\n');
  return { key: 'email2_story', subject, html, text };
}

// ---------------------------------------------------------------------------
// Email 3 — Day 3: bridge guide -> book (promote EXISTING launch offer)
// ---------------------------------------------------------------------------

function email3(ctx: NurtureContext): NurtureEmail {
  const subject =
    'La guía te ayuda a empezar. El libro te ayuda a no volarte la cuenta.';
  const href = productUrl(ctx, 'email3_bridge');
  const launch = formatPrice(ctx.product.price, ctx.product.currency);
  const regular = ctx.product.regularPrice
    ? formatPrice(ctx.product.regularPrice, ctx.product.currency)
    : null;
  const priceLine = regular
    ? `Ahora mismo está con el <strong>50% de descuento de lanzamiento</strong>: ${launch} en vez de ${regular}.`
    : `Ahora mismo está a su <strong>precio de lanzamiento</strong>: ${launch}.`;
  const html = shell(
    p('¿Ya alcanzaste a leer la guía? Entonces tienes el mapa para <strong>empezar</strong>.') +
      p(
        'La guía te dice cómo se parte desde Chile: broker, dólares, transferencias, horarios, costos. Es lo que necesitas para dar el primer paso sin caminar a ciegas.'
      ) +
      p(
        'El libro completo es la otra mitad — la que de verdad protege tu cuenta: mis pérdidas reales explicadas, el manejo del riesgo, cortar pérdidas, el tamaño de las posiciones, la psicología, llevar un registro, construir reglas, y un camino realista para un principiante en Chile. 27 capítulos.'
      ) +
      p(priceLine) +
      `<p style="margin:8px 0 16px;">${button(href, 'Aprovechar el precio de lanzamiento')}</p>` +
      p('— Chris')
  );
  const text = [
    '¿Ya leíste la guía? Entonces tienes el mapa para empezar.',
    '',
    'La guía te dice cómo se parte desde Chile: broker, dólares, transferencias, horarios, costos.',
    '',
    'El libro completo es la otra mitad, la que protege tu cuenta: mis pérdidas reales explicadas, manejo del riesgo, cortar pérdidas, tamaño de posiciones, psicología, llevar un registro, construir reglas y un camino realista para empezar en Chile. 27 capítulos.',
    '',
    regular
      ? `Ahora está con el 50% de descuento de lanzamiento: ${launch} en vez de ${regular}.`
      : `Ahora está a su precio de lanzamiento: ${launch}.`,
    href,
    '',
    '— Chris',
    '',
    DISCLAIMER
  ].join('\n');
  return { key: 'email3_bridge', subject, html, text };
}

// ---------------------------------------------------------------------------
// Email 4 — Day 5: objection handling (price vs. cost of a mistake)
// ---------------------------------------------------------------------------

function email4(ctx: NurtureContext): NurtureEmail {
  const subject = 'Una mala operación cuesta más que este libro';
  const href = productUrl(ctx, 'email4_value');
  const launch = formatPrice(ctx.product.price, ctx.product.currency);
  const html = shell(
    p(
      'Cuando alguien duda si un libro de trading “vale la pena”, suele estar mirando el número equivocado.'
    ) +
      p(
        `El libro cuesta ${launch}. <strong>Una sola operación mal gestionada</strong> —una posición demasiado grande, una pérdida que no cortaste a tiempo— te puede costar mucho más que eso en un solo día. Y desde Chile, con costos de fricción más altos, ese margen de error es todavía menor.`
      ) +
      p(
        'No se trata de asustarte. Se trata de comparar el costo de aprender con estructura versus aprender solo a golpes.'
      ) +
      p('Lo que hay dentro de los 27 capítulos:') +
      `<ul style="margin:0 0 16px;padding-left:20px;color:#44403c;">
        <li style="margin-bottom:6px;">Cómo puedes ganar muchas operaciones y aun así perder — y cómo evitarlo.</li>
        <li style="margin-bottom:6px;">Manejo del riesgo: tamaño de posición, cortar pérdidas, límites diarios.</li>
        <li style="margin-bottom:6px;">La psicología que hace que la gente rompa sus propias reglas.</li>
        <li style="margin-bottom:6px;">Llevar un registro y revisar tus operaciones para mejorar de verdad.</li>
        <li style="margin-bottom:6px;">Un camino realista para empezar pequeño desde Chile.</li>
      </ul>` +
      p(
        'Además del libro, recibes las <strong>hojas de referencia</strong> incluidas con el producto, para tener lo esencial a mano.'
      ) +
      `<p style="margin:8px 0 16px;">${button(href, 'Ver qué incluye el libro')}</p>` +
      p('No te promete ganancias. Te da un método para no destruir tu cuenta mientras aprendes. — Chris')
  );
  const text = [
    'Cuando alguien duda si un libro de trading vale la pena, suele mirar el número equivocado.',
    '',
    `El libro cuesta ${launch}. Una sola operación mal gestionada te puede costar mucho más que eso en un día. Desde Chile, con costos más altos, el margen de error es aún menor.`,
    '',
    'No se trata de asustarte. Se trata de comparar el costo de aprender con estructura versus aprender solo a golpes.',
    '',
    'Dentro de los 27 capítulos: cómo ganar operaciones y aun así perder (y cómo evitarlo), manejo del riesgo (tamaño de posición, cortar pérdidas, límites diarios), la psicología que rompe reglas, llevar un registro, y un camino realista para empezar pequeño desde Chile.',
    '',
    'Además del libro, recibes las hojas de referencia incluidas con el producto.',
    href,
    '',
    'No te promete ganancias. Te da un método para no destruir tu cuenta mientras aprendes.',
    '',
    '— Chris',
    '',
    DISCLAIMER
  ].join('\n');
  return { key: 'email4_value', subject, html, text };
}

// ---------------------------------------------------------------------------
// Email 5 — Day 6: reminder / soft urgency (no fake deadline)
// ---------------------------------------------------------------------------

function email5(ctx: NurtureContext): NurtureEmail {
  const subject = 'El precio de lanzamiento sigue activo, pero no para siempre';
  const href = productUrl(ctx, 'email5_reminder');
  const launch = formatPrice(ctx.product.price, ctx.product.currency);
  const regular = ctx.product.regularPrice
    ? formatPrice(ctx.product.regularPrice, ctx.product.currency)
    : null;
  const html = shell(
    p('Un último recordatorio y te dejo tranquilo.') +
      p(
        regular
          ? `<strong>Cómo hacer trading desde Chile</strong> sigue con su <strong>precio de lanzamiento</strong> (${launch} en vez de ${regular}) mientras siga disponible. No es una cuenta regresiva falsa: es el precio de lanzamiento, y en algún momento cierra.`
          : `<strong>Cómo hacer trading desde Chile</strong> sigue a su <strong>precio de lanzamiento</strong> (${launch}) mientras siga disponible. En algún momento cierra.`
      ) +
      p(
        'Si la guía te sirvió y quieres la otra mitad —el sistema de riesgo y disciplina que evita que un buen comienzo termine en una cuenta vacía— este es un buen momento para aprovecharlo.'
      ) +
      `<p style="margin:8px 0 16px;">${button(href, 'Conseguir el libro al precio de lanzamiento')}</p>` +
      p(
        'Y si por ahora te quedas solo con la guía gratis, también está perfecto. Gracias por leer. — Chris'
      )
  );
  const text = [
    'Un último recordatorio y te dejo tranquilo.',
    '',
    regular
      ? `"Cómo hacer trading desde Chile" sigue con su precio de lanzamiento (${launch} en vez de ${regular}) mientras siga disponible. No es una cuenta regresiva falsa: en algún momento cierra.`
      : `"Cómo hacer trading desde Chile" sigue a su precio de lanzamiento (${launch}) mientras siga disponible. En algún momento cierra.`,
    '',
    'Si la guía te sirvió y quieres la otra mitad —el sistema de riesgo y disciplina— este es un buen momento.',
    href,
    '',
    'Y si por ahora te quedas solo con la guía gratis, también está perfecto. Gracias por leer.',
    '',
    '— Chris',
    '',
    DISCLAIMER
  ].join('\n');
  return { key: 'email5_reminder', subject, html, text };
}

/**
 * Build the full 5-email sequence for a subscriber. Index 0 is the instant
 * delivery email; indexes 1–4 are the scheduled follow-ups, in order.
 */
export function buildNurtureSequence(
  ctx: NurtureContext,
  guideTtlDays: number
): NurtureEmail[] {
  return [
    email1(ctx, guideTtlDays),
    email2(ctx),
    email3(ctx),
    email4(ctx),
    email5(ctx)
  ];
}
