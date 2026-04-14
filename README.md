# Plugin FinCERT autoloader - плагин скачивает архивы из сообщений от ФинЦЕРТ

Настройки позволяют загружать разные типы в разные папки

Проверен на Chrome и Yandex browser

## 🛠️ Последовательность
- **Склонировать репозиторий**
```bash
git clone https://github.com/adjuster2004/FinCERT-Autoloader/
cd FinCERT-Autoloader
```

- **Добавить плагин в браузере**

Используйте режим разработчика 

browser://extensions/

- **В настройках плагина указать ссылку на сайт**

  <img width="254" height="170" alt="image" src="https://github.com/user-attachments/assets/34683d3a-e39a-4365-962f-a17400f1b0eb" />


- **Используйте режим разработчика**

browser://extensions/


- **Настройки позволяют указывать время работы и периодичность обновления**

<img width="321" height="533" alt="image" src="https://github.com/user-attachments/assets/263d17a1-ba71-4c49-be4c-db54a2bd11dd" />


- **Условия**

Страница должна быть открыта


Манифестом запрещено браузерам загружать файлы в папки, отличные от указанной в настройках Загрузки, но можно сортировать по подпапкам.


## Тестовый стенд

Это docker compose для проверки логики плагина. Рабоатет на 7070 порту http://localhost:7070.

Указываете этот адрес в настройках плагина и тестируете.

<img width="601" height="307" alt="image" src="https://github.com/user-attachments/assets/0bd625bc-69cf-4664-8613-2b91c05279c9" />


Запуск контейнера:

```bash
docker-compose up -d
```

## 📄 Лицензия
Этот проект распространяется под лицензией **MIT**.

Copyright (c) 2025 Sergey S @adjuster2004

Подробности в файле [LICENSE](LICENSE).
