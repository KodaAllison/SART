// =====================================================
// SART Configuration
// =====================================================
const CONFIG = {
    nogo_digit: 3,                    // The digit to withhold response (no-go)
    digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], // All possible digits
    num_trials: 20,                   // Total number of trials (~3-4 minutes)
    fixation_duration: 750,           // Fixation dot duration (ms)
    stimulus_max_duration: 1000,      // Max time to respond (ms)
    feedback_duration: 200,           // Blank interval after response (ms)
};

// =====================================================
// Task State
// =====================================================
const state = {
    currentScreen: 'instructions',
    trialData: [],
    currentTrial: 0,
    trialSequence: [],
    stimulusOnset: null,
    awaitingResponse: false,
    currentDigit: null,
    responseTimeout: null,
};

// =====================================================
// Screen Management
// =====================================================
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(`${screenName}-screen`).classList.add('active');
    state.currentScreen = screenName;
}

// =====================================================
// Trial Sequence Generation
// =====================================================
function generateTrialSequence() {
    const sequence = [];
    for (let i = 0; i < CONFIG.num_trials; i++) {
        const digit = CONFIG.digits[Math.floor(Math.random() * CONFIG.digits.length)];
        sequence.push({
            digit: digit,
            isNoGo: digit === CONFIG.nogo_digit,
        });
    }
    return sequence;
}

// =====================================================
// Stimulus Display
// =====================================================
function showFixation() {
    const fixation = document.getElementById('fixation');
    const digit = document.getElementById('digit');
    
    digit.classList.add('hidden');
    fixation.classList.remove('hidden');
}

function hideFixation() {
    const fixation = document.getElementById('fixation');
    fixation.classList.add('hidden');
}

function showDigit(digitValue) {
    const digit = document.getElementById('digit');
    const fixation = document.getElementById('fixation');
    
    fixation.classList.add('hidden');
    digit.textContent = digitValue;
    digit.classList.remove('hidden');
}

function hideDigit() {
    const digit = document.getElementById('digit');
    digit.classList.add('hidden');
}

// =====================================================
// Trial Logic
// =====================================================
function startTrial() {
    if (state.currentTrial >= state.trialSequence.length) {
        endTask();
        return;
    }

    const trial = state.trialSequence[state.currentTrial];
    state.currentDigit = trial.digit;
    state.awaitingResponse = false;

    // Show fixation
    showFixation();

    // After fixation duration, show digit
    setTimeout(() => {
        showDigit(trial.digit);
        state.stimulusOnset = performance.now();
        state.awaitingResponse = true;

        // Set timeout for max stimulus duration
        state.responseTimeout = setTimeout(() => {
            if (state.awaitingResponse) {
                handleNoResponse();
            }
        }, CONFIG.stimulus_max_duration);
    }, CONFIG.fixation_duration);
}

function handleResponse() {
    if (!state.awaitingResponse) return;

    const rt = performance.now() - state.stimulusOnset;
    const trial = state.trialSequence[state.currentTrial];
    
    clearTimeout(state.responseTimeout);
    state.awaitingResponse = false;

    // Record trial data
    const isCorrect = !trial.isNoGo; // Correct if it's a go trial
    
    state.trialData.push({
        trial: state.currentTrial + 1,
        digit: trial.digit,
        trialType: trial.isNoGo ? 'no-go' : 'go',
        response: 'keypress',
        correct: isCorrect,
        rt: Math.round(rt),
    });

    hideDigit();

    // Brief blank interval
    setTimeout(() => {
        state.currentTrial++;
        startTrial();
    }, CONFIG.feedback_duration);
}

function handleNoResponse() {
    if (!state.awaitingResponse) return;

    const trial = state.trialSequence[state.currentTrial];
    state.awaitingResponse = false;

    // Record trial data
    const isCorrect = trial.isNoGo; // Correct if it's a no-go trial
    
    state.trialData.push({
        trial: state.currentTrial + 1,
        digit: trial.digit,
        trialType: trial.isNoGo ? 'no-go' : 'go',
        response: 'none',
        correct: isCorrect,
        rt: null,
    });

    hideDigit();

    // Brief blank interval
    setTimeout(() => {
        state.currentTrial++;
        startTrial();
    }, CONFIG.feedback_duration);
}

// =====================================================
// Task Flow
// =====================================================
function startTask() {
    // Reset state
    state.trialData = [];
    state.currentTrial = 0;
    state.trialSequence = generateTrialSequence();
    
    showScreen('task');
    
    // Small delay before first trial
    setTimeout(() => {
        startTrial();
    }, 500);
}

function endTask() {
    showScreen('results');
    calculateAndDisplayResults();
}

