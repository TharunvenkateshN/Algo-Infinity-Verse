document.addEventListener('DOMContentLoaded', () => {
    // Hide loader
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    }, 1000);

    // Load Navbar placeholder
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder && !navbarPlaceholder.innerHTML) {
        const loadNavbar = async () => {
            try {
                const response = await fetch('/partials/navbar.html');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.text();
                navbarPlaceholder.innerHTML = data;
            } catch (error) {
                console.error('Error loading navbar:', error);
            }
        };
        loadNavbar();
    }

    if (!window.courseData) {
        console.error("Course data not found!");
        return;
    }

    initCoursePlatform();
});

let currentItem = null;
let currentModuleIndex = 0;
let currentItemIndex = 0;

// State management
let progressState = {
    unlockedModules: ['m1'], // Module IDs
    completedItems: []       // Item IDs
};

function loadProgress() {
    try {
        const saved = localStorage.getItem('googleCourseProgress');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                progressState = parsed;
            }
        }
    } catch (e) {
        console.error('Error parsing progress state, resetting to default', e);
        progressState = [];
    }
}

function saveProgress() {
    localStorage.setItem('googleCourseProgress', JSON.stringify(progressState));
}

function initCoursePlatform() {
    loadProgress();
    renderSyllabus();

    document.getElementById('start-course-btn')?.addEventListener('click', () => {
        loadItem(0, 0);
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        goToNextItem();
    });

    document.getElementById('btn-prev')?.addEventListener('click', () => {
        goToPrevItem();
    });

    document.getElementById('btn-complete')?.addEventListener('click', () => {
        markCurrentItemCompleted();
        goToNextItem();
    });

    document.getElementById('btn-submit-quiz')?.addEventListener('click', submitQuiz);


}

function renderSyllabus() {
    const accordion = document.getElementById('syllabus-accordion');
    accordion.innerHTML = '';

    window.courseData.modules.forEach((mod, mIndex) => {
        const isUnlocked = progressState.unlockedModules.includes(mod.id) || !mod.locked;
        
        // Force unlock if previous module completed (safeguard)
        if(!isUnlocked && mIndex > 0) {
           const prevMod = window.courseData.modules[mIndex-1];
           const lastQuiz = prevMod.items[prevMod.items.length-1];
           if(progressState.completedItems.includes(lastQuiz.id)) {
               progressState.unlockedModules.push(mod.id);
               saveProgress();
           }
        }
        
        const isCurrentlyUnlocked = progressState.unlockedModules.includes(mod.id) || !mod.locked;

        const modGroup = document.createElement('div');
        modGroup.className = 'module-group';

        const modHeader = document.createElement('div');
        modHeader.className = 'module-header';
        modHeader.setAttribute('role', 'button');
        modHeader.setAttribute('tabindex', '0');
        modHeader.setAttribute('aria-expanded', mIndex === currentModuleIndex ? 'true' : 'false');
        modHeader.innerHTML = `
            <div class="module-title">
                ${isCurrentlyUnlocked ? '' : '<i class="fas fa-lock module-lock-icon" aria-hidden="true"></i>'}
                ${mod.title}
            </div>
            <i class="fas fa-chevron-${mIndex === currentModuleIndex ? 'up' : 'down'}" aria-hidden="true"></i>
        `;

        const modItems = document.createElement('div');
        modItems.className = 'module-items';
        if (mIndex === currentModuleIndex) {
            modItems.classList.add('expanded');
        }

        const toggleModule = () => {
            modItems.classList.toggle('expanded');
            const isExpanded = modItems.classList.contains('expanded');
            modHeader.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            const icon = modHeader.querySelector('i:last-child');
            if (isExpanded) {
                icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        };

        modHeader.addEventListener('click', toggleModule);
        modHeader.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleModule();
            }
        });

        mod.items.forEach((item, iIndex) => {
        mod.items.forEach((lesson, lIndex) => {
            const isItemCompleted = progressState.completedItems.includes(lesson.id);
            const isItemUnlocked = isCurrentlyUnlocked;
            const isActive = currentItem && currentItem.id === lesson.id;

            const item = document.createElement('div');
            item.className = `lesson-item ${isItemCompleted ? 'completed' : ''} ${isItemUnlocked ? '' : 'locked'} ${isActive ? 'active' : ''}`;
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', isItemUnlocked ? '0' : '-1');
            item.setAttribute('aria-current', isActive ? 'page' : 'false');
            item.setAttribute('aria-disabled', isItemUnlocked ? 'false' : 'true');

            item.innerHTML = `
                <i class="fas ${isItemCompleted ? 'fa-check-circle' : (isItemUnlocked ? 'fa-circle' : 'fa-lock')}" aria-hidden="true"></i>
                ${lesson.title}
            `;

            if (isItemUnlocked) {
                const loadLesson = () => loadItem(mIndex, lIndex);
                item.addEventListener('click', loadLesson);
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        loadLesson();
                    }
                });
            }

            modItems.appendChild(item);
        });

        modGroup.appendChild(modHeader);
        modGroup.appendChild(modItems);
        accordion.appendChild(modGroup);
    });
}

