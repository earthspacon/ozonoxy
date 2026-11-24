/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

// Uzbek Latin to Cyrillic mapping
const LATIN_TO_CYRILLIC_MAP = {
  a: 'а',
  b: 'б',
  // no c or w in Uzbek Latin: they only come from foreign words
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'ҳ',
  i: 'и',
  j: 'ж',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'қ',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'х',
  y: 'й',
  z: 'з',
  A: 'А',
  B: 'Б',
  C: 'К',
  D: 'Д',
  E: 'Е',
  F: 'Ф',
  G: 'Г',
  H: 'Ҳ',
  I: 'И',
  J: 'Ж',
  K: 'К',
  L: 'Л',
  M: 'М',
  N: 'Н',
  O: 'О',
  P: 'П',
  Q: 'Қ',
  R: 'Р',
  S: 'С',
  T: 'Т',
  U: 'У',
  V: 'В',
  W: 'В',
  X: 'Х',
  Y: 'Й',
  Z: 'З',
}

// stay in Latin: brands, scientific names, Latin abbreviations (pH, HVAC, CFU)
const BRANDS = [
  'OZONOXY',
  'YouTube',
  'Telegram',
  'Facebook',
  'Instagram',
  'WhatsApp',
  'Google',
  'Booking',
  'TripAdvisor',
]
const GENERA = [
  'Salmonella',
  'Listeria',
  'Legionella',
  'Pseudomonas',
  'Staphylococcus',
  'Escherichia',
  'Clostridium',
  'Candida',
  'Aspergillus',
  'Fusarium',
  'Botrytis',
  'Trichophyton',
  'Penicillium',
  'Ascosphaera',
  'Campylobacter',
  'Aeromonas',
  'Vibrio',
  'Ichthyophthirius',
  'Saprolegnia',
  'Paenibacillus',
  'Melissococcus',
  'Nosema',
  'Cryptosporidium',
  'Giardia',
  'Ceriodaphnia',
]
// abbreviations of Russian origin: Cyrillic is the original spelling
const RUSSIAN_ABBREVIATIONS = {
  GOST: 'ГОСТ',
  SanPiN: 'СанПиН',
  SP: 'СП',
  TR: 'ТР',
  TS: 'ТС',
  GN: 'ГН',
  MUK: 'МУК',
  FZ: 'ФЗ',
  RF: 'РФ',
  VNITIP: 'ВНИТИП',
  VNIKHI: 'ВНИХИ',
  MPC: 'МПК',
  SZK: 'СЗК',
  SZSh: 'СЗШ',
  PAZ: 'ПАЗ',
  LiAZ: 'ЛиАЗ',
  KOE: 'КОЕ',
}
const ALWAYS_KEEP = new RegExp(
  [
    'https?://\\S+',
    '(?:/[\\w.-]+)+\\.(?:jpe?g|png|webp|svg|pdf)\\b',
    '[\\w.+-]+@[\\w-]+\\.[\\w.]+',
    '\\bOZONOXY(?: \\d+)?(?: (?:Pro|Max|S)\\b)?',
    // also with an Uzbek suffix: Telegramni, Cryptosporidiumga
    `\\b(?:${BRANDS.join('|')}|${GENERA.join('|')})(?![A-Z])`,
  ].join('|'),
  'g',
)
// E. coli, S. aureus, Botrytis cinerea, Salmonella Typhimurium
const SPECIES = new RegExp(`\\b(?:[A-Z]\\.|${GENERA.join('|')}) [A-Za-z][a-z]{2,}\\b(?!['’ʻ])`, 'g')
const KEEP_IF_IN_EN = new RegExp(
  [
    // chemical symbols and Latin unit words: Fe, Mn, ppm, vs
    "\\b(?:[A-Z][a-z]|[A-Z](?=[\\d₀-₉])|ppm|ppb|vs)\\b(?!['’ʻ])",
    // two or more capitals or a mixed case word: HVAC, CO, O3SS, pH, kW, SARS-CoV-2
    "\\b[A-Za-z0-9]*(?:[A-Z][A-Za-z0-9]*[A-Z]|[a-z][A-Z])[A-Za-z0-9]*(?:-[A-Za-z0-9]+)*\\b(?!['’ʻ])",
  ].join('|'),
  'g',
)

// three or more words in a row copied from en: article and source titles
const ENGLISH_RUN = /[A-Za-z][\w'’,:–-]*(?: [A-Za-z][\w'’,:–-]*){2,}/g

const hasWord = (text, word) =>
  new RegExp(`(?:^|[^A-Za-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z]|$)`).test(text)

function keepEnglishRun(run, enText, mask) {
  const words = run.split(' ')
  const keep = words.map(() => false)
  for (let i = 0; i + 3 <= words.length; i++) {
    if (enText.includes(words.slice(i, i + 3).join(' '))) keep.fill(true, i, i + 3)
  }
  return words.map((word, i) => (keep[i] ? mask(word) : word)).join(' ')
}

