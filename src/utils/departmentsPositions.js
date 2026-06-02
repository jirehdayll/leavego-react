import { DEPARTMENTS, POSITIONS } from '../constants';

/**
 * Get all departments including custom ones from localStorage
 * @returns {string[]} Array of all departments
 */
export const getAllDepartments = () => {
  const customDepartments = JSON.parse(localStorage.getItem('customDepartments') || '[]');
  return [...DEPARTMENTS, ...customDepartments];
};

/**
 * Get all positions including custom ones from localStorage
 * @returns {string[]} Array of all positions
 */
export const getAllPositions = () => {
  const customPositions = JSON.parse(localStorage.getItem('customPositions') || '[]');
  return [...POSITIONS, ...customPositions];
};

/**
 * Add a custom department to localStorage
 * @param {string} department - Department name to add
 */
export const addCustomDepartment = (department) => {
  if (!department || typeof department !== 'string') return;
  const customDepartments = JSON.parse(localStorage.getItem('customDepartments') || '[]');
  if (!customDepartments.includes(department.trim())) {
    const updated = [...customDepartments, department.trim()];
    localStorage.setItem('customDepartments', JSON.stringify(updated));
  }
};

/**
 * Add a custom position to localStorage
 * @param {string} position - Position name to add
 */
export const addCustomPosition = (position) => {
  if (!position || typeof position !== 'string') return;
  const customPositions = JSON.parse(localStorage.getItem('customPositions') || '[]');
  if (!customPositions.includes(position.trim())) {
    const updated = [...customPositions, position.trim()];
    localStorage.setItem('customPositions', JSON.stringify(updated));
  }
};

/**
 * Remove a custom department from localStorage
 * @param {string} department - Department name to remove
 */
export const removeCustomDepartment = (department) => {
  const customDepartments = JSON.parse(localStorage.getItem('customDepartments') || '[]');
  const updated = customDepartments.filter(d => d !== department);
  localStorage.setItem('customDepartments', JSON.stringify(updated));
};

/**
 * Remove a custom position from localStorage
 * @param {string} position - Position name to remove
 */
export const removeCustomPosition = (position) => {
  const customPositions = JSON.parse(localStorage.getItem('customPositions') || '[]');
  const updated = customPositions.filter(p => p !== position);
  localStorage.setItem('customPositions', JSON.stringify(updated));
};
