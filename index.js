import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from "@google/genai";
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer();

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const GEMINI_MODEL = "gemini-2.5-flash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});

app.post('/generate-text', async (req, res) => {
    const {prompt} = req.body;
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        res.status(200).json({result: response.text});
    } catch (e) {
        console.log(e);
        res.status(500).json({message: e.message});
    }
});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const {prompt} = req.body;
    const base64Image = req.file.buffer.toString('base64');

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {text: prompt,type: 'text'},
                {inlineData: {data: base64Image, mimeType: req.file.mimetype}}
            ],
        });
        res.status(200).json({result: response.text});
    } catch (e) {
        console.log(e);
        res.status(500).json({message: e.message});
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const {prompt} = req.body;
    const base64Document = req.file.buffer.toString('base64');

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.",type: 'text'},
                {inlineData: {data: base64Document, mimeType: req.file.mimetype}}
            ],
        });

        res.status(200).json({result: response.text});
    } catch (e) {
        console.log(e);
        res.status(500).json({message: e.message});
    }
});

// generate content from audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const {prompt} = req.body;
    const base64Audio = req.file.buffer.toString('base64');

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {text: prompt ?? "Tolong buat transkrip dari audio berikut.",type: 'text'},
                {inlineData: {data: base64Audio, mimeType: req.file.mimetype}}
            ],
        });
        res.status(200).json({result: response.text});
    } catch (e) {
        console.log(e);
        res.status(500).json({message: e.message});
    }
});

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    
    try {
        if (!Array.isArray(conversation)) {
            throw new Error('Messages must be an array!');
        }

        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        // const response = await ai.models.generateContent({
        //     model: GEMINI_MODEL,
        //     contents,
        //     config: {
        //         temperature: 0.9,
        //         systemInstruction: "Jawab hanya menggunakan bahasa Indonesia.",
        //     } // Diperbaiki: Kurung kurawal tutup untuk objek 'config' sebelumnya hilang
        // });
        
        // Di dalam route /api/chat
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                // Suhu 0.2 - 0.4 baik untuk konsultan agar jawabannya akurat dan tidak berhalusinasi.
                // Jika Anda membuat chatbot penulis kreatif/pelawak, gunakan 0.8 - 1.0.
                temperature: 0.3, 
                
                // INI ADALAH KUNCI UTAMANYA:
                systemInstruction: `
                    Kamu adalah FitBot, seorang konsultan nutrisi dan pelatih kebugaran profesional. 
                    Tugasmu HANYA menjawab pertanyaan seputar diet, olahraga, nutrisi, dan gaya hidup sehat.
                    Gunakan nada bahasa yang memotivasi, ramah, dan energik (gunakan emoji 💪, 🥗, 🏃‍♂️).
                    Jika pengguna bertanya di luar topik kesehatan/kebugaran (misal: politik, coding, atau matematika), 
                    tolak dengan sopan dan arahkan kembali ke topik kesehatan.
                `,
            }
        });
        res.status(200).json({ result: response.text });
        
    } catch (e) {
        console.error(e); // Tambahan: Praktik yang baik untuk mencetak error di sisi server
        res.status(500).json({ error: e.message });
    } // Diperbaiki: Kurung kurawal tutup untuk blok 'catch' sebelumnya hilang
});


app.get('/', (req, res) => {
    // Mengirim file index.html yang berada di folder yang sama dengan index.js
    res.sendFile(path.join(__dirname, 'index.html'));
});