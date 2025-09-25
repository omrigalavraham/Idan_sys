import * as express from 'express';
import { UserModel } from '../models/User.js';
import { SystemClientModel } from '../models/SystemClient.js';
import { authenticateToken } from '../middleware/auth.js';
import * as bcrypt from 'bcrypt';
const router = express.Router();
// Helper to safely parse integers
const parseQueryInt = (value, defaultValue) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
};
// Get all users (with hierarchy-based access)
// @ts-ignore
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const limit = parseQueryInt(req.query.limit, 50);
        const offset = parseQueryInt(req.query.offset, 0);
        const role = req.query.role;
        const client_id = req.query.client_id ? parseInt(req.query.client_id) : undefined;
        let users = [];
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        switch (authReq.user.role) {
            case 'admin':
                if (role) {
                    users = await UserModel.findByRole(role);
                }
                else if (client_id) {
                    users = await UserModel.findByClientId(client_id);
                }
                else {
                    users = await UserModel.findAll(limit, offset);
                }
                break;
            case 'manager':
                // Manager can see their agents and themselves
                const agents = await UserModel.findByRole('agent');
                const managerSelf = await UserModel.findById(authReq.user.id);
                users = [...agents];
                if (managerSelf) {
                    users.push(managerSelf);
                }
                break;
            case 'agent':
                const me = await UserModel.findById(authReq.user.id);
                users = me ? [me] : [];
                break;
            default:
                return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ users, total: users.length });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Get user by ID
