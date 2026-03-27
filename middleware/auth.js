import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Avtorizatsiya rad etildi, token yo\'q' });
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'supersecretjwtkey123');
        req.admin = decoded.admin;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token yaroqsiz' });
    }
}
