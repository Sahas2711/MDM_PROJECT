import { useLang, t } from '../context/LanguageContext'

/**
 * Returns a translate function bound to the current language.
 * Usage inside any component:
 *   const tr = useTranslate()
 *   tr('Scan Crop')  →  'स्कैन करें' (in Hindi)
 */
export default function useTranslate() {
  const { lang } = useLang()
  return (str) => t(str, lang)
}
