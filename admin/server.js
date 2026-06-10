const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const nodemailer = require('nodemailer');

// ===== ПОЧТОВЫЙ ТРАНСПОРТ (Selectel) =====
const mailer = nodemailer.createTransport({
    host: 'smtp.mail.selcloud.ru',
    port: 1126,
    secure: false,
    
    auth: {
        user: '9136',
        pass: 'khyPcNTKteIbGCd4oz'
    }
});

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = 3000;

// Настройка CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://vkac.ru', 'http://www.vkach.ru', 'https://vkac.ru', 'https://www.vkach.ru'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/chat', express.static(path.join(__dirname, 'uploads/chat')));

// ========== FATSECRET API НАСТРОЙКИ ==========
const FATSECRET_CLIENT_ID = '8528a45db7a148f78c7e387d5ddf7209';
const FATSECRET_CLIENT_SECRET = '463fdd3f96874524ba88bd3643643649';

let fatsecretAccessToken = null;
let tokenExpiryTime = 0;

async function getFatSecretToken() {
    if (fatsecretAccessToken && Date.now() < tokenExpiryTime) {
        return fatsecretAccessToken;
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        const authString = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');
        
        const response = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials&scope=basic premier'
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            fatsecretAccessToken = data.access_token;
            tokenExpiryTime = Date.now() + (data.expires_in * 1000);
            console.log('✅ FatSecret токен получен, истекает через', data.expires_in, 'сек');
            return fatsecretAccessToken;
        } else {
            console.error('❌ Ошибка получения токена:', data);
            throw new Error('Не удалось получить токен');
        }
    } catch (err) {
        console.error('❌ Ошибка получения токена FatSecret:', err);
        return null;
    }
}

// ========== MIDDLEWARE ПРОВЕРКИ ДОСТУПА АДМИНИСТРАТОРА ==========
function adminOnly(req, res, next) {
    const userId = req.body?.userId || req.query?.userId || req.headers['x-user-id'];
    if (String(userId) !== '1' && String(userId) !== '5') return res.status(403).json({ error: 'Forbidden' });
    next();
}

// ========== НАСТРОЙКА MULTER ДЛЯ АВАТАРОВ ==========
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        cb(null, mimetype && extname);
    }
});

// ========== НАСТРОЙКА MULTER ДЛЯ ФОТО УПРАЖНЕНИЙ ==========
const exercisePhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads/exercises');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '_' + Math.round(Math.random() * 1E9);
        cb(null, 'temp_' + unique + path.extname(file.originalname));
    }
});

const chatImageStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join(__dirname, 'uploads/chat');
        if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2) + ext);
    }
});
const chatImageUpload = multer({
    storage: chatImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Только изображения'));
    }
});

const exercisePhotoUpload = multer({
    storage: exercisePhotoStorage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат файла. Разрешены: JPG, PNG, GIF, WEBP, BMP'));
        }
    }
});

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'lasha2022',
    database: 'rospechat_db'
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка БД:', err.message);
    } else {
        console.log('Подключено к MySQL');
    }
});

function queryPromise(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// ========== API ЗАГРУЗКИ АВАТАРА ==========
app.post('/api/upload-avatar/:id', avatarUpload.single('avatar'), async (req, res) => {
    const userId = req.params.id;
    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    const dir = path.join(__dirname, 'uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Удаляем старый аватар (любое расширение)
    try {
        const oldFiles = fs.readdirSync(dir).filter(f => f.startsWith(`avatar_${userId}.`));
        oldFiles.forEach(f => {
            try { fs.unlinkSync(path.join(dir, f)); } catch(e) {}
        });
    } catch(e) {}

    const outputFilename = `avatar_${userId}.webp`;
    const outputPath = path.join(dir, outputFilename);

    try {
        await sharp(req.file.buffer)
            .rotate()
            .resize(400, 400, { fit: 'cover', position: 'centre' })
            .webp({ quality: 85 })
            .toFile(outputPath);
    } catch (sharpErr) {
        console.error('Ошибка сжатия аватара:', sharpErr);
        return res.status(400).json({ error: 'Не удалось обработать изображение' });
    }

    const avatarUrl = `/uploads/avatars/${outputFilename}`;
    db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId], (err) => {
        if (err) {
            console.error('Ошибка обновления аватара:', err);
            return res.status(500).json({ error: 'Ошибка сохранения' });
        }
        res.json({ success: true, avatar: avatarUrl });
    });
});

// ========== ПАКЕТНОЕ СЖАТИЕ СУЩЕСТВУЮЩИХ АВАТАРОК ==========
app.post('/api/admin/compress-avatars', adminOnly, async (req, res) => {
    const dir = path.join(__dirname, 'uploads/avatars');
    if (!fs.existsSync(dir)) return res.json({ success: true, processed: 0, skipped: 0, errors: [] });

    const files = fs.readdirSync(dir);
    let processed = 0, skipped = 0, errors = [];

    for (const file of files) {
        // Пропускаем уже сжатые .webp
        if (file.endsWith('.webp')) { skipped++; continue; }

        const match = file.match(/^avatar_(\d+)\./);
        if (!match) { skipped++; continue; }

        const userId = match[1];
        const inputPath = path.join(dir, file);
        const outputFilename = `avatar_${userId}.webp`;
        const outputPath = path.join(dir, outputFilename);

        try {
            await sharp(inputPath)
                .resize(400, 400, { fit: 'cover', position: 'centre' })
                .webp({ quality: 85 })
                .toFile(outputPath);

            // Удаляем оригинал
            fs.unlinkSync(inputPath);

            // Обновляем БД
            await queryPromise('UPDATE users SET avatar = ? WHERE id = ?',
                [`/uploads/avatars/${outputFilename}`, userId]);

            processed++;
            console.log(`✅ Аватар сжат: ${file} → ${outputFilename}`);
        } catch (e) {
            errors.push({ file, error: e.message });
            console.error(`❌ Ошибка сжатия ${file}:`, e.message);
        }
    }

    console.log(`✅ Пакетное сжатие: обработано ${processed}, пропущено ${skipped}, ошибок ${errors.length}`);
    res.json({ success: true, processed, skipped, errors });
});

// ========== ЗАГРУЗКА ФОТО УПРАЖНЕНИЙ ==========
app.post('/api/upload-exercise-photo', exercisePhotoUpload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const tempFilePath = req.file.path;
    const outputFilename = `exercise_${Date.now()}_${Math.round(Math.random() * 1E9)}.jpg`;
    const outputPath = path.join(__dirname, 'uploads/exercises', outputFilename);
    
    try {
        let image = sharp(tempFilePath).rotate();
        const metadata = await image.metadata();
        
        const maxSize = 1200;
        let width = metadata.width;
        let height = metadata.height;
        
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round(height * (maxSize / width));
                width = maxSize;
            } else {
                width = Math.round(width * (maxSize / height));
                height = maxSize;
            }
        }
        
        await image.resize(width, height, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toFile(outputPath);
        
        fs.unlinkSync(tempFilePath);
        
        const photoUrl = `/uploads/exercises/${outputFilename}`;
        console.log(`✅ Фото сохранено: ${photoUrl}`);
        res.json({ success: true, photoUrl: photoUrl });
    } catch (err) {
        console.error('❌ Ошибка обработки фото:', err);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        res.status(500).json({ error: 'Ошибка обработки изображения' });
    }
});

// ========== API УДАЛЕНИЯ ФОТО ==========
app.post('/api/delete-exercise-photo', async (req, res) => {
    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ error: 'URL фото обязателен' });
    
    try {
        let cleanUrl = photoUrl;
        if (cleanUrl.startsWith('http')) {
            const urlObj = new URL(cleanUrl);
            cleanUrl = urlObj.pathname;
        }
        const filepath = path.join(__dirname, cleanUrl);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления фото:', err);
        res.status(500).json({ error: 'Ошибка удаления файла' });
    }
});

// ========== API ДЛЯ ПРОТОКОЛОВ ==========

app.get('/api/protocol-data/:protocolId', async (req, res) => {
    const protocolId = req.params.protocolId;
    
    try {
        const days = await queryPromise(
            'SELECT id, day_name, sort_order, comments FROM protocol_days WHERE protocol_id = ? ORDER BY sort_order ASC',
            [protocolId]
        );
        
        const protocolData = { days: [] };
        
        for (const day of days) {
            const exercises = await queryPromise(
                'SELECT id, exercise_name, sort_order, is_collapsed FROM protocol_exercises WHERE day_id = ? ORDER BY sort_order ASC',
                [day.id]
            );
            
            const dayExercises = [];
            
            for (const exercise of exercises) {
                const sets = await queryPromise(
                    'SELECT set_number, reps, weight FROM protocol_sets WHERE exercise_id = ? ORDER BY set_number ASC',
                    [exercise.id]
                );
                const comments = await queryPromise(
                    'SELECT comment_text FROM protocol_exercise_comments WHERE exercise_id = ? ORDER BY sort_order ASC',
                    [exercise.id]
                );
                const photos = await queryPromise(
                    'SELECT photo_url FROM protocol_exercise_photos WHERE exercise_id = ? ORDER BY sort_order ASC',
                    [exercise.id]
                );
                
                dayExercises.push({
                    id: exercise.id.toString(),
                    name: exercise.exercise_name,
                    sets: sets.map(s => ({ reps: s.reps, weight: s.weight })),
                    comments: comments.map(c => c.comment_text),
                    photos: photos.map(p => p.photo_url),
                    is_collapsed: exercise.is_collapsed === 1
                });
            }
            
            protocolData.days.push({
                id: day.id.toString(),
                name: day.day_name,
                exercises: dayExercises,
                comments: day.comments || ''
            });
        }
        
        res.json({ success: true, data: protocolData });
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        res.status(500).json({ error: 'Ошибка загрузки' });
    }
});

