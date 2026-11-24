/**
 * Fix uz-cyr to Russian-style Cyrillic. Loanwords take the Russian spelling, read from
 * ru (same key): ц not тс/с, ь, э (концентрация, фильтр, этилен). Uzbek words take э
 * where uz (Latin) has «e» word-initially or after a vowel (эмас, энг), ъ for the
 * tutuq belgisi (таъсир), я/ё/ю not йа/йо/йу.
 * Run from project root:
 *   node scripts/fix-uz-cyr-spelling.mjs              # all uz-cyr JSONs
 *   node scripts/fix-uz-cyr-spelling.mjs <file.json>  # single file
 *   node scripts/fix-uz-cyr-spelling.mjs --dry-run    # preview only
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const I18N = path.join(ROOT, 'src/shared/config/i18n')
const UZ_CYR_DIR = path.join(I18N, 'uz-cyr')

// loanword stems ru may not show in the same key (other case, other word)
const LOANWORDS = [
  ['марганетс', 'марганец'],
  ['квартс', 'кварц'],
  ['митселий', 'мицелий'],
  ['септитсемия', 'септицемия'],
  ['стсенарйи', 'сценарий'],
  ['стсенарий', 'сценарий'],
  ['контсентр', 'концентр'],
  ['консентр', 'концентр'],
  ['фарматсевт', 'фармацевт'],
  ['протседур', 'процедур'],
  ['кантсероген', 'канцероген'],
  ['кансероген', 'канцероген'],
  ['платскарт', 'плацкарт'],
  ['тсинеол', 'цинеол'],
  ['тсимен', 'цимен'],
  ['тселлюлоз', 'целлюлоз'],
  ['тселлюлит', 'целлюлит'],
  ['матритс', 'матриц'],
  ['атсетат', 'ацетат'],
  ['атсетон', 'ацетон'],
  ['ратсион', 'рацион'],
  ['евротсент', 'евроцент'],
  ['тсикл', 'цикл'],
  ['сикл', 'цикл'],
  ['коеффитсиент', 'коэффициент'],
  ['коеффициент', 'коэффициент'],
  ['филтр', 'фильтр'],
  ['сулфат', 'сульфат'],
  ['сулфид', 'сульфид'],
  ['формалдегид', 'формальдегид'],
  ['алтернатив', 'альтернатив'],
]
// stems the per-word passes leave half-fixed (wrong л/ля, й+и after я)
const STEM_FIXES = [
  [/вентил{1,2}(?:я|а)ц/gi, 'вентиляц'],
  [/вентилатор/gi, 'вентилятор'],
  [/сценарйи/gi, 'сценарий'],
  [/вентиляциёсиз/gi, 'вентиляциясиз'],
]
// Russian nouns in ь that ru may only show inflected
const SOFT_NOUNS = ['нефть', 'ртуть', 'алкоголь', 'автомобиль', 'мебель', 'модель', 'текстиль']
// Russian words in ь that are not loanword nouns
const NOT_NOUN = new Set(['столь', 'только', 'вдоль', 'сколь', 'ничуть', 'опять'])
// Russian words that really have й before a vowel
// тс that is a join of a stem in т and an Uzbek suffix in с; any other inner тс is ц
const TS_OK = /^тс(?:из|а|ак|ам|анг|ангиз|алар|ар|ин|ун)/i
const DIGRAPH_OK = /^(?:йод|йог|район|майонез|конвейер|фойе|майор|нью-?йорк|йорк|койот|йемен|фейерверк|секвойя)/i

const WORD = /\p{Script=Cyrillic}+(?:['’ʼ`]\p{Script=Cyrillic}+)*/gu
const LATIN_WORD = /[A-Za-z]+(?:['’ʼʻ‘`][A-Za-z]+)*/g
// after i it is the Russian «ие» (гигиена, коэффициент): stays е
const LAT_VOWEL = /[aeou]/i
// uz sometimes drops the y of «ye» (etarli, erda, etkazib): these stay е
const YE_TYPO = /^e(?:ngil|r|rda|rga|rdan|rni|rning|rlar|tarli|tkaz|tishtir|chim)/i

const RU_ENDING =
  /(?:ами|ями|ого|ему|ому|ыми|ими|ов|ев|ей|ам|ям|ах|ях|ой|ом|ем|ую|ая|ое|ые|ий|ый|ие|ии|ия|а|я|у|ю|ы|и|е|о|ь)$/

// de-Russified skeleton (ц→с, тс→с, ь/ъ→∅, э→е, я→йа …) + source index per char
function skeleton(word) {
  const w = word.toLowerCase()
  const s = []
  const at = []
  const push = (str, i) => {
    for (const ch of str) {
      s.push(ch)
      at.push(i)
    }
  }
  for (let i = 0; i < w.length; i++) {
    const c = w[i]
    if (c === 'т' && w[i + 1] === 'с') push('с', i++)
    else if (c === 'й' && w[i + 1] === 'е') push('е', i++)
    else if ("ьъ'’ʼ`".includes(c)) continue
    else push({ ц: 'с', э: 'е', я: 'йа', ё: 'йо', ю: 'йу' }[c] ?? c, i)
  }
  return { s: s.join(''), at }
}

// skeleton of a uz (Latin) word; E marks an «e» that Uzbek Cyrillic writes as э
const LAT = {
  a: 'а',
  b: 'б',
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
}
const LAT_PAIRS = { "o'": 'ў', "g'": 'ғ', sh: 'ш', ch: 'ч', ts: 'с', ye: 'е' }
function latinSkeleton(word) {
  const w = word.toLowerCase().replace(/[’ʼʻ‘`]/g, "'")
  const s = []
  const flag = []
  for (let i = 0; i < w.length; i++) {
    const pair = LAT_PAIRS[w.slice(i, i + 2)]
    if (pair) {
      s.push(pair)
      flag.push('')
      i++
    } else if (w[i] !== "'") {
      s.push(LAT[w[i]] ?? w[i])
      flag.push(w[i] === 'e' && ((i === 0 && !YE_TYPO.test(w)) || (i > 0 && LAT_VOWEL.test(w[i - 1]))) ? 'E' : '')
    }
  }
  return { s: s.join(''), flag }
}

function commonPrefix(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

// the original letters behind the first n skeleton chars; null inside я/ё/ю
function origPrefix(word, sk, n) {
  if (n < sk.at.length && sk.at[n] === sk.at[n - 1]) return null
  let end = n < sk.at.length ? sk.at[n] : word.length
  if (n < sk.at.length) while (end > 0 && /[ьъ]/i.test(word[end - 1])) end--
  return word.slice(0, end)
}

function matchCase(model, word) {
  if (model.length > 1 && model === model.toUpperCase()) return word.toUpperCase()
  if (model[0] === model[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1).toLowerCase()
  return word.toLowerCase()
}

// a word rebuilt on the ru stem; ь stays before a consonant suffix and drops before a
// vowel (нефть, нефтьни, модели), and a ь the word already has is kept (мебель/мебели)
function respell(w, from, to) {
  if (/^.+\p{Lu}/u.test(w) && w !== w.toUpperCase()) return w
  let rest = w.slice(from.length)
  const hadSoft = /^ь/i.test(rest) || /ь$/i.test(from)
  if (hadSoft) rest = rest.slice(1)
  const core = to.replace(/ь$/i, '')
  const soft = (hadSoft || /ь$/i.test(to)) && !/^[аеиоуўэяёю]/i.test(rest)
  return matchCase(from, core + (soft ? 'ь' : '')) + rest
}

// w spelled as the ru word r: {seen} when the stems match, {seen, word} when it differs
function ruSpelling(w, r) {
  const ws = skeleton(w)
  const L = commonPrefix(ws.s, r.sk.s)
  const stem = r.sk.s.replace(RU_ENDING, '')
  if (L < 4 || !(L === r.sk.s.length || (L >= stem.length && L >= 5))) return null
  const to = origPrefix(r.word, r.sk, L)
  const from = origPrefix(w, ws, L)
  if (to == null || from == null) return null
  const word = respell(w, from, to)
  if (word === w) return { seen: true }
  return { seen: true, word, from, to }
}

function eSpelling(w, uzWords) {
  if (!/[еЕ]/.test(w) || w.length < 2 || w === w.toUpperCase()) return w
  const ws = skeleton(w)
  const u = uzWords.find((x) => x.s === ws.s)
  if (!u) return w
  let out = w
  for (let i = 0; i < u.flag.length; i++) {
    if (u.flag[i] !== 'E') continue
    const j = ws.at[i]
    if (out[j] === 'е' || out[j] === 'Е') out = out.slice(0, j) + (out[j] === 'е' ? 'э' : 'Э') + out.slice(j + 1)
  }
  return out
}

// an old version of this script turned -тсияси into the Russian -ции (концентрации)
function uzbekCase(w, uzWords) {
  if (!/ци[иия]/i.test(w) || !/ции/i.test(w)) return w
  const candidate = w.replace(/ции/i, 'цияси')
  const sk = skeleton(candidate).s
  return uzWords.some((u) => u.s === sk) ? candidate : w
}

function lexiconSpelling(w, lexicon, stems) {
  const ws = skeleton(w)
  const st = stems.find((x) => ws.s.startsWith(x))
  if (!st) return w
  const from = origPrefix(w, ws, st.length)
  if (!from) return w
  return respell(w, from, lexicon.get(st))
}

function* strings(cyr, ru, uz, set, key = '') {
  if (typeof cyr === 'string')
    yield { cyr, ru: typeof ru === 'string' ? ru : '', uz: typeof uz === 'string' ? uz : '', set, key }
  else if (Array.isArray(cyr))
    for (let i = 0; i < cyr.length; i++) yield* strings(cyr[i], ru?.[i], uz?.[i], (v) => (cyr[i] = v), `${key}[${i}]`)
  else if (cyr && typeof cyr === 'object')
    for (const k of Object.keys(cyr)) yield* strings(cyr[k], ru?.[k], uz?.[k], (v) => (cyr[k] = v), `${key}.${k}`)
}

const ruWords = (text) =>
  [...text.matchAll(WORD)].map((m) => ({ word: m[0], sk: skeleton(m[0]) })).filter((r) => r.sk.s.length >= 4)

function fixString(s, lexicon, stems, soft) {
  const ru = ruWords(s.ru)
  const uzWords = [...s.uz.matchAll(LATIN_WORD)].map((m) => latinSkeleton(m[0]))
  return s.cyr.replace(WORD, (word) => {
    let w = uzbekCase(word, uzWords)
    let seen = false
    for (const r of ru) {
      const res = ruSpelling(w, r)
      if (!res) continue
      seen = true
      if (res.word) {
        w = res.word
        break
      }
    }
    if (!seen) w = lexiconSpelling(eSpelling(w, uzWords), lexicon, stems)
    if (!DIGRAPH_OK.test(w))
      w = w.replace(/[йЙ][аоуеАОУЕ]/g, (d) => {
        const to = { а: 'я', о: 'ё', у: 'ю', е: 'е' }[d[1].toLowerCase()]
        return d[0] === 'Й' ? to.toUpperCase() : to
      })
    w = w.replace(/(?<=\p{L})тс/giu, (m, i) => (TS_OK.test(w.slice(i)) ? m : matchCase(m, 'ц')))
    for (const [re, to] of STEM_FIXES) w = w.replace(re, (m) => matchCase(m, to))
    w = soft(w) ?? w
    return w.replace(/['’ʼ`]/g, 'ъ')
  })
}

