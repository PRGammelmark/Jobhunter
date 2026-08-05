import { Application, CvTemplate } from '../../models';
import type { Statistics } from '@career-intelligence/shared';

export class StatisticsService {
  async getStatistics(): Promise<Statistics> {
    const applications = await Application.find();
    const cvs = await CvTemplate.find();

    const sent = applications.filter((a) =>
      ['sent', 'interview', 'offer', 'rejected', 'hired'].includes(a.status)
    );
    const withResponse = applications.filter((a) => a.responseReceivedAt);
    const interviews = applications.filter((a) =>
      ['interview', 'offer', 'hired'].includes(a.status)
    );
    const offers = applications.filter((a) => ['offer', 'hired'].includes(a.status));
    const rejected = applications.filter((a) => a.status === 'rejected');

    const responseDays = sent
      .filter((a) => a.sentAt && a.responseReceivedAt)
      .map((a) => {
        const days = (a.responseReceivedAt!.getTime() - a.sentAt!.getTime()) / (1000 * 60 * 60 * 24);
        return days;
      });

    const avgResponseDays =
      responseDays.length > 0
        ? Math.round(responseDays.reduce((a, b) => a + b, 0) / responseDays.length)
        : 0;

    return {
      sent: sent.length,
      responseRate: sent.length ? Math.round((withResponse.length / sent.length) * 100) : 0,
      interviewRate: sent.length ? Math.round((interviews.length / sent.length) * 100) : 0,
      offerRate: sent.length ? Math.round((offers.length / sent.length) * 100) : 0,
      rejectionRate: sent.length ? Math.round((rejected.length / sent.length) * 100) : 0,
      avgResponseDays,
      cvPerformance: cvs.map((cv) => ({
        cvTemplateId: cv._id.toString(),
        name: cv.name,
        timesUsed: cv.stats.timesUsed,
        interviews: cv.stats.interviewsGenerated,
      })),
    };
  }
}

export const statisticsService = new StatisticsService();
