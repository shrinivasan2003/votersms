export const mockCounties = [
  { id: 1, code: '060', name: 'Fulton', state: 'GA', status: 'Active' }
];

export const mockPrecincts = [
  { id: 1, code: '01A', name: '01A-Parkside Elementary School, 685 Mercer Street SE, Atlanta, GA 30312', county: 'Fulton', zipcode: '30312' },
  { id: 2, code: '01B', name: '01B - Ormewood Park Presbyterian Church, 1071 Delaware Avenue SE, Atlanta, GA 30316', county: 'Fulton', zipcode: '30316' },
  { id: 3, code: '01C', name: '01C - Dobbs Elementary School', county: 'Fulton', zipcode: '30312' },
  { id: 4, code: '001', name: 'HS_Precinct', county: 'Fulton', zipcode: '30096' },
  { id: 5, code: '123', name: 'India', county: 'Fulton', zipcode: '100' },
];

export const mockVoters = [
  { id: 1, name: 'Shri L', email: 'shri@sonline.us', phone: '-', precinct: 'India', status: 'Active' },
  { id: 2, name: 'adam H', email: '-', phone: '864-430-5358', precinct: '01A-Parkside Elementary School', status: 'Active' },
  { id: 3, name: 'Marcelle English', email: '-', phone: '404-234-8945', precinct: '01C-Dobbs Elementary School', status: 'Active' },
  { id: 4, name: 'Nadine Williams', email: '-', phone: '404-630-9341', precinct: '01C-Dobbs Elementary School', status: 'Active' },
  { id: 5, name: 'regina waller', email: '-', phone: '404-735-8889', precinct: '01C-Dobbs Elementary School', status: 'Active' },
  { id: 6, name: 'Kathryn Glenn', email: '-', phone: '404-668-6659', precinct: '01C-Dobbs Elementary School', status: 'Active' },
  { id: 7, name: 'John Ross', email: 'john.ross@fultoncountyga.gov', phone: '470-786-2510', precinct: '01C-Dobbs Elementary School', status: 'Active' },
];

export const mockSmsTemplates = [
  { id: 1, code: 'V02', name: 'Early Voting Reminder', preview: 'Dear {{FullName}}, Please cast your votes during ...', status: 'Active' },
  { id: 2, code: 'V03', name: 'SMS with URL', preview: 'Dear {{FullName}}, Please click here to register ...', status: 'Active' },
  { id: 3, code: 'V01', name: 'Voter Outreach - 1', preview: 'Dear {{FullName}}, Please register today for the U...', status: 'Active' },
];

export const mockEmailTemplates = mockSmsTemplates.map(t => ({ ...t, subject: t.name }));
export const mockWhatsappTemplates = [];

export const mockSmsProviders = [
  { id: 1, name: 'Twilio', code: 'twilio', type: 'twilio', priority: 1, status: 'Active' }
];

export const mockEmailProviders = [];
export const mockWhatsappProviders = [];

export const mockSmsJobs = [
  { id: 25, precinct: 'HS_Precinct', template: 'Early Voting Reminder', provider: 'Twilio', recipients: 1, status: 'Completed', created: '17/Apr/2026' },
  { id: 22, precinct: 'HS_Precinct', template: 'Early Voting Reminder', provider: 'Twilio', recipients: 3, status: 'Completed', created: '15/Apr/2026' },
  { id: 21, precinct: '01C-Dobbs Elementary School', template: 'SMS with URL', provider: 'Twilio', recipients: 5, status: 'Completed', created: '06/Apr/2026' },
  { id: 20, precinct: '01C-Dobbs Elementary School', template: 'Voter Outreach - 1', provider: 'Twilio', recipients: 5, status: 'Completed', created: '06/Apr/2026' },
  { id: 19, precinct: '01C-Dobbs Elementary School', template: 'Early Voting Reminder', provider: 'Twilio', recipients: 4, status: 'Completed', created: '06/Apr/2026' },
  { id: 18, precinct: '01A-Parkside Elementary School', template: 'Early Voting Reminder', provider: 'Twilio', recipients: 2, status: 'Completed', created: '05/Apr/2026' },
  { id: 17, precinct: '01C-Dobbs Elementary School', template: 'Voter Outreach - 1', provider: 'Twilio', recipients: 1, status: 'Completed', created: '05/Apr/2026' },
  { id: 16, precinct: '01C-Dobbs Elementary School', template: 'Early Voting Reminder', provider: 'Twilio', recipients: 1, status: 'Completed', created: '05/Apr/2026' },
];

export const mockEmailJobs = [];
export const mockWhatsappJobs = [];

