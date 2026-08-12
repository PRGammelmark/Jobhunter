export type AppLanguage = 'da' | 'en';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'da' || value === 'en';
}

/** Default editable instructions for cover-letter generation. Context is appended by the server. */
export const DEFAULT_COVER_LETTER_PROMPT_DA = `Skriv en målrettet ansøgning på dansk ud fra den valgte ANSØGNINGSTYPE eller ANSØGNINGSSKABELON og den øvrige kontekst.

VIGTIGT:

* Brug KUN information fra Knowledge Base, Om mig, jobopslag, virksomhedsinfo og den øvrige angivne kontekst.
* Opfind ALDRIG historier, erfaringer, teknologier, tal, resultater, motivationer eller andre fakta.
* Returnér KUN selve ansøgningsteksten — ingen JSON, forklaringer, kommentarer eller CV.
* CV'et er KUN kontekst. Brug det til at forstå kandidatens baggrund og til at vinkle ansøgningen skarpere, men genfortæl ikke CV'et og kopiér ikke større dele af det ind i ansøgningen.
* Antag, at modtageren også modtager og kan læse CV'et.

ANSØGNINGSTYPE / ANSØGNINGSSKABELON:

* I KONTEKST angives enten en ANSØGNINGSTYPE eller en ANSØGNINGSSKABELON. Følg dens struktur, fortælleform og overordnede tilgang.
* Den valgte type/skabelon har forrang i spørgsmål om disposition, rækkefølge, introduktion, argumentationsform og afslutning.
* Forsøg ikke at presse ansøgningen ind i en anden eller mere klassisk ansøgningsstruktur.
* Bevar type-/skabelonens særpræg gennem hele teksten.
* De øvrige instruktioner i denne prompt skal forbedre kvaliteten inden for den valgte type/skabelon — ikke erstatte dens struktur.

FORMAT:

* Start med præcis den overskrift, der er angivet under KONTEKST. Skriv den på én linje uden markdown.
* Ingen meta-information i toppen: ingen dato, adresse, telefon, e-mail, LinkedIn, afsenderblok eller lignende.
* Gå direkte fra overskriften til ansøgningens indhold.
* Maksimalt 350–400 ord.
* Brug som udgangspunkt sammenhængende prosa. Brug kun lister, hvis den valgte type/skabelon specifikt lægger op til det.
* Hold afsnittene relativt korte og læsevenlige.

INDHOLD OG RELEVANS:

* Besvar gennem ansøgningen implicit:

  1. Hvorfor giver kandidaten mening til netop denne virksomhed og stilling?
  2. Hvilken værdi kan kandidaten skabe i rollen?
* Træk aktivt på kandidatens relevante erfaringer, projekter, kompetencer og dokumenterede resultater.
* Skab tydelige forbindelser mellem virksomhedens behov og kandidatens baggrund.
* Vis så vidt muligt, hvordan tidligere erfaring kan omsættes til værdi i den konkrete rolle.
* Brug virksomhedens produkter, branche, kunder, marked, teknologi, arbejdsform eller strategi aktivt, når oplysningerne findes og er relevante.
* Vis forståelse for virksomhedens behov, muligheder eller udfordringer, når de med rimelighed kan udledes af materialet.
* Prioritér konkrete eksempler frem for generelle påstande.
* Inddrag kun erfaringer og kompetencer, der understøtter argumentationen for den konkrete stilling.
* Fremhæv resultater, effekt, ansvar og arbejdsmetode frem for blot at opremse teknologier, værktøjer eller arbejdsopgaver.
* Nævn kun teknologier og værktøjer, når de understøtter en relevant pointe.
* Hvis kandidaten ikke har direkte erfaring med et krav, så brug relevant overførbar eller beslægtet erfaring, hvis den findes. Undgå unødvendige undskyldninger.
* Undgå indhold, der lige så godt kunne stå i en ansøgning til en helt anden virksomhed.

SPROG OG TONE:

* Undgå standardåbninger som "Jeg søger hermed...", "Jeg brænder for..." og "Jeg er passioneret omkring...".
* Introduktionen skal være konkret, relevant og give lyst til at læse videre, men dens form skal følge den valgte type/skabelon.
* Skriv naturligt, selvsikkert og professionelt uden at blive pralende.
* Undgå et autoritativt eller bedrevidende toneleje.
* Antag ikke, at kandidaten ved mere om virksomheden end virksomheden selv.
* Formulér analyser af virksomhedens situation som forståelse, observationer eller muligheder — ikke som bastante sandheder, medmindre de direkte fremgår af materialet.
* Undgå buzzwords, floskler og tomme superlativer, medmindre bestemte begreber er centrale for stillingsopslaget.
* Brug aktivt og præcist sprog.
* Variér sætningslængde og ordvalg, så teksten føles menneskelig og naturlig.
* Tilpas tonen til virksomheden og rollen, fx startup, enterprise, offentlig organisation, bureau eller specialistmiljø.
* Hvert afsnit skal have et formål og bidrage til argumentationen.
* Fjern gentagelser og information, som allerede fremgår tydeligt af CV'et uden at tilføre en ny pointe.
* Skab en tydelig rød tråd gennem ansøgningen.
* Afslut naturligt og fremadskuende. Afslutningens form skal følge den valgte type/skabelon og må ikke tvinges ind i en bestemt standardform.`;

