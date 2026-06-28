/**
 * Data-driven visual sections for "El Trader Que Perdía Ganando":
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
  barsCaption: 'Ejemplo ilustrativo. No representa resultados reales ni garantizados.'
};

export const preview: BookContent['preview'] = {
  eyebrow: 'Vista previa del libro',
  heading: 'Un vistazo a lo que vas a leer',
  intro:
    'Tres pasajes que muestran el tono: directo, honesto y escrito desde dentro del problema.',
  items: [
    {
      title: 'Las cinco palabras que me costaron todo',
      teaser:
        'La frase que casi todo trader se repite justo antes de convertir una pérdida pequeña en una catástrofe.'
    },
    {
      title: 'El recibo',
      teaser:
        'Lo que de verdad pagas cada vez que rompes tus propias reglas — más allá del número en la pantalla.'
    },
    {
      title: 'La única matemática que importa',
      teaser:
        'Por qué tu porcentaje de aciertos puede mentirte y qué número deberías mirar en su lugar.'
    }
  ]
};