app.post('/api/save-protocol-data', async (req, res) => {
    const { protocolId, data } = req.body;
    
    if (!protocolId || !data) {
        return res.status(400).json({ error: 'Недостаточно данных' });
    }
    
    try {
        console.log(`🔄 Сохранение протокола ${protocolId}`);
        
        await queryPromise('START TRANSACTION');
        
        await queryPromise('DELETE FROM protocol_exercise_photos WHERE exercise_id IN (SELECT id FROM protocol_exercises WHERE day_id IN (SELECT id FROM protocol_days WHERE protocol_id = ?))', [protocolId]);
        await queryPromise('DELETE FROM protocol_exercise_comments WHERE exercise_id IN (SELECT id FROM protocol_exercises WHERE day_id IN (SELECT id FROM protocol_days WHERE protocol_id = ?))', [protocolId]);
        await queryPromise('DELETE FROM protocol_sets WHERE exercise_id IN (SELECT id FROM protocol_exercises WHERE day_id IN (SELECT id FROM protocol_days WHERE protocol_id = ?))', [protocolId]);
        await queryPromise('DELETE FROM protocol_exercises WHERE day_id IN (SELECT id FROM protocol_days WHERE protocol_id = ?)', [protocolId]);
        await queryPromise('DELETE FROM protocol_days WHERE protocol_id = ?', [protocolId]);
        
        console.log(`🗑️ Старые данные удалены`);
        
        for (let dayIdx = 0; dayIdx < data.days.length; dayIdx++) {
            const day = data.days[dayIdx];
            
            const dayResult = await queryPromise(
                'INSERT INTO protocol_days (protocol_id, day_name, sort_order, comments) VALUES (?, ?, ?, ?)',
                [protocolId, day.name, dayIdx, day.comments || '']
            );
            const dayId = dayResult.insertId;
            
            for (let exIdx = 0; exIdx < day.exercises.length; exIdx++) {
                const exercise = day.exercises[exIdx];
                
                const exerciseResult = await queryPromise(
                    'INSERT INTO protocol_exercises (day_id, exercise_name, sort_order, is_collapsed) VALUES (?, ?, ?, ?)',
                    [dayId, exercise.name, exIdx, exercise.is_collapsed ? 1 : 0]
                );
                const exerciseId = exerciseResult.insertId;
                
                if (exercise.sets && exercise.sets.length > 0) {
                    for (let setIdx = 0; setIdx < exercise.sets.length; setIdx++) {
                        const set = exercise.sets[setIdx];
                        await queryPromise(
                            'INSERT INTO protocol_sets (exercise_id, set_number, reps, weight) VALUES (?, ?, ?, ?)',
                            [exerciseId, setIdx + 1, set.reps || '10', set.weight || '0']
                        );
                    }
                }
                
                if (exercise.comments && exercise.comments.length > 0) {
                    for (let commIdx = 0; commIdx < exercise.comments.length; commIdx++) {
                        await queryPromise(
                            'INSERT INTO protocol_exercise_comments (exercise_id, comment_text, sort_order) VALUES (?, ?, ?)',
                            [exerciseId, exercise.comments[commIdx], commIdx]
                        );
                    }
                }
                
                if (exercise.photos && exercise.photos.length > 0) {
                    for (let photoIdx = 0; photoIdx < exercise.photos.length; photoIdx++) {
                        let photoUrl = exercise.photos[photoIdx];
                        if (photoUrl.startsWith('/uploads/')) {
                            await queryPromise(
                                'INSERT INTO protocol_exercise_photos (exercise_id, photo_url, sort_order) VALUES (?, ?, ?)',
                                [exerciseId, photoUrl, photoIdx]
                            );
                        } else if (photoUrl.startsWith('data:image')) {
                            const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, '');
                            const buffer = Buffer.from(base64Data, 'base64');
                            const filename = `exercise_${exerciseId}_${Date.now()}_${photoIdx}.jpg`;
                            const filepath = path.join(__dirname, 'uploads/exercises', filename);
                            fs.writeFileSync(filepath, buffer);
                            photoUrl = `/uploads/exercises/${filename}`;
                            await queryPromise(
                                'INSERT INTO protocol_exercise_photos (exercise_id, photo_url, sort_order) VALUES (?, ?, ?)',
                                [exerciseId, photoUrl, photoIdx]
                            );
                        }
                    }
                }
            }
        }
        
        await queryPromise('COMMIT');
        console.log(`✅ Протокол ${protocolId} сохранён`);
        res.json({ success: true });
    } catch (err) {
        await queryPromise('ROLLBACK');
        console.error('❌ Ошибка сохранения:', err);
        res.status(500).json({ error: 'Ошибка сохранения: ' + err.message });
    }
});


// ========== ИНЪЕКЦИОННЫЙ ТРЕКЕР 2.0 ==========

