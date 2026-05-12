<template>
  <div class="analysis">
    <div class="analysis__header">
      <div class="analysis__header-left">
      <div class="analysis__file-selector">
        <p class="file-selector__text">Файл:</p>
        <div class="file-selector">
          <p class="file">{{ truncatedDocumentName }} ({{ totalPages }} стр.)</p>
          <img src="@/assets/black-arrow.png" class="file-selector__icon" />
        </div>
      </div>
      <div class="analysis__font-size-selector">
        <p class="font-size-selector__size">16px</p>
        <img src="@/assets/black-arrow.png" class="file-selector__icon" />
      </div>
      </div>
      <div class="analysis__progress">
        <div class="progress__info">
          <img src="@/assets/ai.svg" class="progress__info-icon" />
          <p class="progress__status">Читаю файл..</p>
        </div>
        <div class="progress__bar">
          <div class="bar"></div>
          <p class="bar__percentage">0%</p>
        </div>
      </div>
    </div>
    <div class="analysis__content">

      <div class="content__document" ref="documentContainer">
        <div v-if="resizing" class="pdf-loading-overlay">
          <div class="pdf-loading-dots">
            <div class="pdf-loading-dot"></div>
            <div class="pdf-loading-dot"></div>
            <div class="pdf-loading-dot"></div>
          </div>
        </div>
      </div>

      <div class="content__panel" :class="{ 'expanded': expanded }">
        <ul class="panel__levels">
          <li class="levels__item">
            <div class="item__color green"></div>
            <p class="item__text">Хорошо</p>
          </li>
          <li class="levels__item">
            <div class="item__color yellow"></div>
            <p class="item__text">Сомнительно</p>
          </li>
          <li class="levels__item">
            <div class="item__color red"></div>
            <p class="item__text">Большие риски</p>
          </li>
        </ul>
        <div class="ai-assistant__block">
          <button class="panel__button ai-assistant" @click="toggleAssistant">
          <img src="@/assets/ai_white.svg" class="button__icon" alt=""/> 
          <p>ИИ-помощник</p>
        </button>
        </div>
        
        <div class="help-buttons__block">
           <button class="panel__button save">
            <p>Сохранить</p>
            </button>
        <button class="panel__button save">
           
          <p>Скачать отчёт</p>
        </button>
        </div>
        <div class="risk-panel">

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AnalysisResult',
  components: {},
  props: {
    documentUrl: {
      type: String,
      default: ''
    },
    documentName: {
      type: String,
      default: 'Документ'
    },
    expanded: {
      type: Boolean,
      default: false,
    }
  },
  data() {
    return {
      totalPages: 0,
      pdfjsLib: null,
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 3,
      analysisResult: null,
      analysisError: false,
      resizing: false,
      analysisInProgress: false,   // защита от параллельных вызовов
      abortController: null        // для отмены запроса
    };
  },
  computed: {
    truncatedDocumentName() {
      return this.documentName && this.documentName.length > 15
        ? this.documentName.slice(0, 15) + '..'
        : this.documentName;
    }
  },
  methods: {
    async analyzeDocument(text) {
      if (this.analysisInProgress) return;
      this.analysisInProgress = true;

      // Отменяем предыдущий незавершённый запрос
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      const prompt = `Ты — ведущий эксперт с 15+ годами опыта в анализе юридических, технических и коммерческих документов. Твоя задача — провести многоуровневый аудит, выявляя не только явные, но и скрытые риски, пробелы и возможности для оптимизации.

Критерии качества:
- Анализ ТОЛЬКО существенных аспектов, способных реально повлиять на правовую/финансовую устойчивость документа.
- Контекстный подход: учет юрисдикции, отрасли, типа документа и целей сторон.
- Ссылки на законы (для РФ — ГК РФ, ФЗ; для ЕС — директивы, GDPR; иные юрисдикции — соответствующие НПА).
- Глубина аргументации: каждый вывод подтверждай ссылками на пункты документа и нормами права.

СТРУКТУРА ОТЧЕТА (обязательна):
1. КОНТЕКСТУАЛЬНАЯ ПРИВЯЗКА
1.1. ИДЕНТИФИКАЦИЯ ДОКУМЕНТА
1.2. ОТРАСЛЕВАЯ СПЕЦИФИКА
2. ЮРИДИКО-ТЕХНИЧЕСКИЙ АУДИТ
2.1. ФОРМАЛЬНЫЕ ПАРАМЕТРЫ
2.2. СТРУКТУРНАЯ ЦЕЛОСТНОСТЬ
3. СОДЕРЖАТЕЛЬНЫЙ АНАЛИЗ
3.1. ПОЛОЖИТЕЛЬНЫЕ СТОРОНЫ
3.2. ЗОНЫ СОМНЕНИЯ (ТРЕБУЮТ УТОЧНЕНИЯ)
3.3. КРИТИЧЕСКИЕ РИСКИ
4. ПРАВОВОЙ АУДИТ
4.1. КОНФЛИКТЫ С ЗАКОНОДАТЕЛЬСТВОМ
4.2. ПРОБЕЛЫ РЕГУЛИРОВАНИЯ
5. РИСК-МЕНЕДЖМЕНТ
5.1. СЦЕНАРНЫЙ АНАЛИЗ
5.2. ПРИНЦИП «RED FLAG FIRST»
6. РЕКОМЕНДАЦИИ
6.1. ОБЯЗАТЕЛЬНЫЕ ИСПРАВЛЕНИЯ
6.2. СТРАТЕГИЧЕСКИЕ ОПТИМИЗАЦИИ
6.3. АЛЬТЕРНАТИВНЫЕ РЕШЕНИЯ
7. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ

ФОРМАТИРОВАНИЕ:
- Используй **полноценную Markdown-разметку**:
  * Заголовки разделов: ## Название раздела (второй уровень), ### подраздел (третий уровень).
  * Для выделения используй **жирный**, *курсив*, ***жирный курсив***.
  * Списки — маркированные (-) или нумерованные (1.).
  * Таблицы — в стандартном Markdown-синтаксисе (с | и разделителями). **Рекомендуется использовать таблицы для сравнений и сводок**.
  * Блоки кода — с тройными обратными кавычками.
  * Цитаты — с >.
  * Ссылки — [текст](url).
- **НЕ ИСПОЛЬЗУЙ эмодзи (смайлики)** ни в коем случае.
- **НЕ ИСПОЛЬЗУЙ декоративные линии из символов "---", "***" или "___"** — они ломают вёрстку. Вместо них ставь просто пустую строку.
- **НЕ ИСПОЛЬЗУЙ символы "—" и "*" для выделения** (только для жирного/курсива по правилам Markdown).
- Оставляй пустые строки между смысловыми блоками для читаемости.

ВАЖНО: Если документ составлен безупречно — укажи это, но предложи профилактические улучшения. НЕ ДОПУСКАЙ гипотетических рисков без прямой связи с контекстом документа.

Документ для анализа:
${text.substring(0, 15000)}`;

      try {
        console.log('Отправка запроса к Deepseek API...');
        const response = await axios.post(
          'https://api.deepseek.com/chat/completions',
          {
            messages: [
              { content: "You are a professional document analyst. Always respond in Russian, following the exact formatting instructions.", role: "system" },
              { content: prompt, role: "user" }
            ],
            model: "deepseek-reasoner",
            max_tokens: 8000,
            max_cot_tokens: 8000,
            temperature: 1.0,
            top_p: 0.7,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer sk-95a2138d9dc74827b0c1944a0839dadc'
            },
            signal: this.abortController.signal
          }
        );
        
        console.log('Ответ от Deepseek API:', response.data);

        this.analysisResult = response.data.choices[0].message.content;
        this.analysisError = false;
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log('Запрос отменён');
          return;
        }
        console.error('Ошибка при анализе документа:', error);
        this.analysisResult = null;
        this.analysisError = true;
      } finally {
        this.analysisInProgress = false;
        this.$emit('analysis-complete', {
          result: this.analysisResult,
          error: this.analysisError
        });
      }
    },

    async extractPdfText() {
      if (!this.documentUrl || !this.pdfjsLib) return;
      const loadingTask = this.pdfjsLib.getDocument(this.documentUrl);
      const pdf = await loadingTask.promise;
      this.totalPages = pdf.numPages;
      let fullText = '';
      
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      await this.analyzeDocument(fullText);
    },

    async renderPDF() {
      if (!this.documentUrl || !this.pdfjsLib) return;

      const container = this.$refs.documentContainer;
      if (!container) return;

      const pages = container.querySelectorAll('.pdf-page-container');
      pages.forEach(page => page.remove());

      await new Promise(resolve => setTimeout(resolve, 400));

      container.classList.add('pdf-loading');

      try {
        const loadingTask = this.pdfjsLib.getDocument(this.documentUrl);
        const pdf = await loadingTask.promise;
        this.totalPages = pdf.numPages;

        const containerWidth = container.clientWidth * 1;
        
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });
          
          const pageContainer = document.createElement('div');
          pageContainer.classList.add('pdf-page-container');
          pageContainer.style.position = 'relative';
          
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.classList.add('pdf-page');
          canvas.style.animation = "fadeInEffect 0.5s ease";
          
          const context = canvas.getContext('2d');
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          await page.render(renderContext).promise;
          
          const overlay = document.createElement('canvas');
          overlay.width = viewport.width;
          overlay.height = viewport.height;
          overlay.classList.add('overlay-canvas');
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.pointerEvents = 'none';
          overlay.style.background = 'transparent';
          const overlayCtx = overlay.getContext('2d');
          this.drawHeatmap(viewport, overlayCtx);
          
          pageContainer.appendChild(canvas);
          pageContainer.appendChild(overlay);
          container.appendChild(pageContainer);
        }
      } finally {
        container.classList.remove('pdf-loading');
      }
    },
    drawHeatmap(viewport, ctx) {
      ctx.clearRect(0, 0, viewport.width, viewport.height);
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(50, 50, 100, 40);
      ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
      ctx.fillRect(200, 100, 80, 30);
      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      ctx.fillRect(150, 200, 120, 50);
    },
    toggleAssistant() {
      this.$emit('show-assistant'); 
    },

    async updatePdfSize() {
      this.resizing = true;
      try {
        await this.$nextTick();
        await new Promise(resolve => setTimeout(resolve, 10));
        await this.renderPDF();
      } catch (error) {
        console.error('Error updating PDF size:', error);
      } finally {
        this.resizing = false;
      }
    }
  },
  watch: {
    documentUrl(newVal, oldVal) {
      // Игнорируем холостой вызов при инициализации (oldVal === undefined)
      if (newVal && oldVal === undefined) return;
      if (newVal && this.pdfjsLib) {
        // Сбрасываем предыдущий результат и запускаем анализ
        this.analysisResult = null;
        this.analysisError = false;
        this.renderPDF();
        this.extractPdfText();
      }
    }
  },
  async mounted() {
    if (this.documentUrl) {
      this.pdfjsLib = await import(/* webpackIgnore: true */ '/pdfjs/legacy/build/pdf.mjs');
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/legacy/build/pdf.worker.mjs';
      // Первый запуск без дублирования
      if (!this.analysisInProgress) {
        this.renderPDF();
        this.extractPdfText();
      }
    }
  },
  beforeUnmount() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
};
</script>

