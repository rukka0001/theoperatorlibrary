/**
 * FAQ for "Cómo hacer trading desde Chile".
 */
import type { BookContent } from '../types';
import { supportEmail } from '../../../config/business';

export const faq: BookContent['faq'] = {
  heading: 'Preguntas frecuentes',
  items: [
    {
      q: '¿Necesito saber de trading para entenderlo?',
      a: 'No. La Parte 1 empieza desde cero: qué significa hacer trading internacional desde Chile, qué es un broker, qué es el USD/CLP y a qué hora abre el mercado. Está pensado para alguien curioso que recién empieza.'
    },
    {
      q: '¿Es un curso?',
      a: 'No. Es un ebook práctico acompañado de hojas de referencia. Lo lees a tu ritmo y aplicas lo que necesites, sin clases ni plataformas.'
    },
    {
      q: '¿Incluye señales o alertas?',
      a: 'No. No vendemos señales, alertas ni una sala de trading. El objetivo es que entiendas tu propio proceso, no que dependas del de otra persona.'
    },
    {
      q: '¿Tendré que operar de madrugada desde Chile?',
      a: 'No. La zona horaria de Chile es cómoda para el mercado de EE.UU.: la apertura cae a media mañana en Chile. El libro explica los horarios traducidos a tu hora local.'
    },
    {
      q: '¿Cómo recibo el ebook?',
      a: `Después del pago recibes un correo con los botones de descarga de todos los archivos: PDF, EPUB, Kindle/AZW3 y las hojas de referencia. Si no lo ves en unos minutos, revisa tu carpeta de spam o escríbenos a ${supportEmail}.`
    },
    {
      q: '¿Es asesoramiento financiero, legal o tributario?',
      a: 'No. El material es solo para fines educativos. No es asesoramiento financiero, legal ni tributario. Las decisiones que tomes —y sus consecuencias— son tu responsabilidad; consulta a un profesional en Chile para tu situación específica.'
    },
    {
      q: '¿En qué formato viene?',
      a: 'El ebook viene en PDF, EPUB y Kindle/AZW3. Las hojas de referencia y la tarjeta de reglas vienen en PDF listas para imprimir o usar en pantalla.'
    }
  ]
};
