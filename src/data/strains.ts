import { StrainProfile } from '../types';

export const STRAINS: StrainProfile[] = [
  {
    id: 'tlv_imc',
    name: 'Tel Aviv',
    grower: 'IMC',
    type: 'sativa',
    characteristics: ['dry', 'terpene-rich'],
    default_max_temp: 195,
  },
  {
    id: 'purple_clover',
    name: 'Purple Clover',
    type: 'indica',
    characteristics: ['resinous', 'oily', 'heavy'],
    default_max_temp: 210,
  },
  {
    id: 'white_widow',
    name: 'White Widow',
    type: 'hybrid',
    characteristics: ['resinous', 'terpene-rich'],
    default_max_temp: 200,
  },
  {
    id: 'amnesia_haze',
    name: 'Amnesia Haze',
    type: 'sativa',
    characteristics: ['dry', 'citrus', 'terpene-rich'],
    default_max_temp: 195,
  },
  {
    id: 'northern_lights',
    name: 'Northern Lights',
    type: 'indica',
    characteristics: ['oily', 'heavy', 'earthy'],
    default_max_temp: 210,
  },
  {
    id: 'og_kush',
    name: 'OG Kush',
    type: 'hybrid',
    characteristics: ['resinous', 'oily', 'earthy'],
    default_max_temp: 205,
  },
  {
    id: 'blue_dream',
    name: 'Blue Dream',
    type: 'hybrid',
    characteristics: ['terpene-rich', 'light', 'citrus'],
    default_max_temp: 195,
  },
  {
    id: 'gorilla_glue',
    name: 'Gorilla Glue #4',
    type: 'hybrid',
    characteristics: ['resinous', 'oily', 'heavy'],
    default_max_temp: 210,
  },
];

export function getStrainById(id: string): StrainProfile | undefined {
  return STRAINS.find((s) => s.id === id);
}
