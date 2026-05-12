<template>
  <div
    :class="['assistant', { 'assistant--visible': internalVisible, 'assistant--fullscreen': isFullscreen }]"
    :style="{ width: isFullscreen ? '100%' : currentWidth + 'px' }"
  >
    <div
      v-if="!isFullscreen"
      class="assistant__resize-handle"
      @mousedown="startResize"
    ></div>

    <div class="assistant__header">
      <div class="assistant__title">
        <h3>ИИ-помощник</h3>
        <h2>Анализ документа(-ов)</h2>
      </div>
      <div class="assistant__header-actions">
        <button class="fullscreen-toggle" @click="toggleFullscreen">
          <img src="@/assets/fullscreen.svg" alt="fullscreen" />
        </button>
        <button
          v-if="headings.length > 0 && allMessagesComplete"
          class="nav-toggle"
          @click="toggleToc"
        >
          Навигация
        </button>
        <button class="assistant__close" @click="hideAssistant">
          <p>Скрыть</p>
        </button>
      </div>
    </div>

    <!-- Панель навигации -->
    <transition name="toc-slide">
      <div v-if="showToc" class="toc-panel">
        <div class="toc-header">
          <span>Содержание</span>
          <button @click="showToc = false">✕</button>
        </div>
        <ul>
          <li
            v-for="(heading, idx) in headings"
            :key="idx"
            :style="{ paddingLeft: (heading.level - 2) * 12 + 'px' }"
            @click="scrollToHeading(idx)"
          >
            {{ heading.text }}
          </li>
        </ul>
      </div>
    </transition>

    <!-- Область сообщений (отчёт + чат) -->
    <div
      class="assistant__messages"
      ref="messagesContainer"
      @scroll="handleScroll"
    >
      <!-- Первое сообщение (анализ) -->
      <div class="assistant__first-message">
        <template v-if="showFirstLoading">
          <div class="loading-dots">•••</div>
        </template>
        <template v-else>
          <div class="message message--first">
            <img src="@/assets/ai.svg" class="assistant__logo" alt="" />
            <p class="message__text message__text--no-margin" v-html="typedFirstMessage"></p>
          </div>
        </template>
      </div>

      <div v-if="firstMessageComplete" class="dashed-line"></div>

      <!-- Второе сообщение (отчёт) -->
      <div class="assistant__second-message" v-if="firstMessageComplete">
        <template v-if="showSecondLoading">
          <div class="loading-dots">•••</div>
        </template>
        <template v-else>
          <div class="message message--complete">
            <div class="message__header-row">
              <img src="@/assets/ai.svg" class="assistant__logo" alt="" />
              <h4 class="message__header message__header--no-margin" v-html="typedSecondHeader"></h4>
            </div>
            <div class="message__text" v-html="displayText"></div>
          </div>
        </template>
      </div>

      <!-- История чата -->
      <div
        v-if="allMessagesComplete && chatMessages.length"
        class="chat-history"
        :key="chatHistoryKey"
      >
        <div
          v-for="(msg, idx) in chatMessages"
          :key="'msg-' + idx"
          :class="['chat-message', msg.role === 'user' ? 'chat-message--user' : 'chat-message--ai']"
        >
          <div class="chat-message__avatar">
            <img v-if="msg.role === 'user'" src="@/assets/user.png" alt="user" />
            <img v-else src="@/assets/ai.svg" alt="ai" />
          </div>
          <div class="chat-message__content" v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>

      <!-- Индикатор загрузки ответа -->
      <div v-if="isWaitingForAnswer" class="chat-message chat-message--ai chat-message--loading">
        <div class="chat-message__avatar">
          <img src="@/assets/ai.svg" alt="ai" />
        </div>
        <div class="chat-message__content">
          <div class="typing-indicator">•••</div>
        </div>
      </div>

      <div
        v-if="showScrollToBottom"
        class="scroll-to-bottom"
        @click="scrollToBottom"
      >
        <img src="@/assets/arrow_down.png" class="scroll-to-bottom__icon" alt="" />
      </div>
    </div>

    <!-- Поле ввода сообщений -->
    <div class="chat-input-area" v-if="allMessagesComplete">
      <textarea
        v-model="questionText"
        class="chat-input"
        placeholder="Задайте вопрос ИИ-помощнику"
        :disabled="isWaitingForAnswer"
        rows="3"
        @keydown.enter.prevent="sendQuestion"
      ></textarea>
      <button
        class="chat-send"
        :class="{ active: questionText.trim().length > 0 }"
        :disabled="isWaitingForAnswer || questionText.trim().length === 0"
        @click="sendQuestion"
      >
        <img src="@/assets/arrow_right-white.png" alt="send" />
      </button>
    </div>

    <footer class="assistant__footer">
      <div class="footer__text">
        Есть вопросы или что-то не устраивает? Мы всегда открыты к вашим отзывам и предложениям — свяжитесь с нами, и мы постараемся решить любые возникшие проблемы.
      </div>
      <button
        class="footer__button report"
        :class="{ visible: allMessagesComplete }"
        @click="downloadReport"
      >
        Скачать отчёт
      </button>
    </footer>
  </div>
