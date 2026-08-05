export type AppLanguage = 'da' | 'en';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'da' || value === 'en';
}

/** Default editable instructions for cover-letter generation. Context is appended by the server. */
export const DEFAULT_COVER_LETTER_PROMPT_DA = `Skriv en målrettet ansøgning på dansk.

VIGTIGT: Brug KUN information fra Knowledge Base, Om mig, jobopslag og virksomhedsinfo. Opfind ALDRIG historier, tal eller resultater.
Returnér KUN selve ansøgningsteksten — ingen JSON, ingen forklaringer, ingen CV.
CV'et nedenfor er KUN kontekst: brug det til at vinkle ansøgningen skarpere og til at vide hvilket CV der sendes med. Kopiér ikke CV-indhold ind i ansøgningen. Genfortæl ikke CV'et — antag, at modtageren allerede har læst det.

FORMAT:
- Start med præcis den overskrift der er angivet under KONTEKST (én linje, uden markdown).
- Ingen meta-information i toppen: ingen dato, adresse, telefon, e-mail, LinkedIn, afsenderblok eller lignende.
- Gå direkte fra overskriften til selve brevet (fx "Kære ...").
- Maksimalt 350–400 ord. Undgå lange lister og opremsninger.

VINKEL OG INDHOLD:
- Skriv med udgangspunkt i virksomheden og dens udfordringer – ikke kandidaten.
- Besvar implicit to spørgsmål: Hvorfor denne virksomhed? og Hvorfor er jeg den rette til netop denne stilling?
- Træk aktivt på kandidatens konkrete erfaringer, projekter og resultater, og vis hvordan de kan anvendes hos virksomheden.
- Skriv kandidaten "ind i virksomheden": beskriv, hvordan vedkommende forventes at skabe værdi i netop denne rolle.
- Vis, hvordan kandidaten kan bidrage – ikke blot hvad kandidaten har lavet tidligere.
- Prioritér konkrete eksempler frem for generelle påstande. Vis hellere end fortæl.
- Brug virksomhedens produkter, branche, kunder, teknologi og strategi aktivt i argumentationen, når det er relevant.
- Lav tydelige koblinger mellem virksomhedens behov og kandidatens erfaring.
- Vis forståelse for virksomhedens udfordringer og mål, hvis de kan udledes af stillingsopslaget eller virksomhedsprofilen.
- Inddrag kun erfaringer, der er relevante for den konkrete stilling.
- Fremhæv resultater, effekter og ansvar frem for blot teknologier og værktøjer.
- Nævn kun teknologier, når de understøtter en konkret pointe eller et konkret resultat.
- Hvis kandidaten mangler erfaring inden for et område, så fokuser på tilsvarende erfaring frem for at undskylde manglen.
- Undgå generiske formuleringer, der kunne sendes til enhver virksomhed. Hold indholdet specifikt for både virksomheden og kandidatens erfaring.
- Skriv altid, så ansøgningen føles skrevet specifikt til denne ene stilling.

SPROG OG TONE:
- Undgå standardformuleringer som "Jeg søger hermed...", "Jeg brænder for..." og "Jeg er passioneret omkring...".
- Gør introduktionen fængende og nysgerrighedsskabende. Den første sætning skal give lyst til at læse videre.
- Hold sproget naturligt, selvsikkert og professionelt – aldrig overdrevet eller pralende.
- Undgå at skrive i et autoritativt eller bedrevidende toneleje. Antag aldrig, at virksomheden skal lære noget. Beskriv i stedet, hvordan ansøgerens erfaringer, observationer og arbejdsmetode passer til virksomheden.
- Undgå buzzwords og floskler, medmindre de er centrale for stillingsopslaget.
- Skriv i et aktivt sprog med korte, præcise sætninger.
- Variér sætningslængde og ordvalg for at skabe et naturligt flow.
- Tilpas tonen til virksomheden (startup, enterprise, offentlig sektor, bureau osv.).
- Hvert afsnit skal have et tydeligt formål. Fjern alt, der ikke skaber værdi.
- Skab en rød tråd fra introduktion til afslutning.
- Afslut med en fremadskuende invitation til dialog frem for en passiv standardafslutning.`;