app.get('/api/inj2/data/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Препараты
        const drugs = await queryPromise(
            'SELECT drug_id as id, name, dose, type, note, days, date_from as dateFrom, date_to as dateTo, color, created_at as createdAt FROM inj2_drugs WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );
        // Парсим days из строки в массив
        const drugsOut = drugs.map(d => ({
            ...d,
            days: d.days ? d.days.split(',').filter(Boolean) : []
        }));

        // Записи (за последние 365 дней)
        const rows = await queryPromise(
            'SELECT record_date, drug_id, is_done FROM inj2_records WHERE user_id = ? AND record_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)',
            [userId]
        );
        // Собираем в объект { "YYYY-MM-DD": { drugId: bool } }
        const records = {};
        rows.forEach(r => {
            const key = r.record_date.toISOString ? r.record_date.toISOString().split('T')[0] : String(r.record_date).split('T')[0];
            if (!records[key]) records[key] = {};
            records[key][r.drug_id] = r.is_done === 1;
        });

        res.json({ success: true, drugs: drugsOut, records });
    } catch(e) {
        console.error('inj2 load error', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/inj2/data', async (req, res) => {
    const { userId, drugs, records } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'no userId' });

    try {
        // Сохраняем препараты
        if (drugs && drugs.length > 0) {
            // Удаляем старые и вставляем все заново
            await queryPromise('DELETE FROM inj2_drugs WHERE user_id = ?', [userId]);
            for (const d of drugs) {
                await queryPromise(
                    'INSERT INTO inj2_drugs (user_id, drug_id, name, dose, type, note, days, date_from, date_to, color, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                    [userId, d.id, d.name, d.dose, d.type||'injection', d.note||'',
                     (d.days||[]).join(','),
                     d.dateFrom||null, d.dateTo||null,
                     d.color||'#E9AE67',
                     d.createdAt ? new Date(d.createdAt) : new Date()]
                );
            }
        } else if (drugs && drugs.length === 0) {
            await queryPromise('DELETE FROM inj2_drugs WHERE user_id = ?', [userId]);
        }

        // Сохраняем записи
        if (records) {
            for (const [dateStr, drugMap] of Object.entries(records)) {
                for (const [drugId, isDone] of Object.entries(drugMap)) {
                    await queryPromise(
                        'INSERT INTO inj2_records (user_id, record_date, drug_id, is_done, updated_at) VALUES (?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE is_done=?, updated_at=NOW()',
                        [userId, dateStr, drugId, isDone?1:0, isDone?1:0]
                    );
                }
            }
        }

        res.json({ success: true });
    } catch(e) {
        console.error('inj2 save error', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== КОНЕЦ ИНЪЕКЦИОННЫЙ ТРЕКЕР 2.0 ==========

// ========== ОСТАЛЬНЫЕ API ==========

app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Введите email' });
    db.query('SELECT login, plain_password, name FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Пользователь с таким email не найден' });
        const user = results[0];
        const mailOptions = {
            from: '"В КАЧАЛКЕ" <noreply@vkach.ru>',
            to: email,
            subject: '🔑 Восстановление доступа — В КАЧАЛКЕ',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#1a1a1e;color:#f0f0f0;border-radius:16px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#E9AE67,#c4894a);padding:24px;text-align:center;">
                        <h1 style="margin:0;color:#111;font-size:22px;">💪 В КАЧАЛКЕ</h1>
                        <p style="margin:6px 0 0;color:#111;font-size:14px;">Восстановление доступа</p>
                    </div>
                    <div style="padding:28px 24px;">
                        <p style="font-size:15px;margin:0 0 20px;">Привет, <b>${user.name}</b>! Вот твои данные для входа:</p>
                        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(233,174,103,0.3);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                            <p style="margin:0 0 10px;font-size:14px;">🔑 <b>Логин:</b> <span style="color:#E9AE67;">${user.login}</span></p>
                            <p style="margin:0;font-size:14px;">🔒 <b>Пароль:</b> <span style="color:#E9AE67;">${user.plain_password}</span></p>
                        </div>
                        <p style="font-size:12px;color:#888;margin:0;">Если вы не запрашивали восстановление — просто проигнорируйте это письмо.</p>
                    </div>
                    <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
                        <a href="https://vkach.ru" style="color:#E9AE67;font-size:13px;text-decoration:none;">vkach.ru</a>
                    </div>
                </div>
            `
        };
        mailer.sendMail(mailOptions, (mailErr) => {
            if (mailErr) {
                console.error('Mail error:', mailErr);
                return res.status(500).json({ error: 'Ошибка отправки письма' });
            }
            res.json({ success: true, message: 'Данные отправлены на вашу почту' });
        });
    });
});

app.post('/api/register', async (req, res) => {
    const { login, email, password, confirmPassword, name } = req.body;
    if (!login || !email || !password || !confirmPassword || !name) return res.status(400).json({ error: 'Все поля обязательны' });
    if (!/^[a-z\-]+$/.test(login)) return res.status(400).json({ error: 'Логин: только a-z и тире' });
    if (login.length < 3) return res.status(400).json({ error: 'Логин минимум 3 символа' });
    if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Неверный email' });
    if (!/^[a-zA-Z0-9]+$/.test(password)) return res.status(400).json({ error: 'Пароль: только латинские буквы и цифры' });
    if (password.length < 4) return res.status(400).json({ error: 'Пароль минимум 4 символа' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Пароли не совпадают' });
    if (name.length < 2) return res.status(400).json({ error: 'Имя минимум 2 символа' });
    if (name.length > 15) return res.status(400).json({ error: 'Имя максимум 15 символов' });
    
    try {
        const existing = await queryPromise('SELECT id FROM users WHERE login = ? OR email = ?', [login, email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Пользователь уже существует' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await queryPromise(
            'INSERT INTO users (login, email, password, plain_password, name, user_type) VALUES (?, ?, ?, ?, ?, ?)',
            [login, email, hashedPassword, password, name, 'Спортсмен']
        );
        res.json({ success: true, userId: result.insertId, user: { id: result.insertId, login, name, email, bio: '', city: '', phone: '', website: '', discount: 10, user_type: 'Спортсмен' } });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Заполните поля' });
    db.query('SELECT * FROM users WHERE login = ?', [login], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Неверный логин или пароль' });
        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Неверный логин или пароль' });
        if (user.is_blocked) return res.status(403).json({ error: 'blocked', message: 'Ваш аккаунт заблокирован. Вы нарушили правила сообщества.' });
        res.json({ success: true, user: { id: user.id, login: user.login, name: user.name, email: user.email, bio: user.bio || '', city: user.city || '', phone: user.phone || '', website: user.website || '', avatar: user.avatar, discount: user.discount, user_type: user.user_type || 'Спортсмен' } });
    });
});

app.get('/api/user/:id', (req, res) => {
    db.query('SELECT id, login, name, email, bio, city, phone, website, avatar, discount, user_type, kachcoins, is_blocked FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json({ success: true, user: results[0] });
    });
});

app.post('/api/update-user-type', (req, res) => {
    db.query('UPDATE users SET user_type = ? WHERE id = ?', [req.body.userType, req.body.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
        res.json({ success: true });
    });
});

app.get('/api/friends/:id', (req, res) => {
    db.query('SELECT u.id, u.name, u.avatar, u.login FROM friends f JOIN users u ON f.friend_id = u.id WHERE f.user_id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, friends: results });
    });
});

app.get('/api/followers/:id', (req, res) => {
    db.query('SELECT u.id, u.name, u.avatar, u.login FROM friends f JOIN users u ON f.user_id = u.id WHERE f.friend_id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, followers: results });
    });
});

app.get('/api/news/:userId', (req, res) => {
    db.query(`SELECT n.id, n.user_id, n.type, n.message, n.created_at, n.is_read, u.name as user_name, u.login as user_login, u.avatar FROM news n JOIN users u ON n.user_id = u.id WHERE n.target_user_id = ? ORDER BY n.created_at DESC`, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, news: results });
    });
});

app.post('/api/mark-news-read', (req, res) => {
    db.query('UPDATE news SET is_read = TRUE WHERE id = ?', [req.body.newsId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true });
    });
});

app.post('/api/delete-news', (req, res) => {
    db.query('DELETE FROM news WHERE id = ?', [req.body.newsId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true });
    });
});

app.post('/api/add-news', (req, res) => {
    db.query('INSERT INTO news (user_id, target_user_id, type, message) VALUES (?, ?, ?, ?)', [req.body.userId, req.body.targetUserId, req.body.type, req.body.message || 'Подписался на вас'], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка добавления новости' });
        res.json({ success: true });
    });
});

app.get('/api/users-except-friends/:userId', (req, res) => {
    db.query(`SELECT u.id, u.name, u.login, u.avatar FROM users u WHERE u.id != ? AND u.id NOT IN (SELECT friend_id FROM friends WHERE user_id = ?)`, [req.params.userId, req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, users: results });
    });
});

app.post('/api/subscribe', (req, res) => {
    const { userId, friendId } = req.body;
    if (userId === friendId) return res.status(400).json({ error: 'Нельзя подписаться на себя' });
    db.query('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [userId, friendId], (err) => {
        if (err) return res.status(400).json({ error: 'Вы уже подписаны' });
        db.query('INSERT INTO news (user_id, target_user_id, type, message) VALUES (?, ?, ?, ?)', [userId, friendId, 'subscribe', 'Подписался на вас']);
        res.json({ success: true });
    });
});

app.post('/api/unsubscribe', (req, res) => {
    db.query('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [req.body.userId, req.body.friendId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка отписки' });
        res.json({ success: true });
    });
});

app.get('/api/is-subscribed/:userId/:friendId', (req, res) => {
    db.query('SELECT id FROM friends WHERE user_id = ? AND friend_id = ?', [req.params.userId, req.params.friendId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ subscribed: results.length > 0 });
    });
});

app.post('/api/update-email', (req, res) => {
    const { userId, email } = req.body;
    if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Неверный email' });
    db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка обновления' });
        res.json({ success: true });
    });
});

app.post('/api/update-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    if (!/^[a-zA-Z0-9]+$/.test(newPassword)) return res.status(400).json({ error: 'Пароль: только латинские буквы и цифры' });
    if (newPassword.length < 4) return res.status(400).json({ error: 'Пароль минимум 4 символа' });
    
    const results = await queryPromise('SELECT password FROM users WHERE id = ?', [userId]);
    if (results.length === 0) return res.status(500).json({ error: 'Ошибка сервера' });
    const isValid = await bcrypt.compare(oldPassword, results[0].password);
    if (!isValid) return res.status(400).json({ error: 'Неверный старый пароль' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query('UPDATE users SET password = ?, plain_password = ? WHERE id = ?', [hashedPassword, newPassword, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка обновления' });
        res.json({ success: true });
    });
});

app.post('/api/update-profile', (req, res) => {
    const { userId, name, bio, city, phone, website } = req.body;
    db.query('UPDATE users SET name = ?, bio = ?, city = ?, phone = ?, website = ? WHERE id = ?', [name, bio || '', city || '', phone || '', website || '', userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка обновления' });
        res.json({ success: true });
    });
});

// ========== API ДЛЯ СООБЩЕНИЙ ==========
app.get('/api/dialogs/:userId', (req, res) => {
    const userId = req.params.userId;
    db.query(`SELECT u.id as user_id, u.name, u.login, u.avatar, m.message as last_message, m.created_at as last_message_time, (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = u.id AND is_read = FALSE) as unread_count FROM (SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id WHEN receiver_id = ? THEN sender_id END as other_user_id FROM messages WHERE sender_id = ? OR receiver_id = ?) AS conversations JOIN users u ON u.id = conversations.other_user_id LEFT JOIN messages m ON ((m.sender_id = ? AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ?)) AND m.created_at = (SELECT MAX(created_at) FROM messages WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)) WHERE conversations.other_user_id IS NOT NULL ORDER BY m.created_at DESC`, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, dialogs: results });
    });
});

app.get('/api/messages/:userId/:otherUserId', (req, res) => {
    const { userId, otherUserId } = req.params;
    db.query(
        `SELECT m.*, r.message as reply_message, r.sender_id as reply_sender_id
         FROM messages m
         LEFT JOIN messages r ON r.id = m.reply_to_message_id
         WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at ASC`,
        [userId, otherUserId, otherUserId, userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Ошибка сервера' });
            res.json({ success: true, messages: results });
        }
    );
});

app.post('/api/send-message', (req, res) => {
    const { senderId, receiverId, message, image_url, reply_to_message_id } = req.body;
    const text = message || '';
    if (!text && !image_url) return res.status(400).json({ error: 'Пустое сообщение' });
    if (text.length > 2000) return res.status(400).json({ error: 'Сообщение не более 2000 символов' });
    const imgUrl  = image_url || null;
    const replyId = reply_to_message_id || null;
    db.query(
        'INSERT INTO messages (sender_id, receiver_id, message, is_read, created_at, image_url, reply_to_message_id) VALUES (?, ?, ?, FALSE, NOW(), ?, ?)',
        [senderId, receiverId, text, imgUrl, replyId],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Ошибка отправки', detail: err.message });
            res.json({ success: true, messageId: result.insertId });
        }
    );
});

app.post('/api/mark-messages-read', (req, res) => {
    db.query('UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE', [req.body.userId, req.body.otherUserId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true });
    });
});

app.post('/api/delete-message', (req, res) => {
    db.query('DELETE FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)', [req.body.messageId, req.body.userId, req.body.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка удаления' });
        res.json({ success: true });
    });
});

app.post('/api/delete-dialog', (req, res) => {
    db.query('DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [req.body.userId, req.body.otherUserId, req.body.otherUserId, req.body.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка удаления' });
        res.json({ success: true });
    });
});

app.get('/api/unread-count/:userId', (req, res) => {
    db.query('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE', [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, count: results[0].count });
    });
});

// Загрузка фото в чат
app.post('/api/upload-chat-image', async (req, res) => {
    try {
        const { imageData, userId } = req.body;
        if (!imageData || !userId) return res.status(400).json({ success: false, error: 'Нет данных' });

        const fs   = require('fs');
        const path = require('path');

        const semiIdx   = imageData.indexOf(';');
        const commaIdx  = imageData.indexOf(',');
        if (semiIdx < 0 || commaIdx < 0) return res.status(400).json({ success: false, error: 'Неверный формат' });

        const mimeType  = imageData.substring(5, semiIdx);
        const base64    = imageData.substring(commaIdx + 1);
        const buffer    = Buffer.from(base64, 'base64');

        if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ success: false, error: 'Файл слишком большой (макс. 10MB)' });

        const ext       = mimeType === 'image/jpeg' ? 'jpg' : (mimeType === 'image/png' ? 'png' : 'jpg');
        const filename  = 'chat_' + userId + '_' + Date.now() + '.' + ext;
        const uploadDir = path.join(__dirname, 'uploads', 'chat');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const outputPath = path.join(uploadDir, filename);

        // Сжимаем через sharp
        const sharp = require('sharp');
        await sharp(buffer)
            .rotate()
            .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(outputPath);

        res.json({ success: true, url: '/uploads/chat/' + filename });
    } catch(e) {
        console.error('chat image upload error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Краткий preview протокола по токену для чата
app.get('/api/protocol-preview/:token', async (req, res) => {
    try {
        const rows = await queryPromise(
            'SELECT id, name, created_at, updated_at FROM training_protocols WHERE share_token = ?',
            [req.params.token]
        );
        if (!rows || !rows.length) return res.json({ success: false });
        const p = rows[0];
        res.json({ success: true, name: p.name, createdAt: p.created_at, updatedAt: p.updated_at });
    } catch(e) {
        res.json({ success: false });
    }
});

app.get('/api/total-users', (req, res) => {
    db.query('SELECT COUNT(*) as total FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, total: results[0].total });
    });
});

// ========== API ДЛЯ БЛОКОВ ==========
app.get('/api/user-blocks/:userId', (req, res) => {
    db.query(
        'SELECT id, block_id, block_icon, block_title, block_description, is_visible, sort_order, is_favorite FROM user_blocks WHERE user_id = ? ORDER BY is_favorite DESC, sort_order ASC, id ASC',
        [req.params.userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Ошибка сервера' });
            res.json({ success: true, blocks: results });
        }
    );
});

// Сохранение порядка блоков
app.post('/api/user-blocks/order', (req, res) => {
    const { userId, order } = req.body;
    if (!userId || !Array.isArray(order) || order.length === 0) {
        return res.json({ success: true });
    }
    let completed = 0;
    let hasError = false;
    order.forEach((blockId, index) => {
        db.query(
            'UPDATE user_blocks SET sort_order = ? WHERE user_id = ? AND block_id = ?',
            [index, userId, blockId],
            (err) => {
                if (err) hasError = true;
                completed++;
                if (completed === order.length) {
                    res.json({ success: !hasError });
                }
            }
        );
    });
});

app.post('/api/add-user-block', (req, res) => {
    const { userId, blockId, blockIcon, blockTitle, blockDescription } = req.body;
    db.query(`INSERT INTO user_blocks (user_id, block_id, block_icon, block_title, block_description, is_visible) VALUES (?, ?, ?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE block_icon = VALUES(block_icon), block_title = VALUES(block_title), block_description = VALUES(block_description), is_visible = TRUE`, [userId, blockId, blockIcon, blockTitle, blockDescription], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка добавления блока' });
        res.json({ success: true });
    });
});

app.post('/api/remove-user-block', (req, res) => {
    db.query('DELETE FROM user_blocks WHERE user_id = ? AND block_id = ?', [req.body.userId, req.body.blockId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка удаления блока' });
        res.json({ success: true });
    });
});

app.post('/api/toggle-block-visibility', (req, res) => {
    const visibleValue = req.body.isVisible === true || req.body.isVisible === 1 || req.body.isVisible === 'true' ? 1 : 0;
    db.query('UPDATE user_blocks SET is_visible = ? WHERE user_id = ? AND block_id = ?', [visibleValue, req.body.userId, req.body.blockId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка обновления' });
        res.json({ success: true });
    });
});

// Переключение избранного блока (max 4)
app.post('/api/toggle-block-favorite', (req, res) => {
    const { userId, blockId } = req.body;
    if (!userId || !blockId) return res.status(400).json({ success: false, error: 'userId и blockId обязательны' });
    // Узнаём текущий статус
    db.query('SELECT is_favorite FROM user_blocks WHERE user_id=? AND block_id=?', [userId, blockId], (err, rows) => {
        if (err || !rows.length) return res.status(500).json({ success: false, error: 'Блок не найден' });
        const current = rows[0].is_favorite;
        if (current) {
            // Снимаем избранное
            db.query('UPDATE user_blocks SET is_favorite=0 WHERE user_id=? AND block_id=?', [userId, blockId], (err2) => {
                if (err2) return res.status(500).json({ success: false });
                res.json({ success: true, is_favorite: 0 });
            });
        } else {
            // Проверяем лимит (max 4)
            db.query('SELECT COUNT(*) AS cnt FROM user_blocks WHERE user_id=? AND is_favorite=1', [userId], (err2, rows2) => {
                if (err2) return res.status(500).json({ success: false });
                if (rows2[0].cnt >= 4) return res.json({ success: false, error: 'Максимум 4 закреплённых блока' });
                db.query('UPDATE user_blocks SET is_favorite=1 WHERE user_id=? AND block_id=?', [userId, blockId], (err3) => {
                    if (err3) return res.status(500).json({ success: false });
                    res.json({ success: true, is_favorite: 1 });
                });
            });
        }
    });
});

// ========== API ДЛЯ ПРОТОКОЛОВ (СПИСОК) ==========
app.get('/api/protocols/:userId', (req, res) => {
    db.query(`SELECT id, name, sort_order, created_at, is_public, share_token, share_mode,
        DATE_FORMAT(created_at, '%d.%m.%Y') as formatted_date 
        FROM training_protocols WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC`,
        [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        res.json({ success: true, protocols: results });
    });
});

// Просмотр протокола по share_token (без авторизации)
app.get('/api/program/share/:token', async (req, res) => {
    const { token } = req.params;
    const viewerUserId = req.query.userId || null;
    try {
        const rows = await queryPromise(
            'SELECT id, name, user_id, is_public, share_mode FROM training_protocols WHERE share_token = ?',
            [token]
        );
        if (!rows || rows.length === 0) return res.json({ success: false, error: 'not_found' });
        const protocol = rows[0];

        // Если скрыт (is_public=0) — проверяем доступ
        if (!protocol.is_public) {
            if (!viewerUserId) return res.json({ success: false, error: 'restricted' });
            // Владелец всегда видит
            if (String(viewerUserId) === String(protocol.user_id)) {
                // ok
            } else if (protocol.share_mode === 'selected') {
                const access = await queryPromise(
                    'SELECT id FROM protocol_access WHERE protocol_id = ? AND user_id = ?',
                    [protocol.id, viewerUserId]
                );
                if (!access || access.length === 0) return res.json({ success: false, error: 'restricted' });
            } else {
                return res.json({ success: false, error: 'restricted' });
            }
        }

        // Загружаем данные протокола
        const days = await queryPromise(
            'SELECT id, day_name, sort_order, comments FROM protocol_days WHERE protocol_id = ? ORDER BY sort_order ASC',
            [protocol.id]
        );
        const protocolData = { days: [] };
        for (const day of days) {
            const exercises = await queryPromise(
                'SELECT id, exercise_name, sort_order, is_collapsed FROM protocol_exercises WHERE day_id = ? ORDER BY sort_order ASC',
                [day.id]
            );
            const exWithData = [];
            for (const ex of exercises) {
                const sets     = await queryPromise('SELECT set_number, reps, weight FROM protocol_sets WHERE exercise_id = ? ORDER BY set_number ASC', [ex.id]);
                const comments = await queryPromise('SELECT comment_text FROM protocol_exercise_comments WHERE exercise_id = ? ORDER BY sort_order ASC', [ex.id]);
                const photos   = await queryPromise('SELECT photo_url FROM protocol_exercise_photos WHERE exercise_id = ? ORDER BY sort_order ASC', [ex.id]);
                exWithData.push({
                    id: ex.id, name: ex.exercise_name, isCollapsed: !!ex.is_collapsed,
                    sets: sets.map(s => ({ reps: s.reps, weight: s.weight })),
                    comments: comments.map(c => c.comment_text),
                    photos: photos.map(p => p.photo_url)
                });
            }
            protocolData.days.push({ id: day.id, name: day.day_name, comments: day.comments||'', exercises: exWithData });
        }
        res.json({ success: true, protocolName: protocol.name, ownerId: protocol.user_id, data: protocolData });
    } catch(e) {
        console.error('share view error', e);
        res.status(500).json({ success: false, error: 'server_error' });
    }
});

// Загрузка фото в чат
app.post('/api/upload-chat-image', chatImageUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'Файл не получен' });
    const tempPath    = req.file.path;
    const outputName  = 'chat_' + Date.now() + '.jpg';
    const outputPath  = path.join(__dirname, 'uploads/chat', outputName);
    try {
        let img = sharp(tempPath);
        const meta = await img.metadata();
        let w = meta.width || 1280, h = meta.height || 1280;
        if (w > 1280 || h > 1280) {
            const ratio = Math.min(1280/w, 1280/h);
            w = Math.round(w*ratio); h = Math.round(h*ratio);
        }
        await img.resize(w, h, { fit: 'inside', withoutEnlargement: true })
                 .jpeg({ quality: 75 })
                 .toFile(outputPath);
        require('fs').unlinkSync(tempPath);
        res.json({ success: true, url: '/uploads/chat/' + outputName });
    } catch(e) {
        try { require('fs').unlinkSync(tempPath); } catch(_) {}
        res.status(500).json({ success: false, error: e.message });
    }
});

// Превью протокола по токену (для карточки в чате)
app.get('/api/protocol-preview/:token', async (req, res) => {
    try {
        const rows = await queryPromise(
            'SELECT name, created_at, updated_at FROM training_protocols WHERE share_token = ?',
            [req.params.token]
        );
        if (!rows || !rows.length) return res.json({ success: false });
        const p = rows[0];
        res.json({ success: true, name: p.name, date: p.updated_at || p.created_at });
    } catch(e) {
        res.json({ success: false });
    }
});

// Показать/скрыть протокол
app.post('/api/protocols/visibility', async (req, res) => {
    const { userId, protocolId, isPublic, shareMode } = req.body;
    try {
        await queryPromise(
            'UPDATE training_protocols SET is_public=?, share_mode=? WHERE id=? AND user_id=?',
            [isPublic ? 1 : 0, shareMode || 'all', protocolId, userId]
        );
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// Генерировать токен если нет
app.post('/api/protocols/ensure-token', async (req, res) => {
    const { userId, protocolId } = req.body;
    try {
        const rows = await queryPromise('SELECT share_token FROM training_protocols WHERE id=? AND user_id=?', [protocolId, userId]);
        if (!rows || rows.length === 0) return res.status(403).json({ success: false });
        let token = rows[0].share_token;
        if (!token) {
            token = require('crypto').randomBytes(24).toString('hex');
            await queryPromise('UPDATE training_protocols SET share_token=? WHERE id=? AND user_id=?', [token, protocolId, userId]);
        }
        res.json({ success: true, token });
    } catch(e) { res.status(500).json({ success: false }); }
});

// Управление доступом конкретных пользователей
app.post('/api/protocols/access', async (req, res) => {
    const { userId, protocolId, targetUserId, action } = req.body; // action: 'add'|'remove'
    try {
        // Проверяем владельца
        const rows = await queryPromise('SELECT id FROM training_protocols WHERE id=? AND user_id=?', [protocolId, userId]);
        if (!rows || rows.length === 0) return res.status(403).json({ success: false });
        if (action === 'add') {
            await queryPromise('INSERT IGNORE INTO protocol_access (protocol_id, user_id) VALUES (?,?)', [protocolId, targetUserId]);
        } else {
            await queryPromise('DELETE FROM protocol_access WHERE protocol_id=? AND user_id=?', [protocolId, targetUserId]);
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// Список пользователей с доступом
app.get('/api/protocols/access/:protocolId', async (req, res) => {
    const { protocolId } = req.params;
    const userId = req.query.userId;
    try {
        const rows = await queryPromise(
            `SELECT pa.user_id, u.name, u.login, u.avatar_url 
             FROM protocol_access pa 
             JOIN users u ON u.id = pa.user_id
             WHERE pa.protocol_id = ?`,
            [protocolId]
        );
        res.json({ success: true, users: rows });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/protocols/add', (req, res) => {
    const { userId, name, order } = req.body;
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Название от 2 до 100 символов' });
    db.query('INSERT INTO training_protocols (user_id, name, sort_order, created_at) VALUES (?, ?, ?, NOW())', [userId, name, order || 0], (err, result) => {
        if (err) return res.status(500).json({ error: 'Ошибка добавления' });
        res.json({ success: true, protocolId: result.insertId });
    });
});

app.post('/api/protocols/update', (req, res) => {
    const { userId, protocolId, name } = req.body;
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Название от 2 до 100 символов' });
    db.query('UPDATE training_protocols SET name = ? WHERE id = ? AND user_id = ?', [name, protocolId, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка обновления' });
        res.json({ success: true });
    });
});

app.post('/api/protocols/delete', (req, res) => {
    db.query('DELETE FROM training_protocols WHERE id = ? AND user_id = ?', [req.body.protocolId, req.body.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка удаления' });
        res.json({ success: true });
    });
});

app.post('/api/protocols/order', (req, res) => {
    const { userId, orders } = req.body;
    let completed = 0;
    let hasError = false;
    orders.forEach(order => {
        db.query('UPDATE training_protocols SET sort_order = ? WHERE id = ? AND user_id = ?', [order.order, order.id, userId], (err) => {
            if (err) hasError = true;
            completed++;
            if (completed === orders.length) res.json({ success: !hasError });
        });
    });
});

// ========== API ДЛЯ ИНЪЕКЦИОННОГО ТРЕКЕРА ==========

// Сохранение протокола
app.post('/api/injection/protocol', async (req, res) => {
    const { userId, protocol } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId обязателен' });
    }
    
    try {
        await queryPromise(
            'INSERT INTO injection_protocols (user_id, protocol_text, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE protocol_text = ?, updated_at = NOW()',
            [userId, protocol || '', protocol || '']
        );
        console.log(`✅ Сохранён протокол для user ${userId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка сохранения протокола:', err);
        res.status(500).json({ error: err.message });
    }
});

