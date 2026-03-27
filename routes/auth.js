import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        let admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ message: 'Foydalanuvchi topilmadi' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Parol noto\'g\'ri' });
        }

        const payload = {
            admin: { id: admin.id }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'supersecretjwtkey123',
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server xatosi');
    }
});

export default router;
