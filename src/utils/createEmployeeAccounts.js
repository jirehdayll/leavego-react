// Utility function to create complete employee accounts
export const createEmployeeAccounts = () => {
  const employees = [
    {
      id: 'emp_1',
      email: 'john.doe@denr.gov.ph',
      password: 'password123',
      full_name: 'John Doe',
      first_name: 'John',
      middle_name: 'Paul',
      surname: 'Doe',
      position: 'Environmental Management Specialist',
      role: 'employee',
      salary_range: '25000-35000',
      department: 'Forest Management',
      is_active: true
    },
    {
      id: 'emp_2',
      email: 'jane.smith@denr.gov.ph',
      password: 'password123',
      full_name: 'Jane Smith',
      first_name: 'Jane',
      middle_name: 'Marie',
      surname: 'Smith',
      position: 'HR Management Officer',
      role: 'employee',
      salary_range: '35000-45000',
      department: 'Human Resource Management Unit',
      is_active: true
    },
    {
      id: 'emp_3',
      email: 'carlos.rodriguez@denr.gov.ph',
      password: 'password123',
      full_name: 'Carlos Rodriguez',
      first_name: 'Carlos',
      middle_name: 'Santos',
      surname: 'Rodriguez',
      position: 'Forest Ranger',
      role: 'employee',
      salary_range: '18000-25000',
      department: 'Forest Management',
      is_active: true
    },
    {
      id: 'emp_4',
      email: 'maria.santos@denr.gov.ph',
      password: 'password123',
      full_name: 'Maria Santos',
      first_name: 'Maria',
      middle_name: 'Luna',
      surname: 'Santos',
      position: 'Records Officer / Custodian',
      role: 'employee',
      salary_range: '20000-30000',
      department: 'Records Management',
      is_active: true
    },
    {
      id: 'emp_5',
      email: 'robert.chen@denr.gov.ph',
      password: 'password123',
      full_name: 'Robert Chen',
      first_name: 'Robert',
      middle_name: 'James',
      surname: 'Chen',
      position: 'Land Management Officer',
      role: 'employee',
      salary_range: '30000-40000',
      department: 'Land Management',
      is_active: true
    }
  ];

  // Get existing accounts
  const existingAccounts = JSON.parse(localStorage.getItem('userAccounts') || '[]');
  
  // Add new employee accounts if they don't exist
  employees.forEach(emp => {
    if (!existingAccounts.find(acc => acc.email === emp.email)) {
      existingAccounts.push(emp);
    }
  });

  // Save to localStorage
  localStorage.setItem('userAccounts', JSON.stringify(existingAccounts));
  console.log('Employee accounts created:', employees.length);
  
  return employees;
};

// Auto-create employee accounts when this script runs
if (typeof window !== 'undefined') {
  createEmployeeAccounts();
}