<style scoped>
/* ... все стили без изменений, как в исходном файле ... */
@keyframes fadeInEffect {
  from { opacity: 0; }
  to { opacity: 1; }
}

.analysis {
  width: 100%;
  height: 100%;
  background-color: #FFF;
  border-radius: 30px;
  border: 1px solid #E6E6E6;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.expanded .analysis {
  width: 1000px;
}
.analysis__header {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  padding: 10px 20px;
  border-bottom: 1px solid #e6e6e6;
}

.analysis__header-left {
  display: flex;
  gap: 5px;
}

.header__file {
  font-size: 12px;
  font-weight: 500;
  color: #a2a2a2;
}
.analysis__content {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.content__document {
  width: 100%;
  height: 500px;
  overflow: scroll;
}

.expanded .content__document {
  width: 780px;
}

.pdf-page-container {
  margin-bottom: 10px;
}
.pdf-page {
  width: 100%;
  max-width: 100%;
  transition: all 0.3s ease;
}
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  background: transparent;
}
.content__panel {
  width: 200px;
  transition: all 0.3s ease;
}
.panel__levels {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
  margin: 0;
  border-left: 1px solid #e6e6e6;
  border-bottom: 1px dashed #e6e6e6;
  padding: 10px;
  }
.levels__item {
  display: flex;
  gap: 5px;
  align-items: center;
}
.item__color {
  width: 20px;
  height: 10px;
  border-radius: 50px;
}
.green {
  background-color: #00800040;
}
.yellow {
  background-color: #ffd90050;
}
.red {
  background-color: #ff000040;
}
.item__text {
  font-size: 11px;
  transition: all 0.3s ease;
  font-weight: 500;
}
.panel__button {
  width: 120px;
  height: 35px;
  border-radius: 50px;
  outline: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.help-buttons__block {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  padding: 10px;
  border-left: 1px solid #e6e6e6;
  border-bottom: 1px dashed #e6e6e6;
}

.ai-assistant {
  background-color: #6C67FD;
  color: #FFF;
  border: 1px solid #6C67FD;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.ai-assistant__block {
  border-left: 1px solid #e6e6e6;
  border-bottom: 1px dashed #e6e6e6;
  padding: 10px;
  align-items: center;
  display: flex;
  justify-content: center;
}

.ai-assistant:hover {
  background-color: #fff;
  color: #6C67FD;
}

.button__icon {
  width: 15px;
  height: 15px;
  transition: all 0.3s ease;
}
.note, .save {
  background-color: #FFF;
  color: #000;
  border: 1px solid #e6e6e6;
  transition: 0.2s;
}
.note:hover, .save:hover {
  background: #6C67FD;
  color: #FFF;
}
.download {
  margin-top: 30px;
}
.download, .download-all {
  background-color: #333;
  color: #FFF;
  border: 1px solid #333;
  transition: 0.2s;
}
.download-all {
  height: 50px;
}
.download:hover, .download-all:hover {
  background-color: #fff;
  color: #333;
}

@keyframes dot-wave {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

.pdf-loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  gap: 8px;
}

.pdf-loading-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #6C67FD;
  animation: dot-wave 1.5s infinite ease-in-out;
}

