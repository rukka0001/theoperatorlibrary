/**
 * Marketing copy for "Cómo hacer trading desde Chile".
 * Chile-specific adaptation of the Spanish trading book. Textual sales content
 * for the landing page (hero, lists, audience, CTA).
 */
import type { BookContent } from '../types';

const imageBase = '/images/books/como-hacer-trading-desde-chile';

export const hero: BookContent['hero'] = {
  badge: 'Ebook digital + 4 bonos incluidos',
  bundleLine:
    'Incluye ebook PDF + EPUB + Kindle/AZW3 + 4 hojas de referencia imprimibles.',
  buyNote:
    'Descarga por correo después del pago · Pago seguro en Chile vía Flow.',
  trust:
    '¿Quieres hacer trading desde Chile, pero no sabes por dónde empezar? Esta es la guía práctica para entender cómo operar mercados internacionales desde Chile — y cómo evitar los errores que casi destruyeron mi cuenta. No es una sala de señales. No promete ganancias.'
};

export const included: BookContent['included'] = {
  heading: 'Lo que recibes hoy',
  intro:
    'No es solo el libro: es el paquete completo para empezar a operar desde Chile con los ojos abiertos.',
  items: [
    { label: 'Ebook principal en PDF', note: '102 páginas' },
    { label: 'Versión EPUB', note: 'para la mayoría de lectores' },
    { label: 'Versión Kindle / AZW3', note: 'para Amazon Kindle' },
    { label: 'Hoja de Decisión para tus operaciones' },
    { label: 'Hoja de niveles y VWAP' },
    { label: 'Hoja de Revisión de 50 Trades' },
    { label: 'Tarjeta de Reglas de Riesgo Diario' }
  ]
};

export const why: BookContent['why'] = {
  eyebrow: 'Por qué este libro existe',
  heading:
    'Antes de buscar más setups, entiende cómo operar desde Chile y cómo evitar los errores que casi destruyeron mi cuenta.',
  paragraphs: [
    'Cuando empecé, vivía en Chile, no entendía la mitad de las palabras, y casi todo lo que encontraba estaba escrito por estadounidenses para estadounidenses. Tuve que aprender lo difícil — y caro.',
    'La mayoría de la gente curiosa por el trading no sabe lo básico: qué broker usar desde Chile, cómo mover dinero en dólares, a qué hora abre el mercado, qué cuestan las comisiones. Y los que ya operan suelen tener otro problema: <strong class="text-stone-100">ganan la mayoría de sus operaciones y aun así pierden dinero</strong>, porque unas pocas pérdidas sin control borran semanas de aciertos.',
    'Este libro existe para darte las dos cosas: el mapa de cómo operar mercados internacionales desde Chile, y el sistema de riesgo —reglas, stops, registro— que mantiene tus malos días pequeños. Es el mapa que me habría gustado tener.'
  ]
};

export const bonuses: BookContent['bonuses'] = {
  badge: 'Incluido sin costo extra',
  heading: '4 bonos prácticos para usar mientras operas',
  intro:
    'Hojas de referencia diseñadas para tomar decisiones más rápido y con reglas claras.',
  items: [
    {
      title: 'Hoja de Decisión',
      description:
        'Un checklist para decidir cuándo una operación tiene sentido y cuándo solo estás persiguiendo el precio.',
      image: `${imageBase}/bonus-1.png`
    },
    {
      title: 'Hoja de niveles y VWAP',
      description:
        'Referencia rápida para leer niveles clave y el VWAP sin dudar en el momento.',
      image: `${imageBase}/bonus-2.png`
    },
    {
      title: 'Hoja de Revisión de 50 Trades',
      description:
        'Plantilla para revisar tus últimas 50 operaciones y encontrar dónde se fuga tu capital.',
      image: `${imageBase}/bonus-3.png`
    },
    {
      title: 'Tarjeta de Reglas de Riesgo Diario',
      description:
        'Tus límites de riesgo del día en una sola tarjeta, para frenar antes de que un mal día se vuelva catastrófico.',
      image: `${imageBase}/bonus-4.png`
    }
  ]
};

export const audience: BookContent['audience'] = {
  forTitle: 'Para quién es',
  forItems: [
    'Personas en Chile curiosas por el trading que no saben por dónde empezar.',
    'Quienes quieren operar mercados internacionales pero no entienden brokers, dólares ni horarios.',
    'Traders que ganan muchas operaciones y aun así no ven crecer su cuenta.',
    'Quienes están listos para revisar su proceso con honestidad.'
  ],
  notForTitle: 'Para quién NO es',
  notForItems: [
    'Quien busca hacerse rico rápido o ganancias garantizadas.',
    'Quien quiere señales o alertas para copiar sin entender.',
    'Quien no está dispuesto a revisar sus propias operaciones.',
    'Quien espera un atajo en lugar de un proceso.'
  ]
};

export const coverage: BookContent['coverage'] = {
  heading: 'Qué cubre el libro',
  intro:
    'De cómo empezar desde Chile a cómo proteger tu cuenta con un sistema, en dos grandes partes.',
  details: { pages: 102, chapters: 27, parts: 2 },
  topics: [
    'Parte 1: cómo operar mercados internacionales desde Chile.',
    'Brokers y cuentas internacionales, USD/CLP y mover dinero.',
    'Horarios de mercado desde Chile, herramientas y costos.',
    'Parte 2: cómo puedes ganar y aun así perder dinero.',
    'Tamaño de posición, stops, pérdida máxima diaria.',
    'Overtrading, revenge trading, journaling y revisión de trades.'
  ]
};

export const finalCta: BookContent['finalCta'] = {
  heading: 'Empieza a operar desde Chile con un sistema que proteja tu cuenta',
  buyNote: 'Recibes un correo con los botones de descarga después del pago.',
  disclaimer:
    'Solo para fines educativos. No es asesoramiento financiero, legal ni tributario. No incluye alertas ni señales. El trading conlleva riesgo de pérdida de capital.'
};

export const stickyLabel = 'Ebook + 4 bonos';

export const ui: BookContent['ui'] = {
  launchSuffix: 'precio de lanzamiento',
  previewBadge: 'Vista previa',
  bonusWord: 'Bono',
  pagesLabel: 'páginas',
  chaptersLabel: 'capítulos',
  partsLabel: 'partes',
  coverAltPrefix: 'Portada de',
  previewAltPrefix: 'Vista previa:',
  stickyCta: 'Comprar ahora',
  emailPlaceholder: 'tucorreo@ejemplo.com',
  buyCta: 'Comprar ahora'
};