// Загрузка протокола
app.get('/api/injection/protocol/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const rows = await queryPromise(
            'SELECT protocol_text FROM injection_protocols WHERE user_id = ?',
            [userId]
        );
        const protocol = rows.length > 0 ? rows[0].protocol_text || '' : '';
        res.json({ success: true, protocol });
    } catch (err) {
        console.error('❌ Ошибка загрузки протокола:', err);
        res.status(500).json({ error: err.message });
    }
});

// Сохранение истории уколов
app.post('/api/injection/save', async (req, res) => {
    const { userId, history } = req.body;
    
    console.log('📝 POST /api/injection/save', { userId, historyCount: history?.length });
    
    if (!userId) {
        return res.status(400).json({ error: 'userId обязателен' });
    }
    
    try {
        await queryPromise('DELETE FROM injection_logs WHERE user_id = ?', [userId]);
        
        if (history && history.length > 0) {
            for (const item of history) {
                let injectionDate = item.date;
                if (injectionDate && injectionDate.includes('.')) {
                    const parts = injectionDate.split('.');
                    if (parts.length === 3) {
                        injectionDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }
                
                let createdAt = item.timestamp || new Date().toISOString();
                createdAt = createdAt.replace('T', ' ').replace('Z', '').substring(0, 19);
                
                await queryPromise(
                    'INSERT INTO injection_logs (user_id, injection_date, med_name, dosage, is_done, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, injectionDate, item.medName, item.dosage || '', item.done ? 1 : 0, createdAt]
                );
            }
            console.log(`✅ Сохранено ${history.length} записей для user ${userId}`);
        } else {
            console.log(`ℹ️ История пуста, удалено всё для user ${userId}`);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка сохранения:', err);
        res.status(500).json({ error: err.message });
    }
});

// Загрузка истории уколов
app.get('/api/injection/history/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    console.log('📥 GET /api/injection/history/', userId);
    
    try {
        const rows = await queryPromise(
            'SELECT id, injection_date as date, med_name as medName, dosage, is_done as done, created_at as timestamp FROM injection_logs WHERE user_id = ? ORDER BY injection_date DESC',
            [userId]
        );
        
        const history = rows.map(row => ({
            id: row.id,
            date: row.date ? (row.date.toISOString ? row.date.toISOString().split('T')[0] : row.date) : '',
            medName: row.medName,
            dosage: row.dosage || '',
            done: row.done === 1,
            timestamp: row.timestamp
        }));
        
        console.log(`✅ Загружено ${history.length} записей для user ${userId}`);
        res.json({ success: true, history });
    } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
        res.status(500).json({ error: err.message });
    }
});

