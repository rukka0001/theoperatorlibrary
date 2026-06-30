/**
 * Data-driven visual sections for "Cómo hacer trading desde Chile":
 * the "problem in numbers" stat block and the book preview cards.
 */
import type { BookContent } from '../types';

export const problem: BookContent['problem'] = {
  heading: 'El problema, en números',
  intro:
    'Un ejemplo ilustrativo de cómo un buen porcentaje de aciertos puede esconder una cuenta que pierde.',
  stats: [
    {
      value: '73%',
      label: 'de trades ganadores',
      note: 'Un porcentaje de aciertos que casi cualquiera firmaría.',
      tone: 'win'
    },
    {
      value: '−$',
      label: 'y aun así perdiendo dinero',
      note: 'Porque el tamaño de las pérdidas pesa más que la frecuencia de los aciertos.',
      tone: 'loss'
    },
    {
      value: '5',
      label: 'trades causaron casi todo el daño',
      note: 'Identificarlos y controlarlos cambia toda la curva de capital.',
      tone: 'neutral'
    }
  ],
  bars: [
    {
      label: 'Ganancia de los trades ganadores',
      sign: '+',
      tone: 'win',
      widthPct: 55
    },
    {
      label: 'Pérdida de unos pocos trades sin control',
      sign: '−',
      tone: 'loss',
      widthPct: 78
    }
  ],
  barsCaption:
    'Ejemplo ilustrativo. No representa resultados reales ni garantizados.'
};

export const preview: BookContent['preview'] = {
  eyebrow: 'Vista previa del libro',
  heading: 'Un vistazo a lo que vas a leer',
  intro:
    'Tres pasajes que muestran el tono: directo, honesto y escrito desde dentro del problema.',
  items: [
    {
      title: 'Qué significa hacer trading desde Chile',
      teaser:
        'No es comprar acciones chilenas: es operar mercados internacionales por internet, a media mañana y no de madrugada.'
    },
    {
      title: 'La realidad del USD/CLP',
      teaser:
        'Vives en pesos pero operas en dólares — y el tipo de cambio afecta tu resultado real sin que hagas nada.'
    },
    {
      title: 'Cómo puedes ganar y aun así perder dinero',
      teaser:
        'Por qué tu porcentaje de aciertos puede mentirte y qué número deberías mirar en su lugar.'
    }
  ]
};
