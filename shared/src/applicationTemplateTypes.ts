import type { AppLanguage } from './aiPrompts';

export const APPLICATION_TEMPLATE_TYPE_IDS = [
  'classic_targeted',
  'problem_solution_value',
  'case_based',
  'future_oriented',
  'personal_narrative',
] as const;

export type ApplicationTemplateTypeId = (typeof APPLICATION_TEMPLATE_TYPE_IDS)[number];

export interface ApplicationTemplateTypeContent {
  title: string;
  /** Short intro shown on the Templates page and used as AI framing */
  intro?: string;
  structure: string[];
  strengths: string[];
  weaknesses: string[];
}

type LocalizedTemplateType = Record<AppLanguage, ApplicationTemplateTypeContent>;

export const APPLICATION_TEMPLATE_TYPES: Record<
  ApplicationTemplateTypeId,
  LocalizedTemplateType
> = {
  classic_targeted: {
    da: {
      title: 'Den klassiske, målrettede ansøgning',
      structure: [
        'Kort indledning: hvorfor netop jobbet og virksomheden',
        'Dine 2–3 mest relevante kompetencer',
        'Konkrete eksempler på erfaring/resultater',
        'Hvordan du vil skabe værdi i rollen',
        'Kort afslutning med motivation for en samtale',
      ],
      strengths: [
        'Let at læse og afkode',
        'Passer til næsten alle stillinger',
        'Gør det nemt at koble dig direkte til jobopslaget',
        'Sikker form, især i mere traditionelle virksomheder',
      ],
      weaknesses: [
        'Kan hurtigt blive generisk',
        'Mange andre kandidater skriver på samme måde',
        'Kræver gode eksempler for at skille sig ud',
      ],
    },
    en: {
      title: 'The classic, targeted application',
      structure: [
        'Short introduction: why this role and company',
        'Your 2–3 most relevant skills',
        'Concrete examples of experience/results',
        'How you will create value in the role',
        'Short closing with motivation for an interview',
      ],
      strengths: [
        'Easy to read and decode',
        'Fits almost any role',
        'Makes it easy to connect you directly to the job posting',
        'Safe format, especially for more traditional companies',
      ],
      weaknesses: [
        'Can quickly become generic',
        'Many other candidates write the same way',
        'Needs strong examples to stand out',
      ],
    },
  },
  problem_solution_value: {
    da: {
      title: 'Problem → løsning → værdi',
      intro:
        'Ansøgningen bygges omkring det problem, virksomheden reelt ansætter nogen til at løse.',
      structure: [
        'Identificér virksomhedens vigtigste udfordring eller behov',
        'Beskriv kort din forståelse af udfordringen',
        'Vis hvordan din erfaring matcher den',
        'Underbyg med konkrete cases/resultater',
        'Beskriv hvad du konkret vil kunne bidrage med',
      ],
      strengths: [
        'Meget forretningsorienteret',
        'Flytter fokus fra “hvem jeg er” til “hvad jeg kan gøre for jer”',
        'Særligt stærk til specialist-, senior- og managerroller',
        'Demonstrerer forståelse for virksomheden',
      ],
      weaknesses: [
        'Du kan ramme forkert i din analyse',
        'Kræver mere research',
        'Kan virke lidt konsulentagtig, hvis den overdrives',
      ],
    },
    en: {
      title: 'Problem → solution → value',
      intro:
        'The application is built around the problem the company is actually hiring someone to solve.',
      structure: [
        'Identify the company’s most important challenge or need',
        'Briefly describe your understanding of the challenge',
        'Show how your experience matches it',
        'Support with concrete cases/results',
        'Describe what you can concretely contribute',
      ],
      strengths: [
        'Highly business-oriented',
        'Shifts focus from “who I am” to “what I can do for you”',
        'Especially strong for specialist, senior and manager roles',
        'Demonstrates understanding of the company',
      ],
      weaknesses: [
        'You may misread the challenge',
        'Requires more research',
        'Can feel a bit consultant-like if overdone',
      ],
    },
  },
  case_based: {
    da: {
      title: 'Case-baseret ansøgning',
      intro: 'Du bruger én stærk historie som rygrad for ansøgningen.',
      structure: [
        'Start med en konkret situation eller udfordring',
        'Forklar hvad du gjorde',
        'Beskriv resultatet',
        'Kobl erfaringen direkte til den nye stilling',
        'Supplér med 1–2 andre relevante kompetencer',
        'Afslut med hvorfor du vil gøre det samme hos virksomheden',
      ],
      strengths: [
        'Gør kompetencer konkrete og troværdige',
        'Mere levende end klassiske ansøgninger',
        'Resultater bliver lettere at huske',
        'Meget stærk hvis du har en case, der matcher jobbet tæt',
      ],
      weaknesses: [
        'En dårlig eller irrelevant case kan fylde for meget',
        'Kan gøre ansøgningen for snæver',
        'Kræver, at historien fortælles meget kort og præcist',
      ],
    },
    en: {
      title: 'Case-based application',
      intro: 'You use one strong story as the backbone of the application.',
      structure: [
        'Start with a concrete situation or challenge',
        'Explain what you did',
        'Describe the result',
        'Connect the experience directly to the new role',
        'Add 1–2 other relevant skills',
        'Close with why you want to do the same at this company',
      ],
      strengths: [
        'Makes skills concrete and credible',
        'More vivid than classic applications',
        'Results are easier to remember',
        'Very strong if you have a case that closely matches the job',
      ],
      weaknesses: [
        'A weak or irrelevant case can take up too much space',
        'Can make the application too narrow',
        'Requires the story to be told very briefly and precisely',
      ],
    },
  },
  future_oriented: {
    da: {
      title: 'Fremtidsorienteret: “Det vil jeg gøre hos jer”',
      intro: 'Her bruger du mindre plads på fortiden og mere på, hvordan du vil angribe jobbet.',
      structure: [
        'Hvorfor rollen interesserer dig',
        'Din forståelse af virksomhedens situation',
        '2–4 ting du ville prioritere i rollen',
        'Hvordan din erfaring gør dig i stand til at gennemføre dem',
        'Hvilken effekt du forventer at kunne skabe',
      ],
      strengths: [
        'Viser initiativ og ejerskab',
        'Gør det nemt for arbejdsgiveren at forestille sig dig i jobbet',
        'Meget stærk til roller med ansvar, strategi eller udvikling',
        'Kan differentiere dig markant',
      ],
      weaknesses: [
        'Risiko for at virke bedrevidende',
        'Du kender ikke nødvendigvis virksomhedens interne forhold',
        'Mindre velegnet til meget juniorprægede stillinger',
      ],
    },
    en: {
      title: 'Future-oriented: “Here’s what I’ll do for you”',
      intro: 'You spend less space on the past and more on how you will approach the job.',
      structure: [
        'Why the role interests you',
        'Your understanding of the company’s situation',
        '2–4 things you would prioritize in the role',
        'How your experience enables you to deliver on them',
        'What impact you expect to create',
      ],
      strengths: [
        'Shows initiative and ownership',
        'Makes it easy for the employer to picture you in the job',
        'Very strong for roles with responsibility, strategy or development',
        'Can differentiate you significantly',
      ],
      weaknesses: [
        'Risk of coming across as know-it-all',
        'You may not know the company’s internal realities',
        'Less suitable for very junior roles',
      ],
    },
  },
  personal_narrative: {
    da: {
      title: 'Den personlige fortælling',
      intro: 'Ansøgningen tager udgangspunkt i din motivation og faglige udvikling.',
      structure: [
        'Personlig, men jobrelevant åbning',
        'Hvorfor du interesserer dig for området',
        'Hvordan din erfaring har ført dig hertil',
        'Hvorfor netop virksomheden er næste logiske skridt',
        'Hvad du fagligt bringer med dig',
        'Kort fremadrettet afslutning',
      ],
      strengths: [
        'Kan skabe en stærk personlig forbindelse',
        'God når motivation og kulturmatch betyder meget',
        'Kan forklare karriereskift eller utraditionel baggrund',
        'Mere menneskelig og mindre CV-agtig',
      ],
      weaknesses: [
        'Kan blive for meget “mig, mig, mig”',
        'Risiko for for lidt fokus på virksomhedens behov',
        'Kræver en faktisk interessant og relevant fortælling',
      ],
    },
    en: {
      title: 'The personal narrative',
      intro: 'The application starts from your motivation and professional development.',
      structure: [
        'Personal but job-relevant opening',
        'Why you care about this field',
        'How your experience led you here',
        'Why this company is the next logical step',
        'What you bring professionally',
        'Short forward-looking close',
      ],
      strengths: [
        'Can create a strong personal connection',
        'Good when motivation and culture fit matter a lot',
        'Can explain career changes or an unconventional background',
        'More human and less CV-like',
      ],
      weaknesses: [
        'Can become too much “me, me, me”',
        'Risk of too little focus on the company’s needs',
        'Requires a genuinely interesting and relevant story',
      ],
    },
  },
};

