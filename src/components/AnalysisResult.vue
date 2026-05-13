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
      <div
        class="analysis__font-size-selector"
        :class="{ 'font-size-selector--open': fontSizeOpen }"
        @click="toggleFontSize"
        ref="fontSizeRoot">
        <p class="font-size-selector__size">{{ fontScalePercent }}%</p>
        <img src="@/assets/black-arrow.png" class="file-selector__icon" />
        <div v-if="fontSizeOpen" class="font-size-popover" @click.stop>
          <label class="font-size-popover__label" for="font-size-input">Размер текста</label>
          <div class="font-size-popover__controls">
            <input
              id="font-size-input"
              type="number"
              class="font-size-popover__input"
              :min="fontScaleMin"
              :max="fontScaleMax"
              step="1"
              :value="fontScalePercent"
              @input="onFontScaleInput"
              @blur="commitFontScale"
              @keydown.enter="commitFontScale" />
            <span class="font-size-popover__unit">%</span>
            <button
              type="button"
              class="font-size-popover__reset"
              :disabled="fontScalePercent === 100"
              @click="resetFontScale">
              Сброс
            </button>
          </div>
          <input
            type="range"
            class="font-size-popover__slider"
            :min="fontScaleMin"
            :max="fontScaleMax"
            step="1"
            :value="fontScalePercent"
            @input="onFontScaleInput" />
          <div class="font-size-popover__legend">
            <span>{{ fontScaleMin }}%</span>
            <span>100%</span>
            <span>{{ fontScaleMax }}%</span>
          </div>
        </div>
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
        <div
          v-if="documents.length > 0"
          class="progress__popover"
          role="tooltip">
          <ul class="progress__popover-list">
            <li
              v-for="item in documentProgressList"
              :key="item.id"
              class="progress__popover-item"
              :class="{ 'progress__popover-item--active': item.isSelected }">
              <span class="progress__popover-name" :title="item.name">{{ item.name }}</span>
              <div class="progress__popover-bar">
                <div class="progress__popover-fill" :style="{ width: item.progress + '%' }"></div>
              </div>
              <span class="progress__popover-percent">{{ item.progress }}%</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="analysis__content">

      <div
        class="content__document"
        ref="documentContainer"
        :style="{ '--preview-font-scale': fontScale }">
        <div
          v-if="activeRisk && riskPopoverPosition"
          class="risk-popover"
          :class="`risk-popover--${RISK_LEVEL_KEYS[activeRisk.level]}`"
          :style="{ top: riskPopoverPosition.top + 'px', left: riskPopoverPosition.left + 'px' }"
          @click.stop>
          <header class="risk-popover__header">
            <span class="risk-popover__level">{{ activeRisk.level }}</span>
            <button type="button" class="risk-popover__close" @click="closeRiskPopover">×</button>
          </header>
          <h5 class="risk-popover__title">{{ activeRisk.name }}</h5>
          <blockquote class="risk-popover__quote">{{ activeRisk.quote }}</blockquote>
          <p class="risk-popover__comment">{{ activeRisk.comment }}</p>
          <div class="risk-popover__actions">
            <button
              type="button"
              class="risk-popover__btn"
              :disabled="!activeRisk.recommendations?.length"
              @click="recommendationsExpanded = !recommendationsExpanded">
              {{ recommendationsExpanded ? 'Скрыть' : 'Рекомендации' }}
              <span v-if="activeRisk.recommendations?.length"> ({{ activeRisk.recommendations.length }})</span>
            </button>
            <button
              type="button"
              class="risk-popover__btn risk-popover__btn--primary"
              @click="askAiAboutRisk">
              Спросить у ИИ
            </button>
          </div>
          <ul v-if="recommendationsExpanded && activeRisk.recommendations?.length" class="risk-popover__recommendations">
            <li v-for="(rec, idx) in activeRisk.recommendations" :key="idx">{{ rec }}</li>
          </ul>
        </div>
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
          <button
            class="panel__button save"
            :disabled="!analysisComplete || isExporting"
            @click="downloadReport">
            <p>{{ isExporting ? 'Готовлю...' : 'Скачать отчёт' }}</p>
          </button>
        </div>
        <div class="risk-panel">
          <p v-if="!risks.length" class="risk-panel__empty">
            Риски появятся после анализа документа.
          </p>
          <template v-else>
            <section
              v-for="level in [RISK_LEVEL.DANGER, RISK_LEVEL.WARN, RISK_LEVEL.GOOD]"
              :key="level"
              v-show="groupedRisks[level].length > 0"
              class="risk-panel__group"
              :class="`risk-panel__group--${RISK_LEVEL_KEYS[level]}`">
              <h4 class="risk-panel__group-title">{{ level }} ({{ groupedRisks[level].length }})</h4>
              <ul class="risk-panel__list">
                <li
                  v-for="risk in groupedRisks[level]"
                  :key="risks.indexOf(risk)"
                  class="risk-panel__item"
                  :class="{ 'risk-panel__item--active': activeRiskKey === risks.indexOf(risk) }"
                  @click="selectRisk(risks.indexOf(risk))">
                  {{ risk.name || risk.quote.slice(0, 40) }}
                </li>
              </ul>
            </section>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import mammoth from 'mammoth';
