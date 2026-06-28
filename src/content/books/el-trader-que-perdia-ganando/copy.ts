/**
 * Marketing copy for "El Trader Que Perdía Ganando".
 * Textual sales content for the landing page (hero, lists, audience, CTA).
 */
import type { BookContent } from '../types';

const imageBase = '/images/books/el-trader-que-perdia-ganando';

export const hero: BookContent['hero'] = {
  badge: 'Ebook digital + 4 bonos incluidos',
  bundleLine:
    'Incluye ebook PDF + EPUB + Kindle/AZW3 + 4 hojas de referencia imprimibles.',
  buyNote:
    'Descarga por correo después del pago · Pago seguro en Chile vía Flow.',
  trust:
    'No es una sala de señales. No incluye alertas. No promete ganancias. Es una guía práctica para construir proceso, riesgo y disciplina.'
};

export const included: BookContent['included'] = {
  heading: 'Lo que recibes hoy',
  intro:
    'No es solo el libro: es el paquete completo para llevar lo que lees a tu operativa.',
  items: [
    { label: 'Ebook principal en PDF', note: '125 páginas' },
    { label: 'Versión EPUB', note: 'para la mayoría de lectores' },
    { label: 'Versión Kindle / AZW3', note: 'para Amazon Kindle' },
    { label: 'Hoja de Decisión para Short' },
    { label: 'Hoja VWAP Long / Short' },
    { label: 'Hoja de Revisión de 50 Trades' },
    { label: 'Tarjeta de Reglas de Riesgo Diario' }
  ]
};

export const why: BookContent['why'] = {
  eyebrow: 'Por qué este libro existe',
  heading: 'Puedes ganar la mayoría de tus trades y aun así perder dinero.',
  paragraphs: [
    'La mayoría de los traders creen que su problema son las entradas. Buscan el setup perfecto, otra estrategia, otra sala de señales. Pero el verdadero agujero suele estar en otro lado.',
    'Puedes acertar en el 70% de tus operaciones y terminar el mes en rojo, porque <strong class="text-stone-100">unas pocas pérdidas sin control borran semanas de ganancias.</strong> No es el mercado: es la falta de un sistema que proteja tu cuenta cuando las cosas se ponen feas.',
    'Este libro existe para mostrarte dónde se fuga realmente tu capital y cómo empezar a construir un proceso —reglas de riesgo, journaling y revisión— que mantenga tus malos días pequeños.'
  ]
};

export const bonuses: BookContent['bonuses'] = {
  badge: 'Incluido sin costo extra',
  heading: '4 bonos prácticos para usar mientras operas',
  intro:
    'Hojas de referencia diseñadas para tomar decisiones más rápido y con reglas claras.',
  items: [
    {
      title: 'Hoja de Decisión para Short',
      description:
        'Un checklist para decidir cuándo un short tiene sentido y cuándo estás solo persiguiendo el precio.',
      image: `${imageBase}/bonus-1.png`
    },
    {
      title: 'Hoja VWAP Long / Short',
      description:
        'Referencia rápida para leer el VWAP en setups long y short sin dudar en el momento.',
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
    'Traders que tienen buenas entradas pero malos resultados.',
    'Quienes ganan muchos trades y aun así no ven crecer su cuenta.',
    'Operadores de small caps que quieren reglas de riesgo claras.',
    'Quienes están listos para revisar su proceso con honestidad.'
  ],
  notForTitle: 'Para quién NO es',
  notForItems: [
    'Quien busca hacerse rico rápido o ganancias garantizadas.',
    'Quien quiere señales o alertas para copiar sin entender.',
    'Quien no está dispuesto a revisar sus propios trades.',
    'Quien espera un atajo en lugar de un proceso.'
  ]
};

export const coverage: BookContent['coverage'] = {
  heading: 'Qué cubre el libro',
  intro: 'De los fundamentos a la psicología, en un recorrido estructurado.',
  details: { pages: 125, chapters: 23, parts: 8 },
  topics: [
    'Trading vs inversión: en qué juego estás realmente.',
    'Short vs long y cuándo conviene cada uno.',
    'Small caps, float, VWAP, frontside y backside.',
    'Brokers, locates y comisiones que se comen tus ganancias.',
    'Riesgo, stops y cómo evitar el sobretrading.',
    'Psicología, journaling y revisión sistemática de trades.'
  ]
};

export const finalCta: BookContent['finalCta'] = {
  heading: 'Empieza a construir un proceso que proteja tu cuenta',
  buyNote: 'Recibes un correo con los botones de descarga después del pago.',
  disclaimer:
    'Solo para fines educativos. No es asesoramiento financiero. No incluye alertas ni señales. El trading conlleva riesgo de pérdida de capital.'
};

export const stickyLabel = 'Ebook + 4 bonos';
