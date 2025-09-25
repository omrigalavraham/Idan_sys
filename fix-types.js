const fs = require('fs');
const path = require('path');

// Files to fix
const routeFiles = [
  'server/routes/leads.ts',
  'server/routes/customers.ts',
  'server/routes/tasks.ts',
  'server/routes/users.ts',
  'server/routes/attendance.ts',
  'server/routes/calendar.ts',
  'server/routes/reminders.ts',
  'server/routes/system-clients.ts'
];

// Fix imports and types
routeFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add AuthenticatedRequest import if not exists
    if (!content.includes('AuthenticatedRequest')) {
      content = content.replace(
        /import { authenticateToken } from '\.\.\/middleware\/auth\.js';/,
        "import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';"
      );
    }
    
    // Fix function signatures - basic pattern
    content = content.replace(
      /router\.(get|post|put|delete|patch)\('([^']*)', authenticateToken, async \(req, res\) => {/g,
      "router.$1('$2', authenticateToken, async (req: AuthenticatedRequest, res) => {"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
});

// Fix models with map functions
const modelFiles = [
  'server/models/Customer.ts',
  'server/models/SystemClient.ts',
  'server/models/Attendance.ts'
];

modelFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix map function parameters
    content = content.replace(/result\.rows\.map\((\w+) => \(/g, 'result.rows.map(($1: any) => (');
    content = content.replace(/records\.reduce\((\w+), (\w+)\) => /g, 'records.reduce(($1: any, $2: any) => ');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
});

console.log('Type fixes completed!');