// @ts-ignore
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'Invalid user ID' });
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (authReq.user.role !== 'admin' && authReq.user.id !== id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const user = await UserModel.findById(id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// Create new user
// @ts-ignore
router.post('/', authenticateToken, async (req, res, next) => {
    try {
        const { password, role, manager_id, client_id, ...userData } = req.body;
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (authReq.user.role === 'agent')
            return res.status(403).json({ error: 'Agents cannot create users' });
        if (authReq.user.role === 'manager' && role !== 'agent')
            return res.status(403).json({ error: 'Managers can only create agents' });
        if (!password)
            return res.status(400).json({ error: 'Password is required' });
        const password_hash = await bcrypt.hash(password, 12);
        let assigned_manager_id;
        if (role === 'agent' && authReq.user.role === 'manager') {
            assigned_manager_id = authReq.user.id;
        }
        else if (role === 'agent' && authReq.user.role === 'admin' && manager_id) {
            assigned_manager_id = manager_id;
        }
        const user = await UserModel.create({
            ...userData,
            role,
            password_hash,
            created_by: authReq.user.id,
            manager_id: assigned_manager_id,
            client_id: client_id || null
        });
        // אם נוצר משתמש בתפקיד "מנהל", צור גם system_client
        let systemClient = null;
        if (role === 'manager') {
            try {
                const clientName = `${userData.first_name} ${userData.last_name}`;
                const companyName = userData.company_name || `${userData.first_name} ${userData.last_name} - חברה`;
                // בדיקה אם כבר קיים system_client עם אותו שם
                const existingClient = await SystemClientModel.findByName(clientName);
                if (existingClient) {
                    // אם כבר קיים, השתמש בו
                    systemClient = existingClient;
                    console.log(`Using existing system client: ${clientName}`);
                }
                else {
                    // אם לא קיים, צור חדש
                    systemClient = await SystemClientModel.create({
                        name: clientName,
                        company_name: companyName,
                        primary_color: '#3b82f6',
                        secondary_color: '#1e40af',
                        logo_url: undefined,
                        lead_statuses: [
                            { id: 'new', name: 'חדש', color: '#10b981', order: 1, isDefault: true, isFinal: false },
                            { id: 'contacted', name: 'יצרתי קשר', color: '#3b82f6', order: 2, isDefault: false, isFinal: false },
                            { id: 'qualified', name: 'מתאים', color: '#f59e0b', order: 3, isDefault: false, isFinal: false },
                            { id: 'converted', name: 'התקבל', color: '#10b981', order: 4, isDefault: false, isFinal: true },
                            { id: 'rejected', name: 'נדחה', color: '#ef4444', order: 5, isDefault: false, isFinal: true },
                            { id: 'deal_closed', name: 'עסקה נסגרה', color: '#059669', order: 6, isDefault: false, isFinal: true }
                        ],
                        customer_statuses: [
                            { id: 'active', name: 'פעיל', color: '#10b981', order: 1 },
                            { id: 'inactive', name: 'לא פעיל', color: '#6b7280', order: 2 },
                            { id: 'suspended', name: 'מושעה', color: '#f59e0b', order: 3 }
                        ],
                        payment_statuses: [
                            { id: 'pending', name: 'ממתין לתשלום', color: '#f59e0b', order: 1 },
                            { id: 'paid', name: 'שולם', color: '#10b981', order: 2 },
                            { id: 'overdue', name: 'באיחור', color: '#ef4444', order: 3 }
                        ],
                        features: {
                            leads: true,
                            customers: true,
                            tasks: true,
                            calendar: true,
                            reports: true,
                            attendance: true,
                            dialer: true
                        },
                        message_templates: []
                    });
                    console.log(`Created new system client: ${clientName}`);
                }
                // עדכן את המשתמש עם client_id
                if (systemClient) {
                    await UserModel.update(user.id, { client_id: systemClient.id });
                    user.client_id = systemClient.id;
                }
            }
            catch (systemClientError) {
                console.error('Error creating system client for manager:', systemClientError);
                // לא נכשל את יצירת המשתמש אם יצירת system_client נכשלת
            }
        }
        const { password_hash: _, ...userWithoutPassword } = user;
        res.status(201).json({
            user: userWithoutPassword,
            systemClient: systemClient ? {
                id: systemClient.id,
                name: systemClient.name,
                company_name: systemClient.company_name
            } : null
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'User with this email already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});
// Update user
// @ts-ignore
router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const targetUserId = parseInt(req.params.id);
        if (isNaN(targetUserId))
            return res.status(400).json({ error: 'Invalid user ID' });
        const { password, role, ...updates } = req.body;
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const isOwnProfile = authReq.user.id === targetUserId;
        if (!isOwnProfile) {
            if (authReq.user.role === 'agent')
                return res.status(403).json({ error: 'Agents can only update their own profile' });
            if (authReq.user.role === 'manager') {
                const targetUser = await UserModel.findById(targetUserId);
                if (!targetUser || targetUser.role !== 'agent')
                    return res.status(403).json({ error: 'Managers can only update agents' });
            }
        }
        if (role && !isOwnProfile) {
            if (authReq.user.role === 'manager' && role !== 'agent')
                return res.status(403).json({ error: 'Managers can only assign agent role' });
        }
        if (password) {
            updates.password_hash = await bcrypt.hash(password, 12);
        }
        if (role)
            updates.role = role;
        const user = await UserModel.update(targetUserId, updates);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// Delete user
// @ts-ignore
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const targetUserId = parseInt(req.params.id);
        if (isNaN(targetUserId))
            return res.status(400).json({ error: 'Invalid user ID' });
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (authReq.user.role === 'agent')
            return res.status(403).json({ error: 'Agents cannot delete users' });
        if (authReq.user.role === 'manager') {
            const targetUser = await UserModel.findById(targetUserId);
            if (!targetUser || targetUser.role !== 'agent')
                return res.status(403).json({ error: 'Managers can only delete agents' });
        }
        if (authReq.user.id === targetUserId)
            return res.status(400).json({ error: 'Cannot delete your own account' });
        // Get user details before soft deletion
        const userToDelete = await UserModel.findById(targetUserId);
        if (!userToDelete)
            return res.status(404).json({ error: 'User not found' });
        const deleted = await UserModel.softDelete(targetUserId);
        if (!deleted)
            return res.status(404).json({ error: 'User not found or already deleted' });
        // If the deleted user is a manager, also soft delete their system client
        if (userToDelete.role === 'manager' && userToDelete.client_id) {
            try {
                const { SystemClientModel } = await import('../models/SystemClient.js');
                await SystemClientModel.softDelete(userToDelete.client_id);
                console.log(`Also soft deleted system client ${userToDelete.client_id} for manager ${userToDelete.first_name} ${userToDelete.last_name}`);
            }
            catch (error) {
                console.error('Error soft deleting system client for manager:', error);
                // Don't fail the user deletion if system client deletion fails
            }
        }
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// Get agents by manager
router.get('/agents/by-manager', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        let agents = [];
        switch (authReq.user.role) {
            case 'admin':
                // אדמין רואה את כל הנציגים
                agents = await UserModel.findByRole('agent');
                break;
            case 'manager':
                // מנהל רואה רק נציגים שמשויכים אליו
                agents = await UserModel.findByManagerId(authReq.user.id);
                break;
            case 'agent':
                // נציג רואה רק את עצמו
                const self = await UserModel.findById(authReq.user.id);
                agents = self ? [self] : [];
                break;
            default:
                return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ agents });
    }
    catch (error) {
        console.error('Error fetching agents by manager:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});
// Clean up deleted users (admin only)
// @ts-ignore
router.post('/cleanup-deleted', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const deletedCount = await UserModel.cleanupDeletedUsers();
        res.json({
            message: 'Cleanup completed successfully',
            deletedUsers: deletedCount
        });
    }
    catch (error) {
        console.error('Error cleaning up deleted users:', error);
        res.status(500).json({ error: 'Failed to cleanup deleted users' });
    }
});
// Get count of users pending deletion (admin only)
// @ts-ignore
router.get('/pending-deletion-count', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const pendingCount = await UserModel.getPendingDeletionCount();
        res.json({
            pendingDeletionCount: pendingCount
        });
    }
    catch (error) {
        console.error('Error getting pending deletion count:', error);
        res.status(500).json({ error: 'Failed to get pending deletion count' });
    }
});
// Get all deleted users (admin only)
// @ts-ignore
router.get('/deleted', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const deletedUsers = await UserModel.findAllDeleted();
        res.json({
            deletedUsers,
            total: deletedUsers.length
        });
    }
    catch (error) {
        console.error('Error fetching deleted users:', error);
        res.status(500).json({ error: 'Failed to fetch deleted users' });
    }
});
// Soft delete user (admin only)
// @ts-ignore
router.delete('/:id/soft', authenticateToken, async (req, res, next) => {
    try {
        const authReq = req;
        if (!authReq.user || authReq.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const success = await UserModel.softDelete(userId);
        if (success) {
            res.json({ message: 'User soft deleted successfully' });
        }
        else {
            res.status(404).json({ error: 'User not found or already deleted' });
        }
    }
    catch (error) {
        console.error('Error soft deleting user:', error);
        res.status(500).json({ error: 'Failed to soft delete user' });
    }
});
// Get user call history
// @ts-ignore
router.get('/:id/call-history', authenticateToken, async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const requestingUser = req.user;
        // Check permissions - users can only access their own call history
        // Admins and managers can access any user's call history
        if (requestingUser.role !== 'admin' && requestingUser.role !== 'manager' && requestingUser.id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Parse call history from JSONB field
        const callHistory = user.call_history || [];
        res.json({
            callHistory,
            contacts: user.contacts || [],
            favoriteNumbers: user.favorite_numbers || [],
            recentNumbers: user.recent_numbers || [],
            callSettings: user.call_settings || {
                autoRecord: false,
                showCallerId: true,
                blockUnknownNumbers: false,
                defaultCallDuration: 0,
            }
        });
    }
    catch (error) {
        console.error('Error getting user call history:', error);
        res.status(500).json({ error: 'Failed to get user call history' });
    }
});
// Update user call history
// @ts-ignore
router.put('/:id/call-history', authenticateToken, async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const requestingUser = req.user;
        // Check permissions - users can only update their own call history
        // Admins and managers can update any user's call history
        if (requestingUser.role !== 'admin' && requestingUser.role !== 'manager' && requestingUser.id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { callHistory, contacts, favoriteNumbers, recentNumbers, callSettings } = req.body;
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Update user with new call history data
        const updatedUser = await UserModel.update(userId, {
            call_history: callHistory || [],
            contacts: contacts || [],
            favorite_numbers: favoriteNumbers || [],
            recent_numbers: recentNumbers || [],
            call_settings: callSettings || {
                autoRecord: false,
                showCallerId: true,
                blockUnknownNumbers: false,
                defaultCallDuration: 0,
            }
        });
        if (updatedUser) {
            res.json({ message: 'Call history updated successfully' });
        }
        else {
            res.status(500).json({ error: 'Failed to update call history' });
        }
    }
    catch (error) {
        console.error('Error updating user call history:', error);
        res.status(500).json({ error: 'Failed to update user call history' });
    }
});
// Get user profile (including user data and profile data)
// @ts-ignore
router.get('/profile/:userId', authenticateToken, async (req, res, next) => {
    // console.log('Get profile request for user:', req.params.userId);
    try {
        const targetUserId = parseInt(req.params.userId);
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Check permissions
        const isOwnProfile = authReq.user.id === targetUserId;
        if (!isOwnProfile) {
            if (authReq.user.role === 'agent') {
                return res.status(403).json({ error: 'Agents can only view their own profile' });
            }
            if (authReq.user.role === 'manager') {
                const targetUser = await UserModel.findById(targetUserId);
                if (!targetUser || targetUser.role !== 'agent') {
                    return res.status(403).json({ error: 'Managers can only view agent profiles' });
                }
            }
        }
        // Get user data
        const user = await UserModel.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get profile data
        const profile = await UserModel.getProfile(targetUserId);
        // console.log('Profile data retrieved:', profile ? 'exists' : 'null', profile?.avatar_url ? `has avatar (length: ${profile.avatar_url.length})` : 'no avatar');
        res.json({
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                department: user.department,
                phone_number: user.phone_number,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            profile: profile ? {
                id: profile.id,
                phone: profile.phone,
                company: profile.company,
                position: profile.position,
                location: profile.location,
                timezone: profile.timezone,
                bio: profile.bio,
                avatar_url: profile.avatar_url,
                join_date: profile.join_date,
                created_at: profile.created_at,
                updated_at: profile.updated_at
            } : null
        });
    }
    catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});
// Update user profile
// @ts-ignore
router.put('/profile/:userId', authenticateToken, async (req, res, next) => {
    try {
        const targetUserId = parseInt(req.params.userId);
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Check permissions
        const isOwnProfile = authReq.user.id === targetUserId;
        if (!isOwnProfile) {
            if (authReq.user.role === 'agent') {
                return res.status(403).json({ error: 'Agents can only update their own profile' });
            }
            if (authReq.user.role === 'manager') {
                const targetUser = await UserModel.findById(targetUserId);
                if (!targetUser || targetUser.role !== 'agent') {
                    return res.status(403).json({ error: 'Managers can only update agent profiles' });
                }
            }
        }
        // Check if user exists
        const user = await UserModel.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const { phone, company, position, location, timezone, bio, avatar_url } = req.body;
        // console.log('Profile update request for user:', targetUserId);
        // console.log('Avatar URL length:', avatar_url ? avatar_url.length : 'null');
        // Validate avatar_url if provided (should be base64 data URL or valid URL)
        if (avatar_url && typeof avatar_url === 'string') {
            // Check if it's a valid base64 data URL or a valid HTTP/HTTPS URL
            const isValidDataUrl = avatar_url.startsWith('data:image/');
            const isValidUrl = avatar_url.startsWith('http://') || avatar_url.startsWith('https://');
            if (!isValidDataUrl && !isValidUrl) {
                return res.status(400).json({
                    error: 'Invalid avatar URL format. Must be a base64 data URL or HTTP/HTTPS URL.'
                });
            }
            // Check base64 data URL size (max 5MB)
            if (isValidDataUrl) {
                const base64Data = avatar_url.split(',')[1];
                if (base64Data) {
                    const sizeInBytes = (base64Data.length * 3) / 4;
                    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
                    if (sizeInBytes > maxSizeInBytes) {
                        return res.status(400).json({
                            error: 'Avatar image is too large. Maximum size is 5MB.'
                        });
                    }
                }
            }
        }
        // Update profile data
        try {
            const updatedProfile = await UserModel.updateProfile(targetUserId, {
                phone,
                company,
                position,
                location,
                timezone,
                bio,
                avatar_url
            });
            // console.log('Profile updated successfully for user:', targetUserId);
            res.json({
                message: 'Profile updated successfully',
                profile: updatedProfile
            });
        }
        catch (profileError) {
            console.error('Error updating profile:', profileError);
            res.status(500).json({
                error: 'Failed to update profile',
                details: profileError?.message || 'Unknown error'
            });
        }
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});
// Update user status (activate/deactivate)
// @ts-ignore
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const { status } = req.body;
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
        }
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Check if user exists
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check permissions
        if (authReq.user.role === 'agent') {
            return res.status(403).json({ error: 'Agents cannot update user status' });
        }
        if (authReq.user.role === 'manager') {
            // Managers can only update their agents
            if (user.role !== 'agent' || user.manager_id !== authReq.user.id) {
                return res.status(403).json({ error: 'Managers can only update their own agents' });
            }
        }
        // Update user status
        const isActive = status === 'active';
        await UserModel.update(userId, { is_active: isActive });
        res.json({
            message: 'User status updated successfully',
            userId,
            status: isActive ? 'active' : 'inactive'
        });
    }
    catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});
export default router;
