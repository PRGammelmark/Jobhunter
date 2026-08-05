import mongoose from 'mongoose';
import { config } from './config';
import { Settings, KnowledgeEntry, Company } from './models';

async function seed() {
  await mongoose.connect(config.mongodbUri);
  console.log('Seeding database...');

  await Settings.findByIdAndUpdate(
    'app',
    {
      profile: { name: 'Patrick Gammelmark', email: 'patrick@example.com' },
      preferences: { defaultLanguage: 'da', aiModel: 'gpt-4o-mini' },
    },
    { upsert: true }
  );

  const existing = await KnowledgeEntry.countDocuments();
  if (existing > 0) {
    console.log('Knowledge Base already seeded, skipping.');
    await mongoose.disconnect();
    return;
  }

  const react = await KnowledgeEntry.create({
    title: 'React',
    type: 'skill',
    description: 'Frontend-udvikling med React, hooks, state management og komponentarkitektur.',
    keywords: ['react', 'frontend', 'javascript', 'typescript'],
    confidence: 5,
    metrics: [],
    results: ['Bygget multiple produktions-apps med React'],
    cases: [],
    whenToUse: 'Frontend- og fullstack-roller med React-stack',
  });

  const node = await KnowledgeEntry.create({
    title: 'Node',
    type: 'skill',
    description: 'Backend med Node.js, Express, REST APIs og MongoDB.',
    keywords: ['node', 'express', 'backend', 'api'],
    confidence: 5,
    relatedEntryIds: [react._id],
    metrics: [],
    results: [],
    cases: [],
    whenToUse: 'Fullstack- og backend-roller',
  });

  const seo = await KnowledgeEntry.create({
    title: 'SEO',
    type: 'skill',
    description: 'Søgemaskineoptimering, teknisk SEO, content-strategi og analytics.',
    keywords: ['seo', 'google', 'analytics', 'content'],
    confidence: 5,
    metrics: [{ label: 'Organisk trafik-vækst', value: '+340%' }],
    results: ['Documenteret SEO-resultater for flere kunder'],
    cases: [],
    whenToUse: 'Marketing, growth og content-roller',
  });

  const bcb = await KnowledgeEntry.create({
    title: 'Better Call Bob',
    type: 'project',
    description: 'Webapp til håndværker-booking med SEO, WordPress og React. Egen startup.',
    keywords: ['startup', 'wordpress', 'seo', 'react', 'node'],
    relatedEntryIds: [seo._id, react._id, node._id],
    metrics: [
      { label: 'Brugere', value: '5000+' },
      { label: 'Omsætningsvækst', value: '+340%' },
    ],
    results: [
      'Bygget og lanceret produkt fra scratch',
      'Implementeret SEO-strategi med målbar vækst',
    ],
    cases: [
      {
        situation: 'Startup skulle skalere organisk trafik',
        task: 'Udvikle og implementere SEO-strategi',
        action: 'Teknisk SEO, content-plan og React-baseret platform',
        result: '+340% organisk trafik på 12 måneder',
        tags: ['seo', 'startup'],
      },
    ],
    whenToUse: 'Startup-kontekst, SEO/marketing-roller, entreprenørskab',
  });

  await KnowledgeEntry.create({
    title: 'Oscar',
    type: 'project',
    description: 'Case-ansøgning og interview-forberedelse hos Oscar (fintech/insurance).',
    keywords: ['fintech', 'insurance', 'case', 'interview'],
    relatedEntryIds: [react._id, node._id],
    metrics: [],
    results: ['Gennemført fuld ansøgningsproces inkl. case-interview'],
    cases: [
      {
        situation: 'Ansøgning til tech-rolle i fintech',
        task: 'Forberede case-interview og teknisk pitch',
        action: 'Struktureret forberedelse med STAR-eksempler',
        result: 'Nåede interview-runde med stærk case-præsentation',
        tags: ['interview', 'fintech'],
      },
    ],
    whenToUse: 'Fintech, insurance og case-baserede interviews',
  });

  await KnowledgeEntry.create({
    title: '.NET',
    type: 'skill',
    description: 'Grundlæggende kendskab til .NET og C#.',
    keywords: ['.net', 'csharp', 'enterprise'],
    confidence: 1,
    confidenceLabel: 'I gang med at lære',
    metrics: [],
    results: [],
    cases: [],
    whenToUse: 'Kun nævn hvis specifikt relevant — spørg brugeren først',
  });

  await KnowledgeEntry.create({
    title: 'AAU',
    type: 'education',
    description: 'Aalborg Universitet — filosofi og IT.',
    keywords: ['aau', 'universitet', 'filosofi'],
    metrics: [],
    results: [],
    cases: [],
    whenToUse: 'Uddannelsesbaggrund, analytisk tænkning',
  });

  await KnowledgeEntry.findByIdAndUpdate(react._id, { $push: { relatedEntryIds: node._id } });

  await Company.create({
    name: 'Oscar',
    normalizedName: 'oscar',
    industry: 'Fintech / Insurance',
    memory: {
      salaryNotes: [],
      contacts: [],
      interviewQuestions: ['Fortæl om en teknisk udfordring du har løst'],
      generalNotes: ['Første kontakt via jobopslag'],
    },
    applicationIds: [],
    interviewIds: [],
    firstSeenAt: new Date(),
    lastActivityAt: new Date(),
  });

  console.log('Seed complete!');
  await mongoose.disconnect();
}

seed().catch(console.error);
