<template>
  <div 
    :class="['assistant', { 'assistant--visible': internalVisible }]"
    :style="{ width: currentWidth + 'px' }"
  >
    <div 
      class="assistant__resize-handle"
      @mousedown="startResize"
    ></div>
    <div class="assistant__header">
      <div class="assistant__title">
        <h3>ИИ-помощник</h3>
        <h2>Анализ документа(-ов)</h2>
      </div>
      <button class="assistant__close" @click="hideAssistant">
        <p>Скрыть</p>
        <img src="@/assets/close-assistant.png" class="close__icon" alt="" />
      </button>
    </div>
  
    <div
      class="assistant__messages"
      ref="messagesContainer"
      @scroll="handleScroll"
    >
      <div class="assistant__first-message">
        <template v-if="showFirstLoading">
          <div class="loading-dots">•••</div>
        </template>
        <template v-else>
          <div class="message message--first">
            <img src="@/assets/ai.svg" class="assistant__logo" alt=""/>
            <p class="message__text" v-html="typedFirstMessage"></p>
          </div>
        </template>
      </div>

      <div class="assistant__second-message" v-if="firstMessageComplete">
        <template v-if="showSecondLoading">
          <div class="loading-dots">•••</div>
        </template>
        <template v-else>
          <div class="message message--complete">
            <img src="@/assets/ai.svg" class="assistant__logo" alt=""/>
            <div class="message__content">
              <h4 class="message__header" v-html="typedSecondHeader"></h4>
              <p class="message__text" v-html="typedSecondBody"></p>
            </div>
          </div>
        </template>
      </div>

      <div 
        v-if="showScrollToBottom"
        class="scroll-to-bottom"
        @click="scrollToBottom"
      >
        <img src="@/assets/arrow_down.png" class="scroll-to-bottom__icon" alt="">
      </div>
    </div>

    <footer class="assistant__footer">
      <div class="footer__buttons">
        <button 
          class="footer__button report" 
          :class="{ visible: allMessagesComplete }"
          @click="downloadReport"
        >
          Скачать отчёт
        </button>
        <button class="footer__button full" :class="{ visible: allMessagesComplete }">
          Скачать готовый документ
        </button>
      </div>
      <div class="footer__line" />
      <p class="footer__text">
        Есть вопросы или что-то не устраивает? Мы всегда открыты к вашим отзывам и предложениям — свяжитесь с нами, и мы постараемся решить любые возникшие проблемы.
      </p>
    </footer>
  </div> 
</template>