.pdf-loading-dot:nth-child(1) {
  animation-delay: 0s;
}
.pdf-loading-dot:nth-child(2) {
  animation-delay: 0.3s;
}
.pdf-loading-dot:nth-child(3) {
  animation-delay: 0.6s;
}

.content__document {
  position: relative;
  min-height: 200px;
}

.pdf-content {
  transition: opacity 0.3s ease;
}

.pdf-loading-dots {
  display: flex;
  gap: 10px;
}

/* Стили для увеличенной панели */
.expanded .content__panel {
  width: 170px;
}

.expanded .panel__button {
  width: 150px;
  height: 42px;
  font-size: 13px;
  gap: 8px;
}

.expanded .button__icon {
  width: 18px;
  height: 18px;
}

.expanded .panel__levels {
  gap: 8px;
}

.expanded .levels__item {
  gap: 8px;
}

.expanded .item__color {
  width: 20px;
  height: 10px;
}

.expanded .item__text {
  font-size: 13px;
}

.expanded .download-all {
  height: 60px;
}

.analysis__file-selector {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #a2a2a2;
  font-weight: 500;
}

.file-selector {
  width: 200px;
  height: 25px;
  border: 1px solid #e6e6e6;
  border-radius: 50px;
  padding: 5px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-selector__icon {
  width: 8px;
  height: 8px;
}

.file {
  font-size: 12px;
  font-weight: 500;
  color:#a2a2a2;
}

.analysis__font-size-selector {
  width: 65px;
  height: 25px;
  border: 1px solid #e6e6e6;
  border-radius: 50px;
  padding: 5px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.font-size-selector__size {
  font-size: 12px;
  font-weight: 500;
}

.analysis__progress {
  width: 300px;
  height: 30px;
  border: 1px solid #e6e6e6;
  border-radius: 50px;
  display: flex;
  align-items: center;
}

.progress__info {
  width: 50%;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-right: 1px solid #e6e6e6;
  padding: 0 8px;
}

.progress__bar {
  width: 50%;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
}

.bar {
  width: 100px;
  height: 10px;
  background-color: #d9d9d9;
  border-radius: 50px;
}

.bar__percentage {
  font-size: 13px;
  font-weight: 500;
}

.progress__info-icon {
  width: 17px;
  height: 17px;
}

.progress__status {
  font-size: 12px;
  font-weight: 500;
}

.risk-panel {
  width: 100%;
  height: 100%;
  border-left: 1px solid #e6e6e6;
}
</style>