export const DEFAULT_COVER_LETTER_PROMPT_EN = `Write a targeted cover letter in English based on the selected APPLICATION TYPE or APPLICATION TEMPLATE and the rest of the context.

IMPORTANT:

* Use ONLY information from the Knowledge Base, About me, job posting, company info and the other provided context.
* NEVER invent stories, experience, technologies, numbers, results, motivations or other facts.
* Return ONLY the cover letter text itself — no JSON, explanations, comments or CV.
* The CV is context ONLY. Use it to understand the candidate's background and to sharpen the letter's angle, but do not retell the CV or copy large parts of it into the letter.
* Assume the recipient also receives and can read the CV.

APPLICATION TYPE / APPLICATION TEMPLATE:

* CONTEXT specifies either an APPLICATION TYPE or an APPLICATION TEMPLATE. Follow its structure, narrative form and overall approach.
* The selected type/template takes precedence on outline, order, introduction, argumentation style and closing.
* Do not force the letter into a different or more classic cover-letter structure.
* Preserve the distinctive character of the type/template throughout the text.
* The other instructions in this prompt should improve quality within the selected type/template — not replace its structure.

FORMAT:

* Start with exactly the heading given under CONTEXT. Write it on one line without markdown.
* No meta information at the top: no date, address, phone, email, LinkedIn, sender block or similar.
* Go straight from the heading to the letter content.
* Maximum 350–400 words.
* Prefer continuous prose by default. Use lists only if the selected type/template specifically calls for them.
* Keep paragraphs relatively short and readable.

CONTENT AND RELEVANCE:

* Implicitly answer throughout the letter:

  1. Why does the candidate make sense for this company and role in particular?
  2. What value can the candidate create in the role?
* Actively draw on the candidate's relevant experience, projects, skills and documented results.
* Make clear connections between the company's needs and the candidate's background.
* Where possible, show how past experience can translate into value in this specific role.
* Use the company's products, industry, customers, market, technology, working methods or strategy actively when the information exists and is relevant.
* Show understanding of the company's needs, opportunities or challenges when they can reasonably be inferred from the material.
* Prefer concrete examples over general claims.
* Include only experience and skills that support the case for this specific role.
* Emphasize results, impact, responsibility and working methods rather than merely listing technologies, tools or tasks.
* Mention technologies and tools only when they support a relevant point.
* If the candidate lacks direct experience with a requirement, use relevant transferable or related experience if it exists. Avoid unnecessary apologies.
* Avoid content that could equally well appear in an application to a completely different company.

LANGUAGE AND TONE:

* Avoid stock openings such as "I hereby apply...", "I am passionate about..." and "I burn for...".
* The introduction should be concrete, relevant and invite further reading, but its form must follow the selected type/template.
* Write naturally, confidently and professionally without becoming boastful.
* Avoid an authoritative or know-it-all tone.
* Do not assume the candidate knows more about the company than the company itself.
* Frame analyses of the company's situation as understanding, observations or opportunities — not as firm truths unless they are stated directly in the material.
* Avoid buzzwords, clichés and empty superlatives unless particular terms are central to the job posting.
* Use active and precise language.
* Vary sentence length and word choice so the text feels human and natural.
* Adapt the tone to the company and role, e.g. startup, enterprise, public organization, agency or specialist environment.
* Every paragraph should have a purpose and contribute to the argumentation.
* Remove repetition and information that already appears clearly in the CV without adding a new point.
* Create a clear thread through the letter.
* Close naturally and with a forward look. The closing's form must follow the selected type/template and must not be forced into a fixed standard form.`;

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
