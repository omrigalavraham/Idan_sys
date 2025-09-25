import { Router } from 'express';
import { WhatsAppConnectionModel } from '../models/WhatsAppConnection.js';
import { UserModel } from '../models/User.js';
import { validateInput } from '../middleware/security.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import axios from 'axios';
const router = Router();
// Validation schemas
const sendMessageSchema = z.object({
    phone_numbers: z.array(z.string().min(1, 'Phone number is required')),
    message: z.string().min(1, 'Message is required'),
});
const connectWhatsAppSchema = z.object({
    access_token: z.string().min(1, 'Access token is required'),
    phone_number_id: z.string().min(1, 'Phone number ID is required'),
    business_account_id: z.string().optional(),
    app_id: z.string().optional(),
    webhook_verify_token: z.string().optional(),
});
/**
 * Middleware לבדיקת הרשאות מנהל
 */
const requireManager = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.userId);
        if (!user || user.role !== 'manager') {
            return res.status(403).json({ error: 'Manager access required' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            client_id: user.client_id
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
/**
 * Middleware לבדיקת הרשאות מנהל או נציג
 */
const requireManagerOrAgent = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.userId);
        if (!user || !['manager', 'agent'].includes(user.role)) {
            return res.status(403).json({ error: 'Manager or agent access required' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            client_id: user.client_id
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
/**
 * POST /api/whatsapp/connect
 * חיבור ווטסאפ עם API credentials ישירים
 */
router.post('/connect', validateInput, requireManager, async (req, res) => {
    try {
        const user = req.user;
        const validatedData = connectWhatsAppSchema.parse(req.body);
        const { access_token, phone_number_id, business_account_id, app_id, webhook_verify_token } = validatedData;
        // בדיקה אם כבר יש חיבור פעיל
        const existingConnection = await WhatsAppConnectionModel.findActiveByManagerId(user.id);
        if (existingConnection) {
            return res.status(400).json({
                error: 'WhatsApp connection already exists',
                connection: {
                    id: existingConnection.id,
                    is_active: existingConnection.is_active,
                    created_at: existingConnection.created_at
                }
            });
        }
        // בדיקת תקינות ה-API credentials
        const validation = await WhatsAppConnectionModel.validateApiCredentials(access_token, phone_number_id);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid WhatsApp API credentials',
                details: validation.error
            });
        }
        // שמירת החיבור במסד הנתונים
        const connection = await WhatsAppConnectionModel.create({
            manager_id: user.id,
            wa_access_token: access_token,
            wa_phone_number_id: phone_number_id,
            wa_business_account_id: business_account_id,
            wa_app_id: app_id,
            wa_webhook_verify_token: webhook_verify_token,
        });
        res.json({
            success: true,
            connection: {
                id: connection.id,
                phone_number_id: connection.wa_phone_number_id,
                business_account_id: connection.wa_business_account_id,
                is_active: connection.is_active,
                created_at: connection.created_at
            }
        });
    }
    catch (error) {
        console.error('Error connecting WhatsApp:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        res.status(500).json({ error: 'Failed to connect WhatsApp' });
    }
});
/**
 * PUT /api/whatsapp/update
 * עדכון חיבור ווטסאפ קיים
 */
router.put('/update', validateInput, requireManager, async (req, res) => {
    try {
        const user = req.user;
        const validatedData = connectWhatsAppSchema.parse(req.body);
        const { access_token, phone_number_id, business_account_id, app_id, webhook_verify_token } = validatedData;
        // בדיקה אם יש חיבור קיים
        const existingConnection = await WhatsAppConnectionModel.findByManagerId(user.id);
        if (!existingConnection) {
            return res.status(404).json({
                error: 'No WhatsApp connection found'
            });
        }
        // בדיקת תקינות ה-API credentials
        const validation = await WhatsAppConnectionModel.validateApiCredentials(access_token, phone_number_id);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid WhatsApp API credentials',
                details: validation.error
            });
        }
        // עדכון החיבור במסד הנתונים
        const connection = await WhatsAppConnectionModel.updateByManagerId(user.id, {
            wa_access_token: access_token,
            wa_phone_number_id: phone_number_id,
            wa_business_account_id: business_account_id,
            wa_app_id: app_id,
            wa_webhook_verify_token: webhook_verify_token,
            is_active: true,
        });
        res.json({
            success: true,
            connection: {
                id: connection.id,
                phone_number_id: connection.wa_phone_number_id,
                business_account_id: connection.wa_business_account_id,
                is_active: connection.is_active,
                updated_at: connection.updated_at
            }
        });
    }
    catch (error) {
        console.error('Error updating WhatsApp connection:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        res.status(500).json({ error: 'Failed to update WhatsApp connection' });
    }
});
/**
 * POST /api/whatsapp/send
 * שליחת הודעות ווטסאפ
 */
router.post('/send', validateInput, requireManagerOrAgent, async (req, res) => {
    try {
        const validatedData = sendMessageSchema.parse(req.body);
        const { phone_numbers, message } = validatedData;
        const user = req.user;
        // מציאת חיבור ווטסאפ פעיל
        let connection;
        if (user.role === 'manager') {
            connection = await WhatsAppConnectionModel.findActiveByManagerId(user.id);
        }
        else if (user.role === 'agent') {
            connection = await WhatsAppConnectionModel.findActiveByAgentId(user.id);
        }
        if (!connection) {
            return res.status(400).json({
                error: 'No active WhatsApp connection found',
                message: user.role === 'manager'
                    ? 'Please connect your WhatsApp account first'
                    : 'Your manager needs to connect WhatsApp first'
            });
        }
        // שליחת הודעות לכל המספרים
        const results = [];
        const errors = [];
        for (const phoneNumber of phone_numbers) {
            try {
                // ניקוי מספר הטלפון (הסרת תווים מיוחדים)
                const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
                // הוספת קידומת מדינה אם חסרה (ישראל)
                const formattedPhone = cleanPhone.startsWith('972') ? cleanPhone : `972${cleanPhone}`;
                const messageData = {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: {
                        body: message
                    }
                };
                const response = await axios.post(`https://graph.facebook.com/v18.0/${connection.wa_phone_number_id}/messages`, messageData, {
                    headers: {
                        'Authorization': `Bearer ${connection.wa_access_token}`,
                        'Content-Type': 'application/json'
                    }
                });
                results.push({
                    phone_number: phoneNumber,
                    status: 'sent',
                    message_id: response.data.messages[0].id
                });
            }
            catch (error) {
                console.error(`Error sending message to ${phoneNumber}:`, error);
                let errorMessage = 'Failed to send message';
                if (axios.isAxiosError(error)) {
                    errorMessage = error.response?.data?.error?.message || error.message;
                }
                errors.push({
                    phone_number: phoneNumber,
                    error: errorMessage
                });
            }
        }
        // עדכון זמן השימוש האחרון
        await WhatsAppConnectionModel.updateLastUsed(connection.manager_id);
        res.json({
            success: true,
            sent_count: results.length,
            error_count: errors.length,
            results,
            errors
        });
    }
    catch (error) {
        console.error('Error sending WhatsApp messages:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        res.status(500).json({ error: 'Failed to send WhatsApp messages' });
    }
});
/**
 * GET /api/whatsapp/status
 * בדיקת סטטוס החיבור
 */
router.get('/status', requireManagerOrAgent, async (req, res) => {
    try {
        const user = req.user;
        // מציאת חיבור ווטסאפ
        let connection;
        if (user.role === 'manager') {
            connection = await WhatsAppConnectionModel.findActiveByManagerId(user.id);
        }
        else if (user.role === 'agent') {
            connection = await WhatsAppConnectionModel.findActiveByAgentId(user.id);
        }
        if (!connection) {
            return res.json({
                connected: false,
                message: user.role === 'manager'
                    ? 'WhatsApp not connected'
                    : 'Manager has not connected WhatsApp'
            });
        }
        res.json({
            connected: true,
            connection: {
                id: connection.id,
                phone_number_id: connection.wa_phone_number_id,
                business_account_id: connection.wa_business_account_id,
                is_active: connection.is_active,
                last_used_at: connection.last_used_at,
                created_at: connection.created_at
            }
        });
    }
    catch (error) {
        console.error('Error checking WhatsApp status:', error);
        res.status(500).json({ error: 'Failed to check WhatsApp status' });
    }
});
/**
 * DELETE /api/whatsapp/disconnect
 * ניתוק חיבור ווטסאפ
 */
router.delete('/disconnect', requireManager, async (req, res) => {
    try {
        const user = req.user;
        const deleted = await WhatsAppConnectionModel.deleteByManagerId(user.id);
        if (!deleted) {
            return res.status(404).json({ error: 'No WhatsApp connection found' });
        }
        res.json({
            success: true,
            message: 'WhatsApp connection disconnected successfully'
        });
    }
    catch (error) {
        console.error('Error disconnecting WhatsApp:', error);
        res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
});
export default router;
