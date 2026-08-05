import type { Types } from 'mongoose';
import { Application, Company } from '../models';
import type { DashboardData } from '@career-intelligence/shared';

const ACTIVE_STATUSES = [
  'not_started',
  'in_progress',
  'ready_for_review',
  'ready_to_send',
  'sent',
  'interview',
  'offer',
];

export async function getDashboardData(tenantId: Types.ObjectId | string): Promise<DashboardData> {
  const applications = await Application.find({ tenantId }).sort({ updatedAt: -1 });
  const companies = await Company.find({ tenantId }).sort({ lastActivityAt: -1 }).limit(6);

  const active = applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const readyToSend = applications.filter((a) => a.status === 'ready_to_send').length;
  const interviews = applications.filter((a) => a.status === 'interview').length;
  const offers = applications.filter((a) => ['offer', 'hired'].includes(a.status)).length;

  const tasks: DashboardData['tasks'] = [];
  const now = Date.now();
  const followUpDays = 7;

  for (const app of applications) {
    const analysis = app.aiAnalysis as { aiQuestions?: Array<{ answered?: boolean; question: string }> } | undefined;
    const unanswered = analysis?.aiQuestions?.filter((q) => !q.answered) || [];
    if (unanswered.length > 0) {
      tasks.push({
        id: `ai-${app._id}`,
        type: 'ai_question',
        label: `Besvar AI-spørgsmål (${unanswered.length})`,
        applicationId: app._id.toString(),
        companyName: app.job.companyName,
      });
    }

    if (app.status === 'ready_to_send') {
      tasks.push({
        id: `send-${app._id}`,
        type: 'send_application',
        label: 'Send ansøgning',
        applicationId: app._id.toString(),
        companyName: app.job.companyName,
      });
    }

    if (app.status === 'sent' && app.sentAt) {
      const daysSince = (now - app.sentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= followUpDays && !app.responseReceivedAt) {
        tasks.push({
          id: `follow-${app._id}`,
          type: 'follow_up',
          label: 'Følg op',
          applicationId: app._id.toString(),
          companyName: app.job.companyName,
        });
      }
    }

    if (app.status === 'ready_for_review') {
      tasks.push({
        id: `review-${app._id}`,
        type: 'review',
        label: 'Gennemgå ansøgning',
        applicationId: app._id.toString(),
        companyName: app.job.companyName,
      });
    }
  }

  if (tasks.length === 0) {
    tasks.push({ id: 'update-cv', type: 'update_cv', label: 'Opdater CV' });
  }

  return {
    pipeline: { active, readyToSend, interviews, offers },
    tasks: tasks.slice(0, 8),
    recentCompanies: companies.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      lastActivityAt: c.lastActivityAt.toISOString(),
    })),
  };
}
