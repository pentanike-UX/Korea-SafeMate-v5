/** UI 표시용 상한(실제 카운트·집계 값은 변경하지 않음). */
export const ATTENTION_COUNT_DISPLAY_CAP = 99;

export function formatAttentionCountForDisplay(count: number): string {
  if (count < 1) return "";
  return count > ATTENTION_COUNT_DISPLAY_CAP ? `${ATTENTION_COUNT_DISPLAY_CAP}+` : String(count);
}

/** 스크린 리더에 실제 건수를 포함(표시는 cap일 수 있음). */
export function attentionCountAccessibleLabel(description: string, count: number): string {
  return `${description} (${count})`;
}
