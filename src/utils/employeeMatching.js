/** Match leave/travel requests to local accounts (email, name, or user id). */
export function isFormOfAccount(form, account) {
  if (!form || !account) return false;

  const formEmail = (form.user_email || '').toLowerCase().trim();
  const accountEmail = (account.email || account.denr_email || '').toLowerCase().trim();
  if (formEmail && accountEmail && formEmail === accountEmail) return true;

  const formName = (form.user_name || '').toLowerCase().trim();
  const accountName = (account.full_name || account.fullName || account.name || '').toLowerCase().trim();
  if (formName && accountName && formName === accountName) return true;

  if (form.user_id && account.id && form.user_id === account.id) return true;

  return false;
}

export function findAccountForRequest(request, accounts = []) {
  if (!request) return null;
  return accounts.find((acc) => isFormOfAccount(request, acc)) || null;
}

export function formatSalaryDisplay(salary) {
  if (!salary) return salary;
  if (salary.includes(',')) return salary;
  const numericValue = salary.replace(/[^\d]/g, '');
  if (numericValue.length > 3 && /^\d+$/.test(salary.replace(/,/g, ''))) {
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return salary;
}

/** First name + surname for calendar and labels. */
export function getFirstLastName(person) {
  if (!person) return 'Unknown';
  if (person.first_name && person.surname) {
    return `${person.first_name} ${person.surname}`.trim();
  }
  const full = (person.full_name || person.fullName || person.name || person.user_name || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1]}`;
  return full || 'Unknown';
}
