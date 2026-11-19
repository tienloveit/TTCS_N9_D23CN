export const ROOM_TECHNOLOGY_LABELS = {
  STANDARD: 'Standard', IMAX: 'IMAX', FOUR_DX: '4DX', SCREEN_X: 'ScreenX', GOLD_CLASS: 'Gold Class',
};
export const SCREENING_FORMAT_LABELS = { TWO_D: '2D', THREE_D: '3D' };
export const formatScreening = (format = 'TWO_D', technology = 'STANDARD') => [
  SCREENING_FORMAT_LABELS[format] || format || '2D',
  technology && technology !== 'STANDARD' ? ROOM_TECHNOLOGY_LABELS[technology] || technology : '',
].filter(Boolean).join(' ');
