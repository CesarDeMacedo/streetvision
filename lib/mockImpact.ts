// Métricas de impacto SIMULADAS (valores fixos do mockup validado).
// Estrutura pensada para troca futura por cálculo real: substituir estas
// constantes por uma função que derive os valores do projeto/visualização
// (ex: computeImpact(project, visualization)) mantendo o mesmo shape —
// a UI não precisa mudar. Nenhum cálculo real é feito no MVP (ver PRD §4).

export type SimulatedStat = {
  labelKey: 'impact.carLanes' | 'impact.greenArea' | 'impact.cyclistCapacity' | 'impact.traffic'
  /** valor fixo exibido; quando ausente, usa valueKey traduzível */
  value?: string
  valueKey?: 'impact.traffic.value'
  tone?: 'good' | 'warn'
}

export const SIMULATED_STATS: SimulatedStat[] = [
  { labelKey: 'impact.carLanes', value: '4 → 2' },
  { labelKey: 'impact.greenArea', value: '+340 m²', tone: 'good' },
  { labelKey: 'impact.cyclistCapacity', value: '+180/h', tone: 'good' },
  { labelKey: 'impact.traffic', valueKey: 'impact.traffic.value', tone: 'warn' },
]

export const SIMULATED_ELEMENT_KEYS = [
  'elements.bikeLane',
  'elements.median',
  'elements.sidewalk',
  'elements.trees',
  'elements.furniture',
] as const