// Сохранение состояния
app.post('/api/injection/today-state', async (req, res) => {
    const { userId, todayState, date } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId обязателен' });
    }
    
    const stateDate = date || new Date().toISOString().split('T')[0];
    
    try {
        await queryPromise(
            'INSERT INTO injection_today_state (user_id, state_date, state_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE state_json = ?',
            [userId, stateDate, JSON.stringify(todayState || {}), JSON.stringify(todayState || {})]
        );
        console.log(`✅ Сохранено состояние для user ${userId}, date ${stateDate}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка сохранения состояния:', err);
        res.status(500).json({ error: err.message });
    }
});

// Загрузка состояния
app.get('/api/injection/today-state/:userId', async (req, res) => {
    const userId = req.params.userId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    try {
        const rows = await queryPromise(
            'SELECT state_json FROM injection_today_state WHERE user_id = ? AND state_date = ?',
            [userId, date]
        );
        const todayState = rows.length > 0 ? JSON.parse(rows[0].state_json || '{}') : {};
        res.json({ success: true, todayState });
    } catch (err) {
        console.error('❌ Ошибка загрузки состояния:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/user/:id', (req, res) => {
    res.sendFile(__dirname + '/user.html');
});

// ========== PLANNER API ==========
// Вставить в server.js после существующих эндпоинтов

// --- ТИПЫ СОБЫТИЙ ---

app.get('/api/planner/types/:userId', (req, res) => {
    const uid = req.params.userId;
    db.query(
        `SELECT * FROM planner_event_types
         WHERE user_id = 0 OR user_id = ?
         ORDER BY is_default DESC, sort_order ASC, id ASC`,
        [uid], (err, rows) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, types: rows });
        }
    );
});

app.post('/api/planner/types', (req, res) => {
    const { userId, name, color } = req.body;
    if (!userId || !name) return res.status(400).json({ success: false });
    db.query(
        'SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM planner_event_types WHERE user_id=?',
        [userId], (err, rows) => {
            const next = rows?.[0]?.next || 1;
            db.query(
                'INSERT INTO planner_event_types (user_id,name,color,sort_order) VALUES (?,?,?,?)',
                [userId, name, color||'#E9AE67', next],
                (err2, result) => {
                    if (err2) return res.status(500).json({ success: false });
                    res.json({ success: true, id: result.insertId });
                }
            );
        }
    );
});

app.put('/api/planner/types/:id', (req, res) => {
    const { userId, name, color, sort_order } = req.body;
    db.query(
        'UPDATE planner_event_types SET name=COALESCE(?,name), color=COALESCE(?,color), sort_order=COALESCE(?,sort_order) WHERE id=? AND user_id=?',
        [name||null, color||null, sort_order!=null?sort_order:null, req.params.id, userId],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

app.delete('/api/planner/types/:id', (req, res) => {
    const { userId } = req.body;
    db.query('DELETE FROM planner_event_types WHERE id=? AND user_id=? AND is_default=0',
        [req.params.id, userId],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

// --- СОБЫТИЯ ---

app.get('/api/planner/events', (req, res) => {
    const { userId, dateFrom, dateTo } = req.query;
    if (!userId) return res.status(400).json({ success: false });
    let sql = `SELECT e.*, t.name AS type_name, t.color AS type_color
               FROM planner_events e
               LEFT JOIN planner_event_types t ON t.id = e.type_id
               WHERE e.user_id = ?`;
    const params = [userId];
    if (dateFrom) { sql += ' AND e.date_start >= ?'; params.push(dateFrom); }
    if (dateTo)   { sql += ' AND e.date_start <= ?'; params.push(dateTo); }
    sql += ' ORDER BY e.date_start ASC, e.time_val ASC';
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, events: rows });
    });
});

app.post('/api/planner/events', (req, res) => {
    const { userId, typeId, title, note, color, dateStart, dateEnd, timeVal, isDone } = req.body;
    if (!userId || !title || !dateStart) return res.status(400).json({ success: false });
    db.query(
        'INSERT INTO planner_events (user_id,type_id,title,note,color,date_start,date_end,time_val,is_done) VALUES (?,?,?,?,?,?,?,?,?)',
        [userId, typeId||null, title, note||null, color||'#E9AE67', dateStart, dateEnd||null, timeVal||null, isDone?1:0],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.put('/api/planner/events/:id', (req, res) => {
    const { userId, typeId, title, note, color, dateStart, dateEnd, timeVal, isDone } = req.body;
    if (!userId) return res.status(400).json({ success: false });
    db.query(
        `UPDATE planner_events SET
            type_id=?, title=COALESCE(?,title), note=?, color=COALESCE(?,color),
            date_start=COALESCE(?,date_start), date_end=?, time_val=?,
            is_done=COALESCE(?,is_done)
         WHERE id=? AND user_id=?`,
        [typeId||null, title||null, note||null, color||null,
         dateStart||null, dateEnd||null, timeVal||null,
         isDone!=null?isDone:null, req.params.id, userId],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

app.delete('/api/planner/events/:id', (req, res) => {
    const { userId } = req.body;
    db.query('DELETE FROM planner_events WHERE id=? AND user_id=?',
        [req.params.id, userId],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

app.get('/api/planner/search', (req, res) => {
    const { userId, q, types } = req.query;
    if (!userId) return res.status(400).json({ success: false });
    let sql = `SELECT e.*, t.name AS type_name, t.color AS type_color
               FROM planner_events e
               LEFT JOIN planner_event_types t ON t.id = e.type_id
               WHERE e.user_id = ?`;
    const params = [userId];
    if (q) {
        sql += ' AND (e.title LIKE ? OR e.note LIKE ? OR t.name LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like);
    }
    if (types) {
        const arr = types.split(',').map(Number).filter(Boolean);
        if (arr.length) { sql += ` AND e.type_id IN (${arr.map(()=>'?').join(',')})`; params.push(...arr); }
    }
    sql += ' ORDER BY e.date_start DESC, e.time_val ASC LIMIT 100';
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, events: rows });
    });
});

// ===== ЦЕНТР УПРАВЛЕНИЯ — API =====

// ===== КАТЕГОРИИ =====

app.get('/api/admin/categories', adminOnly, (req, res) => {
    db.query('SELECT * FROM block_categories ORDER BY sort_order ASC, id ASC', (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, categories: rows });
    });
});

// Публичный — для галереи
app.get('/api/blocks/categories', (req, res) => {
    db.query('SELECT * FROM block_categories WHERE active=1 ORDER BY sort_order ASC', (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, categories: rows });
    });
});

app.post('/api/admin/categories', adminOnly, (req, res) => {
    const { name, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ success: false });
    db.query('INSERT INTO block_categories (name,icon,sort_order) VALUES (?,?,?)',
        [name, icon||'📦', sort_order||0],
        (err, result) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.put('/api/admin/categories/:id', adminOnly, (req, res) => {
    const { name, icon, sort_order, active } = req.body;
    db.query('UPDATE block_categories SET name=COALESCE(?,name), icon=COALESCE(?,icon), sort_order=COALESCE(?,sort_order), active=COALESCE(?,active) WHERE id=?',
        [name||null, icon||null, sort_order!=null?sort_order:null, active!=null?active:null, req.params.id],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

app.delete('/api/admin/categories/:id', adminOnly, (req, res) => {
    db.query('DELETE FROM block_categories WHERE id=?', [req.params.id],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

// ===== БЛОКИ (КАТАЛОГ) =====

app.get('/api/admin/blocks', adminOnly, (req, res) => {
    db.query(`SELECT b.*, c.name AS category_name, c.icon AS category_icon
              FROM blocks b LEFT JOIN block_categories c ON c.id=b.category_id
              ORDER BY b.sort_order ASC, b.id ASC`,
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, blocks: rows });
        }
    );
});

// Публичный — для галереи
app.get('/api/blocks/catalog', (req, res) => {
    const { category, search } = req.query;
    let sql = `SELECT b.*, c.name AS category_name, c.icon AS category_icon
               FROM blocks b LEFT JOIN block_categories c ON c.id=b.category_id
               WHERE b.is_hidden=0`;
    const params = [];
    if (category) { sql += ' AND b.category_id=?'; params.push(category); }
    if (search) {
        sql += ' AND (b.name LIKE ? OR b.description LIKE ? OR c.name LIKE ?)';
        const like = `%${search}%`;
        params.push(like, like, like);
    }
    sql += ' ORDER BY b.is_featured DESC, b.sort_order ASC';
    db.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, blocks: rows });
    });
});

app.post('/api/admin/blocks', adminOnly, (req, res) => {
    const { block_id, name, description, full_description, features, version, whats_new, screenshots,
            icon, category_id, launch_url, sort_order, is_popular, is_new, is_featured, is_hidden } = req.body;
    if (!block_id || !name || !launch_url) return res.status(400).json({ success: false, error: 'block_id, name, launch_url обязательны' });
    db.query(
        `INSERT INTO blocks
            (block_id,name,description,full_description,features,version,whats_new,screenshots,
             icon,category_id,launch_url,sort_order,is_popular,is_new,is_featured,is_hidden,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [block_id, name, description||null,
         full_description||null,
         features ? JSON.stringify(features) : null,
         version||null, whats_new||null,
         screenshots ? JSON.stringify(screenshots) : null,
         icon||'📦', category_id||null, launch_url, sort_order||0,
         is_popular?1:0, is_new?1:0, is_featured?1:0, is_hidden?1:0],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.put('/api/admin/blocks/:id', adminOnly, (req, res) => {
    const body = req.body;
    // Динамически строим UPDATE только из переданных полей
    const updates = [];
    const vals = [];

    const simple = ['name','description','launch_url'];
    simple.forEach(f => { if (body[f] != null) { updates.push(`${f}=?`); vals.push(body[f]||null); } });
    // icon обрабатываем отдельно — пустая строка тоже сохраняется как NULL
    if ('icon' in body) { updates.push('icon=?'); vals.push(body.icon || null); }

    // Новые текстовые поля — обновляем даже если пустая строка (чтобы очистить)
    const newFields = ['full_description','version','whats_new'];
    newFields.forEach(f => { if (f in body) { updates.push(`${f}=?`); vals.push(body[f]||null); } });

    // JSON поля
    if ('features' in body) { updates.push('features=?'); vals.push(body.features ? JSON.stringify(body.features) : null); }
    if ('screenshots' in body) { updates.push('screenshots=?'); vals.push(body.screenshots ? JSON.stringify(body.screenshots) : null); }

    // Числовые/булевые поля
    if (body.category_id !== undefined) { updates.push('category_id=?'); vals.push(body.category_id||null); }
    if (body.sort_order != null) { updates.push('sort_order=?'); vals.push(body.sort_order); }
    if (body.is_popular != null) { updates.push('is_popular=?'); vals.push(body.is_popular?1:0); }
    if (body.is_new != null) { updates.push('is_new=?'); vals.push(body.is_new?1:0); }
    if (body.is_featured != null) { updates.push('is_featured=?'); vals.push(body.is_featured?1:0); }
    if (body.is_hidden != null) { updates.push('is_hidden=?'); vals.push(body.is_hidden?1:0); }

    updates.push('updated_at=NOW()');
    vals.push(req.params.id);

    if (updates.length <= 1) return res.json({ success: true }); // только updated_at

    db.query(`UPDATE blocks SET ${updates.join(',')} WHERE id=?`, vals, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        // Синхронизация user_blocks
        const { name, description, icon } = body;
        if (name || description || icon) {
            db.query('SELECT block_id FROM blocks WHERE id=?', [req.params.id], (err2, rows) => {
                if (!err2 && rows.length) {
                    const blockId = rows[0].block_id;
                    const ubUpdates = [], ubVals = [];
                    if (name)        { ubUpdates.push('block_title=?');       ubVals.push(name); }
                    if (description) { ubUpdates.push('block_description=?'); ubVals.push(description); }
                    if (icon)        { ubUpdates.push('block_icon=?');        ubVals.push(icon); }
                    if (ubUpdates.length) {
                        ubVals.push(blockId);
                        db.query(`UPDATE user_blocks SET ${ubUpdates.join(',')} WHERE block_id=?`, ubVals, ()=>{});
                    }
                }
            });
        }
        res.json({ success: true });
    });
});

app.delete('/api/admin/blocks/:id', adminOnly, (req, res) => {
    db.query('DELETE FROM blocks WHERE id=?', [req.params.id],
        (err) => { if (err) return res.status(500).json({ success: false }); res.json({ success: true }); }
    );
});

// Счётчик запусков
app.post('/api/blocks/launch', (req, res) => {
    const { blockId } = req.body;
    if (!blockId) return res.status(400).json({ success: false });
    db.query('UPDATE blocks SET launch_count=launch_count+1 WHERE block_id=?', [blockId],
        () => res.json({ success: true })
    );
});

// Загрузка скриншота блока
app.post('/api/admin/blocks/:id/screenshot', adminOnly, (req, res) => {
    const blockId = req.params.id;
    const { screenshotUrl } = req.body;
    if (!screenshotUrl) return res.status(400).json({ success: false, error: 'screenshotUrl обязателен' });

    // Если base64 — сохраняем как файл на диск
    if (screenshotUrl.startsWith('data:image')) {
        const fs = require('fs');
        const path = require('path');
        const matches = screenshotUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ success: false, error: 'Неверный формат изображения' });
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `screenshot_${blockId}_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, 'img', 'screenshots');
        // Создаём папку если нет
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filepath = path.join(uploadDir, filename);
        fs.writeFile(filepath, buffer, (err) => {
            if (err) return res.status(500).json({ success: false, error: 'Ошибка сохранения файла: ' + err.message });
            const fileUrl = '/img/screenshots/' + filename;
            saveScreenshotUrl(blockId, fileUrl, res);
        });
    } else {
        // Внешний URL — сохраняем как есть
        saveScreenshotUrl(blockId, screenshotUrl, res);
    }
});

// Загрузка иконки блока
app.post('/api/admin/blocks/:id/icon', adminOnly, (req, res) => {
    const blockId = req.params.id;
    const { iconData } = req.body;
    if (!iconData) return res.status(400).json({ success: false, error: 'iconData обязателен' });

    const fs = require('fs');
    const path = require('path');

    if (iconData.startsWith('data:image')) {
        const semiIdx = iconData.indexOf(';');
        const commaIdx = iconData.indexOf(',');
        if (semiIdx === -1 || commaIdx === -1) return res.status(400).json({ success: false, error: 'Неверный формат' });
        const mimeType = iconData.substring(5, semiIdx);
        const base64Data = iconData.substring(commaIdx + 1);
        let ext = mimeType === 'image/jpeg' ? 'jpg' : (mimeType === 'image/svg+xml' ? 'svg' : (mimeType.split('/')[1] || 'png'));
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `icon_${blockId}_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, 'img', 'icons');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filepath = path.join(uploadDir, filename);
        fs.writeFile(filepath, buffer, (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const iconUrl = '/img/icons/' + filename;
            db.query('UPDATE blocks SET icon=?, updated_at=NOW() WHERE id=?', [iconUrl, blockId], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });
                // Синхронизируем user_blocks
                db.query('SELECT block_id FROM blocks WHERE id=?', [blockId], (e, rows) => {
                    if (!e && rows.length) {
                        db.query('UPDATE user_blocks SET block_icon=? WHERE block_id=?', [iconUrl, rows[0].block_id], ()=>{});
                    }
                });
                res.json({ success: true, icon: iconUrl });
            });
        });
    } else {
        // Внешний URL
        db.query('UPDATE blocks SET icon=?, updated_at=NOW() WHERE id=?', [iconData, blockId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, icon: iconData });
        });
    }
});

