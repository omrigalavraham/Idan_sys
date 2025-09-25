import express, { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { LeadModel, BulkLeadData } from '../models/Lead.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

// Israel timezone functions (inline to avoid import issues)
function isIsraelDST(date: Date): boolean {
  const month = date.getMonth(); // 0=Jan, 8=Sep, 9=Oct
  return month >= 3 && month <= 8; // April-September = summer (UTC+3)
}

function israelTimeToUtc(israelDate: Date): Date {
  const offset = isIsraelDST(israelDate) ? 3 : 2;
  return new Date(israelDate.getTime() - (offset * 60 * 60 * 1000));
}

function logTimezoneInfo(label: string, utcTime: Date): void {
  const offset = isIsraelDST(utcTime) ? 3 : 2;
  const israelTime = new Date(utcTime.getTime() + (offset * 60 * 60 * 1000));
  const isDST = isIsraelDST(utcTime);
  
  console.log(`🕐 ${label}:`, {
    UTC: utcTime.toISOString(),
    Israel: israelTime.toLocaleString('he-IL'),
    Offset: `UTC+${offset}`,
    Season: isDST ? 'Summer (IDT)' : 'Winter (IST)'
  });
}

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Get all leads
router.get('/', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { limit = '50', offset = '0', assigned_to } = req.query;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    let leads: any[], total: number;
    
    // Check if filtering by specific agent
    if (assigned_to) {
      const assignedToId = parseInt(assigned_to as string);
      
      // Check permissions based on user role
      if (req.user.role === 'admin') {
        // Admin can see leads assigned to any user
        const result = await LeadModel.findByAssignedToPaginated(assignedToId, limitNum, offsetNum);
        leads = result.leads;
        total = result.total;
      } else if (req.user.role === 'manager') {
        // Manager can see leads assigned to their agents or their own leads
        const { UserModel } = await import('../models/User.js');
        const agents = await UserModel.findByManagerId(req.user.id);
        const agentIds = agents.map(agent => agent.id);
        agentIds.push(req.user.id); // Include manager's own leads
        
        if (agentIds.includes(assignedToId)) {
          const result = await LeadModel.findByAssignedToPaginated(assignedToId, limitNum, offsetNum);
          leads = result.leads;
          total = result.total;
        } else {
          leads = [];
          total = 0;
        }
      } else {
        // Agent can only see their own leads
        if (assignedToId === req.user.id) {
          const result = await LeadModel.findByAssignedToPaginated(assignedToId, limitNum, offsetNum);
          leads = result.leads;
          total = result.total;
        } else {
          leads = [];
          total = 0;
        }
      }
    } else {
      // No specific agent filter - show leads based on user role
      if (req.user.role === 'admin') {
        // Admin sees all leads
        const result = await LeadModel.findAllPaginated(limitNum, offsetNum);
        leads = result.leads;
        total = result.total;
      } else if (req.user.role === 'manager') {
        // Manager sees only their own leads by default
        const result = await LeadModel.findByAssignedToPaginated(req.user.id, limitNum, offsetNum);
        leads = result.leads;
        total = result.total;
      } else {
        // Agent sees only their own leads
        const result = await LeadModel.findByAssignedToPaginated(req.user.id, limitNum, offsetNum);
        leads = result.leads;
        total = result.total;
      }
    }
    
    res.json({ leads, total });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead by ID
router.get('/:id', authenticateToken, async (req: Request & {user?: any}, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await LeadModel.findById(parseInt(id));
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check if user has permission to view this lead
    let hasPermission = false;
    
    // Admin can view any lead
    if (req.user.role === 'admin') {
      hasPermission = true;
    }
    // Manager can view any lead (simplified permission for managers)
    else if (req.user.role === 'manager') {
      hasPermission = true;
    }
    // Agent can view their own leads
    else if (req.user.role === 'agent') {
      // Convert both to numbers for proper comparison
      const agentId = Number(req.user.id);
      const leadAssignedTo = Number(lead.assigned_to);
      hasPermission = leadAssignedTo === agentId;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create new lead
router.post('/', authenticateToken, async (req: any, res: any) => {
  try {
    const leadData = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      status: req.body.status,
      source: req.body.source,
      notes: req.body.notes,
      callback_date: req.body.callbackDate || req.body.callback_date,
      callback_time: req.body.callbackTime || req.body.callback_time,
      assigned_to: parseInt(req.body.assigned_to) || req.user.id,
      client_id: req.user.client_id || null
    };
    
    const lead = await LeadModel.create(leadData);
    
    // Create unified event if callback date and time are provided
    if (leadData.callback_date && leadData.callback_time) {
      try {
        const { UnifiedEventModel } = await import('../models/UnifiedEvent.js');
        
        // Parse the input as Israel time and convert to UTC
        // Input: "2025-09-22" and "23:47" -> should create event at 23:47 Israel time
        const israelDateTimeStr = `${leadData.callback_date}T${leadData.callback_time}:00`;
        const israelDate = new Date(israelDateTimeStr);
        
        logTimezoneInfo('Israel callback time input (Create)', israelDate);
        
        // Convert to UTC using smart timezone function
        const utcDate = israelTimeToUtc(israelDate);
        const start_time = utcDate.toISOString();
        
        const endDate = new Date(utcDate.getTime() + (30 * 60 * 1000)); // 30 minutes later
        const end_time = endDate.toISOString();
        
        logTimezoneInfo('UTC start time for storage (Create)', utcDate);
        logTimezoneInfo('UTC end time for storage (Create)', endDate);
        
        const eventData = {
          title: `שיחה חוזרת - ${leadData.name}`,
          description: `שיחה חוזרת עם ${leadData.name} (${leadData.phone})${leadData.notes ? ` - ${leadData.notes}` : ''}`,
          eventType: 'reminder' as const,
          startTime: start_time,
          endTime: end_time,
          advanceNotice: 5, // 5 minutes advance notice for immediate testing
          isActive: true,
          notified: false,
          customerName: leadData.name, // Set customer name for better notifications
          leadId: lead.id
        };
        
        await UnifiedEventModel.createEventFromLead(req.user.id, eventData);
        console.log(`✅ Created unified event for lead ${lead.id} - Israel time: ${israelDate.toLocaleString('he-IL')}, UTC: ${start_time}`);
      } catch (eventError) {
        console.error('❌ Error creating unified event for lead callback:', eventError);
        // Don't fail the lead creation if event creation fails
      }
    }
    
    res.status(201).json({ lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // First check if lead exists and user has permission
    const existingLead = await LeadModel.findById(parseInt(id));
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check if user has permission to update this lead
    let hasPermission = false;
    
    console.log('Permission check:', {
      userId: req.user.id,
      userRole: req.user.role,
      leadId: id,
      leadAssignedTo: existingLead.assigned_to,
      userIdType: typeof req.user.id,
      leadAssignedToType: typeof existingLead.assigned_to
    });
    
    // Admin can update any lead
    if (req.user.role === 'admin') {
      hasPermission = true;
      console.log('Admin permission granted');
    }
    // Manager can update any lead (simplified permission for managers)
    else if (req.user.role === 'manager') {
      hasPermission = true;
      console.log('Manager permission granted automatically');
    }
    // Agent can update their own leads
    else if (req.user.role === 'agent') {
      // Convert both to numbers for proper comparison
      const agentId = Number(req.user.id);
      const leadAssignedTo = Number(existingLead.assigned_to);
      hasPermission = leadAssignedTo === agentId;
      console.log('Agent permission check:', {
        agentId,
        leadAssignedTo,
        hasPermission
      });
    }
    
    if (!hasPermission) {
      console.log('Access denied for user:', req.user.id, 'role:', req.user.role);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Transform the request body to match database field names
    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.source !== undefined) updates.source = req.body.source;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.callbackDate !== undefined) updates.callback_date = req.body.callbackDate;
    if (req.body.callbackTime !== undefined) updates.callback_time = req.body.callbackTime;
    if (req.body.assigned_to !== undefined) updates.assigned_to = req.body.assigned_to;
    
    const lead = await LeadModel.update(parseInt(id), updates);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Handle unified event creation/update for callback date/time changes
    const callbackDate = req.body.callbackDate || req.body.callback_date;
    const callbackTime = req.body.callbackTime || req.body.callback_time;
    
    // Check if callback date or time was provided in the request
    const hasCallbackDate = req.body.callbackDate !== undefined || req.body.callback_date !== undefined;
    const hasCallbackTime = req.body.callbackTime !== undefined || req.body.callback_time !== undefined;
    
    if (hasCallbackDate || hasCallbackTime) {
      try {
        const { UnifiedEventModel } = await import('../models/UnifiedEvent.js');
        
        // Check if there's an existing event for this lead
        const existingEvents = await UnifiedEventModel.getEventsByUser(req.user.id);
        const existingEvent = existingEvents.find(event => 
          event.leadId === parseInt(id) && event.eventType === 'reminder'
        );
        
        if (callbackDate && callbackTime) {
          // Create or update unified event with proper Israel timezone handling
          const israelDateTimeStr = `${callbackDate}T${callbackTime}:00`;
          const israelDate = new Date(israelDateTimeStr);
          
          logTimezoneInfo('Israel callback time input (Update)', israelDate);
          
          // Convert to UTC using smart timezone function
          const utcDate = israelTimeToUtc(israelDate);
          const start_time = utcDate.toISOString();
          
          const endDate = new Date(utcDate.getTime() + (30 * 60 * 1000));
          const end_time = endDate.toISOString();
          
          logTimezoneInfo('UTC start time for storage (Update)', utcDate);
          logTimezoneInfo('UTC end time for storage (Update)', endDate);
          
          const eventData = {
            title: `שיחה חוזרת - ${lead.name}`,
            description: `שיחה חוזרת עם ${lead.name} (${lead.phone})${lead.notes ? ` - ${lead.notes}` : ''}`,
            eventType: 'reminder' as const,
            startTime: start_time,
            endTime: end_time,
            advanceNotice: 5, // 5 minutes advance notice for immediate testing
            isActive: true,
            notified: false,
            customerName: lead.name,
            leadId: lead.id
          };
          
          if (existingEvent) {
            await UnifiedEventModel.updateEvent(req.user.id, existingEvent.id, eventData);
            console.log(`✅ Updated unified event for lead ${lead.id} - Israel: ${israelDate.toLocaleString('he-IL')}, UTC: ${start_time}`);
          } else {
            await UnifiedEventModel.createEventFromLead(req.user.id, eventData);
            console.log(`✅ Created unified event for lead ${lead.id} - Israel: ${israelDate.toLocaleString('he-IL')}, UTC: ${start_time}`);
          }
        } else if (existingEvent && (!callbackDate || !callbackTime)) {
          // Remove callback date/time, so delete the event
          await UnifiedEventModel.deleteEvent(req.user.id, existingEvent.id);
          console.log(`Deleted unified event for lead ${lead.id} callback`);
        }
      } catch (eventError) {
        console.error('Error handling unified event for lead callback:', eventError);
        // Don't fail the lead update if event handling fails
      }
    }
    
    res.json({ lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Update lead status
router.patch('/:id/status', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // First check if lead exists and user has permission
    const existingLead = await LeadModel.findById(parseInt(id));
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check if user has permission to update this lead
    let hasPermission = false;
    
    // Admin can update any lead
    if (req.user.role === 'admin') {
      hasPermission = true;
    }
    // Manager can update any lead (simplified permission for managers)
    else if (req.user.role === 'manager') {
      hasPermission = true;
    }
    // Agent can update their own leads
    else if (req.user.role === 'agent') {
      // Convert both to numbers for proper comparison
      const agentId = Number(req.user.id);
      const leadAssignedTo = Number(existingLead.assigned_to);
      hasPermission = leadAssignedTo === agentId;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const lead = await LeadModel.update(parseInt(id), { status });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ lead });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// Delete lead
router.delete('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // First check if lead exists and user has permission
    const existingLead = await LeadModel.findById(parseInt(id));
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check if user has permission to delete this lead
    let hasPermission = false;
    
    // Admin can delete any lead
    if (req.user.role === 'admin') {
      hasPermission = true;
    }
    // Manager can delete any lead (simplified permission for managers)
    else if (req.user.role === 'manager') {
      hasPermission = true;
    }
    // Agent can delete their own leads
    else if (req.user.role === 'agent') {
      // Convert both to numbers for proper comparison
      const agentId = Number(req.user.id);
      const leadAssignedTo = Number(existingLead.assigned_to);
      hasPermission = leadAssignedTo === agentId;
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await LeadModel.delete(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Search leads
router.get('/search/:term', authenticateToken, async (req: any, res: any) => {
  try {
    const { term } = req.params;
    let leads;
    
    const allLeads = await LeadModel.search(term);
    
    // Filter leads based on user role and permissions
    if (req.user.role === 'admin') {
      // Admin can search all leads
      leads = allLeads;
    } else if (req.user.role === 'manager') {
      // Manager can search leads of their agents + their own leads
      const { UserModel } = await import('../models/User.js');
      const agents = await UserModel.findByManagerId(req.user.id);
      const agentIds = agents.map(agent => agent.id);
      agentIds.push(req.user.id); // Include manager's own leads
      
      leads = allLeads.filter(lead => agentIds.includes(lead.assigned_to || 0));
    } else {
      // Agent can search only their own leads
      leads = allLeads.filter(lead => lead.assigned_to === req.user.id);
    }
    
    res.json({ leads, total: leads.length });
  } catch (error) {
    console.error('Error searching leads:', error);
    res.status(500).json({ error: 'Failed to search leads' });
  }
});

// Get leads by status
router.get('/status/:status', authenticateToken, async (req: any, res: any) => {
  try {
    const { status } = req.params;
    let leads;
    
    const allLeads = await LeadModel.findByStatus(status);
    
    // Filter leads based on user role and permissions
    if (req.user.role === 'admin') {
      // Admin can see all leads with this status
      leads = allLeads;
    } else if (req.user.role === 'manager') {
      // Manager can see leads of their agents + their own leads with this status
      const { UserModel } = await import('../models/User.js');
      const agents = await UserModel.findByManagerId(req.user.id);
      const agentIds = agents.map(agent => agent.id);
      agentIds.push(req.user.id); // Include manager's own leads
      
      leads = allLeads.filter(lead => agentIds.includes(lead.assigned_to || 0));
    } else {
      // Agent can see only their own leads with this status
      leads = allLeads.filter(lead => lead.assigned_to === req.user.id);
    }
    
    res.json({ leads, total: leads.length });
  } catch (error) {
    console.error('Error fetching leads by status:', error);
    res.status(500).json({ error: 'Failed to fetch leads by status' });
  }
});

// Get leads statistics
router.get('/stats/count', authenticateToken, async (req: any, res: any) => {
  try {
    let stats;
    let userLeads;
    
    // Get leads based on user role and permissions
    if (req.user.role === 'admin') {
      // Admin gets statistics for all leads
      const allLeads = await LeadModel.findAll();
      userLeads = allLeads;
    } else if (req.user.role === 'manager') {
      // Manager gets statistics for leads of their agents + their own leads
      const { UserModel } = await import('../models/User.js');
      const agents = await UserModel.findByManagerId(req.user.id);
      const agentIds = agents.map(agent => agent.id);
      agentIds.push(req.user.id); // Include manager's own leads
      
      const allLeads = await LeadModel.findAll();
      userLeads = allLeads.filter(lead => agentIds.includes(lead.assigned_to || 0));
    } else {
      // Agent gets statistics only for their assigned leads
      userLeads = await LeadModel.findByAssignedTo(req.user.id);
    }
    
    const statusCounts: { [key: string]: number } = {};
    
    userLeads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    
    stats = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching lead statistics:', error);
    res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

// Import leads from Excel
router.post('/import/excel', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Smart column detection function
    const detectColumnMapping = (data: any[]) => {
      const firstRow = data[0];
      const columnKeys = Object.keys(firstRow);
      
      // Different patterns to identify columns
      const namePatterns = ['name', 'שם', 'full_name', 'fullname', 'customer', 'לקוח', 'שם מלא', 'Name', 'FullName', 'Customer'];
      const phonePatterns = ['phone', 'טלפון', 'mobile', 'cell', 'נייד', 'telephone', 'Phone', 'Mobile', 'Cell', 'Telephone'];
      const emailPatterns = ['email', 'אימייל', 'mail', 'e_mail', 'Email', 'Mail', 'E_mail', 'E-mail'];
      
      const mapping: any = {};
      
      // First try exact matches
      for (const key of columnKeys) {
        const lowerKey = key.toLowerCase();
        
        if (namePatterns.some(pattern => lowerKey.includes(pattern.toLowerCase()))) {
          mapping.name = key;
        } else if (phonePatterns.some(pattern => lowerKey.includes(pattern.toLowerCase()))) {
          mapping.phone = key;
        } else if (emailPatterns.some(pattern => lowerKey.includes(pattern.toLowerCase()))) {
          mapping.email = key;
        }
      }
      
      // If no mapping found, try position-based detection (A, B, C columns)
      if (!mapping.name || !mapping.phone) {
        const keys = Object.keys(firstRow);
        
        // Check if values look like names/phones to auto-detect
        for (let i = 0; i < Math.min(keys.length, 5); i++) {
          const key = keys[i];
          const values = data.slice(0, 5).map(row => row[key]).filter(v => v);
          
          if (!mapping.name && values.some(v => 
            typeof v === 'string' && 
            v.length > 2 && 
            /^[א-ת\s\w]+$/.test(v) && 
            !v.match(/^[\d\-\+\(\)\s]+$/)
          )) {
            mapping.name = key;
          } else if (!mapping.phone && values.some(v => 
            typeof v === 'string' && 
            (v.match(/^[\d\-\+\(\)\s]+$/) || v.match(/05\d{8}/))
          )) {
            mapping.phone = key;
          } else if (!mapping.email && values.some(v => 
            typeof v === 'string' && v.includes('@')
          )) {
            mapping.email = key;
          }
        }
      }
      
      return mapping;
    };

    // Detect column mapping
    const columnMapping = detectColumnMapping(jsonData);
    
    if (!columnMapping.name && !columnMapping.phone) {
      return res.status(400).json({ 
        error: 'Could not detect name and phone columns. Please ensure your Excel has name and phone data in the first few columns.',
        suggestion: 'Make sure column A has names and column B has phone numbers, or use clear column headers like "שם", "name", "טלפון", "phone"'
      });
    }

    // Validate and transform data
    const leadsData: BulkLeadData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any;
      const rowNumber = i + 2; // +2 because Excel starts from 1 and we have headers

      // Extract data using detected mapping
      const name = columnMapping.name ? row[columnMapping.name] : '';
      const phone = columnMapping.phone ? row[columnMapping.phone] : '';
      const email = columnMapping.email ? row[columnMapping.email] : '';

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.push(`Row ${rowNumber}: Name is required (found in column: ${columnMapping.name || 'not detected'})`);
        continue;
      }

      if (!phone || typeof phone !== 'string' || phone.trim() === '') {
        errors.push(`Row ${rowNumber}: Phone is required (found in column: ${columnMapping.phone || 'not detected'})`);
        continue;
      }

      // Clean and validate phone number
      const cleanPhone = phone.toString().replace(/[\s\-\(\)]/g, '');
      if (!cleanPhone.match(/^[\d\+]+$/) || cleanPhone.length < 9) {
        warnings.push(`Row ${rowNumber}: Phone number "${phone}" might be invalid`);
      }

      // Transform data
      const leadData: BulkLeadData = {
        name: name.toString().trim(),
        phone: cleanPhone,
        email: email ? email.toString().trim() : '',
        status: 'new',
        source: 'excel_import',
        followup_date: undefined,
        followup_time: undefined,
        notes: undefined
      };

      // Basic email validation
      if (leadData.email && !leadData.email.includes('@')) {
        warnings.push(`Row ${rowNumber}: Email "${leadData.email}" might be invalid`);
      }

      leadsData.push(leadData);
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation errors found', 
        errors,
        warnings,
        validRows: leadsData.length,
        totalRows: jsonData.length,
        detectedColumns: columnMapping
      });
    }

    // Import leads to database
    const leadsDataWithUser = leadsData.map(lead => ({
      ...lead,
      assigned_to: req.user.id,
      client_id: req.user.client_id || null
    }));
    const importedLeads = await LeadModel.createBulk(leadsDataWithUser);

    // Create unified events for leads with follow-up dates
    const leadsWithCallbacks = importedLeads.filter(lead => 
      lead.callback_date && lead.callback_time
    );
    
    if (leadsWithCallbacks.length > 0) {
      try {
        const { UnifiedEventModel } = await import('../models/UnifiedEvent.js');
        
        for (const lead of leadsWithCallbacks) {
          try {
            // Combine date and time into ISO string with Jerusalem timezone handling
            const startTime = `${lead.callback_date}T${lead.callback_time}:00.000Z`;
            const endTime = `${lead.callback_date}T${lead.callback_time}:30.000Z`; // 30 minutes duration
            
            const eventData = {
              title: `שיחה חוזרת - ${lead.name}`,
              description: `שיחה חוזרת עם ${lead.name} (${lead.phone})${lead.notes ? ` - ${lead.notes}` : ''}`,
              eventType: 'reminder' as const,
              startTime: startTime,
              endTime: endTime,
              advanceNotice: 30, // 30 minutes advance notice
              isActive: true,
              notified: false,
              customerName: undefined, // Don't set customer name when created from leads
              leadId: lead.id
            };
            
            await UnifiedEventModel.createEventFromLead(req.user.id, eventData);
          } catch (eventError) {
            console.error(`Error creating unified event for imported lead ${lead.id}:`, eventError);
            // Continue with other leads even if one fails
          }
        }
        
        console.log(`Created unified events for ${leadsWithCallbacks.length} imported leads with callbacks`);
      } catch (eventError) {
        console.error('Error creating unified events for imported leads:', eventError);
        // Don't fail the import if event creation fails
      }
    }

    res.json({
      message: 'Leads imported successfully',
      imported: importedLeads.length,
      total: jsonData.length,
      leads: importedLeads,
      detectedColumns: columnMapping,
      warnings: warnings.length > 0 ? warnings : undefined,
      summary: {
        totalRows: jsonData.length,
        successfulImports: importedLeads.length,
        warnings: warnings.length,
        columnsDetected: {
          name: columnMapping.name || 'Auto-detected',
          phone: columnMapping.phone || 'Auto-detected', 
          email: columnMapping.email || 'Not found'
        }
      }
    });

  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// Bulk assign leads to representative
router.patch('/bulk-assign', authenticateToken, async (req: any, res: any) => {
  try {
    const { leadIds, assignedTo } = req.body;
    
    // Validate input
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs are required' });
    }
    
    if (!assignedTo) {
      return res.status(400).json({ error: 'Assigned to user ID is required' });
    }
    
    // Check if user has permission to assign leads
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied. Only admins and managers can assign leads' });
    }
    
    // For managers, verify they can only assign to their own agents or themselves
    if (req.user.role === 'manager') {
      const { UserModel } = await import('../models/User.js');
      const agents = await UserModel.findByManagerId(req.user.id);
      const agentIds = agents.map(agent => agent.id);
      agentIds.push(req.user.id); // Include manager themselves
      
      if (!agentIds.includes(parseInt(assignedTo))) {
        return res.status(403).json({ 
          error: 'Access denied. Managers can only assign leads to their own agents or themselves' 
        });
      }
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Update each lead
    for (const leadId of leadIds) {
      try {
        // Check if lead exists and user has permission to update it
        const existingLead = await LeadModel.findById(parseInt(leadId));
        if (!existingLead) {
          errors.push(`Lead ${leadId} not found`);
          errorCount++;
          continue;
        }
        
        // Check if user has permission to update this lead
        let hasPermission = false;
        
        // Admin can update any lead
        if (req.user.role === 'admin') {
          hasPermission = true;
        }
        // Manager can update any lead (simplified permission for managers)
        else if (req.user.role === 'manager') {
          hasPermission = true;
        }
        // Agent can update their own leads
        else if (req.user.role === 'agent') {
          // Convert both to numbers for proper comparison
          const agentId = Number(req.user.id);
          const leadAssignedTo = Number(existingLead.assigned_to);
          hasPermission = leadAssignedTo === agentId;
        }
        
        if (!hasPermission) {
          errors.push(`No permission to update lead ${leadId}`);
          errorCount++;
          continue;
        }
        
        const updatedLead = await LeadModel.update(parseInt(leadId), { 
          assigned_to: parseInt(assignedTo) 
        });
        
        if (updatedLead) {
          successCount++;
        } else {
          errors.push(`Failed to update lead ${leadId}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating lead ${leadId}:`, error);
        errors.push(`Error updating lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }
    
    res.json({
      message: 'Bulk assignment completed',
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({ error: 'Failed to assign leads' });
  }
});

// Download Excel template
router.get('/template/excel', authenticateToken, (req, res) => {
  try {
    // Create template data
    const templateData = [
      {
        'שם': 'דוגמה',
        'טלפון': '050-1234567',
        'אימייל': 'example@email.com (אופציונלי)',
        'סטטוס': 'new',
        'מקור': 'website',
        'תאריך מעקב': '2024-01-15',
        'שעת מעקב': '10:00',
        'הערות': 'הערות לדוגמה'
      }
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // שם
      { wch: 15 }, // טלפון
      { wch: 25 }, // אימייל
      { wch: 15 }, // סטטוס
      { wch: 15 }, // מקור
      { wch: 15 }, // תאריך מעקב
      { wch: 15 }, // שעת מעקב
      { wch: 30 }  // הערות
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'לידים');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_template.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

export default router;