// =====================================================
// Results Calculation
// =====================================================
function calculateAndDisplayResults() {
    const goTrials = state.trialData.filter(t => t.trialType === 'go');
    const nogoTrials = state.trialData.filter(t => t.trialType === 'no-go');
    
    // Go trial metrics
    const goCorrect = goTrials.filter(t => t.correct).length;
    const goTotal = goTrials.length;
    const goAccuracy = goTotal > 0 ? (goCorrect / goTotal * 100).toFixed(1) : 0;
    
    // No-go trial metrics
    const nogoCorrect = nogoTrials.filter(t => t.correct).length;
    const nogoTotal = nogoTrials.length;
    const nogoAccuracy = nogoTotal > 0 ? (nogoCorrect / nogoTotal * 100).toFixed(1) : 0;
    
    // Overall accuracy
    const totalCorrect = state.trialData.filter(t => t.correct).length;
    const totalTrials = state.trialData.length;
    const overallAccuracy = totalTrials > 0 ? (totalCorrect / totalTrials * 100).toFixed(1) : 0;
    
    // Mean RT for correct go trials only
    const correctGoRTs = goTrials.filter(t => t.correct && t.rt !== null).map(t => t.rt);
    const meanRT = correctGoRTs.length > 0 
        ? Math.round(correctGoRTs.reduce((sum, rt) => sum + rt, 0) / correctGoRTs.length)
        : 0;
    
    // Commissions and omissions
    const commissions = nogoTrials.filter(t => !t.correct).length; // False alarms
    const omissions = goTrials.filter(t => !t.correct).length;     // Misses
    
    // Display results
    document.getElementById('mean-rt').textContent = `${meanRT} ms`;
    document.getElementById('go-accuracy').textContent = `${goAccuracy}%`;
    document.getElementById('nogo-accuracy').textContent = `${nogoAccuracy}%`;
    document.getElementById('overall-accuracy').textContent = `${overallAccuracy}%`;
    
    document.getElementById('go-correct').textContent = goCorrect;
    document.getElementById('go-total').textContent = goTotal;
    document.getElementById('nogo-correct').textContent = nogoCorrect;
    document.getElementById('nogo-total').textContent = nogoTotal;
    document.getElementById('commissions').textContent = commissions;
    document.getElementById('omissions').textContent = omissions;
}

// =====================================================
// Data Export
// =====================================================
function downloadCSV() {
    // Create CSV header
    let csv = 'Trial,Digit,TrialType,Response,Correct,RT_ms\n';
    
    // Add trial data
    state.trialData.forEach(trial => {
        csv += `${trial.trial},${trial.digit},${trial.trialType},${trial.response},${trial.correct},${trial.rt !== null ? trial.rt : ''}\n`;
    });
    
    // Add summary data
    const goTrials = state.trialData.filter(t => t.trialType === 'go');
    const nogoTrials = state.trialData.filter(t => t.trialType === 'no-go');
    const goCorrect = goTrials.filter(t => t.correct).length;
    const nogoCorrect = nogoTrials.filter(t => t.correct).length;
    const correctGoRTs = goTrials.filter(t => t.correct && t.rt !== null).map(t => t.rt);
    const meanRT = correctGoRTs.length > 0 
        ? Math.round(correctGoRTs.reduce((sum, rt) => sum + rt, 0) / correctGoRTs.length)
        : 0;
    const commissions = nogoTrials.filter(t => !t.correct).length;
    const omissions = goTrials.filter(t => !t.correct).length;
    
    csv += '\nSummary\n';
    csv += `Mean RT (correct go trials),${meanRT}\n`;
    csv += `Go Accuracy,${((goCorrect / goTrials.length) * 100).toFixed(1)}%\n`;
    csv += `No-Go Accuracy,${((nogoCorrect / nogoTrials.length) * 100).toFixed(1)}%\n`;
    csv += `Overall Accuracy,${((state.trialData.filter(t => t.correct).length / state.trialData.length) * 100).toFixed(1)}%\n`;
    csv += `Commissions (false alarms),${commissions}\n`;
    csv += `Omissions (misses),${omissions}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sart_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// =====================================================
// Event Listeners
// =====================================================
document.getElementById('start-button').addEventListener('click', startTask);
document.getElementById('restart-button').addEventListener('click', () => {
    showScreen('instructions');
});
document.getElementById('download-button').addEventListener('click', downloadCSV);

// Keyboard listener for spacebar
document.addEventListener('keydown', (event) => {
    if (state.currentScreen === 'task' && event.code === 'Space') {
        event.preventDefault();
        handleResponse();
    }
});

// Initialize
showScreen('instructions');