function saveScreenshotUrl(blockId, url, res) {
    db.query('SELECT screenshots FROM blocks WHERE id=?', [blockId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: 'DB error: ' + err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Блок не найден' });
        let screenshots = [];
        try { screenshots = JSON.parse(rows[0].screenshots || '[]'); } catch(e) {}
        if (screenshots.length >= 5) return res.json({ success: false, error: 'Максимум 5 скриншотов' });
        screenshots.push(url);
        db.query('UPDATE blocks SET screenshots=?, updated_at=NOW() WHERE id=?',
            [JSON.stringify(screenshots), blockId],
            (err2) => {
                if (err2) return res.status(500).json({ success: false, error: 'DB update error: ' + err2.message });
                res.json({ success: true, screenshots });
            }
        );
    });
}

// Удаление скриншота блока
app.delete('/api/admin/blocks/:id/screenshot', adminOnly, (req, res) => {
    const blockId = req.params.id;
    const { index } = req.body;
    if (index == null) return res.status(400).json({ success: false });
    db.query('SELECT screenshots FROM blocks WHERE id=?', [blockId], (err, rows) => {
        if (err || !rows.length) return res.status(500).json({ success: false });
        let screenshots = [];
        try { screenshots = JSON.parse(rows[0].screenshots || '[]'); } catch(e) {}
        screenshots.splice(index, 1);
        db.query('UPDATE blocks SET screenshots=?, updated_at=NOW() WHERE id=?',
            [JSON.stringify(screenshots), blockId],
            (err2) => {
                if (err2) return res.status(500).json({ success: false });
                res.json({ success: true, screenshots });
            }
        );
    });
});

// Статистика
// Статистика пользователей
// old user-stats removed

app.get('/api/admin/stats', adminOnly, (req, res) => {
    db.query(`SELECT b.id, b.block_id, b.name, b.icon, b.is_popular, b.is_new, b.is_featured, b.is_hidden,
        b.install_count, b.launch_count, b.version, b.updated_at,
        (SELECT COUNT(*) FROM user_blocks ub WHERE ub.block_id COLLATE utf8mb4_unicode_ci = b.block_id COLLATE utf8mb4_unicode_ci) AS real_installs
        FROM blocks b ORDER BY real_installs DESC`,
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, stats: rows });
        }
    );
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущен на 0.0.0.0:${PORT}`);
});
// ========== РАМКИ АВАТАРА ==========

// Получить каталог рамок + купленные пользователем
app.get('/api/frames/:userId', (req, res) => {
    const userId = req.params.userId;
    db.query(`
        SELECT f.id, f.frame_id, f.name, f.price, f.img, f.category, f.sort_order, f.is_active,
            CASE WHEN uf.frame_id IS NOT NULL THEN 1 ELSE 0 END as owned,
            u.avatar_frame as active_frame,
            u.kachcoins
        FROM avatar_frames f
        LEFT JOIN user_frames uf ON uf.frame_id = f.frame_id AND uf.user_id = ?
        LEFT JOIN users u ON u.id = ?
        WHERE f.is_active = 1
        ORDER BY f.sort_order ASC
    `, [userId, userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, frames: rows, kachcoins: rows[0]?.kachcoins || 0, active: rows[0]?.active_frame || 'default' });
    });
});

// Купить рамку
app.post('/api/frames/buy', (req, res) => {
    const { userId, frameId } = req.body;
    if (!userId || !frameId) return res.status(400).json({ success: false, error: 'Нет данных' });

    db.query('SELECT price FROM avatar_frames WHERE frame_id = ?', [frameId], (err, frames) => {
        if (err || !frames.length) return res.status(404).json({ success: false, error: 'Рамка не найдена' });
        const price = frames[0].price;

        db.query('SELECT kachcoins FROM users WHERE id = ?', [userId], (err, users) => {
            if (err || !users.length) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
            const coins = users[0].kachcoins;

            if (coins < price) return res.status(400).json({ success: false, error: 'Недостаточно Качкоинов' });

            db.query('INSERT IGNORE INTO user_frames (user_id, frame_id) VALUES (?, ?)', [userId, frameId], (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });

                db.query('UPDATE users SET kachcoins = kachcoins - ? WHERE id = ?', [price, userId], (err) => {
                    if (err) return res.status(500).json({ success: false, error: err.message });
                    res.json({ success: true, newBalance: coins - price });
                });
            });
        });
    });
});

// Активировать рамку
app.post('/api/frames/activate', (req, res) => {
    const { userId, frameId } = req.body;
    if (!userId || !frameId) return res.status(400).json({ success: false, error: 'Нет данных' });

    // Проверяем что рамка куплена
    db.query('SELECT id FROM user_frames WHERE user_id = ? AND frame_id = ?', [userId, frameId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(403).json({ success: false, error: 'Рамка не куплена' });

        db.query('UPDATE users SET avatar_frame = ? WHERE id = ?', [frameId, userId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true });
        });
    });
});


// ========== АДМИНКА: УПРАВЛЕНИЕ РАМКАМИ ==========

// Получить все рамки
app.get('/api/admin/frames', adminOnly, (req, res) => {
    db.query(`
        SELECT f.*, 
            (SELECT COUNT(*) FROM user_frames uf WHERE uf.frame_id = f.frame_id) as bought_count
        FROM avatar_frames f
        ORDER BY f.sort_order ASC
    `, (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, frames: rows });
    });
});

// Добавить рамку
app.post('/api/admin/frames', adminOnly, (req, res) => {
    const { frame_id, name, price, img, category, sort_order, is_active } = req.body;
    if (!frame_id || !name) return res.status(400).json({ success: false, error: 'Нет данных' });
    db.query(
        'INSERT INTO avatar_frames (frame_id, name, price, img, category, sort_order, is_active) VALUES (?,?,?,?,?,?,?)',
        [frame_id, name, price||0, img||null, category||'standard', sort_order||1, is_active!==undefined?is_active:1],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, id: result.insertId });
        }
    );
});

// Обновить рамку
app.put('/api/admin/frames/:id', adminOnly, (req, res) => {
    const { frame_id, name, price, img, category, sort_order, is_active } = req.body;
    const fields = [];
    const vals = [];
    if (frame_id !== undefined) { fields.push('frame_id=?'); vals.push(frame_id); }
    if (name !== undefined)     { fields.push('name=?'); vals.push(name); }
    if (price !== undefined)    { fields.push('price=?'); vals.push(price); }
    if (img !== undefined)      { fields.push('img=?'); vals.push(img); }
    if (category !== undefined) { fields.push('category=?'); vals.push(category); }
    if (sort_order !== undefined){ fields.push('sort_order=?'); vals.push(sort_order); }
    if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active); }
    if (!fields.length) return res.status(400).json({ success: false, error: 'Нет данных' });
    vals.push(req.params.id);
    db.query(`UPDATE avatar_frames SET ${fields.join(',')} WHERE id=?`, vals, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// Удалить рамку
app.delete('/api/admin/frames/:id', adminOnly, (req, res) => {
    db.query('DELETE FROM avatar_frames WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});


// Загрузка PNG рамки
app.post('/api/admin/frames/upload', (req, res) => {
    const uploadDir = path.join(__dirname, 'img', 'frames');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            const frameId = req.body.frameId || ('frame_' + Date.now());
            cb(null, frameId + '.png');
        }
    });
    const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single('file');

    upload(req, res, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        // Проверяем userId после multer (он теперь в req.body)
        const userId = req.body.userId;
        if (String(userId) !== '1' && String(userId) !== '5') return res.status(403).json({ success: false, error: 'Forbidden' });
        if (!req.file) return res.status(400).json({ success: false, error: 'Файл не получен' });
        const imgPath = `/img/frames/${req.file.filename}`;
        res.json({ success: true, path: imgPath });
    });
});


// ========== СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ ==========
app.get('/api/admin/user-stats', adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 30;
        const offset = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : '';

        const [totalRow] = await queryPromise('SELECT COUNT(*) as cnt FROM users');

        let countSql = 'SELECT COUNT(*) as cnt FROM users';
        let usersSql = 'SELECT id, login, name, bio, kachcoins, avatar_frame, is_blocked FROM users';
        const params = [];

        if (search) {
            const isNum = /^\d+$/.test(search);
            if (isNum) {
                const where = ' WHERE id = ?';
                countSql += where;
                usersSql += where;
                params.push(parseInt(search));
            } else {
                const where = ' WHERE login LIKE ? OR name LIKE ?';
                countSql += where;
                usersSql += where;
                params.push(`%${search}%`, `%${search}%`);
            }
        }

        usersSql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
        const [filteredRow] = await queryPromise(countSql, params);
        const users = await queryPromise(usersSql, [...params, limit, offset]);

        res.json({
            success: true,
            totalUsers: totalRow.cnt,
            filteredTotal: filteredRow.cnt,
            page,
            totalPages: Math.ceil(filteredRow.cnt / limit),
            users
        });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Редактировать пользователя (имя, качкоины, bio)
app.put('/api/admin/users/:id', adminOnly, async (req, res) => {
    const { name, kachcoins, bio } = req.body;
    const fields = [], vals = [];
    if (name !== undefined)      { fields.push('name=?');      vals.push(name); }
    if (kachcoins !== undefined) { fields.push('kachcoins=?'); vals.push(parseInt(kachcoins)||0); }
    if (bio !== undefined)       { fields.push('bio=?');       vals.push(bio); }
    if (!fields.length) return res.status(400).json({ success: false, error: 'Нет данных' });
    vals.push(req.params.id);
    try {
        await queryPromise(`UPDATE users SET ${fields.join(',')} WHERE id=?`, vals);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== ЕЖЕДНЕВНЫЙ БОНУС ==========

// Создаём таблицу если нет
db.query(`CREATE TABLE IF NOT EXISTS daily_bonus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    streak INT NOT NULL DEFAULT 0,
    last_claim DATETIME DEFAULT NULL,
    day_in_cycle INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, (err) => {
    if (err) console.error('Ошибка создания таблицы daily_bonus:', err.message);
});

