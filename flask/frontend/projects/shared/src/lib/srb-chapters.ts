/**
 * Service Registry chapters (primary care areas), shared by the Chapters
 * dialog and the sidebar legend.
 *
 * `color` MUST stay identical to the node colours used in the graph
 * (annotation.service.ts, `node[shared_name ^= 'XX']` selectors) — do not
 * change one without the other.
 * `name` follows `data.chapter_description` in nodes.json.
 * `inData: false` = harmonised area with no services in the browser data.
 */
export interface SrbChapter {
  code: string;       // code prefix identifying the chapter (e.g. '80' or 'N')
  name: string;
  color: string;
  icon?: string;      // file in assets/images/srb/ (optional)
  inData: boolean;
}

/** Chapter whose code is the longest prefix of `code` (works for '80…' and 'N06AB'). */
export function findChapter(chapters: SrbChapter[] | undefined, code: any): SrbChapter | undefined {
  const c = String(code || '').toUpperCase();
  let best: SrbChapter | undefined;
  for (const ch of chapters || []) {
    if (c.startsWith(ch.code.toUpperCase()) && (!best || ch.code.length > best.code.length)) { best = ch; }
  }
  return best;
}

export const SRB_CHAPTERS: SrbChapter[] = [
  { code: '80', name: 'General Practice',                 color: '#57341f', icon: '80.png', inData: true },
  { code: '01', name: 'Anesthesiology',                   color: '#19141f', icon: '01.png', inData: true },
  { code: '03', name: 'Radiology',                        color: '#ff9290', icon: '03.png', inData: true },
  { code: '04', name: 'Dermatology and Venereology',      color: '#8f7abe', icon: '04.png', inData: true },
  { code: '06', name: 'Rheumatology',                     color: '#2582be', icon: 'Rheumatology.png', inData: true },
  { code: '07', name: 'Internal Medicine',                color: '#7b3887', icon: '07.png', inData: true },
  { code: '08', name: 'Gynecology and Obstetrics',        color: '#35c0a7', icon: '08.png', inData: true },
  { code: '09', name: 'Surgery',                          color: '#d82327', icon: 'Surgery.png', inData: true },
  { code: '11', name: 'Laboratory',                       color: '#ff9b50', icon: '11.png', inData: true },
  { code: '15', name: 'Eye and Ear',                      color: '#c99e6f', icon: '15.png', inData: true },
  { code: '17', name: 'Neuro Surgery and Neurology',      color: '#b36872', icon: '17.png', inData: true },
  { code: '20', name: 'Orthopaedic Surgery',              color: '#75cd95', icon: '20.png', inData: true },
  { code: '22', name: 'Pathology',                        color: '#de768c', icon: '22.png', inData: true },
  { code: '23', name: 'Plastic Surgery',                  color: '#33835a', icon: '23.png', inData: true },
  { code: '24', name: 'Psychiatry',                       color: '#1a2f43', icon: '24.png', inData: true },
  { code: '25', name: 'Pediatrics',                       color: '#bcaf98', icon: '25.png', inData: true },
  { code: '50', name: 'Dentistry',                        color: '#e4dfc3', icon: '50.png', inData: true },
  { code: '51', name: 'Physiotherapy and Rehabilitation', color: '#bdb963', icon: '51.png', inData: true },
  { code: '53', name: 'Chiropractic',                     color: '#4a507c', icon: '53.png', inData: true },
  { code: '54', name: 'Foot Therapy',                     color: '#b2351b', icon: '54.png', inData: true },
  { code: '63', name: 'Psychology',                       color: '#ec5529', icon: '63.png', inData: true },
  { code: '81', name: 'Emergency Medicine',               color: '#789987', icon: '81.png', inData: true },
  { code: '85', name: 'Pre-hospital Service',             color: '#2c4622', icon: '85.png', inData: false },
  { code: '96', name: 'Translation Services',             color: '#929d9b', icon: 'TranslationServices.png', inData: false },
];
