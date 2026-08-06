import type { Types } from 'mongoose';
import { Application } from '../models';
import type {
  ApplicationStatus,
  DashboardAttentionItem,
  DashboardData,
  DashboardUpcomingItem,
} from '@career-intelligence/shared';

const ACTIVE_STATUSES: ApplicationStatus[] = [
  'not_started',
  'in_progress',
  'ready_for_review',
  'ready_to_send',
  'sent',
  'interview',
  'offer',
];

const CLOSED_STATUSES: ApplicationStatus[] = ['rejected', 'hired'];

const ATTENTION_PRIORITY: Record<DashboardAttentionItem['reason'], number> = {
  send_application: 0,
  review: 1,
  ai_question: 2,
  follow_up: 3,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const FOLLOW_UP_DAYS = 7;
const DEADLINE_WINDOW_DAYS = 14;

function toSummary(app: {
  _id: { toString(): string };
  job: { title: string; companyName: string };
  status: ApplicationStatus;
  updatedAt?: Date;
  createdAt?: Date;
}) {
  const updatedAt = app.updatedAt ?? app.createdAt ?? new Date();
  return {
    _id: app._id.toString(),
    title: app.job.title,
    companyName: app.job.companyName,
    status: app.status,
    updatedAt: updatedAt.toISOString(),
  };
}

export async function getDashboardData(tenantId: Types.ObjectId | string): Promise<DashboardData> {
  const applications = await Application.find({ tenantId }).sort({ updatedAt: -1 });
  const now = Date.now();

  const byStatus = (status: ApplicationStatus) =>
    applications.filter((a) => a.status === status).length;

  const active = applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const inProgress = byStatus('not_started') + byStatus('in_progress');
  const readyForReview = byStatus('ready_for_review');
  const readyToSend = byStatus('ready_to_send');
  const sent = byStatus('sent');
  const interviews = byStatus('interview');
  const offers = byStatus('offer') + byStatus('hired');

  const needsAttention: DashboardAttentionItem[] = [];

  for (const app of applications) {
    const summary = toSummary(app);
    const analysis = app.aiAnalysis as
      | { aiQuestions?: Array<{ answered?: boolean }> }
      | undefined;
    const unanswered = analysis?.aiQuestions?.filter((q) => !q.answered) || [];

    if (app.status === 'ready_to_send') {
      needsAttention.push({ ...summary, reason: 'send_application' });
      continue;
    }

    if (app.status === 'ready_for_review') {
      needsAttention.push({ ...summary, reason: 'review' });
      continue;
    }

    if (unanswered.length > 0 && !CLOSED_STATUSES.includes(app.status)) {
      needsAttention.push({
        ...summary,
        reason: 'ai_question',
        unansweredQuestions: unanswered.length,
      });
      continue;
    }

    if (app.status === 'sent' && app.sentAt) {
      const daysSince = (now - app.sentAt.getTime()) / MS_PER_DAY;
      if (daysSince >= FOLLOW_UP_DAYS && !app.responseReceivedAt) {
        needsAttention.push({ ...summary, reason: 'follow_up' });
      }
    }
  }

  needsAttention.sort(
    (a, b) => ATTENTION_PRIORITY[a.reason] - ATTENTION_PRIORITY[b.reason]
  );

  const upcoming: DashboardUpcomingItem[] = [];

  for (const app of applications) {
    if (CLOSED_STATUSES.includes(app.status)) continue;

    if (app.interviewAt) {
      const at = app.interviewAt.getTime();
      if (at >= now - MS_PER_DAY) {
        upcoming.push({
          _id: app._id.toString(),
          title: app.job.title,
          companyName: app.job.companyName,
          type: 'interview',
          at: app.interviewAt.toISOString(),
        });
      }
    }

    if (app.job.deadline) {
      const deadline = new Date(app.job.deadline);
      if (!Number.isNaN(deadline.getTime())) {
        const at = deadline.getTime();
        const daysUntil = (at - now) / MS_PER_DAY;
        if (daysUntil >= -1 && daysUntil <= DEADLINE_WINDOW_DAYS) {
          upcoming.push({
            _id: app._id.toString(),
            title: app.job.title,
            companyName: app.job.companyName,
            type: 'deadline',
            at: deadline.toISOString(),
          });
        }
      }
    }
  }

  upcoming.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const recentApplications = applications.slice(0, 5).map(toSummary);

  return {
    pipeline: {
      active,
      inProgress,
      readyForReview,
      readyToSend,
      sent,
      interviews,
      offers,
    },
    needsAttention: needsAttention.slice(0, 8),
    upcoming: upcoming.slice(0, 6),
    recentApplications,
  };
}
