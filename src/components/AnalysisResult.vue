<template>
  <div class="analysis">
    <div class="analysis__header">
      <h2>Анализ документов</h2>
      <p class="header__file">{{ truncatedDocumentName }} ({{ totalPages }} стр.)</p>
    </div>
    <div class="analysis__content">

      <div class="content__document" ref="documentContainer">
      <!-- PDF-страницы будут рендериться здесь -->
      
      <!-- Overlay с точками будет поверх PDF -->
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
        <button class="panel__button ai-assistant" @click="toggleAssistant">
        <img src="@/assets/ai_white.svg" class="button__icon" alt=""/> 
        <p>ИИ-помощник</p>
      </button>
        <button class="panel__button note">
          <img src="@/assets/note.svg" class="button__icon" alt=""/> 
          <p>Новая заметка</p>
        </button>
        <button class="panel__button save">
          <img src="@/assets/save.svg" class="button__icon" alt=""/> 
          <p>Сохранить</p>
        </button>
        <button class="panel__button download">
          <img src="@/assets/save_report.svg" class="button__icon" alt=""/> 
          <p>Скачать отчет</p>
        </button>
        <button class="panel__button download-all">
          <p>Скачать готовый документ</p>
        </button>
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
      resizing: false
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
      const prompt = `Ты — ведущий эксперт с 15+ годами опыта в анализе юридических, технических и коммерческих документов. Твоя задача — провести многоуровневый аудит, выявляя не только явные, но и скрытые риски, пробелы и возможности для оптимизации.
Критерии качества:

Анализ ТОЛЬКО существенных аспектов, способных реально повлиять на правовую/финансовую устойчивость документа.

Контекстный подход: учет юрисдикции, отрасли, типа документа и целей сторон.

Ссылки на законы (для РФ — ГК РФ, ФЗ; для ЕС — директивы, GDPR; иные юрисдикции — соответствующие НПА).

Глубина аргументации: каждый вывод подтверждай цитатами из документа и нормами права.

СТРУКТУРА ОТЧЕТА
1. КОНТЕКСТУАЛЬНАЯ ПРИВЯЗКА
1.1. ИДЕНТИФИКАЦИЯ ДОКУМЕНТА

Тип документа: договор/соглашение/регламент/политика.

Стороны: роли (заказчик/исполнитель, работодатель/сотрудник), статус (юридическое/физическое лицо).

Юрисдикция: страна, язык документа → применяемое право.

1.2. ОТРАСЛЕВАЯ СПЕЦИФИКА

Отрасль: финансы, IT, строительство, персональные данные и т.д.

Регуляторные требования: стандарты (ISO, ГОСТ), отраслевые законы (для IT — ФЗ-152, для финансов — 115-ФЗ).

2. ЮРИДИКО-ТЕХНИЧЕСКИЙ АУДИТ
2.1. ФОРМАЛЬНЫЕ ПАРАМЕТРЫ

Реквизиты: наличие/полнота наименования, даты, подписей, печатей.

Обязательные разделы: проверь соответствие требованиям закона (например: для договоров РФ — существенные условия по ст. 432 ГК РФ).

2.2. СТРУКТУРНАЯ ЦЕЛОСТНОСТЬ

Логика изложения: последовательность разделов, отсутствие противоречий между пунктами.

Ссылочный аппарат: корректность внутренних/внешних ссылок, актуальность упомянутых НПА.

3. СОДЕРЖАТЕЛЬНЫЙ АНАЛИЗ
3.1. ПОЛОЖИТЕЛЬНЫЕ СТОРОНЫ

Защита интересов сторон: сбалансированность обязательств, механизмы разрешения споров.

Соответствие best practices: автоматическая индексация платежей, детализация форс-мажора.

Пример: «П. 5.2 предусматривает арбитражную оговорку (Ст. 45 ФЗ-382 «Об арбитраже»), что снижает риски затяжных судебных процессов».

3.2. ЗОНЫ СОМНЕНИЯ (ТРЕБУЮТ УТОЧНЕНИЯ)

Субъективные формулировки: «разумный срок», «надлежащее качество» без критериев оценки.

Зависимость от внешних факторов: условия, привязанные к незаконтролируемым событиям (например: «доставка осуществляется при наличии валюты у поставщика»).

3.3. КРИТИЧЕСКИЕ РИСКИ

Юридические:

Отсутствие обязательных условий (для трудового договора РФ — не указан размер отпуска по ст. 114 ТК РФ).

Противоречия закону (например: односторонний отказ от договора без оснований по ст. 450 ГК РФ).

Финансовые:

Непропорциональные штрафы (превышение 0.5% за просрочку по ст. 395 ГК РФ).

Отсутствие валютных оговорок при международных расчетах.

Репутационные/Мошеннические:

Требование 100% предоплаты без гарантий (риск неисполнения обязательств).

Нерегламентированный порядок возврата средств.

4. ПРАВОВОЙ АУДИТ
4.1. КОНФЛИКТЫ С ЗАКОНОДАТЕЛЬСТВОМ

Прямые нарушения: укажи конкретные пункты документа и противоречащие им нормы права.

Пример: «П. 3.4 разрешает обработку персональных данных без согласия субъекта, что нарушает ст. 9 GDPR».

4.2. ПРОБЕЛЫ РЕГУЛИРОВАНИЯ

Непредусмотренные сценарии: отсутствие порядка действий при форс-мажоре, неописанный механизм продления договора.

5. РИСК-МЕНЕДЖМЕНТ
5.1. СЦЕНАРНЫЙ АНАЛИЗ

Вероятность реализации рисков: низкая/средняя/высокая (обосновать).

Последствия: финансовые потери, судебные иски, репутационный ущерб.

5.2. ПРИНЦИП «RED FLAG FIRST»

Приоритетность устранения рисков:

Угрозы, ведущие к недействительности документа.

Риски с прямыми финансовыми потерями.

Условия, создающие репутационные риски.

6. РЕКОМЕНДАЦИИ
6.1. ОБЯЗАТЕЛЬНЫЕ ИСПРАВЛЕНИЯ

Конкретные правки: «Исключить п. 2.3, противоречащий ст. 12 ФЗ-2300-1 «О защите прав потребителей»».

6.2. СТРАТЕГИЧЕСКИЕ ОПТИМИЗАЦИИ

Долгосрочные меры: внедрение типовых протоколов, регулярный аудит документа.

6.3. АЛЬТЕРНАТИВНЫЕ РЕШЕНИЯ

Варианты переформулировок: замена «разумный срок» на «не более 10 рабочих дней».

7. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ
Интегральная оценка: 8/10 — документ соответствует базовым требованиям, но содержит 3 критических риска.

Уровень готовности: 70% (требуется доработка разделов 3.1, 5.4, 7.2).

Приоритетные действия:

Устранить противоречия с [указать закон] в течение 5 дней.

Ввести механизм гарантийных удержаний.

ФОРМАТИРОВАНИЕ И ЯЗЫК
Визуальное выделение: ключевые термины CAPS, разделы — жирный шрифт.

Структура: пустые строки между смысловыми блоками, нумерация разделов.

Лексика: профессиональная, без шаблонов. Запрещены фразы «возможно», «на усмотрение» — только аргументированные утверждения.

ВАЖНО:

Если документ составлен безупречно — укажи это, но предложи профилактические улучшения (например: добавление медиативной оговорки).

НЕ ДОПУСКАЙ гипотетических рисков без прямой связи с контекстом документа.

OUTPUT: Отчет на русском/английском языке (в зависимости от языка документа) с четким разделением на разделы.
      Документ для анализа:
      ${text.substring(0, 15000)}`;

      try {
        console.log('Отправка запроса к Deepseek API...');
        const response = await axios.post(
          'https://api.deepseek.com/chat/completions',
          {
            messages: [
              {
                content: "You are a professional document analyst",
                role: "system"
              },
              {
                content: prompt,
                role: "user"
              }
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
            }
          }
        );
        
        console.log('Ответ от Deepseek API:', response.data);

        this.analysisResult = response.data.choices[0].message.content;
        this.analysisError = false;
      } catch (error) {
        console.error('Ошибка при анализе документа:', error);
        this.analysisResult = null;
        this.analysisError = true;
      }
      
      this.$emit('analysis-complete', {
        result: this.analysisResult,
        error: this.analysisError
      });
    },


    async extractPdfText() {
      if (!this.documentUrl || !this.pdfjsLib) return;
      const loadingTask = this.pdfjsLib.getDocument(this.documentUrl);
      const pdf = await loadingTask.promise;
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
        // Увеличиваем задержку с 50ms до 150ms
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
    analysisResult(newVal) {
    if (newVal && this.waitingForAnalysis) {
      this.fullSecondBody = this.formatAnalysisText(newVal);
      this.startSecondSequence();
      this.waitingForAnalysis = false;
    }
  },
    documentUrl(newVal) {
      if (newVal && this.pdfjsLib) {
        this.renderPDF();
        
        this.extractPdfText();
      }
    }
  },
  async mounted() {
    if (this.documentUrl) {
      this.pdfjsLib = await import(/* webpackIgnore: true */ '/pdfjs/legacy/build/pdf.mjs');
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/legacy/build/pdf.worker.mjs';
      this.renderPDF();
      
      this.extractPdfText();
    }
  }
};
</script>