const DAILY_REWARDS = [50, 50, 50, 50, 50, 50, 500];

// Получить статус бонуса
app.get('/api/daily-bonus/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const rows = await queryPromise('SELECT * FROM daily_bonus WHERE user_id=?', [userId]);
        const userRows = await queryPromise('SELECT kachcoins FROM users WHERE id=?', [userId]);
        const kachcoins = userRows[0]?.kachcoins || 0;

        // Московское время
        const nowMSK = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const todayMSK = new Date(Date.UTC(nowMSK.getUTCFullYear(), nowMSK.getUTCMonth(), nowMSK.getUTCDate()));

        if (rows.length === 0) {
            // Новый пользователь — бонус доступен
            return res.json({
                success: true,
                kachcoins,
                streak: 0,
                dayInCycle: 0,
                canClaim: true,
                nextClaimAt: null,
                rewards: DAILY_REWARDS
            });
        }

        const bonus = rows[0];
        const lastClaim = bonus.last_claim ? new Date(bonus.last_claim) : null;

        let canClaim = true;
        let nextClaimAt = null;
        let dayInCycle = bonus.day_in_cycle;
        let streak = bonus.streak;

        if (lastClaim) {
            // Приводим last_claim к МСК
            const lastMSK = new Date(lastClaim.getTime() + 3 * 60 * 60 * 1000);
            const lastDayMSK = new Date(Date.UTC(lastMSK.getUTCFullYear(), lastMSK.getUTCMonth(), lastMSK.getUTCDate()));
            const diffDays = Math.floor((todayMSK - lastDayMSK) / (24 * 60 * 60 * 1000));

            if (diffDays === 0) {
                // Уже забирал сегодня
                canClaim = false;
                // Следующий клейм — завтра в 00:00 МСК
                const tomorrowMSK = new Date(todayMSK.getTime() + 24 * 60 * 60 * 1000);
                nextClaimAt = new Date(tomorrowMSK.getTime() - 3 * 60 * 60 * 1000).toISOString();
            } else if (diffDays > 1) {
                // Пропустил — серия сбрасывается
                streak = 0;
                dayInCycle = 0;
            }
        }

        res.json({
            success: true,
            kachcoins,
            streak,
            dayInCycle,
            canClaim,
            nextClaimAt,
            rewards: DAILY_REWARDS
        });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Забрать бонус
app.post('/api/daily-bonus/claim/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const rows = await queryPromise('SELECT * FROM daily_bonus WHERE user_id=?', [userId]);
        const nowMSK = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const todayMSK = new Date(Date.UTC(nowMSK.getUTCFullYear(), nowMSK.getUTCMonth(), nowMSK.getUTCDate()));
        const nowUTC = new Date();

        let dayInCycle = 0;
        let streak = 0;

        if (rows.length > 0) {
            const bonus = rows[0];
            const lastClaim = bonus.last_claim ? new Date(bonus.last_claim) : null;

            if (lastClaim) {
                const lastMSK = new Date(lastClaim.getTime() + 3 * 60 * 60 * 1000);
                const lastDayMSK = new Date(Date.UTC(lastMSK.getUTCFullYear(), lastMSK.getUTCMonth(), lastMSK.getUTCDate()));
                const diffDays = Math.floor((todayMSK - lastDayMSK) / (24 * 60 * 60 * 1000));

                if (diffDays === 0) {
                    return res.status(400).json({ success: false, error: 'Бонус уже получен сегодня' });
                } else if (diffDays === 1) {
                    // Продолжаем серию
                    streak = bonus.streak + 1;
                    dayInCycle = (bonus.day_in_cycle + 1) % 7;
                } else {
                    // Пропустил — сброс
                    streak = 1;
                    dayInCycle = 0;
                }
            } else {
                streak = 1;
                dayInCycle = 0;
            }

            await queryPromise(
                'UPDATE daily_bonus SET streak=?, last_claim=?, day_in_cycle=? WHERE user_id=?',
                [streak, nowUTC, dayInCycle, userId]
            );
        } else {
            streak = 1;
            dayInCycle = 0;
            await queryPromise(
                'INSERT INTO daily_bonus (user_id, streak, last_claim, day_in_cycle) VALUES (?,?,?,?)',
                [userId, streak, nowUTC, dayInCycle]
            );
        }

        const reward = DAILY_REWARDS[dayInCycle];
        await queryPromise('UPDATE users SET kachcoins = kachcoins + ? WHERE id=?', [reward, userId]);
        const userRows = await queryPromise('SELECT kachcoins FROM users WHERE id=?', [userId]);

        res.json({
            success: true,
            reward,
            streak,
            dayInCycle,
            kachcoins: userRows[0].kachcoins
        });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== БЛОЧНАЯ СИСТЕМА ПРОФИЛЯ ==========

// Создаём таблицы если нет
db.query(`CREATE TABLE IF NOT EXISTS profile_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    block_type VARCHAR(64) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, (err) => {
    if (err) console.error('Ошибка создания profile_blocks:', err.message);
});

db.query(`CREATE TABLE IF NOT EXISTS profile_block_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_block_id INT NOT NULL,
    slot_number INT NOT NULL,
    image_path VARCHAR(512) NOT NULL,
    image_path_orig VARCHAR(512) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_block_id (user_block_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, (err) => {
    if (err) console.error('Ошибка создания profile_block_photos:', err.message);
    else {
        // Добавляем колонку если таблица уже существовала без неё
        db.query(`ALTER TABLE profile_block_photos ADD COLUMN IF NOT EXISTS image_path_orig VARCHAR(512) DEFAULT NULL`, () => {});
    }
});

// Multer для фото профиля
const profilePhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        cb(null, allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase()));
    }
});