export const mockUsers = [
  { id: 1, name: 'Administrator', username: 'admin', email: 'admin@ballotda.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'John Staff', username: 'jstaff', email: 'jstaff@ballotda.com', role: 'Staff', status: 'Active' },
  { id: 3, name: 'Report Viewer', username: 'rviewer', email: 'rviewer@ballotda.com', role: 'Viewer', status: 'Active' },
];

export const mockRoles = [
  { id: 1, name: 'Admin', code: 'admin', description: 'Full system access', usersCount: 1, status: 'Active' },
  { id: 2, name: 'Staff', code: 'staff', description: 'Masters and Transactions access', usersCount: 1, status: 'Active' },
  { id: 3, name: 'Viewer', code: 'viewer', description: 'Reports read-only access', usersCount: 1, status: 'Active' },
];

export const mockPermissions = [
  { id: 1, name: 'Dashboard', code: 'dashboard', route: '/dashboard', type: 'menu', section: 'no section', rolesCount: 1, status: 'Active' },
  { id: 2, name: 'Counties', code: 'counties', route: '/counties', type: 'menu', section: 'Masters', rolesCount: 2, status: 'Active' },
  { id: 3, name: 'Precincts', code: 'precincts', route: '/precincts', type: 'menu', section: 'Masters', rolesCount: 2, status: 'Active' },
  { id: 4, name: 'Voters', code: 'voters', route: '/voters', type: 'menu', section: 'Masters', rolesCount: 2, status: 'Active' },
  { id: 5, name: 'SMS Templates', code: 'sms_templates', route: '/sms_templates', type: 'menu', section: 'Masters', rolesCount: 2, status: 'Active' },
  { id: 6, name: 'Email Templates', code: 'email_templates', route: '/email_templates', type: 'menu', section: 'Masters', rolesCount: 2, status: 'Active' },
  { id: 7, name: 'SMS Providers', code: 'sms_providers', route: '/sms_providers', type: 'menu', section: 'Masters', rolesCount: 1, status: 'Active' },
  { id: 8, name: 'Email Providers', code: 'email_providers', route: '/email_providers', type: 'menu', section: 'Masters', rolesCount: 1, status: 'Active' },
  { id: 9, name: 'SMS Jobs', code: 'sms_jobs', route: '/sms_jobs', type: 'menu', section: 'Transactions', rolesCount: 2, status: 'Active' },
  { id: 10, name: 'Email Jobs', code: 'email_jobs', route: '/email_jobs', type: 'menu', section: 'Transactions', rolesCount: 2, status: 'Active' },
  { id: 11, name: 'Process Jobs', code: 'process_job', route: '/process_job', type: 'menu', section: 'Transactions', rolesCount: 1, status: 'Active' },
  { id: 12, name: 'SMS Delivery Report', code: 'sms_delivery_report', route: '/sms_delivery_report', type: 'menu', section: 'Reports', rolesCount: 2, status: 'Active' },
  { id: 13, name: 'Users', code: 'users', route: '/users', type: 'menu', section: 'Admin', rolesCount: 1, status: 'Active' },
  { id: 14, name: 'Roles', code: 'roles', route: '/roles', type: 'menu', section: 'Admin', rolesCount: 1, status: 'Active' },
  { id: 15, name: 'Permissions', code: 'permissions', route: '/permissions', type: 'menu', section: 'Admin', rolesCount: 1, status: 'Active' },
  { id: 16, name: 'Reset Password', code: 'reset_password', route: '/reset_password', type: 'menu', section: 'Admin', rolesCount: 1, status: 'Active' },
  { id: 17, name: 'Clear Failed Logins', code: 'clear_failed_logins', route: '/clear_failed_logins', type: 'menu', section: 'Admin', rolesCount: 1, status: 'Active' },
];

export const mockDeliveryReportStats = {
  totalJobs: 23,
  totalRecipients: 132,
  sent: 40,
  delivered: 0,
  failed: 4,
  pending: 2,
  providerName: 'Twilio'
};

export const mockDeliveryReportRows = [
  { id: 25, precinct: 'HS_Precinct', template: 'Early Voting Reminder', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 1, sent: 1, delivered: '-', failed: '-' },
  { id: 22, precinct: 'HS_Precinct', template: 'Early Voting Reminder', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 3, sent: 3, delivered: '-', failed: '-' },
  { id: 21, precinct: '01C-Dobbs Elementary School', template: 'SMS with URL', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 5, sent: 5, delivered: '-', failed: '-' },
  { id: 20, precinct: '01C-Dobbs Elementary School', template: 'Voter Outreach - 1', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 5, sent: 5, delivered: '-', failed: '-' },
  { id: 19, precinct: '01C-Dobbs Elementary School', template: 'Early Voting Reminder', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 4, sent: 4, delivered: '-', failed: '-' },
  { id: 18, precinct: '01A-Parkside Elementary School', template: 'Early Voting Reminder', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 2, sent: 2, delivered: '-', failed: '-' },
  { id: 17, precinct: '01C-Dobbs Elementary School', template: 'Voter Outreach - 1', provider: 'Twilio', providerType: 'twilio', status: 'Completed', total: 1, sent: 1, delivered: '-', failed: '-' },
];
