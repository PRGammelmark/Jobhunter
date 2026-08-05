import { Box, Typography, LinearProgress } from '@mui/material';
import type { MatchScores } from '@career-intelligence/shared';

const SCORE_LABELS: Record<keyof MatchScores, string> = {
  overall: 'Samlet',
  seo: 'SEO match',
  technical: 'Teknisk match',
  cultural: 'Kulturelt match',
  leadership: 'Ledelsesmatch',
};

interface Props {
  scores: MatchScores;
}

export default function MatchScoreBars({ scores }: Props) {
  const entries = Object.entries(scores) as [keyof MatchScores, number][];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {entries.map(([key, value]) => (
        <Box key={key}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{SCORE_LABELS[key]}</Typography>
            <Typography variant="body2" fontWeight={600}>{value}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={value}
            sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
          />
        </Box>
      ))}
    </Box>
  );
}