function keepLatin(text, enText) {
  const kept = []
  const mask = (match) => {
    kept.push(match)
    return `\u0000${kept.length - 1}\u0000`
  }
  const masked = text
    .replace(ENGLISH_RUN, (match) => keepEnglishRun(match, enText, mask))
    .replace(SPECIES, (match) => (hasWord(enText, match) ? mask(match) : match))
    .replace(ALWAYS_KEEP, mask)
    .replace(KEEP_IF_IN_EN, (match) => {
      if (RUSSIAN_ABBREVIATIONS[match]) return RUSSIAN_ABBREVIATIONS[match]
      // a capitalised Uzbek abbreviation (BMT, QXV) is converted as usual
      return hasWord(enText, match) ? mask(match) : match
    })
  // a kept Latin word glued to a Cyrillic suffix gets a hyphen: Telegram-ни
  const restore = (s) =>
    s.replace(/\u0000(\d+)\u0000(\p{Script=Cyrillic})?/gu, (_, i, next) => kept[Number(i)] + (next ? `-${next}` : ''))
  return { masked, restore }
}

function latinToCyrillic(text, enText = '') {
  if (typeof text !== 'string') {
    return text
  }

  const { masked, restore } = keepLatin(text, enText)
  // oʻ/gʻ with any apostrophe sign → o'/g'
  let result = masked.replace(/([OoGg])[ʻ‘’`]/g, "$1'")

  // Handle special combinations first (order matters!)
  const replacements = [
    ["o'", 'ў'],
    ["O'", 'Ў'],
    ["g'", 'ғ'],
    ["G'", 'Ғ'],
    ['sh', 'ш'],
    ['Sh', 'Ш'],
    ['ch', 'ч'],
    ['Ch', 'Ч'],
    ['ng', 'нг'],
    ['Ng', 'Нг'],
    // Russian-style Cyrillic: я/ё/ю, not йа/йо/йу (yo' is still йў: o' went first)
    ['ye', 'е'],
    ['Ye', 'Е'],
    ['YE', 'Е'],
    ['ya', 'я'],
    ['Ya', 'Я'],
    ['YA', 'Я'],
    ['yo', 'ё'],
    ['Yo', 'Ё'],
    ['YO', 'Ё'],
    ['yu', 'ю'],
    ['Yu', 'Ю'],
    ['YU', 'Ю'],
  ]

  for (const [latin, cyrillic] of replacements) {
    result = result.replace(new RegExp(latin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cyrillic)
  }

  // uz sometimes drops the y of «ye» (etarli, erda, etkazib): these stay е
  result = result.replace(
    /(?<![\p{L}'])([eE])(?=(?:ngil|r|rda|rga|rdan|rni|rning|rlar)(?![\p{L}'])|tarli|tkaz|tishtir|chim)/gu,
    (e) => (e === 'e' ? 'ye' : 'Ye'),
  )
  // e at the start of a word or after a vowel is э (экологик, эмас, аэрация); after i it is
  // the Russian «ие» (гигиена, коэффициент) and stays е
  result = result
    .replace(/(?<![\p{L}'])e|(?<=[aeouAEOU])e/gu, 'э')
    .replace(/(?<![\p{L}'])E(?=\p{L})|(?<=[aeouAEOU])E/gu, 'Э')
  // the tutuq belgisi (ta'sir, ma'lumot) is ъ
  result = result.replace(/(?<=\p{L})['’ʼ](?=\p{L})/gu, 'ъ')

  // Convert remaining single characters
  for (const [latin, cyrillic] of Object.entries(LATIN_TO_CYRILLIC_MAP)) {
    result = result.replace(new RegExp(latin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cyrillic)
  }

  return restore(result)
}

function convertValue(value, enValue) {
  if (typeof value === 'string') {
    return latinToCyrillic(value, typeof enValue === 'string' ? enValue : '')
  } else if (Array.isArray(value)) {
    return value.map((item, i) => convertValue(item, enValue?.[i]))
  } else if (value !== null && typeof value === 'object') {
    const result = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertValue(val, enValue?.[key])
    }
    return result
  }
  return value
}

function convertFile(uzPath, uzCyrPath) {
  console.log(`Converting ${uzPath} -> ${uzCyrPath}`)

  const uzContent = fs.readFileSync(uzPath, 'utf-8')
  const uzData = JSON.parse(uzContent)
  const enPath = uzPath.replace(`${path.sep}uz${path.sep}`, `${path.sep}en${path.sep}`)
  const enData = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf-8')) : undefined

  const uzCyrData = convertValue(uzData, enData)

  fs.writeFileSync(uzCyrPath, JSON.stringify(uzCyrData, null, 2), 'utf-8')
  console.log(`✓ Converted ${path.basename(uzPath)}`)
}

// Get file name from command line
const fileName = process.argv[2]

if (!fileName) {
  console.error('Usage: node convert_latin_to_cyrillic.js <filename>')
  process.exit(1)
}

const projectRoot = path.join(__dirname, '..')
const uzPath = path.join(projectRoot, 'src', 'shared', 'config', 'i18n', 'uz', fileName)
const uzCyrPath = path.join(projectRoot, 'src', 'shared', 'config', 'i18n', 'uz-cyr', fileName)

if (!fs.existsSync(uzPath)) {
  console.error(`File not found: ${uzPath}`)
  process.exit(1)
}

convertFile(uzPath, uzCyrPath)