export const DEFAULT_COVER_LETTER_PROMPT_EN = `Write a targeted cover letter in English.

IMPORTANT: Use ONLY information from the Knowledge Base, About me, job posting and company info. NEVER invent stories, numbers or results.
Return ONLY the cover letter text — no JSON, no explanations, no CV.
The CV below is context ONLY: use it to sharpen the angle of the letter and to know which CV is attached. Do not copy CV content into the letter. Do not retell the CV — assume the recipient has already read it.

FORMAT:
- Start with exactly the heading given under CONTEXT (one line, no markdown).
- No meta information at the top: no date, address, phone, email, LinkedIn, sender block or similar.
- Go straight from the heading to the letter itself (e.g. "Dear ...").
- Maximum 350–400 words. Avoid long lists and enumerations.

ANGLE AND CONTENT:
- Write with the company and its challenges as the starting point — not the candidate.
- Implicitly answer two questions: Why this company? and Why am I the right person for this exact role?
- Actively draw on the candidate's concrete experience, projects and results, and show how they can be applied at the company.
- Write the candidate "into the company": describe how they are expected to create value in this specific role.
- Show how the candidate can contribute — not merely what they have done before.
- Prefer concrete examples over general claims. Show rather than tell.
- Use the company's products, industry, customers, technology and strategy actively in the argumentation when relevant.
- Make clear links between the company's needs and the candidate's experience.
- Show understanding of the company's challenges and goals if they can be inferred from the job posting or company profile.
- Only include experience that is relevant to the specific role.
- Emphasize results, impact and responsibility over technologies and tools alone.
- Mention technologies only when they support a concrete point or result.
- If the candidate lacks experience in an area, focus on transferable experience rather than apologizing for the gap.
- Avoid generic phrasing that could be sent to any company. Keep the content specific to both the company and the candidate's experience.
- Always write so the letter feels written specifically for this one role.

LANGUAGE AND TONE:
- Avoid stock phrases such as "I hereby apply...", "I am passionate about..." and "I burn for...".
- Make the introduction engaging and curiosity-sparking. The first sentence should make the reader want to continue.
- Keep the language natural, confident and professional — never exaggerated or boastful.
- Avoid an authoritative or know-it-all tone. Never assume the company needs to be taught. Instead describe how the applicant's experience, observations and working methods fit the company.
- Avoid buzzwords and clichés unless they are central to the job posting.
- Write in an active voice with short, precise sentences.
- Vary sentence length and word choice to create a natural flow.
- Adapt the tone to the company (startup, enterprise, public sector, agency, etc.).
- Every paragraph should have a clear purpose. Remove anything that does not add value.
- Create a clear thread from introduction to closing.
- End with a forward-looking invitation to dialogue rather than a passive standard closing.`;

/** Backwards-compatible alias (Danish default). */
export const DEFAULT_COVER_LETTER_PROMPT = DEFAULT_COVER_LETTER_PROMPT_DA;

export function getDefaultCoverLetterPrompt(language: AppLanguage = 'da'): string {
  return language === 'en' ? DEFAULT_COVER_LETTER_PROMPT_EN : DEFAULT_COVER_LETTER_PROMPT_DA;
}

/** Strip legacy data/context tails and leftover {{placeholders}} from saved overrides. */
export function normalizeCoverLetterPrompt(text: string): string {
  let normalized = text.replace(/\r\n/g, '\n').trim();
  const legacyMarker = /\nPROFIL:\s*/;
  const match = legacyMarker.exec(normalized);
  if (match && typeof match.index === 'number') {
    normalized = normalized.slice(0, match.index).trim();
  }
  // Also strip older "KONTEKST:" / "CONTEXT:" blocks if someone pasted a full prompt
  const contextMarker = /\n(?:KONTEKST|CONTEXT):\s*/;
  const contextMatch = contextMarker.exec(normalized);
  if (contextMatch && typeof contextMatch.index === 'number') {
    normalized = normalized.slice(0, contextMatch.index).trim();
  }
  normalized = normalized.replace(/\{\{\w+\}\}/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return normalized;
}

/** Combine editable instructions with a hardcoded context block. */
export function composeAiPrompt(instructions: string, context: string): string {
  const left = instructions.trim();
  const right = context.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left}\n\n${right}`;
}

export function resolveCoverLetterPrompt(
  override: string | null | undefined,
  language: AppLanguage = 'da'
): string {
  if (typeof override === 'string' && override.trim()) {
    const normalized = normalizeCoverLetterPrompt(override);
    if (normalized) return normalized;
  }
  return getDefaultCoverLetterPrompt(language);
}

/** Persist only a customized cover-letter prompt; clear everything else. */
export function sanitizeCoverLetterPrompt(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const normalized = normalizeCoverLetterPrompt(input);
  if (
    !normalized ||
    normalized === DEFAULT_COVER_LETTER_PROMPT_DA ||
    normalized === DEFAULT_COVER_LETTER_PROMPT_EN
  ) {
    return undefined;
  }
  return normalized;
}