// GET /api/profile-blocks/:userId — список блоков пользователя
app.get('/api/profile-blocks/:userId', async (req, res) => {
    try {
        const blocks = await queryPromise(
            'SELECT * FROM profile_blocks WHERE user_id=? ORDER BY position ASC, id ASC',
            [req.params.userId]
        );
        res.json({ success: true, blocks });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/profile-blocks — добавить блок
app.post('/api/profile-blocks', async (req, res) => {
    const { userId, blockType } = req.body;
    if (!userId || !blockType) return res.status(400).json({ success: false, error: 'Нет данных' });
    try {
        // Проверяем что такого блока ещё нет
        const existing = await queryPromise(
            'SELECT id FROM profile_blocks WHERE user_id=? AND block_type=?',
            [userId, blockType]
        );
        if (existing.length > 0) return res.json({ success: true, id: existing[0].id, already: true });

        const maxPos = await queryPromise(
            'SELECT COALESCE(MAX(position),0) AS mp FROM profile_blocks WHERE user_id=?',
            [userId]
        );
        const position = (maxPos[0].mp || 0) + 1;
        const result = await queryPromise(
            'INSERT INTO profile_blocks (user_id, block_type, position) VALUES (?,?,?)',
            [userId, blockType, position]
        );
        res.json({ success: true, id: result.insertId });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/profile-blocks/:id — удалить блок и все фото
app.delete('/api/profile-blocks/:id', async (req, res) => {
    const { userId } = req.body;
    const blockId = req.params.id;
    try {
        const rows = await queryPromise('SELECT user_id FROM profile_blocks WHERE id=?', [blockId]);
        if (!rows.length || String(rows[0].user_id) !== String(userId)) {
            return res.status(403).json({ success: false, error: 'Нет прав' });
        }
        // Удаляем физические файлы фото
        const photos = await queryPromise('SELECT image_path, image_path_orig FROM profile_block_photos WHERE user_block_id=?', [blockId]);
        photos.forEach(p => {
            try {
                const fp = path.join(__dirname, p.image_path.replace(/^\//, ''));
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            } catch(e) {}
            try {
                if (p.image_path_orig) {
                    const fp2 = path.join(__dirname, p.image_path_orig.replace(/^\//, ''));
                    if (fs.existsSync(fp2)) fs.unlinkSync(fp2);
                }
            } catch(e) {}
        });
        await queryPromise('DELETE FROM profile_block_photos WHERE user_block_id=?', [blockId]);
        await queryPromise('DELETE FROM profile_blocks WHERE id=?', [blockId]);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/profile-blocks/photos/:blockId — фото блока
app.get('/api/profile-blocks/photos/:blockId', async (req, res) => {
    try {
        const photos = await queryPromise(
            'SELECT * FROM profile_block_photos WHERE user_block_id=? ORDER BY slot_number ASC',
            [req.params.blockId]
        );
        res.json({ success: true, photos });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/profile-blocks/photo — загрузить фото в слот
app.post('/api/profile-blocks/photo', profilePhotoUpload.single('photo'), async (req, res) => {
    const { userId, blockId, slotNumber } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: 'Нет файла' });
    try {
        // Проверяем владельца
        const rows = await queryPromise('SELECT user_id FROM profile_blocks WHERE id=?', [blockId]);
        if (!rows.length || String(rows[0].user_id) !== String(userId)) {
            return res.status(403).json({ success: false, error: 'Нет прав' });
        }
        // Удаляем старое фото в этом слоте если есть
        const old = await queryPromise(
            'SELECT image_path, image_path_orig FROM profile_block_photos WHERE user_block_id=? AND slot_number=?',
            [blockId, slotNumber]
        );
        if (old.length) {
            try {
                const fp = path.join(__dirname, old[0].image_path.replace(/^\//, ''));
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            } catch(e) {}
            try {
                if (old[0].image_path_orig) {
                    const fp2 = path.join(__dirname, old[0].image_path_orig.replace(/^\//, ''));
                    if (fs.existsSync(fp2)) fs.unlinkSync(fp2);
                }
            } catch(e) {}
            await queryPromise('DELETE FROM profile_block_photos WHERE user_block_id=? AND slot_number=?', [blockId, slotNumber]);
        }
        // Сохраняем два файла
        const dir = path.join(__dirname, 'uploads/profile_photos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const ts = Date.now();

        // Превью — 400x400 квадрат для сетки
        const thumbFilename = `pb_${blockId}_${slotNumber}_${ts}_thumb.webp`;
        await sharp(req.file.buffer)
            .rotate()
            .resize(400, 400, { fit: 'cover', position: 'attention' })
            .webp({ quality: 80 })
            .toFile(path.join(dir, thumbFilename));

        // Оригинал — max 1200px по длинной стороне, сохраняем пропорции
        const origFilename = `pb_${blockId}_${slotNumber}_${ts}_orig.webp`;
        await sharp(req.file.buffer)
            .rotate()
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(path.join(dir, origFilename));

        const imagePath = `/uploads/profile_photos/${thumbFilename}`;
        const imagePathOrig = `/uploads/profile_photos/${origFilename}`;

        await queryPromise(
            'INSERT INTO profile_block_photos (user_block_id, slot_number, image_path, image_path_orig) VALUES (?,?,?,?)',
            [blockId, slotNumber, imagePath, imagePathOrig]
        );
        res.json({ success: true, imagePath, imagePathOrig });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/profile-blocks/photo/:photoId — удалить одно фото
app.delete('/api/profile-blocks/photo/:photoId', async (req, res) => {
    const { userId } = req.body;
    try {
        const photos = await queryPromise(
            'SELECT p.*, b.user_id FROM profile_block_photos p JOIN profile_blocks b ON b.id=p.user_block_id WHERE p.id=?',
            [req.params.photoId]
        );
        if (!photos.length || String(photos[0].user_id) !== String(userId)) {
            return res.status(403).json({ success: false, error: 'Нет прав' });
        }
        try {
            const fp = path.join(__dirname, photos[0].image_path.replace(/^\//, ''));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch(e) {}
        try {
            if (photos[0].image_path_orig) {
                const fp2 = path.join(__dirname, photos[0].image_path_orig.replace(/^\//, ''));
                if (fs.existsSync(fp2)) fs.unlinkSync(fp2);
            }
        } catch(e) {}
        await queryPromise('DELETE FROM profile_block_photos WHERE id=?', [req.params.photoId]);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ========== БЛОК "МОИ УСЛУГИ" ==========

db.query(`CREATE TABLE IF NOT EXISTS profile_block_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_block_id INT NOT NULL,
    icon VARCHAR(64) NOT NULL DEFAULT 'ti-barbell',
    title VARCHAR(128) NOT NULL,
    subtitle VARCHAR(128) DEFAULT NULL,
    price VARCHAR(64) DEFAULT NULL,
    price_on_request TINYINT(1) NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_block_id (user_block_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, (err) => {
    if (err) console.error('Ошибка создания profile_block_services:', err.message);
});

// GET /api/profile-blocks/services/:blockId
app.get('/api/profile-blocks/services/:blockId', async (req, res) => {
    try {
        const services = await queryPromise(
            'SELECT * FROM profile_block_services WHERE user_block_id=? ORDER BY position ASC, id ASC',
            [req.params.blockId]
        );
        res.json({ success: true, services });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/profile-blocks/services — добавить услугу
app.post('/api/profile-blocks/services', async (req, res) => {
    const { userId, blockId, icon, title, subtitle, price, priceOnRequest } = req.body;
    if (!userId || !blockId || !title) return res.status(400).json({ success: false, error: 'Нет данных' });
    try {
        const rows = await queryPromise('SELECT user_id FROM profile_blocks WHERE id=?', [blockId]);
        if (!rows.length || String(rows[0].user_id) !== String(userId))
            return res.status(403).json({ success: false, error: 'Нет прав' });
        const maxPos = await queryPromise('SELECT COALESCE(MAX(position),0) AS mp FROM profile_block_services WHERE user_block_id=?', [blockId]);
        const result = await queryPromise(
            'INSERT INTO profile_block_services (user_block_id, icon, title, subtitle, price, price_on_request, position) VALUES (?,?,?,?,?,?,?)',
            [blockId, icon || 'ti-barbell', title, subtitle || null, price || null, priceOnRequest ? 1 : 0, (maxPos[0].mp || 0) + 1]
        );
        res.json({ success: true, id: result.insertId });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/profile-blocks/services/:serviceId — удалить услугу
app.delete('/api/profile-blocks/services/:serviceId', async (req, res) => {
    const { userId } = req.body;
    try {
        const rows = await queryPromise(
            'SELECT s.id, b.user_id FROM profile_block_services s JOIN profile_blocks b ON b.id=s.user_block_id WHERE s.id=?',
            [req.params.serviceId]
        );
        if (!rows.length || String(rows[0].user_id) !== String(userId))
            return res.status(403).json({ success: false, error: 'Нет прав' });
        await queryPromise('DELETE FROM profile_block_services WHERE id=?', [req.params.serviceId]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// ========== ПОЗИЦИЯ И СОСТОЯНИЕ БЛОКОВ ==========

// Добавляем is_collapsed если нет
db.query(`ALTER TABLE profile_blocks ADD COLUMN is_collapsed TINYINT(1) NOT NULL DEFAULT 0`, (err) => {});

// PATCH /api/profile-blocks/:id/position — переместить вверх/вниз
app.patch('/api/profile-blocks/:id/position', async (req, res) => {
    const { userId, direction } = req.body;
    const blockId = req.params.id;
    try {
        const rows = await queryPromise('SELECT * FROM profile_blocks WHERE user_id=? AND is_visible=1 ORDER BY position ASC, id ASC', [userId]);
        const idx = rows.findIndex(b => String(b.id) === String(blockId));
        if (idx < 0) return res.status(404).json({ success: false });
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= rows.length) return res.json({ success: true });
        const a = rows[idx], b = rows[swapIdx];
        const posA = a.position || idx + 1;
        const posB = b.position || swapIdx + 1;
        await queryPromise('UPDATE profile_blocks SET position=? WHERE id=?', [posB, a.id]);
        await queryPromise('UPDATE profile_blocks SET position=? WHERE id=?', [posA, b.id]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/profile-blocks/:id/collapse — сохранить состояние свернут/развёрнут
app.patch('/api/profile-blocks/:id/collapse', async (req, res) => {
    const { userId, isCollapsed } = req.body;
    const blockId = req.params.id;
    try {
        const rows = await queryPromise('SELECT user_id FROM profile_blocks WHERE id=?', [blockId]);
        if (!rows.length || String(rows[0].user_id) !== String(userId))
            return res.status(403).json({ success: false, error: 'Нет прав' });
        await queryPromise('UPDATE profile_blocks SET is_collapsed=? WHERE id=?', [isCollapsed ? 1 : 0, blockId]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/profile-blocks/services/:serviceId — редактировать услугу
app.patch('/api/profile-blocks/services/:serviceId', async (req, res) => {
    const { userId, icon, title, subtitle, price, priceOnRequest } = req.body;
    try {
        const rows = await queryPromise(
            'SELECT s.id, b.user_id FROM profile_block_services s JOIN profile_blocks b ON b.id=s.user_block_id WHERE s.id=?',
            [req.params.serviceId]
        );
        if (!rows.length || String(rows[0].user_id) !== String(userId))
            return res.status(403).json({ success: false, error: 'Нет прав' });
        await queryPromise(
            'UPDATE profile_block_services SET icon=?, title=?, subtitle=?, price=?, price_on_request=? WHERE id=?',
            [icon, title, subtitle || null, price || null, priceOnRequest ? 1 : 0, req.params.serviceId]
        );
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/profile-blocks/:id/visibility — скрыть/показать блок
app.patch('/api/profile-blocks/:id/visibility', async (req, res) => {
    const { userId, isVisible } = req.body;
    const blockId = req.params.id;
    try {
        const rows = await queryPromise('SELECT user_id FROM profile_blocks WHERE id=?', [blockId]);
        if (!rows.length || String(rows[0].user_id) !== String(userId))
            return res.status(403).json({ success: false, error: 'Нет прав' });
        await queryPromise('UPDATE profile_blocks SET is_visible=? WHERE id=?', [isVisible ? 1 : 0, blockId]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// ========== БЛОКИРОВКА ПОЛЬЗОВАТЕЛЕЙ ==========

// POST /api/admin/block-user — заблокировать/разблокировать
app.post('/api/admin/block-user', adminOnly, async (req, res) => {
    const { targetUserId, isBlocked } = req.body;
    if (!targetUserId) return res.status(400).json({ success: false, error: 'Нет targetUserId' });
    try {
        await queryPromise('UPDATE users SET is_blocked=? WHERE id=?', [isBlocked ? 1 : 0, targetUserId]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});
