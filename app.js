/**
 * TIN HOC 10 MASTER - VERCEL APP LOGIC
 * Features:
 * - Full 126 Part 1 Questions + 9 Part 2 Scenarios (36 sub-items)
 * - 4 Comprehensive Exam Sets + 4 True/False Sets
 * - 2 Exam Modes: "Xem kết quả sau khi làm từng câu" & "Xem kết quả sau khi nộp đề"
 * - User Registration & Login System with Profile History Saving
 * - NEW: Custom Answer Editor (Sửa đáp án) for any question with Export to questions.js
 * - Sound Effects & Confetti Animation
 */

// --- AUDIO SYNTHESIZER (Web Audio API) ---
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(146.83, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }
}

// --- CONFETTI ENGINE (Canvas) ---
class ConfettiEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(durationMs = 3500) {
    if (!this.canvas) return;
    this.particles = [];
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    for (let i = 0; i < 150; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height - this.canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 150,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0
      });
    }

    const startTime = Date.now();
    const render = () => {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 1.5;
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.tiltAngle) * 15;

        this.ctx.beginPath();
        this.ctx.lineWidth = p.r;
        this.ctx.strokeStyle = p.color;
        this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        this.ctx.stroke();
      }

      if (Date.now() - startTime < durationMs) {
        this.animationId = requestAnimationFrame(render);
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles = [];
      }
    };

    if (this.animationId) cancelAnimationFrame(this.animationId);
    render();
  }
}

// --- MAIN APPLICATION ---
class QuizApp {
  constructor() {
    this.sound = new SoundEffects();
    this.confetti = null;

    // Load original data from window.QUIZ_BANK
    this.rawBank = window.QUIZ_BANK || { part1: [], part2: [], examSets: [], tfSets: [] };
    
    // Deep clone to allow customizations
    this.bank = JSON.parse(JSON.stringify(this.rawBank));
    this.part1List = this.bank.part1 || [];
    this.part2List = this.bank.part2 || [];
    this.examSets = this.bank.examSets || [];
    this.tfSets = this.bank.tfSets || [];

    // Custom edits map: { globalId: { answer, explanation, items?: { [subId]: { isCorrect, explanation } } } }
    this.customEdits = JSON.parse(localStorage.getItem('th10_custom_edits') || '{}');
    this.applyCustomEdits();

    // Unified questions list
    this.allQuestions = [
      ...this.part1List.map(q => ({ ...q, globalType: 'part1', globalId: `p1_${q.id}` })),
      ...this.part2List.map(q => ({ ...q, globalType: 'part2', globalId: `p2_${q.id}` }))
    ];

    // Navigation and state
    this.activeTab = 'sets'; // 'sets' | 'practice' | 'history' | 'mistakes' | 'study' | 'active-set'
    this.setsSubTab = 'exam'; // 'exam' | 'tf'
    this.practiceFilter = 'all';
    this.practiceIndex = 0;
    this.filteredPracticeList = [...this.allQuestions];

    // User authentication
    this.accounts = JSON.parse(localStorage.getItem('th10_accounts') || '[]');
    this.currentUser = JSON.parse(localStorage.getItem('th10_current_account') || 'null');

    // Storage
    this.userAnswers = JSON.parse(localStorage.getItem('th10_user_answers') || '{}');
    this.bookmarks = new Set(JSON.parse(localStorage.getItem('th10_bookmarks') || '[]'));
    this.mistakes = new Set(JSON.parse(localStorage.getItem('th10_mistakes') || '[]'));
    this.theme = localStorage.getItem('th10_theme') || 'light';
    this.sound.enabled = localStorage.getItem('th10_sound') !== 'false';

    // Active Set State (Running an Exam or TF Set)
    this.activeSet = {
      inProgress: false,
      setInfo: null,
      mode: 'submit_all', // 'instant' or 'submit_all'
      questions: [],
      currentIndex: 0,
      answers: {},
      flags: new Set(),
      timeLeft: 45 * 60,
      timerId: null,
      submitted: false,
      result: null,
      startTime: null
    };

    // Editing modal state
    this.editingGlobalId = null;
    this.editingPart1Answer = null;
    this.editingPart2Items = {};

    // Study filter
    this.studySearch = '';
    this.studyTopic = 'all';
    this.manageSearch = '';
  }

  init() {
    this.confetti = new ConfettiEffect('confetti-canvas');
    this.applyTheme(this.theme);
    this.updateSoundButtonUI();
    this.filterPracticeQuestions();
    this.renderUserHeaderWidget();
    this.updateEditedBadge();
    this.render();
    this.updateHeaderStats();
    this.setupKeyboardShortcuts();
  }

