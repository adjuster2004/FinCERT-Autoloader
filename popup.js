document.getElementById('saveBtn').addEventListener('click', () => {
    const targetUrl = document.getElementById('targetUrl').value.trim();
    chrome.storage.local.set({ targetUrl }, () => {
        document.getElementById('status').innerText = 'Адрес сохранен! Обновите страницу сайта.';
    });
});

chrome.storage.local.get(['targetUrl'], (data) => {
    if (data.targetUrl) document.getElementById('targetUrl').value = data.targetUrl;
});