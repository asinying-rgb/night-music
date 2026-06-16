const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const mediaDir = path.join(__dirname, '../../media');
const jsonPath = path.join(__dirname, '../../songs.json');

async function startAutoSync() {
    try {
        if (!fs.existsSync(mediaDir) || !fs.existsSync(jsonPath)) return;

        let songsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let hasUpdates = false;

        for (let song of songsData) {
            // 如果已經有 Cloudinary 網址，代表以前轉過，跳過不處理
            if (song.audio_url && song.audio_url.includes('cloudinary')) continue;

            console.log(`🚀 發現新歌上架需求：【${song.title}】`);
            const localAudioPath = path.join(mediaDir, song.file);
            const localCoverPath = path.join(mediaDir, song.cover);

            if (fs.existsSync(localAudioPath) && fs.existsSync(localCoverPath)) {
                
                // 1. 自動把音檔直傳給 Cloudinary 進行音質優化
                const audioResult = await cloudinary.uploader.upload(localAudioPath, {
                    resource_type: "video",
                    folder: "night-music/audios",
                    use_filename: true,
                    unique_filename: false
                });

                // 2. 自動把封面傳給 Cloudinary，並命令 AI 提取柔和色票
                const coverResult = await cloudinary.uploader.upload(localCoverPath, {
                    folder: "night-music/covers",
                    colors: true, // 強制啟動 Cloudinary AI 著色引擎
                    use_filename: true,
                    unique_filename: false
                });

                // 3. 提取 AI 算出來的顏色
                const aiColors = coverResult.colors ? coverResult.colors.map(c => c[0]) : ["#A8DADC", "#FFB3C1"];
                
                // 4. 智慧串聯，自動改寫資料
                song.audio_url = audioResult.secure_url;
                song.cover_url = coverResult.secure_url;
                song.colors = aiColors.slice(0, 4); // 自動取前 4 個最漂亮的粉彩柔和色
                
                delete song.file;
                delete song.cover;
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            fs.writeFileSync(jsonPath, JSON.stringify(songsData, null, 2), 'utf8');
            console.log("📝 全自動串連成功！大腦 songs.json 已更新。");
        }
    } catch (error) {
        console.error("❌ 串連失敗:", error);
    }
}
startAutoSync();
