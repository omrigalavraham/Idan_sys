import { query } from '../database/connection.js';
import bcrypt from 'bcrypt';
export class UserModel {
    // Create a new user
    static async create(userData) {
        const { email, password, password_hash: providedPasswordHash, first_name, last_name, role = 'agent', department, phone_number, notes, client_id, created_by, manager_id } = userData;
        // Hash password if provided, otherwise use provided hash
        let finalPasswordHash;
        if (providedPasswordHash) {
            finalPasswordHash = providedPasswordHash;
        }
        else if (password) {
            const saltRounds = 12;
            finalPasswordHash = await bcrypt.hash(password, saltRounds);
        }
        else {
            throw new Error('Either password or password_hash must be provided');
        }
        const result = await query(`INSERT INTO users (email, password_hash, first_name, last_name, role, department, phone_number, notes, client_id, created_by, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [email, finalPasswordHash, first_name, last_name, role, department, phone_number, notes, client_id, created_by, manager_id]);
        return result.rows[0];
    }
    // Find user by email (excluding soft deleted)
    static async findByEmail(email) {
        const result = await query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
        return result.rows[0] || null;
    }
    // Find user by ID (excluding soft deleted)
    static async findById(id) {
        const result = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
        return result.rows[0] || null;
    }
    // Verify user password
    static async verifyPassword(email, password) {
        const user = await this.findByEmail(email);
        if (!user)
            return null;
        const isValid = await bcrypt.compare(password, user.password_hash);
        return isValid ? user : null;
    }
    // Update user
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        for (const key of Object.keys(updates)) {
            if (key !== 'id' && updates[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        }
        if (fields.length === 0)
            return null;
        values.push(id);
        const result = await query(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`, values);
        return result.rows[0] || null;
    }
    // Delete user (hard delete)
    static async delete(id) {
        const result = await query('DELETE FROM users WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
    // Soft delete user
    static async softDelete(id) {
        const result = await query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL', [id]);
        return result.rowCount > 0;
    }
    // Get all users (optionally including soft deleted)
    static async findAll(limit = 50, offset = 0) {
        const result = await query('SELECT id, email, first_name, last_name, role, is_active, email_verified, department, phone_number, notes, client_id, created_at, updated_at, deleted_at, created_by, manager_id FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result.rows;
    }
    // Check if email exists
    static async emailExists(email) {
        const result = await query('SELECT 1 FROM users WHERE email = $1', [email]);
        return result.rows.length > 0;
    }
    // Get users by role (excluding soft deleted)
    static async findByRole(role) {
        const result = await query('SELECT id, email, first_name, last_name, role, is_active, email_verified, department, phone_number, notes, client_id, created_at, updated_at, deleted_at, created_by, manager_id FROM users WHERE role = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [role]);
        return result.rows;
    }
    // Get users by client ID (excluding soft deleted)
    static async findByClientId(clientId) {
        const result = await query('SELECT id, email, first_name, last_name, role, is_active, email_verified, department, phone_number, notes, client_id, created_at, updated_at, deleted_at, created_by, manager_id FROM users WHERE client_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [clientId]);
        return result.rows;
    }
    // Get users by manager ID (excluding soft deleted)
    static async findByManagerId(managerId) {
        const result = await query('SELECT id, email, first_name, last_name, role, is_active, email_verified, department, phone_number, notes, client_id, created_at, updated_at, deleted_at, created_by, manager_id FROM users WHERE manager_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [managerId]);
        return result.rows;
    }
    // Get user profile
    static async getProfile(userId) {
        const result = await query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    // Create or update user profile
    static async updateProfile(userId, profileData) {
        // Check if profile exists
        const existingProfile = await this.getProfile(userId);
        if (existingProfile) {
            // Update existing profile
            const fields = [];
            const values = [];
            let paramCount = 1;
            for (const key of Object.keys(profileData)) {
                if (key !== 'id' && key !== 'user_id' && profileData[key] !== undefined) {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(profileData[key]);
                    paramCount++;
                }
            }
            if (fields.length === 0)
                return existingProfile;
            values.push(userId);
            const result = await query(`UPDATE user_profiles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $${paramCount}
         RETURNING *`, values);
            return result.rows[0];
        }
        else {
            // Create new profile
            const result = await query(`INSERT INTO user_profiles (user_id, phone, company, position, location, timezone, bio, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`, [
                userId,
                profileData.phone || null,
                profileData.company || null,
                profileData.position || null,
                profileData.location || null,
                profileData.timezone || 'Asia/Jerusalem',
                profileData.bio || null,
                profileData.avatar_url || null
            ]);
            return result.rows[0];
        }
    }
    // Update password
    static async updatePassword(userId, passwordHash) {
        const result = await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, userId]);
        return result.rowCount > 0;
    }
    // Update user with extended fields
    static async updateExtended(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        for (const key of Object.keys(updates)) {
            if (key !== 'id' && key !== 'password_hash' && updates[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        }
        if (fields.length === 0)
            return null;
        values.push(id);
        const result = await query(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, role, is_active, email_verified, department, phone_number, notes, client_id, created_at, updated_at`, values);
        return result.rows[0] || null;
    }
    // Create user with extended fields
    static async createExtended(userData) {
        const { email, password_hash, first_name, last_name, role = 'user', department, phone_number, notes, client_id } = userData;
        const result = await query(`INSERT INTO users (email, password_hash, first_name, last_name, role, department, phone_number, notes, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [email, password_hash, first_name, last_name, role, department, phone_number, notes, client_id]);
        return result.rows[0];
    }
    // Clean up users that were soft deleted more than a month ago
    static async cleanupDeletedUsers() {
        const result = await query('SELECT cleanup_deleted_users()');
        // Get the count of deleted users by checking before and after
        const beforeResult = await query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NOT NULL AND deleted_at < CURRENT_TIMESTAMP - INTERVAL \'1 month\'');
        const deletedCount = parseInt(beforeResult.rows[0]?.count || '0');
        return deletedCount;
    }
    // Get count of users pending deletion (soft deleted more than a month ago)
    static async getPendingDeletionCount() {
        const result = await query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NOT NULL AND deleted_at < CURRENT_TIMESTAMP - INTERVAL \'1 month\'');
        return parseInt(result.rows[0]?.count || '0');
    }
    // Get all deleted users (admin only)
    static async findAllDeleted() {
        const result = await query('SELECT id, email, first_name, last_name, role, is_active, email_verified, department, phone_number, notes, client_id, created_at, updated_at, deleted_at, created_by, manager_id FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
        return result.rows;
    }
}
