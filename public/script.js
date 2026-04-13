const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const fileInput = document.getElementById('file-input');
const attachBtn = document.getElementById('attach-btn');
const filePreviewContainer = document.getElementById('file-preview-container');
const fileNameDisplay = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file-btn');

let conversationHistory = [];
let selectedFile = null;

// 1. Logika untuk tombol klip kertas
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

// 2. Menampilkan preview file yang dipilih
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.textContent = `📁 ${selectedFile.name}`;
        filePreviewContainer.classList.remove('hidden');
    }
});

// 3. Menghapus file yang batal dikirim
removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = ''; // Reset input file
    filePreviewContainer.classList.add('hidden');
});

// 4. Proses pengiriman form
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const userMessage = input.value.trim();
    if (!userMessage && !selectedFile) return; // Jangan kirim jika kosong

    // Tampilkan di UI
    let displayMessage = userMessage;
    if (selectedFile) displayMessage = `[File: ${selectedFile.name}] ` + userMessage;
    appendMessage('user', displayMessage);

    // Reset UI segera setelah diklik
    input.value = '';
    filePreviewContainer.classList.add('hidden');

    const loadingId = 'loading-' + Date.now();
    appendMessage('bot', 'Gemini is thinking...', loadingId);

    try {
        let response;
        
        // --- CABANG A: JIKA ADA FILE (Multimodal) ---
        if (selectedFile) {
            const formData = new FormData();
            formData.append('prompt', userMessage || 'Tolong jelaskan file ini.');
            
            let endpoint = '';
            // Deteksi jenis file otomatis
            if (selectedFile.type.startsWith('image/')) {
                endpoint = '/generate-from-image';
                formData.append('image', selectedFile);
            } else if (selectedFile.type.startsWith('audio/')) {
                endpoint = '/generate-from-audio';
                formData.append('audio', selectedFile);
            } else {
                endpoint = '/generate-from-document';
                formData.append('document', selectedFile);
            }

            response = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                // Catatan Penting: Jangan set 'Content-Type' saat pakai FormData. 
                // Browser akan mengaturnya otomatis ke 'multipart/form-data'.
                body: formData
            });

            // Kosongkan state file setelah dikirim
            selectedFile = null; 
            fileInput.value = '';
        } 
        // --- CABANG B: JIKA HANYA TEKS (Chat Normal) ---
        else {
            conversationHistory.push({ role: 'user', text: userMessage });
            response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: conversationHistory })
            });
        }

        const data = await response.json();
        document.getElementById(loadingId).remove();

        if (response.ok) {
            appendMessage('bot', data.result);
            if (!selectedFile) { // Hanya simpan ke riwayat jika chat teks
                conversationHistory.push({ role: 'model', text: data.result });
            }
        } else {
            appendMessage('bot', 'Error: ' + (data.message || data.error));
        }
    } catch (error) {
        document.getElementById(loadingId)?.remove();
        appendMessage('bot', 'Terjadi kesalahan jaringan atau server.');
        console.error(error);
    }
});

// function appendMessage(sender, text, id = null) {
//     const msg = document.createElement('div');
//     msg.classList.add('message', sender);
//     msg.textContent = text;
//     if (id) msg.id = id;
//     chatBox.appendChild(msg);
//     chatBox.scrollTop = chatBox.scrollHeight;
// }

function appendMessage(sender, text, id = null) {
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    if (id) msg.id = id;

    if (sender === 'bot') {
        // 1. Ubah teks Markdown dari Gemini menjadi HTML mentah
        const rawHtml = marked.parse(text);
        
        // 2. Bersihkan HTML agar aman dari celah keamanan (XSS)
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        
        // 3. Masukkan HTML ke dalam gelembung chat
        msg.innerHTML = cleanHtml;
    } else {
        // Untuk user, kita gunakan textContent biasa
        msg.textContent = text;
    }

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}