import { mapStores } from 'pinia';
import { chatCompletion, DEEPSEEK_MODELS } from '@/services/deepseek';
import { downloadAnalysisReport } from '@/services/reportExport';
import {
  buildAnalysisPrompt,
  parseAnalysisResponse,
  groupRisksByLevel,
  RISK_LEVEL,
  RISK_LEVEL_KEYS
} from '@/services/risks';
import { useDocumentsStore, DOCUMENT_STATUS } from '@/stores/documents';
import {
  createProgressEmulator,
  getProgressStatusText
} from '@/composables/useAnalysisProgress';

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
      fileSelectorOpen: false,
      fontSizeOpen: false,
      fontScalePercent: 100,
      fontScaleMin: 50,
      fontScaleMax: 200,
      renderedDocId: null,
      analysisControllers: new Map(),
      emulators: new Map(),
      onDocumentClick: null,
      activeRiskKey: null,
      recommendationsExpanded: false,
      riskPopoverPosition: null,
      isExporting: false,
      RISK_LEVEL,
      RISK_LEVEL_KEYS
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
      if (this.analysisError) return 'Ошибка анализа';
      if (this.analysisComplete) return 'Анализ завершён';
      if (this.analysisInProgress) {
        return getProgressStatusText(this.progressPercent);
      }
      if (!this.hasDocument) return 'Загрузите документ(-ы) для начала работы';
      return 'Загрузите документ(-ы) для начала работы';
    },
    documentProgressList() {
      return this.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        progress: doc.status === DOCUMENT_STATUS.DONE ? 100 : doc.progress || 0,
        isSelected: this.selectedDocument?.id === doc.id
      }));
    },
    fontScale() {
      return this.fontScalePercent / 100;
    },
    risks() {
      return this.selectedDocument?.risks || [];
    },
    groupedRisks() {
      return groupRisksByLevel(this.risks);
    },
    activeRisk() {
      if (this.activeRiskKey === null) return null;
      return this.risks[this.activeRiskKey] || null;
    }
  },
  methods: {
    openFileSelector() {
      if (this.documents.length > 0) {
        this.fileSelectorOpen = !this.fileSelectorOpen;
        if (this.fileSelectorOpen) this.fontSizeOpen = false;
      }
    },
    selectDocument(id) {
      this.fileSelectorOpen = false;
      if (id === this.documentsStore.selectedId) return;
      this.documentsStore.select(id);
    },
    toggleFontSize() {
      this.fontSizeOpen = !this.fontSizeOpen;
      if (this.fontSizeOpen) this.fileSelectorOpen = false;
    },
    clampFontScale(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return this.fontScalePercent;
      return Math.max(this.fontScaleMin, Math.min(this.fontScaleMax, Math.round(n)));
    },
    onFontScaleInput(event) {
      this.fontScalePercent = this.clampFontScale(event.target.value);
    },
    commitFontScale(event) {
      this.fontScalePercent = this.clampFontScale(event.target.value);
    },
    resetFontScale() {
      this.fontScalePercent = 100;
    },
    selectRisk(index) {
      this.activeRiskKey = index;
      this.recommendationsExpanded = false;
      this.fileSelectorOpen = false;
      this.fontSizeOpen = false;
      this.$nextTick(() => this.positionRiskPopover(index));
    },
    closeRiskPopover() {
      this.activeRiskKey = null;
      this.recommendationsExpanded = false;
      this.riskPopoverPosition = null;
    },
    positionRiskPopover(index) {
      const container = this.$refs.documentContainer;
      if (!container) return;
      const mark = container.querySelector(`mark.risk-highlight[data-risk-id="${index}"]`);
      if (!mark) {
        this.riskPopoverPosition = { top: 16, left: 16 };
        return;
      }
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const containerRect = container.getBoundingClientRect();
      const markRect = mark.getBoundingClientRect();
      this.riskPopoverPosition = {
        top: markRect.bottom - containerRect.top + container.scrollTop + 6,
        left: Math.max(8, Math.min(markRect.left - containerRect.left, container.clientWidth - 320))
      };
    },
    askAiAboutRisk() {
      if (!this.activeRisk) return;
      const doc = this.selectedDocument;
      if (doc) {
        this.documentsStore.update(doc.id, { pinnedRisk: { ...this.activeRisk } });
      }
      this.$emit('show-assistant', { risk: this.activeRisk });
      this.closeRiskPopover();
    },
    applyRiskHighlights() {
      const container = this.$refs.documentContainer?.querySelector('.docx-preview');
      if (!container) return;
      this.clearRiskHighlights(container);
      this.risks.forEach((risk, index) => {
        if (!risk?.quote || risk.quote.length < 3) return;
        const levelKey = RISK_LEVEL_KEYS[risk.level];
        if (!levelKey) return;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          const value = node.nodeValue || '';
          const idx = value.indexOf(risk.quote);
          if (idx < 0) continue;
          try {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + risk.quote.length);
            const mark = document.createElement('mark');
            mark.className = `risk-highlight risk-highlight--${levelKey}`;
            mark.dataset.riskId = String(index);
            mark.addEventListener('click', (event) => {
              event.stopPropagation();
              this.selectRisk(index);
            });
            range.surroundContents(mark);
          } catch (error) {
            // если range пересекает несколько узлов - пропускаем риск
          }
          break;
        }
      });
    },
    clearRiskHighlights(rootEl) {
      const root = rootEl || this.$refs.documentContainer;
      if (!root) return;
      root.querySelectorAll('mark.risk-highlight').forEach((mark) => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
        if (parent.normalize) parent.normalize();
      });
    },
    handleDocumentClick(event) {
      if (this.fontSizeOpen && !this.$refs.fontSizeRoot?.contains(event.target)) {
        this.fontSizeOpen = false;
      }
      if (this.fileSelectorOpen) {
        const fileSelector = this.$el.querySelector?.('.file-selector');
        if (fileSelector && !fileSelector.contains(event.target)) {
          this.fileSelectorOpen = false;
        }
      }
      if (this.activeRiskKey !== null) {
        const popover = this.$el.querySelector?.('.risk-popover');
        const isRiskPanel = event.target.closest?.('.risk-panel');
        const isHighlight = event.target.closest?.('mark.risk-highlight');
        if (popover && !popover.contains(event.target) && !isRiskPanel && !isHighlight) {
          this.closeRiskPopover();
        }
      }
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
    startAnalysisForAll(options = []) {
      this.documents.forEach((doc) => {
        if (doc.status !== DOCUMENT_STATUS.IDLE) return;
        if (doc.analysisResult || doc.analysisError) return;
        this.runAnalysisFor(doc.id, options);
      });
    },
    startEmulatorFor(docId) {
      this.stopEmulatorFor(docId);
      const emulator = createProgressEmulator({
        onProgress: (value) => {
          const item = this.documentsStore.byId(docId);
          if (!item) return;
          if (item.status === DOCUMENT_STATUS.DONE || item.status === DOCUMENT_STATUS.ERROR) return;
          this.documentsStore.setProgress(docId, value);
        }
      });
      this.emulators.set(docId, emulator);
      emulator.start();
    },
    stopEmulatorFor(docId) {
      const emulator = this.emulators.get(docId);
      if (emulator) {
        emulator.stop();
        this.emulators.delete(docId);
      }
    },
    async runAnalysisFor(docId, options = []) {
      const doc = this.documentsStore.byId(docId);
      if (!doc) return;
      if (doc.analysisResult || doc.analysisError) return;
      if (doc.status === DOCUMENT_STATUS.ANALYZING || doc.status === DOCUMENT_STATUS.EXTRACTING) return;

      this.startEmulatorFor(docId);

      let text = doc.extractedText;
      if (!text) {
        this.documentsStore.setStatus(docId, DOCUMENT_STATUS.EXTRACTING);
        if (doc.type === 'pdf') {
          text = await this.extractPdfText(doc);
        } else if (doc.type === 'docx') {
          if (!doc.htmlPreview) {
            await this.renderDocx(doc);
          }
          text = this.documentsStore.byId(docId)?.extractedText || '';
        }
        if (text) this.documentsStore.setExtractedText(docId, text);
      }
      if (!text) {
        this.stopEmulatorFor(docId);
        this.documentsStore.setAnalysisError(docId, true);
        return;
      }
      await this.analyzeDocument(doc, text, options);
    },
    async analyzeDocument(doc, text, options = []) {
      const existingController = this.analysisControllers.get(doc.id);
      if (existingController) existingController.abort();
      const controller = new AbortController();
      this.analysisControllers.set(doc.id, controller);
      this.documentsStore.setStatus(doc.id, DOCUMENT_STATUS.ANALYZING);

      try {
        const raw = await chatCompletion({
          model: DEEPSEEK_MODELS.REASONER,
          messages: [
            { role: 'system', content: 'You are a professional document analyst. Always respond in Russian, following the exact formatting instructions.' },
            { role: 'user', content: buildAnalysisPrompt(text, { options }) }
          ],
          temperature: 1.0,
          topP: 0.7,
          maxTokens: 8000,
          extra: { max_cot_tokens: 8000 },
          signal: controller.signal
        });
        const { report, risks } = parseAnalysisResponse(raw);
        this.stopEmulatorFor(doc.id);
        this.documentsStore.setRisks(doc.id, risks);
        this.documentsStore.setAnalysisResult(doc.id, report);
        await this.$nextTick();
        if (doc.type === 'docx' && this.selectedDocument?.id === doc.id) {
          this.applyRiskHighlights();
        }
        this.$emit('analysis-complete', { result: report, error: false, documentId: doc.id });
      } catch (error) {
        this.stopEmulatorFor(doc.id);
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Ошибка при анализе документа:', error?.message || error);
        this.documentsStore.setAnalysisError(doc.id, true);
        this.$emit('analysis-complete', { result: null, error: true, documentId: doc.id });
      } finally {
        this.analysisControllers.delete(doc.id);
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
    async downloadReport() {
      const doc = this.selectedDocument;
      if (!doc?.analysisResult || this.isExporting) return;
      this.isExporting = true;
      try {
        await downloadAnalysisReport({
          title: `Отчёт анализа: ${doc.name}`,
          markdown: doc.analysisResult,
          filename: `report-${doc.name.replace(/\.[^.]+$/, '')}`,
          meta: `Сгенерировано Dockee, ${new Date().toLocaleString('ru-RU')}`
        });
      } catch (error) {
        console.error('Не удалось скачать отчёт:', error?.message || error);
      } finally {
        this.isExporting = false;
      }
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
        this.closeRiskPopover();
        if (!newId) {
          this.renderedDocId = null;
          this.totalPages = 0;
          return;
        }
        await this.$nextTick();
        await this.renderSelectedDocument();
        if (this.selectedDocument?.type === 'docx' && this.risks.length > 0) {
          this.applyRiskHighlights();
        }
      }
    }
  },
  mounted() {
    this.onDocumentClick = (event) => this.handleDocumentClick(event);
    document.addEventListener('click', this.onDocumentClick);
  },
  beforeUnmount() {
    if (this.onDocumentClick) {
      document.removeEventListener('click', this.onDocumentClick);
      this.onDocumentClick = null;
    }
    this.analysisControllers.forEach((controller) => controller.abort());
    this.analysisControllers.clear();
    this.emulators.forEach((emulator) => emulator.stop());
    this.emulators.clear();
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
  transform: scale(var(--preview-font-scale, 1));
  transform-origin: top center;
  transition: transform 0.2s ease;
}
.pdf-page {
  width: 100%;
  max-width: 100%;
  transition: all 0.3s ease;
}

.docx-preview {
  padding: 20px 28px;
  font-family: 'PT Sans', sans-serif;
  font-size: calc(14px * var(--preview-font-scale, 1));
  line-height: 1.5;
  color: #222;
  user-select: text;
  transition: font-size 0.2s ease;
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
  position: relative;
  width: 70px;
  height: 25px;
  border: 1px solid #e6e6e6;
  border-radius: 50px;
  padding: 5px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.analysis__font-size-selector .file-selector__icon {
  transition: transform 0.2s ease;
}

.font-size-selector--open .file-selector__icon {
  transform: rotate(180deg);
}

.font-size-selector__size {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.font-size-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 220px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  z-index: 25;
  cursor: default;
}

.font-size-popover__label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6c67fd;
  margin-bottom: 8px;
}

.font-size-popover__controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.font-size-popover__input {
  width: 56px;
  height: 26px;
  padding: 4px 6px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  outline: none;
  text-align: center;
}

.font-size-popover__input:focus {
  border-color: #6c67fd;
}

.font-size-popover__input::-webkit-outer-spin-button,
.font-size-popover__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.font-size-popover__unit {
  font-size: 12px;
  color: #6b6b6b;
}

.font-size-popover__reset {
  margin-left: auto;
  height: 26px;
  padding: 0 10px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.font-size-popover__reset:hover:not(:disabled) {
  background: #6c67fd;
  color: #fff;
  border-color: #6c67fd;
}

.font-size-popover__reset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.font-size-popover__slider {
  width: 100%;
  margin: 0;
  accent-color: #6c67fd;
  cursor: pointer;
}

.font-size-popover__legend {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #a2a2a2;
  margin-top: 4px;
}

.analysis__progress {
  position: relative;
  width: 300px;
  min-height: 30px;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  display: flex;
  align-items: stretch;
}

.progress__popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 280px;
  max-width: 360px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 30;
}

.analysis__progress:hover .progress__popover,
.analysis__progress:focus-within .progress__popover {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.progress__popover-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress__popover-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px 36px;
  gap: 8px;
  align-items: center;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 11px;
  color: #333;
}

.progress__popover-item--active {
  background: rgba(108, 103, 253, 0.08);
  color: #6c67fd;
  font-weight: 600;
}

.progress__popover-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress__popover-bar {
  height: 6px;
  background: #e9e9e9;
  border-radius: 50px;
  overflow: hidden;
}

.progress__popover-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 50px;
  transition: width 0.3s ease;
}

