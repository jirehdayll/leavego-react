import { findAccountForRequest } from '../utils/employeeMatching';

export function buildPdfDataFromRequest(request, accounts = []) {
  const details = request?.details || {};
  const account = findAccountForRequest(request, accounts);
  const department =
    details.department ||
    details.office_department ||
    request.department ||
    account?.department ||
    '';
  const applicationNumber = details.control_number || details.travel_no || '';

  return {
    ...details,
    full_name:
      request.user_name ||
      details.full_name ||
      account?.full_name ||
      account?.fullName ||
      '',
    first_name: account?.first_name || details.first_name || '',
    middle_name: account?.middle_name || details.middle_name || '',
    surname: account?.surname || details.surname || '',
    department,
    office_department: department,
    office: details.office || details.office_department || department || 'CENRO',
    position: details.position || account?.position || '',
    salary: details.salary || account?.salary_range || '',
    travel_no: applicationNumber,
    control_number: applicationNumber,
  };
}
