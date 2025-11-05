export const LANGUAGES = [
  { code: 'thai', name: 'Thai' },
  { code: 'lao', name: 'Lao' },
  { code: 'vietnamese', name: 'Vietnamese' },
  { code: 'khmer', name: 'Khmer (Cambodian)' },
  { code: 'burmese', name: 'Burmese (Myanmar)' },
  { code: 'english', name: 'English' },
  { code: 'chinese', name: 'Chinese' },
  { code: 'japanese', name: 'Japanese' },
  { code: 'korean', name: 'Korean' },
  { code: 'french', name: 'French' },
  { code: 'german', name: 'German' },
  { code: 'spanish', name: 'Spanish' },
  { code: 'russian', name: 'Russian' },
  { code: 'hindi', name: 'Hindi' },
  { code: 'filipino', name: 'Filipino' },
  { code: 'indonesian', name: 'Indonesian' },
  { code: 'malay', name: 'Malay' },
  { code: 'arabic', name: 'Arabic' }
]

export function languageNameFor(codeOrName) {
  if (!codeOrName) return ''
  const lower = String(codeOrName).toLowerCase()
  const found = LANGUAGES.find(l => l.code === lower || l.name.toLowerCase() === lower)
  return found ? found.name : codeOrName
}