.progress__popover-percent {
  font-size: 11px;
  text-align: right;
  color: inherit;
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.risk-panel__empty {
  font-size: 11px;
  color: #a2a2a2;
  margin: 0;
}

.risk-panel__group {
  border-radius: 8px;
  padding: 6px 8px;
  border: 1px solid transparent;
}

.risk-panel__group--good {
  background: rgba(0, 128, 0, 0.05);
  border-color: rgba(0, 128, 0, 0.18);
}

.risk-panel__group--warn {
  background: rgba(255, 217, 0, 0.07);
  border-color: rgba(255, 184, 0, 0.3);
}

.risk-panel__group--danger {
  background: rgba(255, 0, 0, 0.05);
  border-color: rgba(255, 0, 0, 0.22);
}

.risk-panel__group-title {
  font-size: 11px;
  font-weight: 600;
  margin: 0 0 6px;
  color: #333;
}

.risk-panel__group--good .risk-panel__group-title { color: #1f7a1f; }
.risk-panel__group--warn .risk-panel__group-title { color: #b58400; }
.risk-panel__group--danger .risk-panel__group-title { color: #c43030; }

.risk-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-panel__item {
  font-size: 11px;
  line-height: 1.3;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  color: #333;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.risk-panel__item:hover {
  background: #fff;
  border-color: #d9d9d9;
}

.risk-panel__item--active {
  background: #fff;
  border-color: #6c67fd;
  color: #6c67fd;
  font-weight: 600;
}

.risk-highlight {
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.risk-highlight:hover {
  filter: brightness(0.95);
}

.risk-highlight--good {
  background-color: rgba(0, 200, 0, 0.25);
}

.risk-highlight--warn {
  background-color: rgba(255, 200, 0, 0.32);
}

.risk-highlight--danger {
  background-color: rgba(255, 70, 70, 0.3);
}

.risk-popover {
  position: absolute;
  z-index: 40;
  width: 300px;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.14);
  overflow: hidden;
  cursor: default;
}

.risk-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.risk-popover--good .risk-popover__header { background: #1f9d4a; }
.risk-popover--warn .risk-popover__header { background: #d99c00; }
.risk-popover--danger .risk-popover__header { background: #d04040; }

.risk-popover__close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.85;
}
.risk-popover__close:hover { opacity: 1; }

.risk-popover__title {
  margin: 8px 12px 4px;
  font-size: 13px;
  font-weight: 600;
}

.risk-popover__quote {
  margin: 4px 12px 6px;
  padding: 6px 8px;
  border-left: 3px solid #d9d9d9;
  background: #f7f7f7;
  font-size: 11px;
  font-style: italic;
  color: #444;
  max-height: 100px;
  overflow-y: auto;
}

.risk-popover__comment {
  margin: 4px 12px;
  font-size: 12px;
  color: #333;
  line-height: 1.35;
}

.risk-popover__actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid #efefef;
}

.risk-popover__btn {
  flex: 1;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.risk-popover__btn:hover:not(:disabled) { background: #f3f3f3; }
.risk-popover__btn:disabled { opacity: 0.4; cursor: not-allowed; }

.risk-popover__btn--primary {
  background: #6c67fd;
  color: #fff;
  border-color: #6c67fd;
}
.risk-popover__btn--primary:hover:not(:disabled) {
  background: #5854d8;
  border-color: #5854d8;
}

.risk-popover__recommendations {
  list-style: disc;
  padding: 0 12px 10px 28px;
  margin: 0;
  font-size: 11px;
  color: #333;
  line-height: 1.4;
}
</style>