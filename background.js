let currentTargetFolder = "";

// Слушаем сообщения от контент-скрипта
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setNextDownloadFolder") {
        currentTargetFolder = request.folder;
        sendResponse({status: "ok"});
    }
});

// Перехватываем определение имени файла при загрузке
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    if (currentTargetFolder) {
        // Указываем путь: Папка_из_настроек / Имя_файла
        suggest({ filename: `${currentTargetFolder}/${item.filename}` });
        // Сбрасываем папку, чтобы ручные скачивания не летели туда же
        currentTargetFolder = ""; 
    } else {
        suggest({ filename: item.filename });
    }
});