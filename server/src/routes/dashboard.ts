import { Router } from 'express';
import { getDashboardData } from '../services/dashboardService';
import { statisticsService } from '../services/ai/StatisticsService';
import { storageService } from '../services/storage/storageService';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  const data = await getDashboardData();
  res.json(data);
});

router.get('/statistics', async (_req, res) => {
  const stats = await statisticsService.getStatistics();
  res.json(stats);
});

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  html: 'text/html',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

router.get('/files/*', async (req, res) => {
  try {
    const key = decodeURIComponent(req.path.replace(/^\/files\//, ''));
    const buffer = await storageService.download(key);
    const fileName = key.split('/').pop() || 'file';
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    const inline = ext === 'pdf' || ext === 'html' || ext === 'txt';

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);
  } catch {
    res.status(404).json({ error: 'Fil ikke fundet' });
  }
});

export default router;