function load(name) {
  // the legacy flat file uz-cyr.json pairs with ru.json and uz.json
  const read = (lang) => {
    const p = name === 'uz-cyr.json' ? path.join(I18N, `${lang}.json`) : path.join(I18N, lang, name)
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : undefined
  }
  return { cyr: read('uz-cyr'), ru: read('ru'), uz: read('uz') }
}

// stems learnt from ru: ru nouns in ь anywhere, and every ru-driven fix
function buildLexicon(names) {
  const lexicon = new Map()
  const ruAll = new Set()
  const cyrAll = new Set()
  for (const [from, to] of LOANWORDS) lexicon.set(skeleton(from).s, to)
  for (const w of SOFT_NOUNS) lexicon.set(skeleton(w).s, w)
  for (const name of names) {
    const { cyr, ru } = load(name)
    for (const s of strings(ru, ru, ru))
      for (const m of s.cyr.matchAll(WORD)) {
        const w = m[0].toLowerCase()
        if (w.length >= 5 && /[^ьъ]ь$/.test(w) && !/(?:ть|сь|чь)$/.test(w) && !NOT_NOUN.has(w))
          lexicon.set(skeleton(w).s, w)
      }
    for (const s of strings(ru, ru, ru)) for (const m of s.cyr.matchAll(WORD)) ruAll.add(m[0].toLowerCase())
    for (const s of strings(cyr, ru, ru)) {
      for (const m of s.cyr.matchAll(WORD)) cyrAll.add(m[0].toLowerCase())
      const ru = ruWords(s.ru)
      for (const m of s.cyr.matchAll(WORD))
        for (const r of ru) {
          const res = ruSpelling(m[0], r)
          if (!res) continue
          const st = res.word ? skeleton(res.from).s : ''
          if (st.length >= 5 && !lexicon.get(st)?.endsWith('ь')) lexicon.set(st, res.to.toLowerCase())
          break
        }
    }
  }
  return { lexicon, soft: softStems(ruAll, cyrAll), ruAll }
}