  // --- THEME & SOUND ---
  applyTheme(theme) {
    this.theme = theme;
    localStorage.setItem('th10_theme', theme);
    const html = document.documentElement;
    const btn = document.getElementById('btn-toggle-theme');
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-sun text-amber-400 text-sm"></i>';
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-moon text-slate-600 text-sm"></i>';
    }
  }

  toggleTheme() {
    this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  toggleSound() {
    this.sound.enabled = !this.sound.enabled;
    localStorage.setItem('th10_sound', this.sound.enabled);
    this.updateSoundButtonUI();
  }

  updateSoundButtonUI() {
    const btn = document.getElementById('btn-toggle-sound');
    if (!btn) return;
    btn.innerHTML = this.sound.enabled
      ? '<i class="fa-solid fa-volume-high text-brand-600 dark:text-brand-400 text-sm"></i>'
      : '<i class="fa-solid fa-volume-xmark text-slate-400 text-sm"></i>';
  }

  // ==========================================
  // CUSTOM ANSWER EDITING & EXPORT ENGINE
  // ==========================================
  applyCustomEdits() {
    // Apply edits to part1List
    this.part1List.forEach(q => {
      const edit = this.customEdits[`p1_${q.id}`];
      if (edit) {
        if (edit.answer) q.answer = edit.answer;
        if (edit.explanation) q.explanation = edit.explanation;
        if (edit.question) q.question = edit.question;
        q._isEdited = true;
      }
    });

    // Apply edits to part2List
    this.part2List.forEach(q => {
      const edit = this.customEdits[`p2_${q.id}`];
      if (edit) {
        if (edit.scenario) q.scenario = edit.scenario;
        if (edit.items) {
          q.items.forEach(it => {
            const itemEdit = edit.items[it.subId];
            if (itemEdit) {
              if (typeof itemEdit.isCorrect === 'boolean') it.isCorrect = itemEdit.isCorrect;
              if (itemEdit.explanation) it.explanation = itemEdit.explanation;
              if (itemEdit.text) it.text = itemEdit.text;
            }
          });
        }
        q._isEdited = true;
      }
    });
  }

  updateEditedBadge() {
    const badge = document.getElementById('header-edited-badge');
    if (!badge) return;
    const count = Object.keys(this.customEdits).length;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  openEditAnswerModal(globalId) {
    this.editingGlobalId = globalId;
    const q = this.allQuestions.find(item => item.globalId === globalId);
    if (!q) return;

    const modal = document.getElementById('edit-answer-modal');
    const titleEl = document.getElementById('edit-modal-title');
    const bodyEl = document.getElementById('edit-modal-body');
    if (!modal || !bodyEl) return;

    titleEl.textContent = q.globalType === 'part1'
      ? `Sửa Đáp Án • Câu ${q.id} (Trắc nghiệm)`
      : `Sửa Đáp Án • Câu Đúng/Sai ${q.id}`;

    if (q.globalType === 'part1') {
      this.editingPart1Answer = q.answer;
      const optionsButtons = ['A', 'B', 'C', 'D'].map(letter => {
        const isCurrent = letter === this.editingPart1Answer;
        return `
          <button type="button" onclick="app.setEditingPart1Answer('${letter}')" id="edit-opt-btn-${letter}" class="px-5 py-3 rounded-2xl border-2 font-black text-base transition flex items-center justify-center gap-2 ${isCurrent ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'}">
            <span>${letter}</span>
            ${isCurrent ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
          </button>
        `;
      }).join('');

      bodyEl.innerHTML = `
        <div class="space-y-4">
          <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            <strong>Câu hỏi:</strong> ${q.question}
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Chọn đáp án đúng chuẩn:</label>
            <div class="grid grid-cols-4 gap-2.5">
              ${optionsButtons}
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Lời giải thích chi tiết:</label>
            <textarea id="edit-explanation-input" rows="4" class="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none">${q.explanation || ''}</textarea>
          </div>
        </div>
      `;
    } else {
      // Part 2: True/False scenario
      this.editingPart2Items = {};
      q.items.forEach(it => {
        this.editingPart2Items[it.subId] = {
          isCorrect: it.isCorrect,
          explanation: it.explanation || ''
        };
      });

      const itemsHTML = q.items.map(it => {
        const curVal = this.editingPart2Items[it.subId].isCorrect;
        return `
          <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
            <div class="flex items-start gap-2">
              <span class="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">${it.subId})</span>
              <p class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 flex-1">${it.text}</p>
            </div>

            <div class="flex items-center space-x-2 pl-8">
              <span class="text-xs font-bold text-slate-500">Đáp án:</span>
              <button type="button" onclick="app.setEditingPart2Item('${it.subId}', true)" id="edit-tf-btn-${it.subId}-true" class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${curVal === true ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}">
                <i class="fa-solid fa-check text-xs"></i> ĐÚNG
              </button>
              <button type="button" onclick="app.setEditingPart2Item('${it.subId}', false)" id="edit-tf-btn-${it.subId}-false" class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${curVal === false ? 'bg-rose-600 text-white shadow-sm' : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}">
                <i class="fa-solid fa-xmark text-xs"></i> SAI
              </button>
            </div>

            <div class="pl-8">
              <input type="text" id="edit-tf-exp-${it.subId}" value="${it.explanation || ''}" placeholder="Nhập giải thích cho ý ${it.subId}..." class="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none">
            </div>
          </div>
        `;
      }).join('');

      bodyHTML = `
        <div class="space-y-3.5">
          <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
            <strong>Tình huống:</strong> ${q.scenario}
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Chỉnh sửa tính Đúng / Sai cho từng ý:</label>
            <div class="space-y-2.5">${itemsHTML}</div>
          </div>
        </div>
      `;
      bodyEl.innerHTML = bodyHTML;
    }

    modal.classList.remove('hidden');
  }

  setEditingPart1Answer(letter) {
    this.editingPart1Answer = letter;
    ['A', 'B', 'C', 'D'].forEach(l => {
      const btn = document.getElementById(`edit-opt-btn-${l}`);
      if (btn) {
        if (l === letter) {
          btn.className = 'px-5 py-3 rounded-2xl border-2 font-black text-base transition flex items-center justify-center gap-2 bg-emerald-600 border-emerald-600 text-white shadow-md';
          btn.innerHTML = `<span>${l}</span> <i class="fa-solid fa-check text-xs"></i>`;
        } else {
          btn.className = 'px-5 py-3 rounded-2xl border-2 font-black text-base transition flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200';
          btn.innerHTML = `<span>${l}</span>`;
        }
      }
    });
  }

  setEditingPart2Item(subId, val) {
    if (!this.editingPart2Items[subId]) return;
    this.editingPart2Items[subId].isCorrect = val;

    const btnTrue = document.getElementById(`edit-tf-btn-${subId}-true`);
    const btnFalse = document.getElementById(`edit-tf-btn-${subId}-false`);

    if (btnTrue && btnFalse) {
      if (val === true) {
        btnTrue.className = 'px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-emerald-600 text-white shadow-sm';
        btnFalse.className = 'px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300';
      } else {
        btnFalse.className = 'px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-rose-600 text-white shadow-sm';
        btnTrue.className = 'px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300';
      }
    }
  }

  saveQuestionEdit() {
    const globalId = this.editingGlobalId;
    const q = this.allQuestions.find(item => item.globalId === globalId);
    if (!q) return;

    if (q.globalType === 'part1') {
      const expInput = document.getElementById('edit-explanation-input');
      const newAnswer = this.editingPart1Answer;
      const newExp = expInput ? expInput.value.trim() : q.explanation;

      q.answer = newAnswer;
      q.explanation = newExp;
      q._isEdited = true;

      // Sync with part1List
      const p1 = this.part1List.find(item => item.id === q.id);
      if (p1) {
        p1.answer = newAnswer;
        p1.explanation = newExp;
      }

      this.customEdits[globalId] = {
        answer: newAnswer,
        explanation: newExp
      };
    } else {
      // Part 2
      const itemsMap = {};
      q.items.forEach(it => {
        const expEl = document.getElementById(`edit-tf-exp-${it.subId}`);
        const isCorrect = this.editingPart2Items[it.subId].isCorrect;
        const explanation = expEl ? expEl.value.trim() : it.explanation;
        it.isCorrect = isCorrect;
        it.explanation = explanation;
        itemsMap[it.subId] = { isCorrect, explanation };
      });
      q._isEdited = true;

      // Sync with part2List
      const p2 = this.part2List.find(item => item.id === q.id);
      if (p2) {
        p2.items.forEach(it => {
          if (itemsMap[it.subId]) {
            it.isCorrect = itemsMap[it.subId].isCorrect;
            it.explanation = itemsMap[it.subId].explanation;
          }
        });
      }

      this.customEdits[globalId] = { items: itemsMap };
    }

    localStorage.setItem('th10_custom_edits', JSON.stringify(this.customEdits));
    this.closeEditAnswerModal();
    this.updateEditedBadge();
    this.sound.playCorrect();
    this.showToast(`Đã lưu đáp án mới cho ${q.globalType === 'part1' ? `Câu ${q.id}` : `Câu Đúng/Sai ${q.id}`}!`, 'success');
    this.render();
  }

  resetQuestionToDefault() {
    const globalId = this.editingGlobalId;
    if (!this.customEdits[globalId]) {
      this.closeEditAnswerModal();
      return;
    }

    delete this.customEdits[globalId];
    localStorage.setItem('th10_custom_edits', JSON.stringify(this.customEdits));

    // Reload from rawBank
    if (globalId.startsWith('p1_')) {
      const id = parseInt(globalId.replace('p1_', ''), 10);
      const rawQ = this.rawBank.part1.find(x => x.id === id);
      const q = this.allQuestions.find(x => x.globalId === globalId);
      const p1 = this.part1List.find(x => x.id === id);
      if (rawQ && q && p1) {
        q.answer = rawQ.answer;
        q.explanation = rawQ.explanation;
        q._isEdited = false;
        p1.answer = rawQ.answer;
        p1.explanation = rawQ.explanation;
      }
    } else {
      const id = parseInt(globalId.replace('p2_', ''), 10);
      const rawQ = this.rawBank.part2.find(x => x.id === id);
      const q = this.allQuestions.find(x => x.globalId === globalId);
      const p2 = this.part2List.find(x => x.id === id);
      if (rawQ && q && p2) {
        q.items = JSON.parse(JSON.stringify(rawQ.items));
        q._isEdited = false;
        p2.items = JSON.parse(JSON.stringify(rawQ.items));
      }
    }

    this.closeEditAnswerModal();
    this.updateEditedBadge();
    this.showToast('Đã khôi phục câu hỏi về đáp án ban đầu.', 'info');
    this.render();
  }

  closeEditAnswerModal() {
    const modal = document.getElementById('edit-answer-modal');
    if (modal) modal.classList.add('hidden');
    this.editingGlobalId = null;
  }

  // --- MANAGE ALL ANSWERS MODAL ---
  openManageAnswersModal() {
    const modal = document.getElementById('manage-answers-modal');
    if (!modal) return;
    this.manageSearch = '';
    const input = document.getElementById('manage-search-input');
    if (input) input.value = '';
    this.renderManageAnswersList();
    modal.classList.remove('hidden');
  }

  closeManageAnswersModal() {
    const modal = document.getElementById('manage-answers-modal');
    if (modal) modal.classList.add('hidden');
  }

  filterManageList(val) {
    this.manageSearch = val.toLowerCase().trim();
    this.renderManageAnswersList();
  }

  renderManageAnswersList() {
    const container = document.getElementById('manage-answers-list');
    if (!container) return;

    let list = [...this.allQuestions];
    if (this.manageSearch) {
      list = list.filter(q => {
        if (q.globalType === 'part1') {
          return `câu ${q.id}`.includes(this.manageSearch) ||
            q.question.toLowerCase().includes(this.manageSearch) ||
            q.topic.toLowerCase().includes(this.manageSearch);
        } else {
          return `câu ${q.id}`.includes(this.manageSearch) ||
            `đúng sai ${q.id}`.includes(this.manageSearch) ||
            q.scenario.toLowerCase().includes(this.manageSearch);
        }
      });
    }

    const editedCount = Object.keys(this.customEdits).length;

    const itemsHTML = list.map(q => {
      const isEdited = !!this.customEdits[q.globalId];
      let answerPreview = '';
      if (q.globalType === 'part1') {
        answerPreview = `Đáp án: <strong class="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm ml-1">${q.answer}</strong>`;
      } else {
        const subPreview = q.items.map(it => `${it.subId}: <strong>${it.isCorrect ? 'Đ' : 'S'}</strong>`).join(', ');
        answerPreview = `<span class="text-xs text-slate-600 dark:text-slate-300">Đáp án: ${subPreview}</span>`;
      }

      return `
        <div class="p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${isEdited ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/40' : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/70'}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${q.globalType === 'part1' ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700'}">
                ${q.globalType === 'part1' ? `Câu ${q.id}` : `Đ/S ${q.id}`}
              </span>
              <span class="text-[11px] text-slate-500 truncate">${q.topic}</span>
              ${isEdited ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
            </div>
            <p class="text-xs text-slate-800 dark:text-slate-200 truncate font-medium">
              ${q.globalType === 'part1' ? q.question : q.scenario}
            </p>
            <div class="mt-1 text-xs">${answerPreview}</div>
          </div>

          <div class="shrink-0 flex items-center gap-1.5">
            <button onclick="app.openEditAnswerModal('${q.globalId}')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
              <i class="fa-solid fa-pen text-[10px]"></i> Sửa
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="text-xs font-bold text-slate-500 mb-2 flex items-center justify-between">
        <span>Hiển thị <strong>${list.length}</strong> câu hỏi • Đã tùy chỉnh: <strong class="text-amber-600">${editedCount}</strong> câu</span>
      </div>
      <div class="space-y-2">
        ${itemsHTML}
      </div>
    `;
  }

  resetAllCustomEdits() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ các đáp án đã chỉnh sửa và khôi phục về đề cương gốc không?')) return;
    this.customEdits = {};
    localStorage.removeItem('th10_custom_edits');
    
    // Restore in-memory bank from rawBank
    this.bank = JSON.parse(JSON.stringify(this.rawBank));
    this.part1List = this.bank.part1;
    this.part2List = this.bank.part2;
    this.allQuestions = [
      ...this.part1List.map(q => ({ ...q, globalType: 'part1', globalId: `p1_${q.id}` })),
      ...this.part2List.map(q => ({ ...q, globalType: 'part2', globalId: `p2_${q.id}` }))
    ];

    this.updateEditedBadge();
    this.renderManageAnswersList();
    this.render();
    this.showToast('Đã khôi phục toàn bộ đáp án về mặc định.', 'info');
  }

  exportUpdatedQuestionsJS() {
    // Generate clean JS with custom answers baked in
    const exportBank = {
      title: "Đề Cương Ôn Tập Tin Học 10 - Chương Trình Mới (Đã Cập Nhật Đáp Án)",
      part1: this.part1List.map(q => {
        const copy = { ...q };
        delete copy._isEdited;
        delete copy.globalType;
        delete copy.globalId;
        return copy;
      }),
      part2: this.part2List.map(q => {
        const copy = { ...q };
        delete copy._isEdited;
        delete copy.globalType;
        delete copy.globalId;
        return copy;
      }),
      examSets: this.examSets,
      tfSets: this.tfSets
    };

    const jsText = `/**\n * NGAN HANG CAU HOI DE CUONG TIN HOC 10 (UTF-8)\n * ĐÃ ĐƯỢC CHỈNH SỬA VÀ XUẤT TỰ ĐỘNG BỞI TINHOC10 MASTER\n */\n\nwindow.QUIZ_BANK = ${JSON.dumps ? JSON.dumps : JSON.stringify(exportBank, null, 2)};\n`;

    // Trigger download
    const blob = new Blob(["\ufeff", jsText], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('✅ Đã tải về file "questions.js" mới thành công!\n\nBạn chỉ cần chép đè file questions.js này vào thư mục dự án và deploy lên Vercel là toàn bộ đáp án mới sẽ được cập nhật vĩnh viễn cho tất cả mọi người!');
  }

  // --- USER AUTHENTICATION & PROFILE ---
  renderUserHeaderWidget() {
    const container = document.getElementById('user-header-widget');
    if (!container) return;

    if (this.currentUser) {
      const initial = (this.currentUser.fullName || this.currentUser.username || 'U').charAt(0).toUpperCase();
      container.innerHTML = `
        <div class="relative group">
          <button class="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700">
            <span class="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
              ${initial}
            </span>
            <div class="text-left hidden sm:block">
              <div class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">${this.currentUser.fullName}</div>
              <div class="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">${this.currentUser.className || 'Học sinh'}</div>
            </div>
            <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-1"></i>
          </button>

          <!-- Dropdown menu -->
          <div class="absolute right-0 top-full mt-1.5 w-48 glass-panel bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 hidden group-hover:block z-50">
            <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
              <p class="font-bold text-slate-900 dark:text-white">${this.currentUser.fullName}</p>
              <p class="text-slate-500 font-mono text-[11px]">@${this.currentUser.username}</p>
            </div>
            <a href="javascript:void(0)" onclick="app.switchTab('history')" class="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-chart-line text-brand-600"></i> Bảng điểm & Lịch sử
            </a>
            <a href="javascript:void(0)" onclick="app.openManageAnswersModal()" class="block px-4 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2">
              <i class="fa-solid fa-pen-to-square"></i> Quản lý & Sửa đáp án
            </a>
            <a href="javascript:void(0)" onclick="app.openAuthModal('login')" class="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-arrows-rotate text-blue-500"></i> Đổi tài khoản
            </a>
            <a href="javascript:void(0)" onclick="app.handleLogout()" class="block px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
            </a>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button onclick="app.openAuthModal('login')" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition">
          <i class="fa-regular fa-circle-user text-sm"></i>
          <span>Đăng nhập</span>
        </button>
      `;
    }
  }

  openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.switchAuthTab(defaultTab);
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('hidden');
  }

  switchAuthTab(tab) {
    const loginBtn = document.getElementById('auth-tab-btn-login');
    const regBtn = document.getElementById('auth-tab-btn-register');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');

    if (tab === 'login') {
      loginBtn.className = 'flex-1 pb-2 text-center text-sm font-bold border-b-2 border-brand-600 text-brand-600 dark:text-brand-400';
      regBtn.className = 'flex-1 pb-2 text-center text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
      loginForm.classList.remove('hidden');
      regForm.classList.add('hidden');
    } else {
      regBtn.className = 'flex-1 pb-2 text-center text-sm font-bold border-b-2 border-brand-600 text-brand-600 dark:text-brand-400';
      loginBtn.className = 'flex-1 pb-2 text-center text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
      regForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error-msg');

    const user = this.accounts.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (!user) {
      errorEl.textContent = 'Tên đăng nhập hoặc mật khẩu không chính xác!';
      errorEl.classList.remove('hidden');
      return;
    }

    this.currentUser = user;
    localStorage.setItem('th10_current_account', JSON.stringify(user));
    errorEl.classList.add('hidden');
    this.closeAuthModal();
    this.renderUserHeaderWidget();
    this.render();
    this.showToast(`Chào mừng bạn ${user.fullName} đã đăng nhập thành công!`, 'success');
  }

  handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const className = document.getElementById('reg-classname').value.trim();
    const pass = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('reg-error-msg');

    if (username.length < 3) {
      errorEl.textContent = 'Tên đăng nhập phải có ít nhất 3 ký tự!';
      errorEl.classList.remove('hidden');
      return;
    }

    if (this.accounts.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      errorEl.textContent = 'Tên đăng nhập này đã tồn tại, vui lòng chọn tên khác!';
      errorEl.classList.remove('hidden');
      return;
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      fullName,
      username,
      className,
      password: pass,
      createdAt: new Date().toLocaleString('vi-VN')
    };

    this.accounts.push(newUser);
    localStorage.setItem('th10_accounts', JSON.stringify(this.accounts));
    this.currentUser = newUser;
    localStorage.setItem('th10_current_account', JSON.stringify(newUser));

    errorEl.classList.add('hidden');
    this.closeAuthModal();
    this.renderUserHeaderWidget();
    this.render();
    this.showToast(`Đăng ký tài khoản thành công! Điểm số sẽ được tự động lưu.`, 'success');
  }

  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem('th10_current_account');
    this.renderUserHeaderWidget();
    this.render();
    this.showToast('Bạn đã đăng xuất tài khoản.', 'info');
  }

  // --- HISTORY & RESULTS STORAGE ---
  getUserHistory() {
    const key = this.currentUser ? `th10_history_${this.currentUser.username}` : 'th10_history_guest';
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  saveExamResult(record) {
    const key = this.currentUser ? `th10_history_${this.currentUser.username}` : 'th10_history_guest';
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift(record);
    localStorage.setItem(key, JSON.stringify(history));
    this.updateHeaderStats();
  }

  getBestScoreForSet(setId) {
    const history = this.getUserHistory();
    const matching = history.filter(h => h.setId === setId);
    if (matching.length === 0) return null;
    return Math.max(...matching.map(h => h.score));
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-slate-900');
    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl flex items-center space-x-2 ${bg} animate-bounce`;
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // --- HEADER STATS & DRAWER MATRIX ---
  updateHeaderStats() {
    const badgeMistakes = document.getElementById('tab-mistakes-badge');
    const badgeHistory = document.getElementById('tab-history-badge');
    const history = this.getUserHistory();

    if (badgeMistakes) {
      if (this.mistakes.size > 0) {
        badgeMistakes.textContent = this.mistakes.size;
        badgeMistakes.classList.remove('hidden');
      } else {
        badgeMistakes.classList.add('hidden');
      }
    }

    if (badgeHistory) {
      if (history.length > 0) {
        badgeHistory.textContent = history.length;
        badgeHistory.classList.remove('hidden');
      } else {
        badgeHistory.classList.add('hidden');
      }
    }
  }

  toggleMatrixDrawer() {
    const drawer = document.getElementById('matrix-drawer');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden');
      this.renderDrawerMatrix();
    } else {
      drawer.classList.add('hidden');
    }
  }

  renderDrawerMatrix() {
    const container = document.getElementById('drawer-matrix-content');
    if (!container) return;

    const isRunningSet = this.activeSet.inProgress;
    const targetList = isRunningSet ? this.activeSet.questions : this.allQuestions;
    const currentIdx = isRunningSet ? this.activeSet.currentIndex : this.practiceIndex;

    let p1HTML = '';
    let p2HTML = '';

    targetList.forEach((q, idx) => {
      let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      const isBookmarked = this.bookmarks.has(q.globalId);
      const isFlagged = isRunningSet && this.activeSet.flags.has(idx);
      const isEdited = !!this.customEdits[q.globalId];

      if (isRunningSet) {
        if (!this.activeSet.submitted && this.activeSet.mode === 'submit_all') {
          if (q.globalType === 'part1') {
            if (this.activeSet.answers[q.globalId]) bgClass = 'bg-brand-600 text-white border-brand-600';
          } else {
            const allSubDone = q.items.every(it => this.activeSet.answers[`${q.globalId}_${it.subId}`] !== undefined);
            if (allSubDone) bgClass = 'bg-brand-600 text-white border-brand-600';
            else if (q.items.some(it => this.activeSet.answers[`${q.globalId}_${it.subId}`] !== undefined)) {
              bgClass = 'bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 border-brand-400';
            }
          }
        } else {
          if (q.globalType === 'part1') {
            const ans = this.activeSet.answers[q.globalId];
            if (ans !== undefined) {
              bgClass = (ans === q.answer) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-rose-500 text-white border-rose-500';
            }
          } else {
            const hasAns = q.items.some(it => this.activeSet.answers[`${q.globalId}_${it.subId}`] !== undefined);
            if (hasAns) {
              const allRight = q.items.every(it => this.activeSet.answers[`${q.globalId}_${it.subId}`] === it.isCorrect);
              bgClass = allRight ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-500 text-white border-amber-500';
            }
          }
        }
      } else {
        if (q.globalType === 'part1') {
          const ans = this.userAnswers[q.globalId];
          if (ans !== undefined) {
            bgClass = (ans === q.answer) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-rose-500 text-white border-rose-500';
          }
        } else {
          const hasAns = q.items.some(it => this.userAnswers[`${q.globalId}_${it.subId}`] !== undefined);
          if (hasAns) {
            const allRight = q.items.every(it => this.userAnswers[`${q.globalId}_${it.subId}`] === it.isCorrect);
            bgClass = allRight ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-500 text-white border-amber-500';
          }
        }
      }

      const activeRing = (idx === currentIdx) ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : '';
      let badgeTag = '';
      if (isFlagged) badgeTag = '🚩';
      else if (isEdited) badgeTag = '✏️';
      else if (isBookmarked) badgeTag = '★';

      const btnHTML = `
        <button onclick="app.jumpToQuestion(${idx})" class="nav-badge relative w-9 h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition ${bgClass} ${activeRing}">
          ${q.globalType === 'part1' ? q.id : `ĐS${q.id}`}
          ${badgeTag ? `<span class="absolute -top-1 -right-1 text-[9px] text-amber-500 font-extrabold">${badgeTag}</span>` : ''}
        </button>
      `;

      if (q.globalType === 'part1') p1HTML += btnHTML;
      else p2HTML += btnHTML;
    });

    container.innerHTML = `
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Phần I. Trắc Nghiệm (${this.part1List.length} câu)</h3>
        <div class="grid grid-cols-6 sm:grid-cols-7 gap-2">${p1HTML}</div>
      </div>
      <div class="mt-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Phần II. Đúng / Sai (${this.part2List.length} câu lớn)</h3>
        <div class="grid grid-cols-4 sm:grid-cols-5 gap-2">${p2HTML}</div>
      </div>
    `;
  }

  jumpToQuestion(idx) {
    if (this.activeSet.inProgress) {
      this.activeSet.currentIndex = idx;
      this.renderActiveSetView();
    } else {
      this.practiceIndex = idx;
      this.renderPracticeView();
    }
    this.toggleMatrixDrawer();
  }

  // --- TAB NAVIGATION ---
  switchTab(tabId) {
    this.activeTab = tabId;
    ['sets', 'practice', 'history', 'mistakes', 'study', 'active-set'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const panel = document.getElementById(`view-${t}`);
      if (panel) {
        if (t === tabId) {
          panel.classList.remove('hidden');
          panel.classList.add('block');
        } else {
          panel.classList.add('hidden');
          panel.classList.remove('block');
        }
      }
      if (btn) {
        if (t === tabId) {
          btn.className = 'tab-button flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap bg-brand-600 text-white shadow-md shadow-brand-500/20';
        } else {
          btn.className = 'tab-button flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap';
        }
      }
    });

    this.render();
  }

  render() {
    switch (this.activeTab) {
      case 'sets':
        this.renderSetsView();
        break;
      case 'practice':
        this.renderPracticeView();
        break;
      case 'history':
        this.renderHistoryView();
        break;
      case 'mistakes':
        this.renderMistakesView();
        break;
      case 'study':
        this.renderStudyView();
        break;
      case 'active-set':
        this.renderActiveSetView();
        break;
    }
    this.updateHeaderStats();
    this.updateEditedBadge();
  }

  // ==========================================
  // VIEW: BỘ ĐỀ LUYỆN TẬP (SETS VIEW)
  // ==========================================
  switchSetsSubTab(subTab) {
    this.setsSubTab = subTab;
    this.renderSetsView();
  }

  renderSetsView() {
    const container = document.getElementById('view-sets');
    if (!container) return;

    const subTabExam = `
      <button onclick="app.switchSetsSubTab('exam')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${this.setsSubTab === 'exam' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
        <i class="fa-solid fa-file-signature"></i> Các Bộ Đề Thi Tổng Hợp (Đầy đủ 100% Đề Cương)
      </button>
    `;
    const subTabTF = `
      <button onclick="app.switchSetsSubTab('tf')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${this.setsSubTab === 'tf' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
        <i class="fa-solid fa-scale-balanced"></i> Chuyên Đề Trắc Nghiệm Đúng / Sai (Phần II)
      </button>
    `;

    let cardsHTML = '';

    if (this.setsSubTab === 'exam') {
      cardsHTML = this.examSets.map((set, idx) => {
        const bestScore = this.getBestScoreForSet(set.id);
        const totalQ = set.part1Ids.length + set.part2Ids.length;

        return `
          <div class="set-card glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                  ĐỀ SỐ 0${idx + 1}
                </span>
                <span class="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <i class="fa-regular fa-clock"></i> ${set.timeMinutes} Phút
                </span>
              </div>

              <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                ${set.title}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                ${set.description}
              </p>

              <div class="my-4 py-3 border-y border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span class="text-slate-600 dark:text-slate-400">Quy mô: <strong>${set.part1Ids.length} TN + ${set.part2Ids.length} Đ/S (${totalQ} câu)</strong></span>
                ${bestScore !== null ? `
                  <span class="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    🏆 Cao nhất: ${bestScore}đ
                  </span>
                ` : `<span class="text-slate-400">Chưa làm</span>`}
              </div>
            </div>

            <button onclick="app.openStartSetModal('${set.id}', 'exam')" class="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wide transition shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2">
              <i class="fa-solid fa-play text-xs"></i> Chọn Chế Độ & Làm Đề
            </button>
          </div>
        `;
      }).join('');
    } else {
      cardsHTML = this.tfSets.map((set, idx) => {
        const bestScore = this.getBestScoreForSet(set.id);
        const statementCount = set.part2Ids.length * 4;

        return `
          <div class="set-card glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                  CHUYÊN ĐỀ ĐÚNG/SAI 0${idx + 1}
                </span>
                <span class="text-xs font-semibold text-amber-600 flex items-center gap-1">
                  <i class="fa-solid fa-check-double"></i> ${statementCount} Nhận định
                </span>
              </div>

              <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                ${set.title}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                ${set.description}
              </p>

              <div class="my-4 py-3 border-y border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span class="text-slate-600 dark:text-slate-400">Số câu tình huống: <strong>${set.part2Ids.length} câu</strong></span>
                ${bestScore !== null ? `
                  <span class="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    🏆 Cao nhất: ${bestScore}đ
                  </span>
                ` : `<span class="text-slate-400">Chưa làm</span>`}
              </div>
            </div>

            <button onclick="app.openStartSetModal('${set.id}', 'tf')" class="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wide transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2">
              <i class="fa-solid fa-play text-xs"></i> Luyện Bộ Đúng/Sai Này
            </button>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">
        
        <div class="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden shadow-2xl border-none">
          <div class="relative z-10 max-w-2xl">
            <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-brand-500/30 text-brand-300 border border-brand-400/30 inline-block mb-3">
              🚀 KỲ THI TIN HỌC LỚP 10
            </span>
            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Hệ Thống Luyện Bộ Đề Có Chấm Điểm & Lưu Kết Quả</h2>
            <p class="text-sm text-slate-300 mt-2 leading-relaxed">
              Trọn bộ câu hỏi từ đề cương đã được phân loại thành <strong>4 Bộ đề chuẩn</strong> và <strong>4 Chuyên đề Đúng/Sai</strong>. Bạn có thể làm lại nhiều lần, tùy chọn <em>Xem kết quả sau từng câu</em> hoặc <em>Xem sau khi nộp đề</em>, và có thể <strong>tự chỉnh sửa đáp án</strong> bất kỳ câu nào!
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              ${!this.currentUser ? `
                <button onclick="app.openAuthModal('login')" class="px-4 py-2 rounded-xl bg-white text-brand-900 font-extrabold text-xs shadow-lg hover:bg-brand-50 transition flex items-center gap-2">
                  <i class="fa-solid fa-key"></i> Đăng nhập / Đăng ký để lưu điểm
                </button>
              ` : `
                <div class="text-xs text-brand-300 font-medium flex items-center gap-2">
                  <i class="fa-solid fa-user-check text-emerald-400"></i> Đang đăng nhập: <strong>${this.currentUser.fullName}</strong> (${this.currentUser.className || 'Học sinh'})
                </div>
              `}
              <button onclick="app.openManageAnswersModal()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-2">
                <i class="fa-solid fa-pen-to-square"></i> Quản lý & Sửa đáp án
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          ${subTabExam}
          ${subTabTF}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          ${cardsHTML}
        </div>

      </div>
    `;
  }

  // --- START SET MODAL ---
  openStartSetModal(setId, setType) {
    let setInfo = null;
    if (setType === 'exam') {
      setInfo = this.examSets.find(s => s.id === setId);
    } else {
      setInfo = this.tfSets.find(s => s.id === setId);
    }
    if (!setInfo) return;

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="text-left">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span class="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Chọn Chế Độ Làm Đề</span>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">${setInfo.title}</h3>
          </div>
          <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600 p-1">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <p class="text-xs text-slate-500 mt-3 mb-4">
          Hệ thống cung cấp 2 chế độ học tập linh hoạt theo đúng nhu cầu ôn luyện của bạn:
        </p>

        <div class="space-y-3.5">
          
          <div onclick="app.launchSet('${setId}', '${setType}', 'instant')" class="cursor-pointer p-4 rounded-2xl border-2 border-indigo-400/40 hover:border-indigo-600 bg-indigo-50/50 dark:bg-slate-800/60 transition group hover:-translate-y-0.5 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
                <i class="fa-solid fa-lightbulb text-base"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                    1. Xem kết quả sau khi làm từng câu
                  </h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">Ôn tập tức thì</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Bấm chọn đáp án sẽ biết <strong>Đúng/Sai ngay lập tức</strong> kèm theo <strong>Lời giải thích chi tiết</strong>. Rất thích hợp để học thuộc kiến thức và rèn luyện kỹ năng.
                </p>
              </div>
            </div>
          </div>

          <div onclick="app.launchSet('${setId}', '${setType}', 'submit_all')" class="cursor-pointer p-4 rounded-2xl border-2 border-emerald-400/40 hover:border-emerald-600 bg-emerald-50/50 dark:bg-slate-800/60 transition group hover:-translate-y-0.5 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                <i class="fa-solid fa-stopwatch text-base"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                    2. Xem kết quả sau khi làm xong cả đề
                  </h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Thi thử bấm giờ</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Làm hết toàn bộ câu hỏi trong bộ đề, sau đó bấm <strong>Nộp bài</strong> để hệ thống tính điểm, xếp loại, chấm Đúng/Sai lũy tiến và lưu kết quả vào hồ sơ.
                </p>
              </div>
            </div>
          </div>

        </div>

        <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onclick="app.closeModal()" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100">
            Hủy
          </button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  // --- LAUNCH ACTIVE SET ---
  launchSet(setId, setType, mode) {
    this.closeModal();

    let setInfo = null;
    let questions = [];

    if (setType === 'exam') {
      setInfo = this.examSets.find(s => s.id === setId);
      const p1Questions = this.part1List.filter(q => setInfo.part1Ids.includes(q.id))
        .map(q => ({ ...q, globalType: 'part1', globalId: `p1_${q.id}` }));
      const p2Questions = this.part2List.filter(q => setInfo.part2Ids.includes(q.id))
        .map(q => ({ ...q, globalType: 'part2', globalId: `p2_${q.id}` }));
      questions = [...p1Questions, ...p2Questions];
    } else {
      setInfo = this.tfSets.find(s => s.id === setId);
      questions = this.part2List.filter(q => setInfo.part2Ids.includes(q.id))
        .map(q => ({ ...q, globalType: 'part2', globalId: `p2_${q.id}` }));
    }

    if (this.activeSet.timerId) clearInterval(this.activeSet.timerId);

    this.activeSet = {
      inProgress: true,
      setInfo,
      setType,
      mode,
      questions,
      currentIndex: 0,
      answers: {},
      flags: new Set(),
      timeLeft: (setInfo.timeMinutes || 45) * 60,
      timerId: null,
      submitted: false,
      result: null,
      startTime: Date.now()
    };

    if (mode === 'submit_all') {
      this.activeSet.timerId = setInterval(() => {
        if (this.activeSet.timeLeft > 0) {
          this.activeSet.timeLeft--;
          const mins = Math.floor(this.activeSet.timeLeft / 60);
          const secs = this.activeSet.timeLeft % 60;
          const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          const clockEl = document.getElementById('active-set-timer');
          if (clockEl) clockEl.textContent = timeFormatted;
        } else {
          clearInterval(this.activeSet.timerId);
          this.submitActiveSet(true);
        }
      }, 1000);
    }

    this.switchTab('active-set');
  }

  // --- VIEW: ACTIVE SET RUNNER ---
  renderActiveSetView() {
    const container = document.getElementById('view-active-set');
    if (!container) return;

    if (!this.activeSet.inProgress) {
      this.switchTab('sets');
      return;
    }

    const q = this.activeSet.questions[this.activeSet.currentIndex];
    const isSubmitted = this.activeSet.submitted;
    const isInstant = this.activeSet.mode === 'instant';
    const isFlagged = this.activeSet.flags.has(this.activeSet.currentIndex);

    const mins = Math.floor(this.activeSet.timeLeft / 60);
    const secs = this.activeSet.timeLeft % 60;
    const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const isLowTime = this.activeSet.timeLeft < 300 && !isSubmitted && !isInstant;

    let bodyHTML = '';

    if (q.globalType === 'part1') {
      const selected = this.activeSet.answers[q.globalId];
      const isAnswered = selected !== undefined;
      const isRight = selected === q.answer;

      const optionsHTML = q.options.map((optText, oIdx) => {
        const optLetter = ['A', 'B', 'C', 'D'][oIdx];
        let stateClasses = 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700/60';
        let badgeClasses = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
        let markHTML = '';

        if (isInstant) {
          if (isAnswered) {
            if (optLetter === q.answer) {
              stateClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
              badgeClasses = 'bg-emerald-600 text-white';
              markHTML = '<i class="fa-solid fa-check text-emerald-600 ml-auto"></i>';
            } else if (optLetter === selected) {
              stateClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
              badgeClasses = 'bg-rose-600 text-white';
              markHTML = '<i class="fa-solid fa-xmark text-rose-600 ml-auto"></i>';
            } else {
              stateClasses = 'opacity-40 border-slate-200 dark:border-slate-700';
            }
          }
        } else {
          if (!isSubmitted) {
            if (selected === optLetter) {
              stateClasses = 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-bold ring-1 ring-brand-500';
              badgeClasses = 'bg-brand-600 text-white';
            }
          } else {
            if (optLetter === q.answer) {
              stateClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
              badgeClasses = 'bg-emerald-600 text-white';
              markHTML = '<i class="fa-solid fa-check text-emerald-600 ml-auto"></i>';
            } else if (selected === optLetter) {
              stateClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
              badgeClasses = 'bg-rose-600 text-white';
              markHTML = '<i class="fa-solid fa-xmark text-rose-600 ml-auto"></i>';
            } else {
              stateClasses = 'opacity-40 border-slate-200 dark:border-slate-700';
            }
          }
        }

        return `
          <button onclick="app.answerActiveSetPart1('${q.globalId}', '${optLetter}')" class="option-btn w-full p-4 rounded-xl border text-left flex items-center space-x-3 transition ${stateClasses}">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition ${badgeClasses}">
              ${optLetter}
            </span>
            <span class="text-sm sm:text-base leading-relaxed flex-1">${optText.replace(/^[A-D]\.\s*/, '')}</span>
            ${markHTML}
          </button>
        `;
      }).join('');

      bodyHTML = `
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">Phần I • Câu ${this.activeSet.currentIndex + 1}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${q.topic}</span>
              ${this.customEdits[q.globalId] ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
            </div>
            <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1">
              <i class="fa-solid fa-pen text-[10px]"></i> Sửa đáp án
            </button>
          </div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">${q.question}</h2>
        </div>
        <div class="space-y-3">${optionsHTML}</div>

        ${(isInstant && isAnswered) || isSubmitted ? `
          <div class="mt-6 p-4 rounded-xl ${isRight ? 'border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30' : 'border-rose-300 bg-rose-50/80 dark:bg-rose-950/30'} border text-sm">
            <p><strong>Đáp án đúng:</strong> <span class="font-extrabold text-emerald-600 dark:text-emerald-400">${q.answer}</span></p>
            <p class="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed"><strong>Giải thích:</strong> ${q.explanation}</p>
          </div>
        ` : ''}
      `;
    } else {
      // Part 2: True/False
      const itemsHTML = q.items.map(item => {
        const itemKey = `${q.globalId}_${item.subId}`;
        const userChoice = this.activeSet.answers[itemKey];
        const isAnswered = userChoice !== undefined;
        const isRight = userChoice === item.isCorrect;

        let feedbackHTML = '';
        if ((isInstant && isAnswered) || isSubmitted) {
          feedbackHTML = `
            <div class="text-xs mt-2 ${isRight ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}">
              ${isRight ? '✓ Trả lời đúng' : `✗ Trả lời sai (Đáp án: ${item.isCorrect ? 'ĐÚNG' : 'SAI'})`}
            </div>
            <div class="text-xs text-slate-500 mt-0.5">${item.explanation}</div>
          `;
        }

        return `
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div class="flex items-start gap-2.5">
              <span class="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                ${item.subId})
              </span>
              <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium flex-1">
                ${item.text}
              </p>
            </div>

            <div class="flex items-center space-x-2 pt-2.5 mt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <button onclick="app.answerActiveSetPart2('${itemKey}', true)" class="px-4 py-1.5 rounded-lg text-xs font-bold transition ${userChoice === true ? (isInstant || isSubmitted ? (item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-brand-600 text-white') : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600'}">
                Đúng
              </button>
              <button onclick="app.answerActiveSetPart2('${itemKey}', false)" class="px-4 py-1.5 rounded-lg text-xs font-bold transition ${userChoice === false ? (isInstant || isSubmitted ? (!item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-brand-600 text-white') : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600'}">
                Sai
              </button>
            </div>

            ${feedbackHTML}
          </div>
        `;
      }).join('');

      bodyHTML = `
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">Phần II • Câu Đúng/Sai ${this.activeSet.currentIndex + 1}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${q.topic}</span>
              ${this.customEdits[q.globalId] ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
            </div>
            <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1">
              <i class="fa-solid fa-pen text-[10px]"></i> Sửa đáp án
            </button>
          </div>
          <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
            <i class="fa-solid fa-quote-left text-amber-500 mr-1.5"></i><strong>Tình huống:</strong> ${q.scenario}
          </div>
        </div>
        <div class="space-y-3">${itemsHTML}</div>
      `;
    }

    container.innerHTML = `
      <div class="glass-panel rounded-3xl p-5 sm:p-8 max-w-4xl mx-auto border border-slate-200/80 dark:border-slate-800/80">
        
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mb-6">
          <div class="flex items-center space-x-3">
            ${!isInstant ? `
              <div id="active-set-timer" class="px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-extrabold flex items-center gap-2 shadow-sm ${isLowTime ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900 text-white dark:bg-slate-800'}">
                <i class="fa-regular fa-clock"></i>
                <span>${isSubmitted ? 'ĐÃ NỘP BÀI' : timeFormatted}</span>
              </div>
            ` : `
              <div class="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <i class="fa-solid fa-lightbulb"></i> Xem kết quả từng câu
              </div>
            `}
            <span class="text-xs font-bold text-slate-500">Câu ${this.activeSet.currentIndex + 1} / ${this.activeSet.questions.length}</span>
          </div>

          <div class="flex items-center space-x-2">
            ${!isSubmitted ? `
              ${!isInstant ? `
                <button onclick="app.toggleActiveSetFlag(${this.activeSet.currentIndex})" class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${isFlagged ? 'bg-rose-100 border-rose-300 text-rose-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}">
                  <span>🚩 ${isFlagged ? 'Đã gắn cờ' : 'Gắn cờ'}</span>
                </button>
              ` : ''}
              <button onclick="app.confirmSubmitActiveSet()" class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20">
                ${isInstant ? 'Hoàn thành bài làm' : 'Nộp bài thi'}
              </button>
            ` : `
              <button onclick="app.showActiveSetResultModal()" class="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition">
                Xem bảng điểm
              </button>
              <button onclick="app.exitActiveSet()" class="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition">
                Về danh sách đề
              </button>
            `}
            <button onclick="app.toggleMatrixDrawer()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <i class="fa-solid fa-table-cells"></i>
            </button>
          </div>
        </div>

        ${bodyHTML}

        <div class="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <button onclick="app.prevActiveSetQuestion()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition" ${this.activeSet.currentIndex === 0 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''}>
            <i class="fa-solid fa-arrow-left"></i> Câu trước
          </button>
          
          <button onclick="app.toggleMatrixDrawer()" class="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            Mục lục câu hỏi
          </button>

          <button onclick="app.nextActiveSetQuestion()" class="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs sm:text-sm font-semibold hover:bg-brand-700 transition" ${this.activeSet.currentIndex === this.activeSet.questions.length - 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''}>
            Câu sau <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>

      </div>
    `;
  }

  answerActiveSetPart1(globalId, opt) {
    if (this.activeSet.submitted) return;
    this.activeSet.answers[globalId] = opt;

    const q = this.activeSet.questions.find(item => item.globalId === globalId);
    if (this.activeSet.mode === 'instant' && q) {
      if (opt === q.answer) {
        this.sound.playCorrect();
        this.mistakes.delete(globalId);
      } else {
        this.sound.playWrong();
        this.mistakes.add(globalId);
      }
      localStorage.setItem('th10_mistakes', JSON.stringify([...this.mistakes]));
    }

    this.renderActiveSetView();
  }

  answerActiveSetPart2(itemKey, val) {
    if (this.activeSet.submitted) return;
    this.activeSet.answers[itemKey] = val;

    if (this.activeSet.mode === 'instant') {
      const [p2GlobalId, subId] = itemKey.split('_');
      const q = this.activeSet.questions.find(item => item.globalId === p2GlobalId);
      if (q) {
        const item = q.items.find(it => it.subId === subId);
        if (item) {
          if (val === item.isCorrect) this.sound.playCorrect();
          else {
            this.sound.playWrong();
            this.mistakes.add(p2GlobalId);
            localStorage.setItem('th10_mistakes', JSON.stringify([...this.mistakes]));
          }
        }
      }
    }

    this.renderActiveSetView();
  }

  toggleActiveSetFlag(idx) {
    if (this.activeSet.flags.has(idx)) this.activeSet.flags.delete(idx);
    else this.activeSet.flags.add(idx);
    this.renderActiveSetView();
  }

  prevActiveSetQuestion() {
    if (this.activeSet.currentIndex > 0) {
      this.activeSet.currentIndex--;
      this.renderActiveSetView();
    }
  }

  nextActiveSetQuestion() {
    if (this.activeSet.currentIndex < this.activeSet.questions.length - 1) {
      this.activeSet.currentIndex++;
      this.renderActiveSetView();
    }
  }

  confirmSubmitActiveSet() {
    let unansweredCount = 0;
    this.activeSet.questions.forEach(q => {
      if (q.globalType === 'part1') {
        if (!this.activeSet.answers[q.globalId]) unansweredCount++;
      } else {
        const anyMissing = q.items.some(it => this.activeSet.answers[`${q.globalId}_${it.subId}`] === undefined);
        if (anyMissing) unansweredCount++;
      }
    });

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="text-center">
        <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">
          ${this.activeSet.mode === 'instant' ? 'Hoàn thành buổi luyện tập?' : 'Xác nhận nộp bài thi?'}
        </h3>
        ${unansweredCount > 0 ? `
          <p class="text-sm text-amber-600 font-semibold mt-2">
            Bạn vẫn còn ${unansweredCount} câu chưa làm xong!
          </p>
        ` : `
          <p class="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Bạn đã hoàn thành đủ các câu hỏi trong đề.
          </p>
        `}
        <div class="flex items-center justify-center space-x-3 mt-6">
          <button onclick="app.closeModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold hover:bg-slate-100">
            Làm tiếp
          </button>
          <button onclick="app.submitActiveSet(false)" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20">
            Nộp bài & Lưu điểm
          </button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  submitActiveSet(isAuto = false) {
    if (this.activeSet.timerId) clearInterval(this.activeSet.timerId);
    this.closeModal();
    this.activeSet.submitted = true;

    const set = this.activeSet.setInfo;
    const questions = this.activeSet.questions;

    let p1CorrectCount = 0;
    let p1Total = 0;
    let p2TotalPoints = 0;
    let p2TotalCount = 0;

    questions.forEach(q => {
      if (q.globalType === 'part1') {
        p1Total++;
        if (this.activeSet.answers[q.globalId] === q.answer) {
          p1CorrectCount++;
        } else {
          this.mistakes.add(q.globalId);
        }
      } else {
        p2TotalCount++;
        let subCorrectInQ = 0;
        q.items.forEach(it => {
          if (this.activeSet.answers[`${q.globalId}_${it.subId}`] === it.isCorrect) {
            subCorrectInQ++;
          }
        });

        let pts = 0;
        if (subCorrectInQ === 1) pts = 0.1;
        else if (subCorrectInQ === 2) pts = 0.25;
        else if (subCorrectInQ === 3) pts = 0.5;
        else if (subCorrectInQ === 4) pts = 1.0;

        p2TotalPoints += pts;

        if (subCorrectInQ < 4) {
          this.mistakes.add(q.globalId);
        }
      }
    });

    localStorage.setItem('th10_mistakes', JSON.stringify([...this.mistakes]));

    let totalScore = 0;
    let p1Score = 0;
    let p2Score = 0;

    if (p1Total > 0 && p2TotalCount > 0) {
      p1Score = Number(((p1CorrectCount / p1Total) * 7.0).toFixed(2));
      p2Score = Number(((p2TotalPoints / (p2TotalCount * 1.0)) * 3.0).toFixed(2));
      totalScore = Number((p1Score + p2Score).toFixed(2));
    } else if (p2TotalCount > 0 && p1Total === 0) {
      totalScore = Number(((p2TotalPoints / (p2TotalCount * 1.0)) * 10.0).toFixed(2));
      p2Score = totalScore;
    } else {
      totalScore = Number(((p1CorrectCount / p1Total) * 10.0).toFixed(2));
      p1Score = totalScore;
    }

    let grade = 'Trung Bình';
    let gradeBadge = 'bg-slate-500 text-white';
    if (totalScore >= 9.0) {
      grade = 'Xuất Sắc! 🏆';
      gradeBadge = 'bg-emerald-600 text-white';
    } else if (totalScore >= 8.0) {
      grade = 'Giỏi 🎉';
      gradeBadge = 'bg-brand-600 text-white';
    } else if (totalScore >= 6.5) {
      grade = 'Khá 👍';
      gradeBadge = 'bg-blue-600 text-white';
    } else if (totalScore >= 5.0) {
      grade = 'Đạt Yêu Cầu ⚠️';
      gradeBadge = 'bg-amber-600 text-white';
    } else {
      grade = 'Cần Ôn Luyện Thêm 📚';
      gradeBadge = 'bg-rose-600 text-white';
    }

    const durationSeconds = Math.round((Date.now() - this.activeSet.startTime) / 1000);

    const resultRecord = {
      id: 'res_' + Date.now(),
      setId: set.id,
      setTitle: set.title,
      mode: this.activeSet.mode,
      score: totalScore,
      maxScore: 10.0,
      p1Score,
      p2Score,
      p1CorrectCount,
      p1Total,
      p2TotalCount,
      grade,
      gradeBadge,
      isAuto,
      durationSeconds,
      timestamp: new Date().toLocaleString('vi-VN'),
      answers: { ...this.activeSet.answers }
    };

    this.activeSet.result = resultRecord;
    this.saveExamResult(resultRecord);

    if (totalScore >= 8.0) {
      this.sound.playFanfare();
      this.confetti.start(4000);
    } else {
      this.sound.playCorrect();
    }

    this.renderActiveSetView();
    this.showActiveSetResultModal();
    this.updateHeaderStats();
  }

  showActiveSetResultModal() {
    const res = this.activeSet.result;
    if (!res) return;

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    const mins = Math.floor(res.durationSeconds / 60);
    const secs = res.durationSeconds % 60;
    const timeSpentStr = `${mins} phút ${secs} giây`;

    content.innerHTML = `
      <div class="text-center">
        <span class="px-3 py-1 rounded-full text-xs font-extrabold ${res.gradeBadge}">
          ${res.grade}
        </span>

        <div class="mt-4 mb-2">
          <div class="text-5xl font-black text-brand-600 dark:text-brand-400">
            ${res.score} <span class="text-xl text-slate-400">/ 10.0</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">${res.setTitle}</p>
        </div>

        <div class="grid grid-cols-2 gap-2.5 my-4 text-left text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <span class="text-slate-500">Chế độ làm:</span>
            <div class="font-bold text-slate-800 dark:text-slate-200">
              ${res.mode === 'instant' ? '💡 Xem từng câu' : '⏱️ Xem sau khi nộp'}
            </div>
          </div>
          <div>
            <span class="text-slate-500">Thời gian làm:</span>
            <div class="font-bold text-slate-800 dark:text-slate-200">${timeSpentStr}</div>
          </div>
          <div>
            <span class="text-slate-500">Trắc nghiệm P.I:</span>
            <div class="font-bold text-slate-800 dark:text-slate-200">${res.p1Score}đ (${res.p1CorrectCount}/${res.p1Total})</div>
          </div>
          <div>
            <span class="text-slate-500">Đúng/Sai P.II:</span>
            <div class="font-bold text-slate-800 dark:text-slate-200">${res.p2Score}đ (${res.p2TotalCount} câu)</div>
          </div>
        </div>

        ${!this.currentUser ? `
          <div class="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i> Bạn đang làm bài với tư cách Khách. <a href="javascript:void(0)" onclick="app.openAuthModal('register')" class="font-bold underline text-brand-600">Đăng ký tài khoản</a> để lưu bảng điểm vĩnh viễn!
          </div>
        ` : `
          <div class="text-xs text-emerald-600 font-semibold mb-4">
            ✓ Đã lưu kết quả vào tài khoản: <strong>${this.currentUser.fullName}</strong>
          </div>
        `}

        <div class="flex items-center justify-center space-x-3">
          <button onclick="app.closeModal()" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wide transition shadow-md shadow-brand-500/20">
            Xem lại bài làm chi tiết
          </button>
          <button onclick="app.exitActiveSet()" class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 transition">
            Về trang danh sách đề
          </button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  exitActiveSet() {
    this.closeModal();
    if (this.activeSet.timerId) clearInterval(this.activeSet.timerId);
    this.activeSet.inProgress = false;
    this.activeSet.submitted = false;
    this.switchTab('sets');
  }

  // ==========================================
  // VIEW: BẢNG ĐIỂM & LỊCH SỬ LÀM BÀI (HISTORY)
  // ==========================================
  renderHistoryView() {
    const container = document.getElementById('view-history');
    if (!container) return;

    const history = this.getUserHistory();

    if (history.length === 0) {
      container.innerHTML = `
        <div class="glass-panel rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 border border-slate-200/80 dark:border-slate-800/80">
          <div class="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-chart-simple text-2xl"></i>
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Chưa có lịch sử làm đề</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            ${this.currentUser ? `Chào ${this.currentUser.fullName}! Bạn chưa làm bài kiểm tra nào.` : 'Hãy chọn một bộ đề trong mục "Các Bộ Đề Ôn Luyện" để thử sức và hệ thống sẽ tự động lưu điểm của bạn tại đây.'}
          </p>
          <button onclick="app.switchTab('sets')" class="mt-6 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25">
            Làm bài ngay
          </button>
        </div>
      `;
      return;
    }

    const totalTests = history.length;
    const avgScore = (history.reduce((sum, h) => sum + h.score, 0) / totalTests).toFixed(2);
    const maxScore = Math.max(...history.map(h => h.score));

    const rowsHTML = history.map((record, idx) => {
      const mins = Math.floor(record.durationSeconds / 60);
      const secs = record.durationSeconds % 60;
      const durationStr = `${mins}m ${secs}s`;

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
          <td class="py-3 px-3 font-semibold text-slate-400 text-xs">${idx + 1}</td>
          <td class="py-3 px-3">
            <div class="font-bold text-slate-900 dark:text-white text-sm">${record.setTitle}</div>
            <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span><i class="fa-regular fa-calendar"></i> ${record.timestamp}</span>
              <span>•</span>
              <span class="px-1.5 py-0.2 rounded font-semibold ${record.mode === 'instant' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}">
                ${record.mode === 'instant' ? 'Xem từng câu' : 'Xem sau khi nộp'}
              </span>
            </div>
          </td>
          <td class="py-3 px-3 text-center">
            <span class="text-base font-black text-brand-600 dark:text-brand-400">${record.score}</span>
            <span class="text-xs text-slate-400">/10</span>
          </td>
          <td class="py-3 px-3 text-center text-xs font-mono font-medium text-slate-500">
            ${durationStr}
          </td>
          <td class="py-3 px-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${record.gradeBadge || 'bg-slate-200 text-slate-700'}">
              ${record.grade || 'Hoàn thành'}
            </span>
          </td>
          <td class="py-3 px-3 text-right">
            <button onclick="app.launchSet('${record.setId}', '${record.setId.startsWith('exam') ? 'exam' : 'tf'}', '${record.mode}')" class="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold text-xs transition">
              <i class="fa-solid fa-rotate-right mr-1"></i> Làm lại
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        
        <div class="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
              ${(this.currentUser ? this.currentUser.fullName : 'K').charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">${this.currentUser ? this.currentUser.fullName : 'Học Viên Khách'}</h3>
                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                  ${this.currentUser ? this.currentUser.className || 'Học sinh' : 'Chưa đăng nhập'}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Lịch sử và kết quả thi được lưu trên trình duyệt của bạn</p>
            </div>
          </div>

          <div class="flex items-center space-x-4 text-center">
            <div class="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <div class="text-xs text-slate-500 font-medium">Đã làm</div>
              <div class="text-lg font-black text-slate-800 dark:text-slate-100">${totalTests} đề</div>
            </div>
            <div class="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <div class="text-xs text-slate-500 font-medium">Điểm TB</div>
              <div class="text-lg font-black text-brand-600 dark:text-brand-400">${avgScore}</div>
            </div>
            <div class="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <div class="text-xs text-slate-500 font-medium">Cao nhất</div>
              <div class="text-lg font-black text-emerald-600 dark:text-emerald-400">${maxScore}</div>
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-brand-600"></i> Lịch Sử Chi Tiết Các Lần Làm Bài
            </h4>
            <button onclick="app.clearUserHistory()" class="text-xs text-rose-500 hover:text-rose-700 font-bold transition">
              <i class="fa-solid fa-trash-can mr-1"></i> Xóa lịch sử
            </button>
          </div>

          <table class="w-full text-left history-table border-collapse min-w-[600px]">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                <th class="py-2.5 px-3">#</th>
                <th class="py-2.5 px-3">Bộ Đề</th>
                <th class="py-2.5 px-3 text-center">Điểm Số</th>
                <th class="py-2.5 px-3 text-center">Thời Gian</th>
                <th class="py-2.5 px-3 text-center">Xếp Loại</th>
                <th class="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>

      </div>
    `;
  }

  clearUserHistory() {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử làm bài này không?')) return;
    const key = this.currentUser ? `th10_history_${this.currentUser.username}` : 'th10_history_guest';
    localStorage.removeItem(key);
    this.renderHistoryView();
    this.updateHeaderStats();
    this.showToast('Đã xóa toàn bộ lịch sử làm bài.', 'info');
  }

  // ==========================================
  // VIEW: PRACTICE VIEW (LUYỆN TẬP TỰ DO)
  // ==========================================
  filterPracticeQuestions() {
    if (this.practiceFilter === 'all') {
      this.filteredPracticeList = [...this.allQuestions];
    } else if (this.practiceFilter === 'part1') {
      this.filteredPracticeList = this.allQuestions.filter(q => q.globalType === 'part1');
    } else if (this.practiceFilter === 'part2') {
      this.filteredPracticeList = this.allQuestions.filter(q => q.globalType === 'part2');
    } else {
      this.filteredPracticeList = this.allQuestions.filter(q => q.topic === this.practiceFilter);
    }
    if (this.practiceIndex >= this.filteredPracticeList.length) {
      this.practiceIndex = 0;
    }
  }

  setPracticeFilter(filter) {
    this.practiceFilter = filter;
    this.practiceIndex = 0;
    this.filterPracticeQuestions();
    this.renderPracticeView();
  }

  renderPracticeView() {
    const container = document.getElementById('view-practice');
    if (!container) return;

    if (this.filteredPracticeList.length === 0) {
      container.innerHTML = `
        <div class="glass-panel rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
          <i class="fa-solid fa-folder-open text-4xl text-slate-400 mb-4"></i>
          <h3 class="text-lg font-bold">Không tìm thấy câu hỏi phù hợp</h3>
          <button onclick="app.setPracticeFilter('all')" class="mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold text-sm">Xem tất cả</button>
        </div>
      `;
      return;
    }

    const q = this.filteredPracticeList[this.practiceIndex];
    const totalInFilter = this.filteredPracticeList.length;
    const isBookmarked = this.bookmarks.has(q.globalId);
    const isEdited = !!this.customEdits[q.globalId];

    const topics = [
      { id: 'all', name: 'Tất cả (135 câu)' },
      { id: 'part1', name: 'Phần I: Trắc nghiệm 4 lựa chọn' },
      { id: 'part2', name: 'Phần II: Đúng / Sai' },
      { id: 'Thông tin & Dữ liệu', name: 'Chủ đề: Thông tin & Dữ liệu' },
      { id: 'Thiết bị thông minh', name: 'Chủ đề: Thiết bị thông minh' },
      { id: 'Đạo đức số', name: 'Chủ đề: Đạo đức & Văn hóa số' },
      { id: 'Đồ họa vectơ & Inkscape', name: 'Chủ đề: Đồ họa vectơ & Inkscape' }
    ];

    const filterOptionsHTML = topics.map(t => `
      <button onclick="app.setPracticeFilter('${t.id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${this.practiceFilter === t.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
        ${t.name}
      </button>
    `).join('');

    let cardContentHTML = '';

    if (q.globalType === 'part1') {
      const selected = this.userAnswers[q.globalId];
      const isAnswered = selected !== undefined;
      const isRight = selected === q.answer;

      const optionsHTML = q.options.map((optText, oIdx) => {
        const optLetter = ['A', 'B', 'C', 'D'][oIdx];
        let stateClasses = 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-brand-50/50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200';
        let badgeClasses = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
        let iconHTML = '';

        if (isAnswered) {
          if (optLetter === q.answer) {
            stateClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold shadow-sm';
            badgeClasses = 'bg-emerald-600 text-white';
            iconHTML = '<i class="fa-solid fa-check text-emerald-600 dark:text-emerald-400 text-base ml-auto"></i>';
          } else if (optLetter === selected) {
            stateClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
            badgeClasses = 'bg-rose-600 text-white';
            iconHTML = '<i class="fa-solid fa-xmark text-rose-600 dark:text-rose-400 text-base ml-auto"></i>';
          } else {
            stateClasses = 'opacity-50 border-slate-200 dark:border-slate-700';
          }
        }

        return `
          <button onclick="app.answerPracticePart1('${q.globalId}', '${optLetter}')" class="option-btn w-full p-4 rounded-xl border text-left flex items-center space-x-3 transition ${stateClasses}">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition ${badgeClasses}">
              ${optLetter}
            </span>
            <span class="text-sm sm:text-base leading-relaxed flex-1">${optText.replace(/^[A-D]\.\s*/, '')}</span>
            ${iconHTML}
          </button>
        `;
      }).join('');

      cardContentHTML = `
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">Phần I • Câu ${q.id}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${q.topic}</span>
              ${isEdited ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
            </div>
            <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs font-semibold px-2.5 py-1 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition">
              <i class="fa-solid fa-pen text-xs"></i> <span>Sửa đáp án</span>
            </button>
          </div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            ${q.question}
          </h2>
        </div>

        <div class="space-y-3">${optionsHTML}</div>

        ${isAnswered ? `
          <div class="mt-6 p-4 rounded-xl border ${isRight ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30'}">
            <div class="flex items-start space-x-3">
              <i class="fa-solid ${isRight ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'} text-lg mt-0.5"></i>
              <div class="text-sm">
                <div class="font-bold ${isRight ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}">
                  ${isRight ? 'Chính xác!' : `Chưa đúng! Đáp án đúng: ${q.answer}`}
                </div>
                <div class="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>Giải thích:</strong> ${q.explanation}
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      `;
    } else {
      // Part 2: True/False
      const itemsHTML = q.items.map(item => {
        const itemKey = `${q.globalId}_${item.subId}`;
        const userChoice = this.userAnswers[itemKey];
        const isAnswered = userChoice !== undefined;
        const isRight = userChoice === item.isCorrect;

        let statusBadge = '';
        if (isAnswered) {
          statusBadge = isRight
            ? '<span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-check"></i> Đúng</span>'
            : '<span class="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1"><i class="fa-solid fa-xmark"></i> Sai</span>';
        }

        return `
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5">
                <span class="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  ${item.subId})
                </span>
                <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  ${item.text}
                </p>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div class="flex items-center space-x-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <button onclick="app.answerPracticePart2('${itemKey}', true)" class="px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${userChoice === true ? (item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'}">
                <i class="fa-solid fa-check text-xs"></i> Đúng
              </button>
              <button onclick="app.answerPracticePart2('${itemKey}', false)" class="px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${userChoice === false ? (!item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'}">
                <i class="fa-solid fa-xmark text-xs"></i> Sai
              </button>
            </div>

            ${isAnswered ? `
              <div class="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span class="font-bold text-brand-600 dark:text-brand-400">Đáp án: ${item.isCorrect ? 'ĐÚNG' : 'SAI'}</span> - ${item.explanation}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      cardContentHTML = `
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">Phần II • Câu Đúng/Sai ${q.id}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${q.topic}</span>
              ${isEdited ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
            </div>
            <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs font-semibold px-2.5 py-1 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition">
              <i class="fa-solid fa-pen text-xs"></i> <span>Sửa đáp án</span>
            </button>
          </div>
          <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
            <i class="fa-solid fa-quote-left text-amber-500 mr-1.5"></i><strong>Tình huống:</strong> ${q.scenario}
          </div>
        </div>
        <div class="space-y-3">${itemsHTML}</div>
      `;
    }

    container.innerHTML = `
      <div class="flex items-center space-x-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        ${filterOptionsHTML}
      </div>

      <div class="glass-panel rounded-2xl p-5 sm:p-8 max-w-4xl mx-auto border border-slate-200/80 dark:border-slate-800/80">
        
        <div class="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mb-5">
          <div class="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span>Tiến độ:</span>
            <span class="text-brand-600 dark:text-brand-400 font-extrabold text-sm">${this.practiceIndex + 1} / ${totalInFilter}</span>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="app.toggleBookmark('${q.globalId}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${isBookmarked ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}">
              <i class="fa-solid fa-star ${isBookmarked ? 'text-amber-500' : 'text-slate-400'}"></i>
              <span>${isBookmarked ? 'Đã lưu' : 'Lưu câu'}</span>
            </button>
            <button onclick="app.toggleMatrixDrawer()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <i class="fa-solid fa-table-cells text-xs mr-1"></i> Mục lục
            </button>
          </div>
        </div>

        ${cardContentHTML}

        <div class="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <button onclick="app.prevPracticeQuestion()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition flex items-center gap-2" ${this.practiceIndex === 0 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''}>
            <i class="fa-solid fa-arrow-left"></i> Câu trước
          </button>
          <div class="text-xs text-slate-400 hidden sm:block">
            Phím tắt: 1, 2, 3, 4 để chọn A, B, C, D
          </div>
          <button onclick="app.nextPracticeQuestion()" class="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs sm:text-sm font-semibold hover:bg-brand-700 transition flex items-center gap-2 shadow-md shadow-brand-500/20" ${this.practiceIndex === totalInFilter - 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : ''}>
            Câu sau <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>

      </div>
    `;
  }

  answerPracticePart1(globalId, opt) {
    const q = this.allQuestions.find(item => item.globalId === globalId);
    if (!q) return;

    this.userAnswers[globalId] = opt;
    localStorage.setItem('th10_user_answers', JSON.stringify(this.userAnswers));

    if (opt === q.answer) {
      this.sound.playCorrect();
      this.mistakes.delete(globalId);
    } else {
      this.sound.playWrong();
      this.mistakes.add(globalId);
    }
    localStorage.setItem('th10_mistakes', JSON.stringify([...this.mistakes]));

    this.renderPracticeView();
    this.updateHeaderStats();
  }

  answerPracticePart2(itemKey, val) {
    this.userAnswers[itemKey] = val;
    localStorage.setItem('th10_user_answers', JSON.stringify(this.userAnswers));

    const [p2GlobalId, subId] = itemKey.split('_');
    const q = this.allQuestions.find(item => item.globalId === p2GlobalId);
    if (q) {
      const item = q.items.find(it => it.subId === subId);
      if (item) {
        if (val === item.isCorrect) this.sound.playCorrect();
        else {
          this.sound.playWrong();
          this.mistakes.add(p2GlobalId);
          localStorage.setItem('th10_mistakes', JSON.stringify([...this.mistakes]));
        }
      }
    }

    this.renderPracticeView();
    this.updateHeaderStats();
  }

  prevPracticeQuestion() {
    if (this.practiceIndex > 0) {
      this.practiceIndex--;
      this.renderPracticeView();
    }
  }

  nextPracticeQuestion() {
    if (this.practiceIndex < this.filteredPracticeList.length - 1) {
      this.practiceIndex++;
      this.renderPracticeView();
    }
  }

  toggleBookmark(globalId) {
    if (this.bookmarks.has(globalId)) this.bookmarks.delete(globalId);
    else this.bookmarks.add(globalId);
    localStorage.setItem('th10_bookmarks', JSON.stringify([...this.bookmarks]));
    this.render();
  }

  // ==========================================
  // VIEW: ÔN CÂU SAI (MISTAKES)
  // ==========================================
  renderMistakesView() {
    const container = document.getElementById('view-mistakes');
    if (!container) return;

    const mistakeList = this.allQuestions.filter(q => this.mistakes.has(q.globalId));

    if (mistakeList.length === 0) {
      container.innerHTML = `
        <div class="glass-panel rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 border border-slate-200/80 dark:border-slate-800/80">
          <div class="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-trophy text-2xl"></i>
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Tuyệt vời! Không có câu làm sai</h3>
          <p class="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Bạn đã giải đúng toàn bộ các câu hỏi hoặc chưa có câu nào bị ghi nhận sai. Hãy tiếp tục làm thêm các bộ đề để củng cố nhé!
          </p>
          <button onclick="app.switchTab('sets')" class="mt-6 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/20">
            Luyện Bộ Đề
          </button>
        </div>
      `;
      return;
    }

    const cardsHTML = mistakeList.map(q => {
      if (q.globalType === 'part1') {
        const options = q.options.map((opt, oIdx) => {
          const letter = ['A', 'B', 'C', 'D'][oIdx];
          const isCorrect = letter === q.answer;
          return `
            <div class="p-2.5 rounded-lg text-xs sm:text-sm border flex items-center space-x-2 ${isCorrect ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold' : 'border-slate-200 bg-white/50 dark:bg-slate-800/50'}">
              <span class="w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200'}">${letter}</span>
              <span>${opt.replace(/^[A-D]\.\s*/, '')}</span>
              ${isCorrect ? '<i class="fa-solid fa-check text-emerald-600 ml-auto"></i>' : ''}
            </div>
          `;
        }).join('');

        return `
          <div class="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                Phần I • Câu ${q.id}
              </span>
              <div class="flex items-center gap-2">
                <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs text-amber-600 hover:underline">
                  <i class="fa-solid fa-pen text-[10px]"></i> Sửa đáp án
                </button>
                <button onclick="app.removeMistake('${q.globalId}')" class="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition">
                  <i class="fa-solid fa-check"></i> Đã nhớ câu này
                </button>
              </div>
            </div>
            <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">${q.question}</h4>
            <div class="space-y-1.5">${options}</div>
            <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <strong>Giải thích:</strong> ${q.explanation}
            </div>
          </div>
        `;
      } else {
        const items = q.items.map(it => `
          <div class="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 flex items-start gap-2">
            <span class="font-bold text-brand-600">${it.subId})</span>
            <div class="flex-1">
              <div>${it.text}</div>
              <div class="mt-1 font-bold ${it.isCorrect ? 'text-emerald-600' : 'text-rose-600'}">
                Đáp án: ${it.isCorrect ? 'ĐÚNG' : 'SAI'} - <span class="font-normal text-slate-500">${it.explanation}</span>
              </div>
            </div>
          </div>
        `).join('');

        return `
          <div class="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                Phần II (Đúng/Sai) • Câu ${q.id}
              </span>
              <div class="flex items-center gap-2">
                <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs text-amber-600 hover:underline">
                  <i class="fa-solid fa-pen text-[10px]"></i> Sửa đáp án
                </button>
                <button onclick="app.removeMistake('${q.globalId}')" class="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition">
                  <i class="fa-solid fa-check"></i> Đã nhớ câu này
                </button>
              </div>
            </div>
            <div class="p-3 rounded-xl bg-amber-500/10 text-xs text-slate-800 dark:text-slate-200">
              <strong>Tình huống:</strong> ${q.scenario}
            </div>
            <div class="space-y-1.5">${items}</div>
          </div>
        `;
      }
    }).join('');

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-5">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-circle-exclamation text-rose-500"></i>
              Sổ Tay Ôn Câu Sai (${mistakeList.length} câu)
            </h2>
            <p class="text-xs text-slate-500">Xem lại các câu bạn từng trả lời sai để ghi nhớ kiến thức tốt hơn.</p>
          </div>
          <button onclick="app.clearAllMistakes()" class="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-600 text-xs font-bold hover:bg-rose-50 transition">
            Xóa hết câu sai
          </button>
        </div>

        <div class="space-y-4">${cardsHTML}</div>
      </div>
    `;
  }

  removeMistake(globalId) {
    this.mistakes.delete(globalId);
    localStorage.setItem('th10_mistakes', JSON.stringify([...this.mistakes]));
    this.renderMistakesView();
    this.updateHeaderStats();
  }

  clearAllMistakes() {
    this.mistakes.clear();
    localStorage.setItem('th10_mistakes', JSON.stringify([]));
    this.renderMistakesView();
    this.updateHeaderStats();
  }

  // ==========================================
  // VIEW: TRA CỨU & ĐÁP ÁN (STUDY)
  // ==========================================
  renderStudyView() {
    const container = document.getElementById('view-study');
    if (!container) return;

    let list = [...this.allQuestions];

    if (this.studySearch.trim()) {
      const qLower = this.studySearch.toLowerCase().trim();
      list = list.filter(q => {
        if (q.globalType === 'part1') {
          return q.question.toLowerCase().includes(qLower) ||
            q.options.some(opt => opt.toLowerCase().includes(qLower)) ||
            q.explanation.toLowerCase().includes(qLower) ||
            q.topic.toLowerCase().includes(qLower);
        } else {
          return q.scenario.toLowerCase().includes(qLower) ||
            q.items.some(it => it.text.toLowerCase().includes(qLower) || it.explanation.toLowerCase().includes(qLower)) ||
            q.topic.toLowerCase().includes(qLower);
        }
      });
    }

    const cardsHTML = list.map(q => {
      const isEdited = !!this.customEdits[q.globalId];

      if (q.globalType === 'part1') {
        const optionsHTML = q.options.map((opt, oIdx) => {
          const letter = ['A', 'B', 'C', 'D'][oIdx];
          const isCorrect = letter === q.answer;
          return `
            <div class="p-2.5 rounded-xl text-xs sm:text-sm border flex items-center space-x-2.5 ${isCorrect ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 font-bold' : 'border-slate-200 bg-white/40 dark:bg-slate-800/40'}">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200'}">
                ${letter}
              </span>
              <span class="flex-1">${opt.replace(/^[A-D]\.\s*/, '')}</span>
              ${isCorrect ? '<i class="fa-solid fa-circle-check text-emerald-600 text-sm ml-auto"></i>' : ''}
            </div>
          `;
        }).join('');

        return `
          <div class="glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">Phần I • Câu ${q.id}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">${q.topic}</span>
                ${isEdited ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-emerald-600">Đáp án: ${q.answer}</span>
                <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs font-semibold px-2 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <i class="fa-solid fa-pen text-[10px]"></i> Sửa
                </button>
              </div>
            </div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">${q.question}</h3>
            <div class="space-y-2">${optionsHTML}</div>
            <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <strong>Lời giải chi tiết:</strong> ${q.explanation}
            </div>
          </div>
        `;
      } else {
        const itemsHTML = q.items.map(it => `
          <div class="p-3 rounded-xl border border-slate-200 bg-white/60 dark:bg-slate-800/60 space-y-1.5 text-xs sm:text-sm">
            <div class="flex items-start gap-2">
              <span class="w-5 h-5 rounded bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">${it.subId})</span>
              <p class="font-medium text-slate-800 dark:text-slate-200 flex-1">${it.text}</p>
              <span class="px-2 py-0.5 rounded font-extrabold text-xs ${it.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                ${it.isCorrect ? 'ĐÚNG' : 'SAI'}
              </span>
            </div>
            <div class="text-xs text-slate-500 pl-7">${it.explanation}</div>
          </div>
        `).join('');

        return `
          <div class="glass-panel rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Phần II (Đúng/Sai) • Câu ${q.id}</span>
                ${isEdited ? `<span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">Đã sửa ✏️</span>` : ''}
              </div>
              <button onclick="app.openEditAnswerModal('${q.globalId}')" class="text-xs font-semibold px-2 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1">
                <i class="fa-solid fa-pen text-[10px]"></i> Sửa
              </button>
            </div>
            <div class="p-3 rounded-xl bg-amber-500/10 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              <strong>Tình huống:</strong> ${q.scenario}
            </div>
            <div class="space-y-2">${itemsHTML}</div>
          </div>
        `;
      }
    }).join('');

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-5">
        <div class="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
          <div class="relative w-full sm:flex-1">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-sm"></i>
            <input type="text" value="${this.studySearch}" oninput="app.onStudySearch(this.value)" placeholder="Tra cứu từ khóa nhanh (ví dụ: Inkscape, RAM, Byte, IoT, Bản quyền...)" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 outline-none">
          </div>
          <div class="flex items-center gap-2">
            <button onclick="app.openManageAnswersModal()" class="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 whitespace-nowrap">
              <i class="fa-solid fa-pen-to-square"></i> Quản lý đáp án
            </button>
            <button onclick="window.print()" class="no-print px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap">
              <i class="fa-solid fa-print"></i> In / Xuất PDF
            </button>
          </div>
        </div>

        <div class="text-xs text-slate-500 font-medium px-1 flex items-center justify-between">
          <span>Tìm thấy <strong>${list.length}</strong> câu hỏi phù hợp</span>
          ${this.studySearch ? `<button onclick="app.clearStudySearch()" class="text-brand-600 font-bold hover:underline">Xóa tìm kiếm</button>` : ''}
        </div>

        <div class="space-y-4">${cardsHTML}</div>
      </div>
    `;
  }

  onStudySearch(val) {
    this.studySearch = val;
    this.renderStudyView();
  }

  clearStudySearch() {
    this.studySearch = '';
    this.renderStudyView();
  }

  // --- KEYBOARD SHORTCUTS ---
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        if (this.activeTab === 'practice') this.prevPracticeQuestion();
        else if (this.activeTab === 'active-set') this.prevActiveSetQuestion();
      } else if (e.key === 'ArrowRight') {
        if (this.activeTab === 'practice') this.nextPracticeQuestion();
        else if (this.activeTab === 'active-set') this.nextActiveSetQuestion();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optLetter = ['A', 'B', 'C', 'D'][parseInt(e.key, 10) - 1];
        if (this.activeTab === 'practice') {
          const q = this.filteredPracticeList[this.practiceIndex];
          if (q && q.globalType === 'part1') this.answerPracticePart1(q.globalId, optLetter);
        } else if (this.activeTab === 'active-set' && this.activeSet.inProgress && !this.activeSet.submitted) {
          const q = this.activeSet.questions[this.activeSet.currentIndex];
          if (q && q.globalType === 'part1') this.answerActiveSetPart1(q.globalId, optLetter);
        }
      }
    });
  }

  // --- MODAL UTILS ---
  closeModal() {
    const modal = document.getElementById('modal-container');
    if (modal) modal.classList.add('hidden');
  }
}

// Instantiate and initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new QuizApp();
  window.app.init();
});
