export function clamp(
  nRange: number,
  nMin: number,
  nMax: number,
  fRange: number,
  fMin: number,
  fMax: number,
) {
  if (nRange > fRange) {
    nMin = fMin;
    nMax = fMax;
  } else if (nMin < fMin) {
    nMin = fMin;
    nMax = fMin + nRange;
  } else if (nMax > fMax) {
    nMax = fMax;
    nMin = fMax - nRange;
  }

  return [nMin, nMax];
}
