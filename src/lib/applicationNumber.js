/**
 * Application control numbers: YY-00001 (2-digit year + 5-digit sequence per calendar year).
 */

export function formatApplicationNumber(year, sequence) {
  const yy = String(year).slice(-2);
  return `${yy}-${String(sequence).padStart(5, '0')}`;
}

export function getApprovalTimestamp(request) {
  return (
    request.cenro_approved_at ||
    request.admin_approved_at ||
    request.submitted_at ||
    request.created_at
  );
}

export function getApprovalYear(request) {
  return new Date(getApprovalTimestamp(request)).getFullYear();
}

/** Next number when assigning on approval (uses max existing sequence for that year). */
export function getNextApplicationNumber(approvedRequests, approvalDate = new Date()) {
  const year = approvalDate.getFullYear();
  const yy = String(year).slice(-2);
  let maxSeq = 0;

  (approvedRequests || []).forEach((r) => {
    const num = r.details?.control_number || r.details?.travel_no;
    if (!num) return;
    const match = String(num).match(new RegExp(`^${yy}-(\\d{5})$`));
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  });

  return formatApplicationNumber(year, maxSeq + 1);
}

/** Stable display number for reports (persisted control_number or computed from approval order). */
export function resolveControlNumber(request, allApprovedRequests) {
  const stored = request.details?.control_number || request.details?.travel_no;
  if (stored) return stored;

  const year = getApprovalYear(request);
  const time = new Date(getApprovalTimestamp(request)).getTime();

  const sameYear = (allApprovedRequests || [])
    .filter((r) => getApprovalYear(r) === year)
    .sort((a, b) => new Date(getApprovalTimestamp(a)).getTime() - new Date(getApprovalTimestamp(b)).getTime());

  const index = sameYear.findIndex((r) => r.id === request.id);
  const sequence = index >= 0 ? index + 1 : sameYear.length + 1;
  return formatApplicationNumber(year, sequence);
}

export function buildDetailsWithApplicationNumber(existingDetails, applicationNumber) {
  return {
    ...existingDetails,
    control_number: applicationNumber,
    travel_no: applicationNumber,
  };
}
