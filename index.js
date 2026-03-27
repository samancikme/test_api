import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam-platform')
    .then(async () => {
        console.log('MongoDB ulangan');
        // Auto-seed admin user
        try {
            const adminExists = await Admin.findOne({ username: 'admin' });
            if (!adminExists) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('admin123', salt);
                await Admin.create({ username: 'admin', password: hashedPassword });
                console.log('Default admin yaratildi (admin:admin123)');
            }
        } catch (e) {
            console.error('Admin yaratishda xato:', e);
        }
    })
    .catch(err => console.error('MongoDB xatosi:', err));

// Routes
import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quizzes.js';

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server ${PORT} da ishlayapti`));
}

export default app;