// ь stems from the whole ru corpus (мебель, фильтр, параллель) and from uz-cyr words that
// already have the ь (модельлар): a word with the same stem and no ь gets it back
const SOFT_CONS = /[бвгджзйклмнпрстфхцчшщқғҳ]/
const SOFT_VERB = /(?:ть|ться|сь|чь)$/
const SOFT_KEEP = new Set(['нефть', 'ртуть'])
// nouns in ь that ru here only shows as adjectives (параллельно, Монреальским)
const SOFT_SEED = ['параллель', 'монреаль']
// ь before the -н- of an adjective or adverb (канальные, параллельно): the noun may have none
const SOFT_ADJ = /ь(?:н|ск)(?:ый|ий|ая|ое|ые|ых|ым|ыми|ой|ую|ого|ому|ом|о|а|ы)?$/
function softStems(ruWords, cyrWords) {
  const stems = new Map() // stem without ь → { p, inner }
  const add = (s, p, inner) => {
    if (!stems.has(s) || (inner && !stems.get(s).inner)) stems.set(s, { p, inner })
  }
  for (const r of [...ruWords, ...SOFT_SEED]) {
    if (SOFT_ADJ.test(r)) continue
    if ((SOFT_VERB.test(r) && !SOFT_KEEP.has(r)) || NOT_NOUN.has(r)) continue
    for (let p = r.indexOf('ь'); p > 0; p = r.indexOf('ь', p + 1)) {
      if (p < 3 || !SOFT_CONS.test(r[p - 1])) continue
      if (p === r.length - 1) {
        if (p >= 5) add(r.slice(0, p), p, false)
      } else if (SOFT_CONS.test(r[p + 1])) {
        const s = (r.slice(0, p) + r.slice(p + 1)).replace(RU_ENDING, '')
        if (s.length >= 5 && s.length > p) add(s, p, true)
      }
    }
  }
  for (const w of cyrWords) {
    const p = w.indexOf('ь')
    if (p >= 5 && SOFT_CONS.test(w[p - 1]) && (p === w.length - 1 || SOFT_CONS.test(w[p + 1])))
      if (!stems.has(w.slice(0, p))) add(w.slice(0, p), p, false)
  }
  const ruList = [...ruWords]
  const sorted = [...stems.keys()].sort((a, b) => b.length - a.length)
  return (word) => {
    const w = word.toLowerCase()
    if (word.length > 1 && word === word.toUpperCase()) return null
    for (const s of sorted) {
      if (!w.startsWith(s)) continue
      const { p, inner } = stems.get(s)
      const rest = w.slice(s.length)
      if (!inner && rest && !SOFT_CONS.test(rest[0])) return null
      // a Russian word with the same letters and no ь (контроллер, параллелепипед)
      const probe = s + rest.slice(0, 2)
      if (rest && ruList.some((r) => r.startsWith(probe))) return null
      return word.slice(0, p) + 'ь' + word.slice(p)
    }
    return null
  }
}