function loadItem(mIndex, iIndex) {
    const mod = window.courseData.modules[mIndex];
    if (!mod) return;
    const isUnlocked = progressState.unlockedModules.includes(mod.id) || !mod.locked;
    if (!isUnlocked) return;

    const item = mod.items[iIndex];
    if (!item) return;

    currentModuleIndex = mIndex;
    currentItemIndex = iIndex;
    currentItem = item;

    // Update active state in syllabus
    renderSyllabus();

    // Render Content
    const titleEl = document.getElementById('viewer-title');
    const contentArea = document.getElementById('viewer-content-area');
    const quizArea = document.getElementById('viewer-quiz-area');

    titleEl.textContent = item.title;

    // Setup Footer buttons
    const btnNext = document.getElementById('btn-next');
    const btnComplete = document.getElementById('btn-complete');
    const btnSubmitQuiz = document.getElementById('btn-submit-quiz');
    const btnPrev = document.getElementById('btn-prev');
    const status = document.getElementById('completion-status');

    btnPrev.disabled = (mIndex === 0 && iIndex === 0);
    btnNext.style.display = 'none';
    btnComplete.style.display = 'none';
    btnSubmitQuiz.style.display = 'none';

    if (item.type === 'reading' || item.type === 'lab') {
        quizArea.style.display = 'none';
        contentArea.style.display = 'block';
        
        let html = item.content;
        
        // If it's a lab, inject the lab container
        if (item.type === 'lab') {
            html += `
            <div class="lab-container" id="lab-${item.labId}">
                <div class="lab-header">
                    <span style="color:#FBBC05;font-weight:bold;"><i class="fas fa-flask"></i> Interactive Lab Simulation</span>
                </div>
                <div class="lab-canvas" id="${item.labId}-canvas">
                    <!-- Controlled by google-labs.js -->
                </div>
            </div>`;
        }
        
        contentArea.innerHTML = html;

        // Initialize Lab if needed
        if (item.type === 'lab' && window.initGoogleLab) {
             window.initGoogleLab(item.labId);
        }

        const isCompleted = progressState.completedItems.includes(item.id);
        if (isCompleted) {
            status.innerHTML = '<i class="fas fa-check-circle" style="color:var(--lms-success);"></i> Completed';
            btnNext.style.display = 'block';
        } else {
            status.innerHTML = '';
            btnComplete.style.display = 'block';
        }

    } else if (item.type === 'quiz') {
        contentArea.style.display = 'none';
        quizArea.style.display = 'block';
        renderQuiz(item);
        
        const isCompleted = progressState.completedItems.includes(item.id);
        if (isCompleted) {
            status.innerHTML = '<i class="fas fa-check-circle" style="color:var(--lms-success);"></i> Passed';
            btnNext.style.display = 'block';
        } else {
            status.innerHTML = `Passing Score: ${item.passingScore}%`;
            btnSubmitQuiz.style.display = 'block';
        }
    }
}

