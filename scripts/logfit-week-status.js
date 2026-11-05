'use strict';

function resolveWeekDayState(date, plan, records) {
  const list = Array.isArray(records) ? records : [];
  const record = list.find((item) => item.record_date === date && item.completion === 'completed');
  if (record && record.type === 'rest') return { className: 'done', label: '휴식', detail: '휴식' };
  if (record && record.type === 'exercise') {
    const name = record.exercise_type || record.activity_name || '운동';
    const duration = record.duration_min ? ` ${record.duration_min}분` : '';
    return { className: 'done', label: `${name}${duration}`, detail: '완료' };
  }
  if (plan && plan.status === 'planned') return { className: 'miss', label: '미수행', detail: '미수행' };
  return { className: 'wait', label: '휴식', detail: '휴식' };
}

module.exports = { resolveWeekDayState };
