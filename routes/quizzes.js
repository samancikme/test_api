import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
import Quiz from '../models/Quiz.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Barcha testlarni olish (Title, Description, Level va savollar soni - umumiy foydalanish uchun)
router.get('/', async (req, res) => {
    try {
        const quizzes = await Quiz.find({}, '-questions.correctAnswer -questions.correctAnswers -questions.statements.correctAnswer').sort({ createdAt: -1 });
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ message: 'Server xatosi', error: err.message });
    }
});

// Bitta testni to'liq barcha savollari bilan olish
router.get('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Test topilmadi' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// Admin tomonidan testni o'chirish
router.delete('/:id', auth, async (req, res) => {
    try {
        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ message: "Test o'chirildi" });
    } catch (err) {
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// --- PARSER YORDAMCHI FUNKSIYASI ---
function parseTextToQuiz(text, filename) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let title = filename.replace(/\.[^/.]+$/, "");
    let description = "";
    let level = "Noma'lum";
    let questions = [];

    let currentQuestion = null;
    let inQuestion = false;

    // Fayl boshidan Title va Descriptionni qidirish
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.toLowerCase().startsWith('title:')) {
            title = line.substring(6).trim();
        } else if (line.toLowerCase().startsWith('description:')) {
            description = line.substring(12).trim();
        } else if (line.toLowerCase().startsWith('level:')) {
            level = line.substring(6).trim();
        } else if (line.toLowerCase().startsWith('q:')) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            currentQuestion = {
                id: `q${questions.length + 1}`,
                questionNumber: questions.length + 1,
                type: 'single', // default
                questionText: line.substring(2).trim(),
                options: [],
                correctAnswers: [],
            };
            inQuestion = true;
        } else if (inQuestion && line.toLowerCase().startsWith('type:')) {
            currentQuestion.type = line.substring(5).trim().toLowerCase();
        } else if (inQuestion && /^[A-E]\)/i.test(line)) {
            // Variant (masalan, A) Toshkent (T) )
            const optLabel = line.substring(0, 1).toUpperCase();
            let optText = line.substring(2).trim();
            const isCorrect = /\(T\)/i.test(optText) || /\(t\)/i.test(optText);

            if (isCorrect) {
                optText = optText.replace(/\([Tt]\)/g, '').trim();
            }

            const optId = `o${currentQuestion.options.length + 1}`;
            currentQuestion.options.push({
                id: optId,
                label: optLabel,
                text: optText
            });

            if (isCorrect) {
                if (currentQuestion.type === 'single') {
                    currentQuestion.correctAnswer = optId;
                } else {
                    currentQuestion.correctAnswers.push(optId);
                }
            }
        }
    }

    if (currentQuestion) {
        questions.push(currentQuestion);
    }

    return { title, description, level, questions };
}

// Word/PDF fayl yuklash va saqlash
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Fayl yuklanmadi' });
        }

        const buffer = req.file.buffer;
        const filename = req.file.originalname;
        let ext = filename.split('.').pop().toLowerCase();
        let textContent = '';

        if (ext === 'pdf') {
            const data = await pdfParse(buffer);
            textContent = data.text;
        } else if (ext === 'docx') {
            const result = await mammoth.extractRawText({ buffer });
            textContent = result.value;
        } else {
            return res.status(400).json({ message: 'Faqat PDF va DOCX formatlari ruxsat etilgan' });
        }

        const quizData = parseTextToQuiz(textContent, filename);

        if (quizData.questions.length === 0) {
            return res.status(400).json({ message: 'Fayldan hech qanday savol topilmadi. Shablon qoidalariga rioya qiling.' });
        }

        const quiz = new Quiz(quizData);
        await quiz.save();

        res.json({ message: 'Test muvaffaqiyatli saqlandi', quizId: quiz._id, questionsCount: quiz.questions.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Faylni o'qishda xatolik", error: err.message });
    }
});

export default router;