function renderQuiz(quizItem) {
    const quizArea = document.getElementById('viewer-quiz-area');
    let html = `<div class="quiz-container">
        <h3>${quizItem.title}</h3>
        <p>You must score at least ${quizItem.passingScore}% to pass this evaluation and unlock the next module.</p>
        <div id="quiz-form">`;
    
    quizItem.questions.forEach((q, qIndex) => {
        html += `<div class="quiz-question-block" data-qindex="${qIndex}">
            <h4>${qIndex + 1}. ${q.q}</h4>`;
        
        q.options.forEach((opt, oIndex) => {
            html += `<label class="quiz-option">
                <input type="radio" name="q${qIndex}" value="${oIndex}">
                ${opt.text}
            </label>`;
        });
        html += `</div>`;
    });

    html += `</div>
        <div id="quiz-result" class="quiz-result-message"></div>
    </div>`;

    quizArea.innerHTML = html;
}

function submitQuiz() {
    if (currentItem.type !== 'quiz') return;

    let score = 0;
    let allAnswered = true;
    
    currentItem.questions.forEach((q, qIndex) => {
        const selected = document.querySelector(`input[name="q${qIndex}"]:checked`);
        if (!selected) {
            allAnswered = false;
        } else {
            const val = parseInt(selected.value);
            if (q.options[val].isCorrect) {
                score++;
            }
        }
    });

    const resultDiv = document.getElementById('quiz-result');

    if (!allAnswered) {
        resultDiv.className = 'quiz-result-message fail';
        resultDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please answer all questions before submitting.';
        return;
    }

    const percentage = Math.round((score / currentItem.questions.length) * 100);
    
    if (percentage >= currentItem.passingScore) {
        resultDiv.className = 'quiz-result-message pass';
        resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> Congratulations! You scored ${percentage}%. You have passed the evaluation.`;
        
        markCurrentItemCompleted();
        
        // Unlock next module
        if (currentModuleIndex + 1 < window.courseData.modules.length) {
            const nextMod = window.courseData.modules[currentModuleIndex + 1];
            if (!progressState.unlockedModules.includes(nextMod.id)) {
                progressState.unlockedModules.push(nextMod.id);
                saveProgress();
                renderSyllabus();
            }
        }

        document.getElementById('btn-submit-quiz').style.display = 'none';
        document.getElementById('btn-next').style.display = 'block';

    } else {
        resultDiv.className = 'quiz-result-message fail';
        resultDiv.innerHTML = `<i class="fas fa-times-circle"></i> You scored ${percentage}%. You need ${currentItem.passingScore}% to pass. Please review the material and try again.`;
    }
}

function markCurrentItemCompleted() {
    if (!progressState.completedItems.includes(currentItem.id)) {
        progressState.completedItems.push(currentItem.id);
        saveProgress();
        renderSyllabus();
    }
}

function goToNextItem() {
    const mod = window.courseData.modules[currentModuleIndex];
    if (currentItemIndex + 1 < mod.items.length) {
        loadItem(currentModuleIndex, currentItemIndex + 1);
    } else if (currentModuleIndex + 1 < window.courseData.modules.length) {
        const nextMod = window.courseData.modules[currentModuleIndex + 1];
        if (progressState.unlockedModules.includes(nextMod.id) || !nextMod.locked) {
            loadItem(currentModuleIndex + 1, 0);
        } else {
            alert("The next module is locked. You must complete the evaluation.");
        }
    }
}

function goToPrevItem() {
    if (currentItemIndex > 0) {
        loadItem(currentModuleIndex, currentItemIndex - 1);
    } else if (currentModuleIndex > 0) {
        const prevMod = window.courseData.modules[currentModuleIndex - 1];
        loadItem(currentModuleIndex - 1, prevMod.items.length - 1);
    }
}
