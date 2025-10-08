// api/index.js
import express from "express";
import axios from "axios";
import qs from "qs";
import cors from "cors";

const app = express();

// Middleware
app.use(cors()); // Mengizinkan request dari domain lain (penting untuk Vercel)
app.use(express.json());

// --- SEMUA FUNGSI LOGIKA ANDA (getToken, getHtml, dll) MASUKKAN DI SINI ---
const getToken = async (tweetUrl) => { /* ... kode sama persis ... */ };
const getHtml = async (tweetUrl, cftoken) => { /* ... kode sama persis ... */ };
const convertToMp3 = async (audioUrl, v_id, exp, token) => { /* ... kode sama persis ... */ };
const getDownloadLinks = async (tweetUrl) => { /* ... kode sama persis seperti di server.js sebelumnya ... */ };

// --- KODE LENGKAP LOGIKA UNTUK DICOPY-PASTE ---
const getToken = async (tweetUrl) => {
  const res = await axios.post( "https://x2twitter.com/api/userverify", qs.stringify({ url: tweetUrl }), { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", "X-Requested-With": "XMLHttpRequest" } } );
  return res.data.token;
};
const getHtml = async (tweetUrl, cftoken) => {
  const res = await axios.post( "https://x2twitter.com/api/ajaxSearch", qs.stringify({ q: tweetUrl, lang: "id", cftoken }), { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", "X-Requested-With": "XMLHttpRequest" } } );
  return res.data.data;
};
const convertToMp3 = async (audioUrl, v_id, exp, token) => {
  if (!audioUrl || !v_id || !exp || !token) { return { result: null, fileSize: 'N/A' }; }
  const res = await axios.post( "https://s1.twcdn.net/api/json/convert", qs.stringify({ ftype: "mp3", v_id, audioUrl, audioType: "video/mp4", fquality: "128", fname: "X2Twitter.com", exp, token }), { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*" } } );
  return res.data;
};
const getDownloadLinks = async (tweetUrl) => {
  const cftoken = await getToken(tweetUrl);
  const html = await getHtml(tweetUrl, cftoken);
  if (!html) { throw new Error("Gagal mendapatkan data dari URL."); }
  const thumbnail = html.match(/<img[^>]+src="([^"]+)"/)?.[1] || null;
  const downloads = [...html.matchAll(/<a[^>]+href="(https:\/\/dl\.snapcdn\.app\/get\?token=[^"]+)"[^>]*>(.*?)<\/a>/gs)].map(m => ({ label: m[2].replace(/<[^>]+>/g, "").trim(), url: m[1].trim() })).filter(x => x.label.toLowerCase().includes("mp4"));
  const audioUrl = html.match(/data-audioUrl="([^"]+)"/)?.[1];
  const v_id = html.match(/data-mediaId="([^"]+)"/)?.[1];
  const exp = html.match(/k_exp\s*=\s*"([^"]+)"/)?.[1];
  const token = html.match(/k_token\s*=\s*"([^"]+)"/)?.[1];
  const mp3 = await convertToMp3(audioUrl, v_id, exp, token);
  return { thumbnail, mp3: { url: mp3.result, quality: mp3.fileSize || '128kbps' }, videos: downloads };
};
// --- BATAS AKHIR KODE LOGIKA ---

// Endpoint API kita
app.post("/api", async (req, res) => {
  const { url } = req.body;
  if (!url) { return res.status(400).json({ error: "URL Twitter diperlukan" }); }
  try {
    const data = await getDownloadLinks(url);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memproses permintaan." });
  }
});

// Vercel akan menangani routing, jadi kita tidak butuh app.listen
// Ekspor app agar Vercel bisa menggunakannya
export default app;