<script>
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default {
  name: 'AiAssistant',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    analysisResult: String,
    analysisError: Boolean
  },
  data() {
    return {
      internalVisible: this.visible,
      firstMessageComplete: false,
      showFirstLoading: true,
      fullFirstMessage:
        "Я начинаю анализ прикрепленных вами документов. Вы получите полный отчёт и рекомендации. Пожалуйста, подождите минуточку!",
      typedFirstMessage: "",
      firstTypingIndex: 0,
      firstTypingInterval: null,
      showSecondLoading: true,
      fullSecondHeader: "Анализ ваших документов успешно завершен.",
      fullSecondBody: this.analysisError 
        ? "Анализ недоступен" 
        : this.analysisResult || "Идет анализ документа...",
      typedSecondHeader: "",
      typedSecondBody: "",
      secondTypingIndex: 0,
      secondTypingInterval: null,
      headerTypingSpeed: 50,
      bodyTypingSpeed: 0.3,
      allMessagesComplete: false,
      showScrollToBottom: false,
      waitingForAnalysis: false,

      currentWidth: 0,
      isResizing: false,
      startX: 0,
      startWidth: 0,
      minWidth: 430,
      maxWidth: 0
    }
  },
  watch: {
    visible(newVal) {
      this.internalVisible = newVal;
    },
    analysisResult(newVal) {
      if (newVal && this.waitingForAnalysis) {
        this.fullSecondBody = newVal;
        this.startSecondSequence();
        this.waitingForAnalysis = false;
      }
    },
    analysisError(newVal) {
      if (newVal && this.waitingForAnalysis) {
        this.fullSecondBody = "Анализ недоступен";
        this.startSecondSequence();
        this.waitingForAnalysis = false;
      }
    },
  },
  mounted() {
    this.updateMaxWidth();
    window.addEventListener('resize', this.updateMaxWidth);

    this.currentWidth = Math.min(
      Math.max(
        window.innerWidth * 0.465,
        this.minWidth
      ),
      this.maxWidth
    );
   
    setTimeout(() => {
      this.showFirstLoading = false;
      this.startFirstTyping();
    }, 2000);
    
    this.$nextTick(() => {
      this.handleScroll();
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateMaxWidth);
  },
  updated() {
    this.$nextTick(() => {
      if (this.$refs.messagesContainer) {
        this.handleScroll();
      }
    });
  },
  methods: {
    hideAssistant() {
      this.internalVisible = false;
      this.$emit('close');
    },

    updateMaxWidth() {
      this.maxWidth = window.innerWidth * 0.79;
      if (this.currentWidth > this.maxWidth) {
        this.currentWidth = this.maxWidth;
      }
    },

    startResize(e) {
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
      if (!this.isResizing) return;
      e.preventDefault();
      
      const deltaX = e.clientX - this.startX;
      let newWidth = this.startWidth - deltaX;
      
      newWidth = Math.min(Math.max(newWidth, this.minWidth), this.maxWidth);
      const maxPossibleWidth = window.innerWidth - 50;
      this.currentWidth = Math.min(newWidth, maxPossibleWidth);
    },
    
    stopResize() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    
    startFirstTyping() {
      const text = this.fullFirstMessage;
      this.typedFirstMessage = "";
      this.firstTypingIndex = 0;
      this.firstTypingInterval = setInterval(() => {
        this.typedFirstMessage += text[this.firstTypingIndex];
        this.firstTypingIndex++;
        if (this.firstTypingIndex >= text.length) {
          clearInterval(this.firstTypingInterval);
          this.firstMessageComplete = true;
          this.waitForAnalysis();
        }
      }, 12);
    },

    waitForAnalysis() {
      this.waitingForAnalysis = true;
      this.showSecondLoading = true;

      if (this.analysisResult || this.analysisError) {
        this.startSecondSequence();
        this.waitingForAnalysis = false;
      }
    },

    formatAnalysisText(text) {
      if (!text) return '';
      
      const lines = text.split('\n');
      let htmlOutput = '';
      let inList = false;

      lines.forEach((line, index) => {
        line = line.trim();
        
        if (!line) {
          if (index > 0 && index < lines.length - 1 && lines[index - 1].trim() && lines[index + 1].trim()) {
            htmlOutput += '<br>';
          }
          return;
        }

        const headerMatch = line.match(/^(#+)\s*(.*?)\s*$/);
        const isListItem = line.match(/^\s*[-•]\s/) || line.match(/^\s*\d+\.\s/);
        const isIndented = line.match(/^\s{4}/);

        const processBold = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = processBold(headerMatch[2]);

          if (inList) {
            htmlOutput += `</ul>`;
            inList = false;
          }

          if (level === 3) {
            htmlOutput += `<h3 style="font-size:24px;font-weight:bold;margin-bottom:15px">${headerText}</h3>`;
          } 
          else if (level === 4) {
            htmlOutput += `<h4 style="margin-bottom:10px">${headerText}</h4>`;
          }
          else {
            htmlOutput += `<h${level}>${headerText}</h${level}>`;
          }
        }
        else if (isListItem) {
          if (!inList) {
            htmlOutput += `<div style="margin-top:10px">`;
            inList = true;
          }
          const itemText = processBold(line.replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+\.\s*/, ''));
          htmlOutput += `<div>${itemText}</div>`;
        } 
        else {
          if (inList) {
            htmlOutput += `</div>`;
            inList = false;
          }
          
          const cleanLine = processBold(line
            .replace(/^#+\s*/, '')
            .replace(/---/g, '')
            .replace(/--/g, ''));

          if (isIndented) {
            htmlOutput += `<p style="padding-left:20px">${cleanLine}</p>`;
          } else {
            htmlOutput += `<p>${cleanLine}</p>`;
          }
        }
      });

      if (inList) {
        htmlOutput += `</div>`;
      }

      return htmlOutput;
    },
   
    startSecondSequence() {
      this.showSecondLoading = false;
      this.startSecondTypingHeader();
    },

    startSecondTypingHeader() {
      this.typedSecondHeader = "";
      this.secondTypingIndex = 0;
      const headerText = this.fullSecondHeader;
      this.secondTypingInterval = setInterval(() => {
        this.typedSecondHeader += headerText[this.secondTypingIndex];
        this.secondTypingIndex++;
        if (this.secondTypingIndex >= headerText.length) {
          clearInterval(this.secondTypingInterval);
          this.startSecondTypingBody();
        }
      }, this.headerTypingSpeed);
    },

    startSecondTypingBody() {
      this.typedSecondBody = "";
      const bodyText = this.formatAnalysisText(this.fullSecondBody);
      this.secondTypingIndex = 0;
      this.secondTypingInterval = setInterval(() => {
        this.typedSecondBody = bodyText.substring(0, this.secondTypingIndex);
        this.secondTypingIndex++;
        if (this.secondTypingIndex >= bodyText.length) {
          clearInterval(this.secondTypingInterval);
          this.allMessagesComplete = true;
          this.$emit('processing-complete');
        }
      }, this.bodyTypingSpeed);
    },

    handleScroll() {
      const container = this.$refs.messagesContainer;
      const scrollHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
    
      const nearBottom = scrollHeight - (scrollTop + clientHeight) <= 20;
      this.showScrollToBottom = !nearBottom;
    },
    
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    },

    // Метод для скачивания отчёта в PDF
    async downloadReport() {
      try {
        // Создаём временный элемент для форматирования контента
        const reportContent = document.createElement('div');
        reportContent.style.cssText = `
          width: 794px; /* A4 width in pixels at 96 DPI */
          min-height: 1123px; /* A4 height */
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

        // Добавляем заголовок
        const title = document.createElement('h1');
        title.textContent = 'Отчёт анализа документа';
        title.style.cssText = `
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 40px;
          text-align: left; /* Изменено с center на left */
          color: #2c3e50;
          border-bottom: 2px solid #6C67FD;
          padding-bottom: 15px;
        `;
        reportContent.appendChild(title);

        // Добавляем мета-информацию
        const metaInfo = document.createElement('div');
        metaInfo.style.cssText = `
          margin-bottom: 30px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          color: #666;
          text-align: left; /* Добавлено выравнивание по левому краю */
        `;
        metaInfo.innerHTML = `
          <div><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</div>
          <div><strong>Время:</strong> ${new Date().toLocaleTimeString('ru-RU')}</div>
          <div><strong>Статус:</strong> Анализ успешно завершен</div>
        `;
        reportContent.appendChild(metaInfo);

        // Добавляем основной контент анализа
        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = this.formatAnalysisTextForPDF(this.fullSecondBody);
        reportContent.appendChild(contentWrapper);

        // Добавляем подпись
        const signature = document.createElement('div');
        signature.style.cssText = `
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: left; /* Изменено с right на left */
          font-size: 12px;
          color: #888;
        `;
        signature.innerHTML = `
          <div>Сгенерировано ИИ-помощником</div>
          <div>Dokkee</div>
        `;
        reportContent.appendChild(signature);

        document.body.appendChild(reportContent);

        // Используем html2canvas для создания изображения
        const canvas = await html2canvas(reportContent, {
          scale: 2, // Увеличиваем качество
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        // Очищаем временный элемент
        document.body.removeChild(reportContent);

        // Создаём PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Добавляем первую страницу
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Добавляем дополнительные страницы если контент длинный
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Сохраняем PDF
        pdf.save(`Отчет_анализа_${new Date().toISOString().slice(0,10)}.pdf`);

      } catch (error) {
        console.error('Ошибка при создании PDF:', error);
        alert('Не удалось создать PDF отчёт. Пожалуйста, попробуйте еще раз.');
      }
    },

    // Форматирование текста для PDF (аналогично formatAnalysisText, но с учётом особенностей PDF)
    formatAnalysisTextForPDF(text) {
      if (!text) return '';
      
      const lines = text.split('\n');
      let htmlOutput = '';
      let inList = false;

      lines.forEach((line, index) => {
        line = line.trim();
        
        if (!line) {
          if (index > 0 && index < lines.length - 1 && lines[index - 1].trim() && lines[index + 1].trim()) {
            htmlOutput += '<br>';
          }
          return;
        }

        const headerMatch = line.match(/^(#+)\s*(.*?)\s*$/);
        const isListItem = line.match(/^\s*[-•]\s/) || line.match(/^\s*\d+\.\s/);
        const isIndented = line.match(/^\s{4}/);

        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

          if (inList) {
            htmlOutput += `</div>`;
            inList = false;
          }

          let style = '';
          switch(level) {
            case 1:
              style = 'font-size: 28px; font-weight: bold; margin: 40px 0 20px 0; color: #2c3e50;';
              break;
            case 2:
              style = 'font-size: 24px; font-weight: bold; margin: 30px 0 15px 0; color: #34495e;';
              break;
            case 3:
              style = 'font-size: 20px; font-weight: bold; margin: 25px 0 12px 0; color: #2c3e50;';
              break;
            case 4:
              style = 'font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; color: #34495e;';
              break;
            default:
              style = 'font-size: 16px; font-weight: bold; margin: 15px 0 8px 0;';
          }

          htmlOutput += `<div style="${style}">${headerText}</div>`;
        }
        else if (isListItem) {
          if (!inList) {
            htmlOutput += `<div style="margin: 15px 0 15px 20px;">`;
            inList = true;
          }
          const itemText = line.replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+\.\s*/, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          // Уменьшен шрифт для элементов списка с 14px до 12px
          htmlOutput += `<div style="margin-bottom: 5px; font-size: 12px;">• ${itemText}</div>`;
        } 
        else {
          if (inList) {
            htmlOutput += `</div>`;
            inList = false;
          }
          
          const cleanLine = line
            .replace(/^#+\s*/, '')
            .replace(/---/g, '')
            .replace(/--/g, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

          // Уменьшен шрифт для основного текста с 14px до 12px
          let style = 'font-size: 12px; line-height: 1.6; margin: 10px 0;';
          if (isIndented) {
            style += ' padding-left: 40px;';
          }

          htmlOutput += `<div style="${style}">${cleanLine}</div>`;
        }
      });

      if (inList) {
        htmlOutput += `</div>`;
      }

      return htmlOutput;
    }
  }
}
</script>

<style scoped>
.analysis-result {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  padding: 15px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 25px 0 15px 0;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.regular-text {
  font-size: 14px;
  margin: 10px 0;
  text-align: left;
}

.indented-text {
  font-size: 14px;
  margin: 8px 0 8px 20px;
  text-align: left;
}

.text-block {
  margin-bottom: 15px;
}

.assistant {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: #333;
  color: #fff;
  padding: 30px;
  box-sizing: border-box;
  transform: translateX(100%);
  transition: transform 0.2s ease-out;
  will-change: transform;
  z-index: 1000;
}

.assistant__resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  z-index: 1001;
  transition: .2s;
}

.assistant__resize-handle:hover {
  background: #666666;
}

.assistant--visible {
  transform: translateX(0);
}

.assistant__header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding-bottom: 20px;
}

.assistant__title h3 {
  font-size: 12px;
  color: #d9d9d9;
  margin: 0 0 5px 0;
}

.assistant__title h2 {
  font-size: 24px;
  margin: 0;
}

.assistant__close {
  background: transparent;
  border: none;
  outline: none;
  color: #a2a2a2;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.close__icon {
  width: 8px;
}

.assistant__close:hover {
  text-decoration: underline;
  text-underline-position: under;
}

.assistant__logo {
  width: 25px;
  height: 25px;
}

.loading-dots {
  font-size: 24px;
  color: #a2a2a2;
  animation: blink 1s infinite;
}

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

.assistant__messages {
  height: calc(100vh - 250px);
  overflow-y: auto;
  padding-right: 10px;
  position: relative;
}

.assistant__messages::-webkit-scrollbar {
  width: 8px;
}

.assistant__messages::-webkit-scrollbar-track {
  background: #444;
  border-radius: 4px;
}

.assistant__messages::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.message {
  display: flex;
  gap: 15px;
  padding-bottom: 25px;
  align-items: flex-start;
}

.message__text {
  margin: 0;
  line-height: 1.4;
  font-size: 14px;
  opacity: 0;
  animation: fadeIn 0.25s forwards;
}

.message--complete .message__header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  opacity: 0;
  animation: fadeIn 0.25s forwards;
}

.message__content {
  display: flex;
  flex-direction: column;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.assistant__first-message,
.assistant__second-message {
  transition: opacity 0.25s ease-in-out;
}

.assistant__footer {
  padding-top: 10px;
}

.footer__buttons {
  width: 370px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  height: 50px;
}

.footer__button {
  height: 40px;
  width: fit-content;
  border-radius: 10px;
  outline: none;
  border: none;
  padding: 0 15px;
  cursor: pointer;
  transition: opacity 0.5s ease;
  opacity: 0;
}

.footer__button.visible {
  opacity: 1;
}

.report {
  color: #FFF;
  background-color: #6C67FD;
  border: 1px solid #6C67FD;
  transition: 0.2s;
  font-size: 13px;
  font-weight: bold;
}

.full {
  color: #000;
  background-color: #FFF;
  border: 1px solid #FFF;
  transition: 0.2s;
  font-size: 13px;
  font-weight: bold;
}

.report:hover {
  color: #6C67FD;
  background-color: #FFF;
}

.full:hover {
  background-color: #333;
  color: #FFF;
}

.footer__line {
  width: 100%;
  height: 1px;
  background-color: #e6e6e6;
}

.footer__text {
  margin-top: 10px;
  font-size: 12px;
  color: #a2a2a2;
  width: 500px;
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

.scroll-to-bottom:hover {
  background-color: #e6e6e6;
}

.scroll-to-bottom__icon {
  height: 15px;
}
</style>