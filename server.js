// server.js
import express from "express";
import axios from "axios";
import qs from "qs";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk mengizinkan request dari frontend dan membaca JSON
app.use(cors());
app.use(express.json());

// --- LOGIKA DARI SCRIPT ANDA DIMULAI DI SINI ---
const getToken = async (tweetUrl) => {
  const res = await axios.post(
    "https://x2twitter.com/api/userverify",
    qs.stringify({ url: tweetUrl }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );
  return res.data.token;
};

const getHtml = async (tweetUrl, cftoken) => {
  const res = await axios.post(
    "https://x2twitter.com/api/ajaxSearch",
    qs.stringify({ q: tweetUrl, lang: "id", cftoken }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );
  return res.data.data;
};

const convertToMp3 = async (audioUrl, v_id, exp, token) => {
  // Pastikan semua parameter ada sebelum mengirim request
  if (!audioUrl || !v_id || !exp || !token) {
    return { result: null, fileSize: 'N/A' };
  }
  const res = await axios.post(
    "https://s1.twcdn.net/api/json/convert",
    qs.stringify({
      ftype: "mp3",
      v_id,
      audioUrl,
      audioType: "video/mp4",
      fquality: "128",
      fname: "X2Twitter.com",
      exp,
      token,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
      },
    }
  );
  return res.data;
};

// Fungsi utama yang dimodifikasi untuk menerima URL dan mengembalikan hasil
const getDownloadLinks = async (tweetUrl) => {
  const cftoken = await getToken(tweetUrl);
  const html = await getHtml(tweetUrl, cftoken);

  if (!html) {
    throw new Error("Gagal mendapatkan data dari URL. Pastikan URL valid.");
  }

  const thumbnail = html.match(/<img[^>]+src="([^"]+)"/)?.[1] || null;
  const downloads = [...html.matchAll(/<a[^>]+href="(https:\/\/dl\.snapcdn\.app\/get\?token=[^"]+)"[^>]*>(.*?)<\/a>/gs)]
    .map(m => {
      const label = m[2].replace(/<[^>]+>/g, "").trim();
      return { label, url: m[1].trim() };
    })
    .filter(x => x.label.toLowerCase().includes("mp4"));

  const audioUrl = html.match(/data-audioUrl="([^"]+)"/)?.[1];
  const v_id = html.match(/data-mediaId="([^"]+)"/)?.[1];
  const exp = html.match(/k_exp\s*=\s*"([^"]+)"/)?.[1];
  const token = html.match(/k_token\s*=\s*"([^"]+)"/)?.[1];

  const mp3 = await convertToMp3(audioUrl, v_id, exp, token);

  const result = {
    thumbnail,
    mp3: {
      url: mp3.result,
      quality: mp3.fileSize || '128kbps'
    },
    videos: downloads,
  };
  return result;
};
// --- LOGIKA DARI SCRIPT ANDA BERAKHIR DI SINI ---


// Membuat endpoint API
app.post("/api/download", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL Twitter diperlukan" });
  }

  try {
    const data = await getDownloadLinks(url);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memproses permintaan. Mungkin URL tidak valid atau video tidak ditemukan." });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