<style scoped>
@keyframes fadeInEffect {
  from { opacity: 0; }
  to { opacity: 1; }
}


.analysis {
  width: 88%;
  height: 100%;
  background-color: #FFF;
  border-radius: 30px;
  border: 1px solid #E6E6E6;
  padding: 15px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}




.expanded .analysis {
  width: 900px;
}
.analysis__header {
  display: flex;
  gap: 15px;
  align-items: center;
  padding-bottom: 20px;
}
.header__file {
  font-size: 12px;
  font-weight: 500;
  color: #a2a2a2;
}
.analysis__content {
  display: flex;
  gap: 10px;
}
.content__document {
  width: 100%;
  height: 500px;
  overflow: scroll;
}

.expanded .content__document {
  width: 780px; /* 900px - padding и т.д. */
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
  width: 130px;
  transition: all 0.3s ease;
}
.panel__levels {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
  margin: 0;
}
.levels__item {
  display: flex;
  gap: 5px;
  align-items: center;
}
.item__color {
  width: 5px;
  height: 5px;
  border-radius: 100%;
}
.green {
  background-color: #008000;
}
.yellow {
  background-color: #FFFF00;
}
.red {
  background-color: #FF0000;
}
.item__text {
  font-size: 11px;
  transition: all 0.3s ease;
}
.panel__button {
  width: 120px;
  height: 35px;
  border-radius: 12px;
  outline: none;
  border: none;
  margin-top: 10px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.3s ease;
}
.ai-assistant {
  background-color: #6C67FD;
  color: #FFF;
  border: 1px solid #6C67FD;
  margin-bottom: 20px;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
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
  color: #6C67FD;
  border: 1px solid #6C67FD;
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
  width: 160px; /* Увеличиваем ширину */
}

.expanded .panel__button {
  width: 150px; /* Ширина кнопок */
  height: 42px; /* Высота кнопок */
  font-size: 13px; /* Размер текста */
  gap: 8px; /* Расстояние между иконкой и текстом */
}

.expanded .button__icon {
  width: 18px; /* Размер иконок */
  height: 18px;
}

.expanded .panel__levels {
  gap: 8px; /* Увеличиваем промежутки между элементами */
}

.expanded .levels__item {
  gap: 8px;
}

.expanded .item__color {
  width: 7px; /* Размер цветных индикаторов */
  height: 7px;
}

.expanded .item__text {
  font-size: 13px; /* Размер текста */
}

.expanded .download-all {
  height: 60px; /* Высота большой кнопки */
}
</style>