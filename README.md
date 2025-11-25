# Interactive Line Chart - A/B Test Statistics

Интерактивный линейный график для визуализации статистики A/B тестов с анализом коэффициента конверсии.

## Технологический стек

- **React 18** + **TypeScript**
- **Recharts** - библиотека визуализации
- **Vite** - сборщик проекта
- **CSS Modules** - стилизация компонентов
- **html2canvas** - экспорт в PNG

## Выбранная библиотека визуализации

**Recharts** - выбрана за отличную интеграцию с React, поддержку TypeScript, богатый набор компонентов и простоту использования.

## Реализованные функции

### Основные требования

- Линейный график conversion rate для всех вариаций (в процентах)
- Интерактивность: вертикальная линия и tooltip при наведении
- Минимум одна вариация всегда выбрана
- Автоматическая адаптация осей X и Y к видимым данным
- Все значения отображаются в процентах
- Адаптивный дизайн (671px - 1300px)
- Селектор вариаций (dropdown)
- Переключатель День / Неделя

### Бонусные функции

- **Zoom / Reset zoom** - кастомный контрол зума с кнопками +/- и ползунком, панорамирование
- **Line style selector** - выбор стиля: Line, Smooth, Area
- **Light / Dark theme** - переключатель темы
- **Export to PNG** - экспорт графика в высоком качестве

## Установка и запуск

### Предварительные требования

- Node.js (версия 16 или выше)
- npm или yarn

### Локальная установка

1. Клонируйте репозиторий
   ```bash
   git clone <repository-url>
   cd frontend-interview-task
   ```

2. Установите зависимости
   ```bash
   npm install
   ```

3. Запустите dev сервер
   ```bash
   npm run dev
   ```
   Приложение будет доступно по адресу `http://localhost:5173`

4. Сборка для production
   ```bash
   npm run build
   ```

5. Превью production сборки
   ```bash
   npm run preview
   ```

## Структура проекта

```
frontend-interview-task/
├── src/
│   ├── components/Chart/
│   │   ├── Chart.tsx
│   │   └── Chart.module.css
│   ├── utils/dataProcessor.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── data.json
│   └── index.css
├── package.json
├── tsconfig.json
└── vite.config.ts
```

