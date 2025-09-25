import fs from 'fs';
import path from 'path';

// Files to fix TypeScript types in server routes
const routeFiles = [
  'server/routes/customers.ts',
  'server/routes/tasks.ts', 
  'server/routes/users.ts',
  'server/routes/attendance.ts',
  'server/routes/calendar.ts',
  'server/routes/reminders.ts',
  'server/routes/system-clients.ts',
  'server/routes/auth.ts',
  'server/routes/reports.ts',
  'server/routes/cleanup.ts',
  'server/routes/unified-events.ts',
  'server/routes/whatsapp.ts'
];

routeFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if we need to add express imports
    if (!content.includes('import express, { Request, Response }')) {
      content = content.replace(
        /import express from 'express';/,
        "import express, { Request, Response } from 'express';"
      );
    }
    
    // Replace any type signatures
    content = content.replace(
      /async \(req: any, res: any\)/g, 
      'async (req: Request & {user?: any}, res: Response)'
    );
    
    // Fix query parsing issues
    content = content.replace(
      /parseInt\(([^)]+)\)/g,
      'parseInt($1 as string)'
    );
    
    // Fix limit/offset defaults
    content = content.replace(
      /limit = (\d+)/g,
      "limit = '$1'"
    );
    content = content.replace(
      /offset = (\d+)/g,
      "offset = '$1'"
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed TypeScript types in ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Finished fixing TypeScript types in server routes');