function getJsonFiles(args) {
  const filtered = args.filter((a) => a !== '--dry-run')
  const all = fs.readdirSync(UZ_CYR_DIR).filter((f) => f.endsWith('.json'))
  if (filtered.length === 0) return fs.existsSync(path.join(I18N, 'uz-cyr.json')) ? [...all, 'uz-cyr.json'] : all
  return filtered.map((f) => path.basename(f))
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const names = getJsonFiles(args)
  const names0 = fs.readdirSync(UZ_CYR_DIR).filter((f) => f.endsWith('.json'))
  if (fs.existsSync(path.join(I18N, 'uz-cyr.json'))) names0.push('uz-cyr.json')
  const { lexicon, soft, ruAll } = buildLexicon(names0)
  const stems = [...lexicon.keys()].sort((a, b) => b.length - a.length)
  const loaded = names.map((name) => ({ name, data: load(name), changed: new Set() }))
  for (const f of loaded)
    for (const s of strings(f.data.cyr, f.data.ru, f.data.uz)) {
      const fixed = fixString(s, lexicon, stems, soft)
      if (fixed !== s.cyr) {
        s.set(fixed)
        f.changed.add(s.key)
      }
    }
  // second ь pass: stems the first pass wrote with ь (биофильм) reach the words it missed
  const cyrAll = new Set()
  for (const f of loaded)
    for (const s of strings(f.data.cyr, f.data.ru, f.data.uz))
      for (const m of s.cyr.matchAll(WORD)) cyrAll.add(m[0].toLowerCase())
  const soft2 = softStems(ruAll, cyrAll)
  for (const f of loaded)
    for (const s of strings(f.data.cyr, f.data.ru, f.data.uz)) {
      const fixed = s.cyr.replace(WORD, (w) => soft2(w) ?? w)
      if (fixed !== s.cyr) {
        s.set(fixed)
        f.changed.add(s.key)
      }
    }
  let total = 0
  for (const { name, data, changed } of loaded) {
    if (!changed.size) continue
    total += changed.size
    console.log(`  ${name}: ${changed.size} string(s)`)
    const out = name === 'uz-cyr.json' ? path.join(I18N, name) : path.join(UZ_CYR_DIR, name)
    if (!dryRun) fs.writeFileSync(out, JSON.stringify(data.cyr, null, 2) + '\n', 'utf-8')
  }
  console.log(`${dryRun ? '(dry-run) would change' : 'Done.'} ${total} string(s) in ${names.length} file(s)`)
}

main()
