<template>
  <div class="analysis">
    <div class="analysis__header">
      <div class="analysis__header-left">
      <div class="analysis__file-selector">
        <p class="file-selector__text">Файл:</p>
        <div
          class="file-selector"
          :class="{ 'file-selector--disabled': documents.length === 0, 'file-selector--open': fileSelectorOpen }"
          @click="openFileSelector">
          <p class="file">{{ truncatedDocumentName }}{{ totalPages ? ` (${totalPages} стр.)` : '' }}</p>
          <img src="@/assets/black-arrow.png" class="file-selector__icon" />
          <ul v-if="fileSelectorOpen" class="file-selector__dropdown" @click.stop>
            <li
              v-for="doc in documents"
              :key="doc.id"
              class="file-selector__item"
              :class="{ 'file-selector__item--active': selectedDocument && doc.id === selectedDocument.id }"
              @click="selectDocument(doc.id)">
              <span class="file-selector__item-name">{{ doc.name }}</span>
              <span class="file-selector__item-type">{{ doc.type ? doc.type.toUpperCase() : '' }}</span>
            </li>
          </ul>
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
          <p class="progress__status">{{ progressStatusText }}</p>
        </div>
        <div class="progress__bar">
          <div class="bar">
            <div class="bar__fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <p class="bar__percentage">{{ progressPercent }}%</p>
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
          <button
            class="panel__button ai-assistant"
            :disabled="!analysisComplete"
            @click="toggleAssistant">
            <img src="@/assets/ai_white.svg" class="button__icon" alt=""/>
            <p>ИИ-помощник</p>
          </button>
        </div>

        <div class="help-buttons__block">
          <button class="panel__button save" :disabled="!analysisComplete">
            <p>Сохранить</p>
          </button>
          <button class="panel__button save" :disabled="!analysisComplete">
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
import mammoth from 'mammoth';
import { mapStores } from 'pinia';
import { chatCompletion, DEEPSEEK_MODELS } from '@/services/deepseek';
import { useDocumentsStore, DOCUMENT_STATUS } from '@/stores/documents';

