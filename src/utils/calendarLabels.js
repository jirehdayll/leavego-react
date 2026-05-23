import { REQUEST_TYPES } from '../constants';
import { resolveControlNumber } from '../lib/applicationNumber';
import { findAccountForRequest, getFirstLastName } from './employeeMatching';

export function getApplicationTypeLabel(request) {
  if (request.request_type === REQUEST_TYPES.TRAVEL) return 'Travel Order';
  return request.details?.leave_type || 'Leave Application';
}

export function getCalendarEventLabels(request, accounts = [], allApprovedForms = []) {
  const account = findAccountForRequest(request, accounts);
  const displayName = getFirstLastName(account || { user_name: request.user_name });
  const controlNumber = resolveControlNumber(request, allApprovedForms);
  const typeLabel = getApplicationTypeLabel(request);
  return { displayName, controlNumber, typeLabel };
}