</template>

<script>
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MarkdownIt from 'markdown-it';
import { chatCompletion } from '@/services/deepseek';

export default {
  name: 'AiAssistant',
  props: {
    visible: { type: Boolean, default: false },
    analysisResult: String,
    analysisError: Boolean,
    documentUrl: { type: String, default: '' },
    documentText: { type: String, default: '' }
  },
  data() {
    return {
      internalVisible: this.visible,
      isFullscreen: false,
      savedWidth: 0,
      firstMessageComplete: false,
      showFirstLoading: true,
      fullFirstMessage:
        'Я начинаю анализ прикрепленных вами документов. Вы получите полный отчёт и рекомендации. Пожалуйста, подождите минуточку!',
      typedFirstMessage: '',
      firstTypingIndex: 0,
      firstTypingInterval: null,
      showSecondLoading: true,
      fullSecondHeader: 'Анализ ваших документов успешно завершен.',
      fullSecondBody: this.analysisError
        ? 'Анализ недоступен'
        : this.analysisResult || 'Идет анализ документа...',
      typedSecondHeader: '',
      displayText: '',
      secondTypingIndex: 0,
      secondTypingInterval: null,
      headerTypingSpeed: 20,
      allMessagesComplete: false,
      showScrollToBottom: false,
      waitingForAnalysis: false,
      currentWidth: 0,
      isResizing: false,
      startX: 0,
      startWidth: 0,
      minWidth: 430,
      maxWidth: 0,
      md: null,
      headings: [],
      showToc: false,
      rawHtml: '',
      chatMessages: [],
      questionText: '',
      isWaitingForAnswer: false,
      chatHistoryKey: 0
    };
  },
  watch: {
    visible(newVal) {
      this.internalVisible = newVal;
    },
    analysisResult(newVal) {
      if (newVal && this.waitingForAnalysis && !this.allMessagesComplete) {
        this.fullSecondBody = newVal;
        this.startSecondSequence();
        this.waitingForAnalysis = false;
      } else if (newVal && !this.allMessagesComplete) {
        this.fullSecondBody = newVal;
      }
    },
    analysisError(newVal) {
      if (newVal && this.waitingForAnalysis && !this.allMessagesComplete) {
        this.fullSecondBody = 'Анализ недоступен';
        this.startSecondSequence();
        this.waitingForAnalysis = false;
      } else if (newVal && !this.allMessagesComplete) {
        this.fullSecondBody = 'Анализ недоступен';
      }
    },
    documentUrl(newUrl, oldUrl) {
      // Сброс чата при смене документа
      if (newUrl && newUrl !== oldUrl) {
        this.chatMessages = [];
        this.chatHistoryKey++;
      }
    }
  },
  created() {
    this.md = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
      typographer: true
    });
    this.md.enable(['table']);
  },
  mounted() {
    this.updateMaxWidth();
    window.addEventListener('resize', this.updateMaxWidth);
    this.currentWidth = Math.min(
      Math.max(window.innerWidth * 0.465, this.minWidth),
      this.maxWidth
    );
    setTimeout(() => {
      this.showFirstLoading = false;
      this.startFirstTyping();
    }, 2000);
    this.$nextTick(() => this.handleScroll());
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateMaxWidth);
    if (this.firstTypingInterval) clearInterval(this.firstTypingInterval);
    if (this.secondTypingInterval) clearInterval(this.secondTypingInterval);
  },
  methods: {
    // ----- Рендеринг Markdown -----
    renderMarkdown(text) {
      if (!text) return '';
      try {
        return this.md ? this.md.render(text) : this.escapeHtml(text);
      } catch (e) {
        return this.escapeHtml(text);
      }
    },
    escapeHtml(str) {
      return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
    },

    // ----- Управление панелью -----
    hideAssistant() {
      this.internalVisible = false;
      this.$emit('close');
    },
    toggleToc() {
      this.showToc = !this.showToc;
    },
    toggleFullscreen() {
      if (this.isFullscreen) {
        this.isFullscreen = false;
        this.currentWidth = this.savedWidth || Math.min(
          Math.max(window.innerWidth * 0.465, this.minWidth),
          this.maxWidth
        );
      } else {
        this.savedWidth = this.currentWidth;
        this.isFullscreen = true;
      }
    },

    // ----- Изменение размера (без анимации) -----
    updateMaxWidth() {
      this.maxWidth = window.innerWidth * 0.79;
      if (this.currentWidth > this.maxWidth) this.currentWidth = this.maxWidth;
    },
    startResize(e) {
      if (this.isFullscreen) return;
      e.preventDefault();
      this.isResizing = true;
      this.startX = e.clientX;
      this.startWidth = this.currentWidth;
      document.addEventListener('mousemove', this.handleResize);
      document.addEventListener('mouseup', this.stopResize);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    handleResize(e) {
      if (!this.isResizing || this.isFullscreen) return;
      e.preventDefault();
      let newWidth = this.startWidth - (e.clientX - this.startX);
      newWidth = Math.min(Math.max(newWidth, this.minWidth), this.maxWidth);
      this.currentWidth = Math.min(newWidth, window.innerWidth - 50);
    },
    stopResize() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },

    // ----- Первое сообщение -----
    startFirstTyping() {
      const text = this.fullFirstMessage;
      this.typedFirstMessage = '';
      this.firstTypingIndex = 0;
      this.firstTypingInterval = setInterval(() => {
        this.typedFirstMessage += text[this.firstTypingIndex];
        this.firstTypingIndex++;
        if (this.firstTypingIndex >= text.length) {
          clearInterval(this.firstTypingInterval);
          this.firstMessageComplete = true;
          this.waitForAnalysis();
        }
      }, 4);
    },
    waitForAnalysis() {
      this.waitingForAnalysis = true;
      this.showSecondLoading = true;
      if (this.analysisResult || this.analysisError) {
        this.startSecondSequence();
        this.waitingForAnalysis = false;
      }
    },

    // ----- Второе сообщение (отчёт) -----
    startSecondSequence() {
      this.showSecondLoading = false;
      this.startSecondTypingHeader();
    },
    startSecondTypingHeader() {
      this.typedSecondHeader = '';
      this.secondTypingIndex = 0;
      const interval = setInterval(() => {
        this.typedSecondHeader += this.fullSecondHeader[this.secondTypingIndex];
        this.secondTypingIndex++;
        if (this.secondTypingIndex >= this.fullSecondHeader.length) {
          clearInterval(interval);
          this.prepareFullHtml();
        }
      }, this.headerTypingSpeed);
      this.secondTypingInterval = interval;
    },
    prepareFullHtml() {
      let cleanText = this.fullSecondBody.replace(/^[-—*_]{3,}\s*$/gm, '');
      try {
        let fullHtml = this.md ? this.md.render(cleanText) : '<p>Ошибка парсера</p>';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = fullHtml;
        const headings = [];
        tempDiv.querySelectorAll('h2, h3, h4').forEach((tag, idx) => {
          const level = parseInt(tag.tagName[1]);
          const text = tag.innerText;
          const id = `heading-${idx}`;
          tag.id = id;
          headings.push({ text, level, id });
        });
        this.headings = headings;
        this.rawHtml = tempDiv.innerHTML;
        this.startTypingContent();
      } catch (error) {
        this.rawHtml = '<p style="color:red">Ошибка при формировании отчёта.</p>';
        this.startTypingContent();
      }
    },
    startTypingContent() {
      this.displayText = this.rawHtml;
      this.allMessagesComplete = true;
      this.$emit('processing-complete');
      this.scrollToBottom();
    },

    // ----- Прокрутка -----
    handleScroll() {
      const container = this.$refs.messagesContainer;
      if (!container) return;
      const nearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) <= 20;
      this.showScrollToBottom = !nearBottom && container.scrollHeight > container.clientHeight;
    },
    scrollToHeading(index) {
      const heading = this.headings[index];
      if (!heading) return;
      const element = document.getElementById(heading.id);
      if (element && this.$refs.messagesContainer) {
        const elementTop = element.offsetTop;
        this.$refs.messagesContainer.scrollTo({
          top: elementTop - 20,
          behavior: 'smooth'
        });
      }
      this.showToc = false;
    },
    scrollToBottom() {
      if (this.$refs.messagesContainer) {
        this.$refs.messagesContainer.scrollTo({
          top: this.$refs.messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
        this.showScrollToBottom = false;
      }
    },

    // ----- Отправка вопроса -----
    async sendQuestion() {
      if (!this.allMessagesComplete || this.isWaitingForAnswer) return;
      const text = this.questionText.trim();
      if (!text) return;

      const userMsg = { role: 'user', content: text };
      this.chatMessages = [...this.chatMessages, userMsg];
      this.questionText = '';
      this.isWaitingForAnswer = true;
      this.chatHistoryKey++;
      this.$nextTick(() => this.scrollToBottom());

      try {
        const contextPrompt = this.buildContextPrompt();
        const historyForApi = this.chatMessages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content
        }));
        const messagesForApi = [
          { role: 'system', content: contextPrompt },
          ...historyForApi,
          { role: 'user', content: text }
        ];

        const answer = await chatCompletion({
          messages: messagesForApi,
          temperature: 0.7,
          maxTokens: 2000
        });
        const assistantMsg = { role: 'assistant', content: answer };
        this.chatMessages = [...this.chatMessages, assistantMsg];
        this.chatHistoryKey++;
        this.$nextTick(() => this.scrollToBottom());
      } catch (error) {
        let errorMsg = 'Извините, произошла ошибка. Попробуйте позже.';
        if (error.response) errorMsg += ` Код: ${error.response.status}`;
        this.chatMessages = [...this.chatMessages, { role: 'assistant', content: errorMsg }];
        this.chatHistoryKey++;
        this.$nextTick(() => this.scrollToBottom());
      } finally {
        this.isWaitingForAnswer = false;
        this.$nextTick(() => this.scrollToBottom());
      }
    },
    buildContextPrompt() {
      return `Ты – эксперт по юридическому анализу документов. Пользователь ранее загрузил документ, и ты подготовил подробный отчёт по этому документу. Сейчас пользователь задаёт вопросы, связанные с этим документом, его анализом или юридической тематикой в целом.
Ты можешь использовать следующую информацию (отчёт):
"""
${this.fullSecondBody.substring(0, 8000)}
"""
Если вопрос не касается документа, отчёта или юридических аспектов, вежливо объясни, что ты специализируешься только на этой теме. Отвечай развёрнуто, ссылаясь на отчёт, если это уместно. Используй Markdown для форматирования ответа.`;
    },

    // ----- Скачивание отчёта -----
    async downloadReport() {
      try {
        const reportContent = document.createElement('div');
        reportContent.style.cssText = `
          width: 794px;
          min-height: 1123px;
          padding: 50px;
          background: white;
          color: black;
          font-family: 'Arial', sans-serif;
          box-sizing: border-box;
          position: fixed;
          top: -10000px;
          left: -10000px;
          z-index: 10000;
        `;

        const title = document.createElement('h1');
        title.textContent = 'Отчёт анализа документа';
        title.style.cssText = `
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 40px;
          text-align: left;
          color: #2c3e50;
          border-bottom: 2px solid #6C67FD;
          padding-bottom: 15px;
        `;
        reportContent.appendChild(title);

        const metaInfo = document.createElement('div');
        metaInfo.style.cssText = `
          margin-bottom: 30px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          color: #666;
          text-align: left;
        `;
        metaInfo.innerHTML = `
          <div><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</div>
          <div><strong>Время:</strong> ${new Date().toLocaleTimeString('ru-RU')}</div>
          <div><strong>Статус:</strong> Анализ успешно завершен</div>
        `;
        reportContent.appendChild(metaInfo);

        const contentWrapper = document.createElement('div');
        const cleanForPdf = this.fullSecondBody.replace(/^[-—*_]{3,}\s*$/gm, '');
        contentWrapper.innerHTML = this.md.render(cleanForPdf);
        reportContent.appendChild(contentWrapper);

        const signature = document.createElement('div');
        signature.style.cssText = `
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: left;
          font-size: 12px;
          color: #888;
        `;
        signature.innerHTML = `
          <div>Сгенерировано ИИ-помощником</div>
          <div>Dokkee</div>
        `;
        reportContent.appendChild(signature);

        document.body.appendChild(reportContent);

        const canvas = await html2canvas(reportContent, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        document.body.removeChild(reportContent);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Отчет_анализа_${new Date().toISOString().slice(0, 10)}.pdf`);
      } catch (error) {
        console.error('Ошибка при создании PDF:', error);
        alert('Не удалось создать PDF отчёт. Пожалуйста, попробуйте еще раз.');
      }
    }
  }
};
</script>

<style scoped>
.assistant {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: #333;
  color: #fff;
  padding: 20px;
  box-sizing: border-box;
  transform: translateX(100%);
  transition: transform 0.2s ease-out; /* убрали анимацию ширины */
  will-change: transform;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}
.assistant__resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: #444;
  cursor: ew-resize;
  z-index: 1001;
  transition: background 0.2s;
}
.assistant__resize-handle:hover {
  background: #666;
}
.assistant--visible {
  transform: translateX(0);
}

.assistant__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  flex-shrink: 0;
}
.assistant__title h3 {
  font-size: 10px;
  color: #d9d9d9;
  margin: 0;
}
.assistant__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.fullscreen-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
.fullscreen-toggle img {
  width: 18px;
  height: 18px;
  filter: invert(70%);
}
.nav-toggle {
  background: #444;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;
}
.nav-toggle:hover { background: #6C67FD; }
.assistant__close {
  background: transparent;
  border: 1px solid #a2a2a2;
  border-radius: 50px;
  padding: 5px 10px;
  outline: none;
  color: #a2a2a2;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: .2s;
}
.assistant__close:hover { color: #FFF; border-color: #FFF; }

.toc-panel {
  position: absolute;
  right: 20px;
  top: 85px;
  width: 320px;
  max-height: 70vh;
  height: fit-content;
  background: #2a2a2a;
  border-radius: 12px;
  padding: 12px;
  overflow-y: auto;
  z-index: 1002;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  border: 1px solid #555;
}
.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 8px;
  padding-bottom: 4px;
}
.toc-header button { background: none; border: none; color: #aaa; cursor: pointer; font-size: 16px; }
.toc-panel ul { list-style: none; margin: 0; padding: 0; }
.toc-panel li { padding: 4px 8px; cursor: pointer; border-radius: 6px; font-size: 13px; }
.toc-panel li:hover { background: #444; }
.toc-slide-enter-active, .toc-slide-leave-active { transition: all 0.25s ease; }
.toc-slide-enter-from { opacity: 0; transform: translateX(20px); }
.toc-slide-leave-to { opacity: 0; transform: translateX(20px); }

.assistant__messages {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 20px;
  line-height: 1.5;
  font-size: 14px;
  position: relative;
}
.assistant__messages::-webkit-scrollbar { width: 8px; }
.assistant__messages::-webkit-scrollbar-track { background: #444; border-radius: 4px; }
.assistant__messages::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
.assistant__messages::-webkit-scrollbar-thumb:hover { background: #aaa; }

.message.message--first { display: flex; gap: 15px; align-items: flex-start; }
.message.message--complete { display: flex; flex-direction: column; gap: 12px; }
.message__header-row { display: flex; align-items: center; gap: 10px; }
.message__header {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  padding: 0;
  opacity: 0;
  animation: fadeIn 0.25s forwards;
}
/* Убрать отступы только для заголовка второго сообщения */
.message__header--no-margin {
  margin: 0 !important;
  padding: 0 !important;
}
.message__text {
  margin: 0;
  padding: 0;
  opacity: 0;
  animation: fadeIn 0.25s forwards;
}
/* Убрать отступы только для первого сообщения */
.message__text--no-margin {
  margin: 0 !important;
  padding: 0 !important;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.chat-history { margin-top: 20px; }
.chat-message { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
.chat-message--user { flex-direction: row-reverse; }
.chat-message__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: #444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-message__avatar img { width: 20px; height: 20px; }
.chat-message__content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  background: #2c2c2c;
  color: #fff;
  line-height: 1.4;
}
.chat-message--user .chat-message__content { background: #6C67FD; color: white; }
.chat-message--ai .chat-message__content { background: #3a3a3a; }
.chat-message--loading .chat-message__content { background: #3a3a3a; }
.typing-indicator { font-size: 20px; letter-spacing: 2px; animation: blink 1.2s infinite; }
@keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }

.chat-input-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 20px;
  background: transparent;
  width: 100%;
  flex-shrink: 0;
}
.chat-input {
  width: 100%;
  height: 100px;
  border: 1px solid #5e5e5e;
  border-radius: 30px;
  padding: 15px;
  background: #333;
  color: #fff;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
}
.chat-input:focus { border-color: #6C67FD; }
.chat-input:disabled { opacity: 0.6; }
.chat-send {
  width: 25px;
  height: 25px;
  background-color: #a2a2a2;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.chat-send.active { background-color: #6C67FD; }
.chat-send img { width: 14px; height: 14px; filter: brightness(0) invert(1); }
.chat-send:disabled { cursor: not-allowed; opacity: 0.5; }

/* Остальные элементы получают стандартные отступы (было) */
.assistant__messages :deep(h1),
.assistant__messages :deep(h2),
.assistant__messages :deep(h3),
.assistant__messages :deep(h4),
.assistant__messages :deep(h5),
.assistant__messages :deep(h6) {
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.2;
}
.assistant__messages :deep(h1) { font-size: 1.6rem; border-left: 4px solid #6C67FD; padding-left: 12px; }
.assistant__messages :deep(h2) { font-size: 1.4rem; border-bottom: 1px solid #5e5e5e; padding-bottom: 4px; }
.assistant__messages :deep(h3) { font-size: 1.2rem; }
.assistant__messages :deep(h4) { font-size: 1.1rem; }
.assistant__messages :deep(p) {
  margin: 0.8em 0;
  line-height: 1.5;
}
.assistant__messages :deep(ul),
.assistant__messages :deep(ol) { margin: 0.6em 0 0.6em 1.8em; padding-left: 0; }
.assistant__messages :deep(li) { margin: 0.3em 0; line-height: 1.4; }
.assistant__messages :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2em 0;
  font-size: 0.9rem;
  background: #2c2c2c;
  color: #e0e0e0;
}
.assistant__messages :deep(th),
.assistant__messages :deep(td) {
  border: 1px solid #555 !important;
  padding: 8px 10px !important;
  text-align: left;
  vertical-align: top;
}
.assistant__messages :deep(th) { background-color: #444; font-weight: 700; }
.assistant__messages :deep(tr:nth-child(even)) { background-color: #3a3a3a; }
.assistant__messages :deep(pre) {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 1em 0;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.4;
}
.assistant__messages :deep(code) {
  background: #2a2a2a;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
}
.assistant__messages :deep(pre code) { background: transparent; padding: 0; }
.assistant__messages :deep(blockquote) {
  margin: 1em 0;
  padding: 8px 16px;
  border-left: 4px solid #6C67FD;
  background: rgba(108,103,253,0.1);
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: #ccc;
}
.assistant__messages :deep(a) {
  color: #6C67FD;
  text-decoration: none;
  border-bottom: 1px dotted rgba(108,103,253,0.5);
}
.assistant__messages :deep(a):hover { text-decoration: underline; }
.assistant__messages :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, #5e5e5e, #aaa, #5e5e5e);
  margin: 24px 0;
}

.assistant__logo { width: 25px; height: 25px; }
.loading-dots { font-size: 24px; color: #a2a2a2; animation: blink 1s infinite; }
.assistant__footer {
  background: #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 -20px -20px -20px;
  padding: 20px;
  border-top: 1px solid #5e5e5e;
  flex-shrink: 0;
}
.footer__text { font-size: 12px; color: #a2a2a2; max-width: 400px; margin: 0; }
.footer__button.report {
  min-width: 120px;
  height: 30px;
  background-color: #6C67FD;
  border: none;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
  color: #FFF;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 1;
}
.footer__button.report:hover { background-color: #FFF; color: #6C67FD; }
.dashed-line {
  width: 100%;
  height: 1px;
  background: repeating-linear-gradient(90deg, #5e5e5e, #5e5e5e 3px, transparent 3px, transparent 5px);
  margin: 20px 0;
}
.scroll-to-bottom {
  position: sticky;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 25px;
  height: 25px;
  background: #fff;
  color: #333;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  border: 1px solid #a2a2a2;
}
.scroll-to-bottom:hover { background-color: #e6e6e6; }
.scroll-to-bottom__icon { height: 15px; }
</style>