import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema({
    id: String,
    text: String,
    label: String
}, { _id: false });

const PairSchema = new mongoose.Schema({
    left: String,
    right: String
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
    id: String,
    questionNumber: Number,
    type: {
        type: String,
        enum: ['single', 'multi', 'statement-grid', 'matching', 'short-answer', 'ordering', 'boolean']
    },
    instruction: String,
    questionText: String,
    options: [OptionSchema],
    correctAnswer: String, // ID or text depending on type
    correctAnswers: [String],
    statements: [{
        id: String,
        text: String,
        correctAnswer: String
    }],
    pairs: [PairSchema],
    correctOrder: [String],
    correctAnswerText: String
}, { _id: false });

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    level: String,
    questions: [QuestionSchema]
}, { timestamps: true });

export default mongoose.model('Quiz', QuizSchema);
