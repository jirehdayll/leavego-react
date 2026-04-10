import {
  DEFAULT_LEAVE_REQUEST_ORDER_BY,
  LEAVE_REQUEST_ORDER_COLUMNS,
} from '../constants';

const VALID_ORDER_COLUMNS = new Set(LEAVE_REQUEST_ORDER_COLUMNS);

export function normalizeLeaveRequestOrderBy(orderBy) {
  if (!orderBy || !VALID_ORDER_COLUMNS.has(orderBy)) {
    return DEFAULT_LEAVE_REQUEST_ORDER_BY;
  }

  return orderBy;
}

export function withTimestamp(updates = {}) {
  return {
    ...updates,
    updated_at: new Date().toISOString(),
  };
}
