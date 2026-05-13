export const RISK_LEVEL = Object.freeze({
  GOOD: 'Хорошо',
  WARN: 'Сомнительно',
  DANGER: 'Большие риски'
})

export const RISK_LEVEL_KEYS = Object.freeze({
  [RISK_LEVEL.GOOD]: 'good',
  [RISK_LEVEL.WARN]: 'warn',
  [RISK_LEVEL.DANGER]: 'danger'
})

const RISKS_OPEN_TAG = '<!--RISKS-->'
const RISKS_CLOSE_TAG = '<!--/RISKS-->'

export const PROMPT_OPTIONS = Object.freeze({
  gdpr: 'Проверить документ на соответствие GDPR и 152-ФЗ (защита персональных данных, согласия, трансграничная передача).',
  tax: 'Дополнительно проанализировать налоговые риски: НДС, налог на прибыль, переквалификация выплат, формальные основания для проверок.',
  corruption: 'Выделить коррупционные факторы: непрозрачные условия, неоправданные посредники, аффилированность, нерыночные цены.',
  labor: 'Если в документе есть трудовые отношения - проверить трудовые договоры на скрытые штрафы, кабальные условия, нарушения ТК РФ.',
  counterparty: 'Добавить анализ рисков для контрагента: его правоспособность, обязательства, штрафы и санкции в его сторону.'
})

export const PROMPT_OPTION_LABELS = Object.freeze({
  gdpr: 'Проверить на соответствие GDPR/152-ФЗ',
  tax: 'Анализировать налоговые риски',
  corruption: 'Выделить коррупционные факторы',
  labor: 'Проверить трудовые договоры на скрытые штрафы',
  counterparty: 'Добавить анализ рисков для контрагента'
})

const PROMPT_TEMPLATE = `Ты — ведущий эксперт с 15+ годами опыта в анализе юридических, технических и коммерческих документов. Твоя задача — провести многоуровневый аудит, выявляя не только явные, но и скрытые риски, пробелы и возможности для оптимизации.

Критерии качества:
- Анализ ТОЛЬКО существенных аспектов, способных реально повлиять на правовую/финансовую устойчивость документа.
- Контекстный подход: учет юрисдикции, отрасли, типа документа и целей сторон.
- Ссылки на законы (для РФ — ГК РФ, ФЗ; для ЕС — директивы, GDPR; иные юрисдикции — соответствующие НПА).
- Глубина аргументации: каждый вывод подтверждай ссылками на пункты документа и нормами права.

СТРУКТУРА ОТЧЕТА (обязательна):
1. КОНТЕКСТУАЛЬНАЯ ПРИВЯЗКА
2. ЮРИДИКО-ТЕХНИЧЕСКИЙ АУДИТ
3. СОДЕРЖАТЕЛЬНЫЙ АНАЛИЗ
4. ПРАВОВОЙ АУДИТ
5. РИСК-МЕНЕДЖМЕНТ
6. РЕКОМЕНДАЦИИ
7. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ

ФОРМАТИРОВАНИЕ:
- Используй полноценную Markdown-разметку (## ### ** _ - 1. > | таблицы).
- НЕ используй эмодзи, декоративные линии "---" "***" "___" — они ломают вёрстку.
- НЕ используй символы "—" и "*" для выделения вне правил Markdown.
- Оставляй пустые строки между смысловыми блоками.

КРИТИЧЕСКИ ВАЖНО: после всего основного отчёта добавь блок рисков в строго заданном формате.
Маркеры обязательны. Между маркерами — валидный JSON-массив без префиксов.

${RISKS_OPEN_TAG}
\`\`\`json
[
  {
    "level": "Хорошо" | "Сомнительно" | "Большие риски",
    "name": "краткое название риска (до 6 слов)",
    "quote": "точная цитата из документа, как в исходнике (без сокращений и перефразирования)",
    "comment": "пояснение от ИИ, 1-3 предложения",
    "recommendations": ["рекомендация 1", "рекомендация 2"]
  }
]
\`\`\`
${RISKS_CLOSE_TAG}

Требования к рискам:
- 3-10 элементов, отражающих суть документа.
- level выбирается строго из списка: "Хорошо" / "Сомнительно" / "Большие риски".
- quote — это точная подстрока документа, без многоточий и пропусков, иначе подсветка в тексте не сработает.
- recommendations — массив строк (не объектов).
- Никакого текста вне маркеров после ${RISKS_OPEN_TAG}.
{{EXTRA_INSTRUCTIONS}}
Документ для анализа:
{{DOCUMENT_TEXT}}
`

export function buildAnalysisPrompt(text, { maxChars = 15000, options = [] } = {}) {
  const safe = (text || '').substring(0, maxChars)
  const extra = (Array.isArray(options) ? options : [])
    .filter((key) => PROMPT_OPTIONS[key])
    .map((key) => `- ${PROMPT_OPTIONS[key]}`)
    .join('\n')
  const extraSection = extra
    ? `\nДОПОЛНИТЕЛЬНЫЕ ФОКУСЫ АНАЛИЗА:\n${extra}\n`
    : ''
  return PROMPT_TEMPLATE.replace('{{DOCUMENT_TEXT}}', safe).replace(
    '{{EXTRA_INSTRUCTIONS}}',
    extraSection
  )
}

function extractJsonFromBlock(block) {
  const trimmed = block.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence) return fence[1].trim()
  return trimmed
}

function normalizeRisk(raw) {
  if (!raw || typeof raw !== 'object') return null
  const level = typeof raw.level === 'string' ? raw.level.trim() : ''
  if (!RISK_LEVEL_KEYS[level]) return null
  const name = String(raw.name ?? '').trim()
  const quote = String(raw.quote ?? '').trim()
  const comment = String(raw.comment ?? '').trim()
  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.map((r) => String(r).trim()).filter(Boolean)
    : []
  if (!name && !quote) return null
  return { level, name, quote, comment, recommendations }
}

/**
 * Разбирает ответ модели на (1) текст отчёта без блока рисков и (2) массив рисков.
 * Если маркеры или JSON некорректны — возвращает исходный текст и пустой массив.
 * @param {string} raw
 * @returns {{ report: string, risks: Array }}
 */
export function parseAnalysisResponse(raw) {
  const source = String(raw ?? '')
  const openIdx = source.indexOf(RISKS_OPEN_TAG)
  const closeIdx = source.indexOf(RISKS_CLOSE_TAG)
  if (openIdx < 0 || closeIdx < 0 || closeIdx < openIdx) {
    return { report: source.trim(), risks: [] }
  }
  const before = source.slice(0, openIdx)
  const after = source.slice(closeIdx + RISKS_CLOSE_TAG.length)
  const block = source.slice(openIdx + RISKS_OPEN_TAG.length, closeIdx)
  const jsonText = extractJsonFromBlock(block)

  let parsed = []
  try {
    const data = JSON.parse(jsonText)
    if (Array.isArray(data)) parsed = data.map(normalizeRisk).filter(Boolean)
  } catch (error) {
    parsed = []
  }

  const report = `${before}\n${after}`.replace(/\n{3,}/g, '\n\n').trim()
  return { report, risks: parsed }
}

export function groupRisksByLevel(risks = []) {
  return {
    [RISK_LEVEL.DANGER]: risks.filter((r) => r.level === RISK_LEVEL.DANGER),
    [RISK_LEVEL.WARN]: risks.filter((r) => r.level === RISK_LEVEL.WARN),
    [RISK_LEVEL.GOOD]: risks.filter((r) => r.level === RISK_LEVEL.GOOD)
  }
}