export default {
  name: 'AnalysisResult',
  components: {},
  props: {
    expanded: {
      type: Boolean,
      default: false
    }
  },
  emits: ['analysis-complete', 'show-assistant'],
  data() {
    return {
      totalPages: 0,
      pdfjsLib: null,
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 3,
      resizing: false,
      abortController: null,
      fileSelectorOpen: false,
      renderedDocId: null
    };
  },
  computed: {
    ...mapStores(useDocumentsStore),
    documents() {
      return this.documentsStore.items;
    },
    selectedDocument() {
      return this.documentsStore.selected;
    },
    documentName() {
      return this.selectedDocument?.name || 'Документ';
    },
    documentUrl() {
      return this.selectedDocument?.url || '';
    },
    documentType() {
      return this.selectedDocument?.type || null;
    },
    analysisResult() {
      return this.selectedDocument?.analysisResult ?? null;
    },
    analysisError() {
      return this.selectedDocument?.analysisError ?? false;
    },
    analysisInProgress() {
      const status = this.selectedDocument?.status;
      return status === DOCUMENT_STATUS.EXTRACTING || status === DOCUMENT_STATUS.ANALYZING;
    },
    truncatedDocumentName() {
      return this.documentName && this.documentName.length > 15
        ? this.documentName.slice(0, 15) + '..'
        : this.documentName;
    },
    hasDocument() {
      return Boolean(this.selectedDocument);
    },
    analysisComplete() {
      return this.analysisResult !== null && !this.analysisError && !this.analysisInProgress;
    },
    progressPercent() {
      if (this.analysisComplete) return 100;
      return this.selectedDocument?.progress ?? 0;
    },
    progressStatusText() {
      if (this.analysisInProgress) return 'Читаю файл..';
      if (this.analysisError) return 'Ошибка анализа';
      if (this.analysisComplete) return 'Анализ завершён';
      return 'Загрузите документ(-ы) для начала работы';
    }
  },
  methods: {
    openFileSelector() {
      if (this.documents.length > 0) {
        this.fileSelectorOpen = !this.fileSelectorOpen;
      }
    },
    selectDocument(id) {
      this.fileSelectorOpen = false;
      if (id === this.documentsStore.selectedId) return;
      this.documentsStore.select(id);
    },
    async ensurePdfJs() {
      if (this.pdfjsLib) return this.pdfjsLib;
      const pdfLibUrl = '/pdfjs/legacy/build/pdf.mjs';
      try {
        this.pdfjsLib = await import(/* webpackIgnore: true */ /* @vite-ignore */ pdfLibUrl);
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/legacy/build/pdf.worker.mjs';
        return this.pdfjsLib;
      } catch (error) {
        console.warn('PDF.js не загружен:', error?.message || error);
        return null;
      }
    },
    async renderSelectedDocument() {
      const doc = this.selectedDocument;
      if (!doc) return;
      if (this.renderedDocId === doc.id && doc.htmlPreview) return;
      const container = this.$refs.documentContainer;
      if (!container) return;

      container.querySelectorAll('.pdf-page-container, .docx-preview').forEach((el) => el.remove());

      if (doc.type === 'pdf') {
        await this.renderPDF(doc);
      } else if (doc.type === 'docx') {
        await this.renderDocx(doc);
      }
      this.renderedDocId = doc.id;
    },
    async runAnalysisForSelected() {
      const doc = this.selectedDocument;
      if (!doc) return;
      if (doc.analysisResult || doc.analysisError) return;
      if (doc.status === DOCUMENT_STATUS.ANALYZING || doc.status === DOCUMENT_STATUS.EXTRACTING) return;

      let text = doc.extractedText;
      if (!text) {
        this.documentsStore.setStatus(doc.id, DOCUMENT_STATUS.EXTRACTING);
        if (doc.type === 'pdf') {
          text = await this.extractPdfText(doc);
        } else if (doc.type === 'docx') {
          text = doc.extractedText;
        }
        if (text) this.documentsStore.setExtractedText(doc.id, text);
      }
      if (!text) return;
      await this.analyzeDocument(doc, text);
    },
    async analyzeDocument(doc, text) {
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();
      this.documentsStore.setStatus(doc.id, DOCUMENT_STATUS.ANALYZING);

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
        const result = await chatCompletion({
          model: DEEPSEEK_MODELS.REASONER,
          messages: [
            { role: 'system', content: 'You are a professional document analyst. Always respond in Russian, following the exact formatting instructions.' },
            { role: 'user', content: prompt }
          ],
          temperature: 1.0,
          topP: 0.7,
          maxTokens: 8000,
          extra: { max_cot_tokens: 8000 },
          signal: this.abortController.signal
        });
        this.documentsStore.setAnalysisResult(doc.id, result);
        this.$emit('analysis-complete', { result, error: false });
      } catch (error) {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Ошибка при анализе документа:', error?.message || error);
        this.documentsStore.setAnalysisError(doc.id, true);
        this.$emit('analysis-complete', { result: null, error: true });
      }
    },

    async extractPdfText(doc) {
      const lib = await this.ensurePdfJs();
      if (!doc?.url || !lib) return '';
      const loadingTask = lib.getDocument(doc.url);
      const pdf = await loadingTask.promise;
      this.totalPages = pdf.numPages;
      let fullText = '';
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    },

    async renderDocx(doc) {
      if (!doc?.file) return;
      const arrayBuffer = await doc.file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      this.documentsStore.setHtmlPreview(doc.id, html);

      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text && !doc.extractedText) {
        this.documentsStore.setExtractedText(doc.id, text);
      }
      this.totalPages = 1;

      const container = this.$refs.documentContainer;
      if (!container) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'docx-preview';
      wrapper.innerHTML = html;
      container.appendChild(wrapper);
    },

    async renderPDF(doc) {
      const lib = await this.ensurePdfJs();
      if (!doc?.url || !lib) return;

      const container = this.$refs.documentContainer;
      if (!container) return;

      container.classList.add('pdf-loading');

      try {
        const loadingTask = lib.getDocument(doc.url);
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
          canvas.style.animation = 'fadeInEffect 0.5s ease';

          const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport
          };
          await page.render(renderContext).promise;

          pageContainer.appendChild(canvas);
          container.appendChild(pageContainer);
        }
      } finally {
        container.classList.remove('pdf-loading');
      }
    },
    toggleAssistant() {
      this.$emit('show-assistant');
    },

    async updatePdfSize() {
      if (!this.selectedDocument || this.selectedDocument.type !== 'pdf') return;
      this.resizing = true;
      try {
        await this.$nextTick();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const container = this.$refs.documentContainer;
        if (container) {
          container.querySelectorAll('.pdf-page-container').forEach((el) => el.remove());
        }
        await this.renderPDF(this.selectedDocument);
      } catch (error) {
        console.error('Error updating PDF size:', error);
      } finally {
        this.resizing = false;
      }
    }
  },
  watch: {
    'selectedDocument.id': {
      immediate: true,
      async handler(newId) {
        if (!newId) {
          this.renderedDocId = null;
          this.totalPages = 0;
          return;
        }
        await this.$nextTick();
        await this.renderSelectedDocument();
        await this.runAnalysisForSelected();
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

.docx-preview {
  padding: 20px 28px;
  font-family: 'PT Sans', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #222;
  user-select: text;
}

.docx-preview :deep(h1),
.docx-preview :deep(h2),
.docx-preview :deep(h3) {
  margin: 1.2em 0 0.5em;
  font-weight: 600;
}

.docx-preview :deep(p) {
  margin: 0.6em 0;
}

.docx-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.docx-preview :deep(td),
.docx-preview :deep(th) {
  border: 1px solid #d9d9d9;
  padding: 6px 10px;
}

.docx-preview :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

.docx-preview :deep(ul),
.docx-preview :deep(ol) {
  padding-left: 1.5em;
  margin: 0.6em 0;
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

.panel__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
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
  position: relative;
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

.file-selector--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.file-selector--open .file-selector__icon {
  transform: rotate(180deg);
}

.file-selector__icon {
  width: 8px;
  height: 8px;
  transition: transform 0.2s ease;
}

.file-selector__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 10px;
  padding: 4px;
  margin: 0;
  list-style: none;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.file-selector__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  gap: 8px;
  border-radius: 6px;
  font-size: 12px;
  color: #333;
}

.file-selector__item:hover {
  background-color: #f3f3f3;
}

.file-selector__item--active {
  background-color: rgba(108, 103, 253, 0.1);
  color: #6c67fd;
  font-weight: 600;
}

.file-selector__item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-selector__item-type {
  font-size: 10px;
  color: #a2a2a2;
  font-weight: 600;
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
  min-height: 30px;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  display: flex;
  align-items: stretch;
}

.progress__info {
  width: 60%;
  display: flex;
  align-items: center;
  gap: 6px;
  border-right: 1px solid #e6e6e6;
  padding: 4px 8px;
}

.progress__bar {
  width: 40%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
}

.bar {
  width: 100px;
  height: 10px;
  background-color: #d9d9d9;
  border-radius: 50px;
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  width: 0;
  background-color: #4caf50;
  border-radius: 50px;
  transition: width 0.3s ease;
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
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
}

.risk-panel {
  width: 100%;
  height: 100%;
  border-left: 1px solid #e6e6e6;
}
</style>