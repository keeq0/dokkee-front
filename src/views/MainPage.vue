<template>
  <div class="main-page">
    <div class="main-page__header">
      <h1 class="main-page__title">Загрузка документов</h1>
      <button 
        class="main-page__hide" 
        @click="toggleUploadDocuments"
        :disabled="uploadDocumentsCollapsed"
        :class="{ 'disabled': uploadDocumentsCollapsed }">
        Скрыть меню
      </button>
    </div>
    <div class="main-page__content">
      <div class="upload-documents-container" :class="{ 'collapsed': uploadDocumentsCollapsed }">
        <UploadDocuments 
         @update-pdf="handlePdfUpdate"
          :collapsed="uploadDocumentsCollapsed"
          @toggle-menu="uploadDocumentsCollapsed = false"
          :processing="processing" 
          @processing-started="handleProcessingStarted" 
          @document-uploaded="handleDocumentUploaded" />
      </div>
      <div class="analysis-container" :class="{ 'expanded': uploadDocumentsCollapsed }">
          <AnalysisResult 
            v-if="showAnalysis" 
             ref="analysisResult"
            :expanded="uploadDocumentsCollapsed"
            :documentUrl="uploadedDocumentUrl"
            :documentName="uploadedDocumentName"
            @analysis-complete="handleAnalysisComplete"
            @show-assistant="activateAssistant" />
        </div>
      
      <AiAssistant 
        v-if="showAssistant"
        ref="assistantRef"
        :visible="assistantVisible" 
        @close="hideAssistant"
        @processing-complete="handleProcessingComplete"
        :analysisResult="analysisData.result"
        :analysisError="analysisData.error" />
    </div>
  </div>
</template>

<script>
import AiAssistant from '@/components/AiAssistant.vue';
import AnalysisResult from '@/components/AnalysisResult.vue';
import UploadDocuments from '@/components/UploadDocuments.vue';

export default {
  name: 'MainPage',
  components: { AiAssistant, AnalysisResult, UploadDocuments },
  data() {
    return {
      uploadDocumentsCollapsed: false,
      showUploadDocuments: true,
      processing: false,
      showAssistant: false,
      assistantVisible: false,
      showAnalysis: false,
      uploadedDocumentUrl: '',
      uploadedDocumentName: '',
      analysisData: {
        result: null,
        error: false
      }
    }
  },
  methods: {
    handlePdfUpdate() {
    this.$nextTick(() => {
      if (this.$refs.analysisResult) {
        this.$refs.analysisResult.updatePdfSize();
      }
    });
  },
  toggleUploadDocuments() {
    this.uploadDocumentsCollapsed = !this.uploadDocumentsCollapsed;
    this.$nextTick(() => {
      if (this.$refs.analysisResult) {
        this.$refs.analysisResult.updatePdfSize();
      }
    });
  },
    handleAnalysisComplete(data) {
      this.analysisData = data;
      if (this.showAssistant) {
        this.assistantVisible = true;
      }
    },

    activateAssistant() {
      this.showAssistant = true;
      this.$nextTick(() => {
        this.assistantVisible = true;
      });
    },


    handleProcessingStarted() {
      this.processing = true;
      setTimeout(() => {
        this.activateAssistant();
        this.assistantVisible = false; 
        this.$nextTick(() => {
          setTimeout(() => {
            this.assistantVisible = true;
          }, 50);
        });
      }, 1000);
      setTimeout(() => {
        this.showAnalysis = true;
      }, 2500);
    },
    handleProcessingComplete() {
      this.processing = false;
    },
    handleDocumentUploaded(file) {
      this.uploadedDocumentUrl = URL.createObjectURL(file);
      this.uploadedDocumentName = file.name;
    },

    hideAssistant() {
      this.assistantVisible = false;
    }
  }
}
</script>

<style scoped>


.upload-documents-container {
  width: 450px;
  transition: width 0.3s ease;
}

.upload-documents-container.collapsed {
  width: 70px;
  
}

/* Анимация для плавного скрытия */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.5s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.main-page__title {
  font-size: 28px;
}
.main-page__content {
  display: flex;
  position: relative;
  height: 600px
}

.analysis-container {
  position: absolute;
  left: 470px; /* 450px + 20px gap */
  width: 620px;
  transition: all 0.3s ease;
}

.analysis-container.expanded {
  left: 75px; /* 55px + 20px gap */
  width: calc(100% - 95px); /* 55px + 20px*2 gap */
  max-width: 900px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.analysis-result-wrapper {
  flex: 1;
  min-width: 520px;
  transition: all 0.3s ease;
}



.analysis-result-wrapper.expanded {
  width: calc(100% - 75px); 
  max-width: none;
}

.main-page__header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-bottom: 20px;
}

.main-page__hide {
  width: fit-content;
  height: 25px;
  background: #fff;
  border: none;
  outline: none;
  border-radius: 10px;
  color: #000;
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #e6e6e6;
  padding: 0 10px;
}

.main-page__hide:hover:not(.disabled) {
  background-color: #f7f7f7;
}

.main-page__hide.disabled {
  color: #e6e6e6;
  cursor: not-allowed;
  border-color: #e6e6e6;
}
</style>