export function isApplicationTemplateTypeId(value: unknown): value is ApplicationTemplateTypeId {
  return (
    typeof value === 'string' &&
    (APPLICATION_TEMPLATE_TYPE_IDS as readonly string[]).includes(value)
  );
}

export function getApplicationTemplateType(
  id: ApplicationTemplateTypeId,
  language: AppLanguage = 'da'
): ApplicationTemplateTypeContent {
  return APPLICATION_TEMPLATE_TYPES[id][language];
}

/** Format a built-in template type as AI context (structure only — not strengths/weaknesses). */
export function formatApplicationTemplateTypeForPrompt(
  id: ApplicationTemplateTypeId,
  language: AppLanguage
): string {
  const content = getApplicationTemplateType(id, language);
  const structureLines = content.structure.map((item) => `- ${item}`).join('\n');

  if (language === 'en') {
    return [
      'APPLICATION TYPE (follow this approach and structure — adapt content to the role and company):',
      `Type: ${content.title}`,
      content.intro ? `Approach: ${content.intro}` : '',
      'Structure:',
      structureLines,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'ANSØGNINGSTYPE (følg denne tilgang og struktur — tilpas indholdet til stillingen og virksomheden):',
    `Type: ${content.title}`,
    content.intro ? `Tilgang: ${content.intro}` : '',
    'Struktur:',
    structureLines,
  ]
    .filter(Boolean)
    .join('\n');
}
